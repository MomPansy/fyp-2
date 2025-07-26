#!/bin/bash

# Quick test for allocate endpoint
set -e

BASE_URL="http://localhost:8080"
TIMEOUT=15

echo "🚀 Quick Allocate Endpoint Test"
echo "==============================="

# Check if service is accessible
echo "🔍 Checking service accessibility..."
if ! timeout 5 curl -s "$BASE_URL/metrics" > /dev/null 2>&1; then
    echo "❌ Service not accessible. Run: kubectl port-forward -n database service/db-broker 8080:8080"
    exit 1
fi
echo "✅ Service is accessible"

# Test allocation
echo ""
echo "📝 Testing PostgreSQL allocation..."
response=$(timeout $TIMEOUT curl -s -X POST "$BASE_URL/allocate" \
    -H "Content-Type: application/json" \
    -d '{"dialect":"postgres"}' 2>/dev/null || echo "TIMEOUT")

if [ "$response" == "TIMEOUT" ]; then
    echo "❌ Request timed out after ${TIMEOUT} seconds"
    exit 1
fi

echo "Response: $response"

# Parse response
if echo "$response" | jq . > /dev/null 2>&1; then
    pod_name=$(echo "$response" | jq -r '.pod_name')
    conn_string=$(echo "$response" | jq -r '.connectionString')
    
    if [ "$pod_name" != "null" ] && [ -n "$pod_name" ]; then
        echo "✅ Allocation successful!"
        echo "📊 Pod: $pod_name"
        echo "🔗 Connection: $conn_string"
        
        # Verify pod exists in k8s
        echo ""
        echo "🔍 Verifying pod in Kubernetes..."
        if kubectl get pod "$pod_name" -n database > /dev/null 2>&1; then
            status=$(kubectl get pod "$pod_name" -n database -o jsonpath='{.status.phase}')
            labels=$(kubectl get pod "$pod_name" -n database -o jsonpath='{.metadata.labels.state}')
            echo "✅ Pod found - Status: $status, State: $labels"
        else
            echo "❌ Pod not found in Kubernetes"
        fi
        
        # Cleanup
        echo ""
        echo "🧹 Cleaning up..."
        cleanup_response=$(timeout 10 curl -s -X DELETE "$BASE_URL/release?pod=$pod_name" 2>/dev/null || echo "TIMEOUT")
        if [ "$cleanup_response" != "TIMEOUT" ]; then
            echo "✅ Pod released successfully"
        else
            echo "⚠️  Cleanup timed out, you may need to manually delete pod: $pod_name"
        fi
    else
        echo "❌ No pod name in response"
        exit 1
    fi
else
    echo "❌ Invalid JSON response"
    exit 1
fi

echo ""
echo "🎉 Quick test completed successfully!"
