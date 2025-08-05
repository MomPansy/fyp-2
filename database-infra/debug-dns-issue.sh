#!/bin/bash

echo "=== Checking current state of database namespace ==="
echo
echo "1. Checking if namespace exists:"
kubectl get namespace database

echo
echo "2. Checking deployments in database namespace:"
kubectl get deployments -n database

echo
echo "3. Checking services in database namespace:"
kubectl get services -n database

echo
echo "4. Checking pods in database namespace:"
kubectl get pods -n database -o wide

echo
echo "5. Checking pg-sandbox service details (if exists):"
kubectl describe service pg-sandbox -n database

echo
echo "6. Checking pg-sandbox deployment details (if exists):"
kubectl describe deployment pg-sandbox -n database

echo
echo "7. Checking if any pods have the correct labels:"
kubectl get pods -n database --show-labels

echo
echo "8. Checking KEDA ScaledObject:"
kubectl get scaledobjects -n database

echo
echo "9. Checking if pg-sandbox headless service selector matches pod labels:"
kubectl get service pg-sandbox -n database -o yaml 2>/dev/null | grep -A 10 selector || echo "pg-sandbox service not found"

echo
echo "10. Testing DNS resolution from a test pod (if possible):"
kubectl run dns-test --image=busybox --rm -it --restart=Never -n database -- nslookup pg-sandbox.database.svc.cluster.local || echo "Could not create test pod"

echo
echo "=== End of DNS debugging ==="
