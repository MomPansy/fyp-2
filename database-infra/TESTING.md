# Testing Database Broker on Minikube

This guide helps you test the Kubernetes database broker service on Minikube.

## Prerequisites

1. **Minikube**: Install and start Minikube

   ```bash
   minikube start
   ```

2. **kubectl**: Ensure kubectl is configured to work with your Minikube cluster

3. **Helm**: Install Helm 3.x

   ```bash
   # macOS with Homebrew
   brew install helm
   ```

4. **Docker**: Required for building the container image

5. **psql** (optional): For testing database connections
   ```bash
   # macOS with Homebrew
   brew install postgresql
   ```

## Quick Start

### 1. Automated Setup

Run the automated setup script:

```bash
cd database-infra
./test-minikube.sh
```

This script will:

- Build the database broker Docker image in Minikube
- Create the necessary namespace and RBAC permissions
- Deploy the application using Helm
- Set up port forwarding for testing

### 2. Test the API

After setup is complete, test the broker API:

```bash
./test-client.sh
```

## Manual Testing Steps

### 1. Build and Deploy

```bash
# Configure Docker to use Minikube's Docker daemon
eval $(minikube docker-env)

# Build the database broker image
cd server
docker build -t db-broker:latest .
cd ..

# Create namespace
kubectl create namespace database

# Create ServiceAccount and RBAC
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

# Deploy with Helm
helm upgrade --install sandboxed-db . \
  --namespace database \
  --set image=db-broker:latest \
  --set serviceAccount.create=false \
  --set serviceAccount.name=db-broker
```

### 2. Port Forward for Testing

```bash
kubectl port-forward -n database service/db-broker 8080:8080
```

### 3. Test API Endpoints

**Allocate a database:**

```bash
curl -X POST http://localhost:8080/allocate \
  -H "Content-Type: application/json" \
  -d '{"dialect":"postgres"}'
```

**Check metrics:**

```bash
curl http://localhost:8080/metrics
```

**Release a database:**

```bash
curl -X POST http://localhost:8080/release?pod=<POD_NAME>
```

### 4. Monitor and Debug

**Check pods:**

```bash
kubectl get pods -n database
```

**View logs:**

```bash
kubectl logs -f deployment/db-broker -n database
```

**Describe a pod:**

```bash
kubectl describe pod <pod-name> -n database
```

**Check deployments:**

```bash
kubectl get deployments -n database
```

## Test Scenarios

### 1. Basic Allocation Test

- Request a PostgreSQL database
- Verify the response contains connection string and pod name
- Check that a new pod is created

### 2. Connection Test

- Use the returned connection string to connect to the database
- Run simple SQL queries
- Verify database functionality

### 3. Scaling Test

- Request multiple databases
- Verify that the deployment scales up automatically
- Check metrics for free database count

### 4. Release Test

- Release an allocated database
- Verify the pod is deleted
- Check that metrics are updated

## Troubleshooting

### Common Issues

1. **Image not found**: Make sure you're using Minikube's Docker daemon

   ```bash
   eval $(minikube docker-env)
   ```

2. **RBAC permissions**: Ensure the ServiceAccount has proper permissions

   ```bash
   kubectl describe clusterrolebinding db-broker
   ```

3. **Port forwarding issues**: Check if the service is running

   ```bash
   kubectl get svc -n database
   ```

4. **Pod creation timeout**: Check deployment status
   ```bash
   kubectl describe deployment pg-sandbox -n database
   ```

### Logs and Debugging

**Database broker logs:**

```bash
kubectl logs -f deployment/db-broker -n database
```

**PostgreSQL pod logs:**

```bash
kubectl logs <postgres-pod-name> -n database
```

**Events:**

```bash
kubectl get events -n database --sort-by='.lastTimestamp'
```

## Cleanup

```bash
# Remove the Helm deployment
helm uninstall sandboxed-db -n database

# Delete the namespace
kubectl delete namespace database

# Delete RBAC resources
kubectl delete clusterrole db-broker
kubectl delete clusterrolebinding db-broker
```

## Architecture

The database broker service:

1. Manages PostgreSQL database instances as Kubernetes pods
2. Automatically scales deployments based on demand
3. Provides REST API for allocation and release
4. Exposes Prometheus metrics for monitoring
5. Uses headless services for direct pod access

The system creates ephemeral database instances that can be quickly allocated and released for development and testing purposes.
