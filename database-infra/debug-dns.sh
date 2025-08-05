#!/bin/bash

# DNS Debugging Script for Database Broker
set -e

NAMESPACE="database"

echo "🔍 DNS Debugging for Database Broker"
echo "====================================="

# Function to print colored output
print_status() {
    local color=$1
    local message=$2
    case $color in
        "red") echo -e "\033[0;31m${message}\033[0m" ;;
        "green") echo -e "\033[0;32m${message}\033[0m" ;;
        "yellow") echo -e "\033[1;33m${message}\033[0m" ;;
        "blue") echo -e "\033[0;34m${message}\033[0m" ;;
        *) echo "$message" ;;
    esac
}

# Check if namespace exists
print_status "blue" "📋 Checking namespace..."
if kubectl get namespace "$NAMESPACE" &>/dev/null; then
    print_status "green" "✅ Namespace '$NAMESPACE' exists"
else
    print_status "red" "❌ Namespace '$NAMESPACE' does not exist"
    exit 1
fi

# List all services in the namespace
print_status "blue" "📋 Listing services in namespace '$NAMESPACE'..."
kubectl get services -n "$NAMESPACE"

# List all pods in the namespace
print_status "blue" "📋 Listing pods in namespace '$NAMESPACE'..."
kubectl get pods -n "$NAMESPACE" -o wide

# Check the headless service
print_status "blue" "📋 Checking pg-sandbox service details..."
kubectl describe service pg-sandbox -n "$NAMESPACE" || print_status "red" "❌ pg-sandbox service not found"

# Check KEDA ScaledObject
print_status "blue" "📋 Checking KEDA ScaledObject..."
kubectl get scaledobject -n "$NAMESPACE" || print_status "yellow" "⚠️ No ScaledObjects found"

# Check deployment
print_status "blue" "📋 Checking pg-sandbox deployment..."
kubectl get deployment pg-sandbox -n "$NAMESPACE" -o wide || print_status "red" "❌ pg-sandbox deployment not found"

# Test DNS resolution from a test pod
print_status "blue" "📋 Testing DNS resolution..."

# Create a temporary test pod for DNS testing
TEST_POD_NAME="dns-test-$(date +%s)"
print_status "yellow" "🧪 Creating test pod: $TEST_POD_NAME"

kubectl run "$TEST_POD_NAME" -n "$NAMESPACE" --image=busybox --rm -it --restart=Never -- sh -c "
echo 'Testing DNS resolution...'
echo '========================='

# Test headless service resolution
echo '1. Testing headless service: pg-sandbox.$NAMESPACE.svc.cluster.local'
nslookup pg-sandbox.$NAMESPACE.svc.cluster.local || echo 'Failed to resolve headless service'

# List any existing postgres pods
echo
echo '2. Testing pod-specific DNS (if pods exist):'
for pod in \$(nslookup pg-sandbox.$NAMESPACE.svc.cluster.local 2>/dev/null | grep 'Address:' | grep -v '#53' | cut -d' ' -f2 | head -3); do
    echo \"Testing reverse lookup for IP: \$pod\"
    nslookup \$pod || echo \"Failed reverse lookup for \$pod\"
done

echo
echo '3. Testing connection to service port:'
nc -zv pg-sandbox.$NAMESPACE.svc.cluster.local 5432 || echo 'Port 5432 not reachable on service'

echo
echo 'DNS test completed!'
"

print_status "green" "✅ DNS debugging completed!"

echo
print_status "blue" "💡 Troubleshooting Tips:"
echo "1. Ensure the headless service (clusterIP: None) exists and selects the correct pods"
echo "2. Verify pods have the 'subdomain: pg-sandbox' field in their spec"
echo "3. Check that pod labels match the service selector"
echo "4. For pod-specific DNS to work: {podname}.{service}.{namespace}.svc.cluster.local"
echo "5. KEDA should scale the deployment, not create individual pods"

echo
print_status "blue" "🔧 Quick fixes to try:"
echo "kubectl apply -f templates/service/postgres.yaml"
echo "kubectl apply -f templates/deployment/postgres.yaml"
echo "kubectl scale deployment pg-sandbox -n $NAMESPACE --replicas=1"
