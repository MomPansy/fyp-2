#!/bin/bash

# Database Broker Minikube Test Script
set -e

echo "🚀 Setting up Database Broker on Minikube"

# Check if minikube is running
if ! minikube status > /dev/null 2>&1; then
    echo "❌ Minikube is not running. Please start it with: minikube start"
    exit 1
fi

# Configure Docker environment to use Minikube's Docker daemon
echo "📦 Configuring Docker environment..."
eval $(minikube docker-env)

# Build the database broker image
echo "🔨 Building database broker image..."
cd server
docker build -t db-broker:latest .
cd ..

# Create namespace if it doesn't exist
echo "📁 Creating database namespace..."
kubectl create namespace database --dry-run=client -o yaml | kubectl apply -f -

# Create ServiceAccount and RBAC
echo "🔐 Setting up RBAC..."
kubectl apply -f - << EOF
apiVersion: v1
kind: ServiceAccount
metadata:
  name: db-broker
  namespace: database
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: db-broker
rules:
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
- apiGroups: ["apps"]
  resources: ["deployments", "deployments/scale"]
  verbs: ["get", "list", "update", "patch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: db-broker
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: db-broker
subjects:
- kind: ServiceAccount
  name: db-broker
  namespace: database
EOF

echo "🧹 Cleaning up existing resources..."
helm uninstall database -n database 2>/dev/null || true
helm uninstall sandboxed-db -n database 2>/dev/null || true
kubectl delete configmap pg-init-scripts -n database 2>/dev/null || true

# Deploy using Helm template + kubectl apply (to avoid server-side size limits)
echo "⚙️  Deploying with Helm..."
helm template sandboxed-db . \
  --namespace database \
  --set image=db-broker:latest \
  --set serviceAccount.create=false \
  --set serviceAccount.name=db-broker | kubectl apply -f -

# Wait for deployment
echo "⏳ Waiting for deployment to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment/db-broker -n database

# Get the broker service
echo "🌐 Setting up port forwarding..."
kubectl port-forward -n database service/db-broker 8080:8080 &
PORT_FORWARD_PID=$!

echo "✅ Setup complete!"
echo ""
echo "🧪 Testing endpoints:"
echo "Allocate database: curl -X POST http://localhost:8080/allocate -d '{\"dialect\":\"postgres\"}' -H 'Content-Type: application/json'"
echo "Check metrics: curl http://localhost:8080/metrics"
echo ""
echo "📊 To view logs: kubectl logs -f deployment/db-broker -n database"
echo "🛑 To stop port forwarding: kill $PORT_FORWARD_PID"
echo "🧹 To cleanup: helm uninstall sandboxed-db -n database && kubectl delete namespace database"
