#!/bin/bash

# Database Broker Allocate Endpoint Test Script
set -e

BASE_URL="http://localhost:8080"
TIMEOUT=30  # 30 second timeout for each test

echo "🧪 Testing Database Broker Allocate Endpoint"
echo "============================================="

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to test HTTP endpoint with timeout
test_endpoint() {
    local method=$1
    local url=$2
    local data=$3
    local expected_status=$4
    local description=$5
    
    print_status $BLUE "📝 ${description}..."
    
    # Use timeout command to limit curl execution time
    local response
    local http_status
    
    if [ -n "$data" ]; then
        response=$(timeout $TIMEOUT curl -s -w "\n%{http_code}" -X $method "$url" \
            -H "Content-Type: application/json" \
            -d "$data" 2>/dev/null || echo "TIMEOUT")
    else
        response=$(timeout $TIMEOUT curl -s -w "\n%{http_code}" -X $method "$url" 2>/dev/null || echo "TIMEOUT")
    fi
    
    if [ "$response" == "TIMEOUT" ]; then
        print_status $RED "❌ Request timed out after ${TIMEOUT} seconds"
        return 1
    fi
    
    # Split response and status code
    local body=$(echo "$response" | head -n -1)
    http_status=$(echo "$response" | tail -n 1)
    
    echo "   Response: $body"
    echo "   HTTP Status: $http_status"
    
    if [ "$http_status" == "$expected_status" ]; then
        print_status $GREEN "✅ Test passed!"
        echo "$body"  # Return the response body for further processing
        return 0
    else
        print_status $RED "❌ Expected status $expected_status, got $http_status"
        return 1
    fi
}

# Function to check if service is accessible
check_service() {
    print_status $BLUE "🔍 Checking if database broker service is accessible..."
    
    if timeout 5 curl -s "$BASE_URL/metrics" > /dev/null 2>&1; then
        print_status $GREEN "✅ Service is accessible"
        return 0
    else
        print_status $RED "❌ Service is not accessible at $BASE_URL"
        print_status $YELLOW "💡 Make sure to run: kubectl port-forward -n database service/db-broker 8080:8080"
        return 1
    fi
}

# Function to cleanup allocated resources
cleanup_pod() {
    local pod_name=$1
    if [ -n "$pod_name" ]; then
        print_status $YELLOW "🧹 Cleaning up pod: $pod_name"
        test_endpoint "DELETE" "$BASE_URL/release?pod=$pod_name" "" "200" "Releasing pod $pod_name"
    fi
}

# Trap to cleanup on exit
trap 'cleanup_pod $ALLOCATED_POD' EXIT

# Check if service is accessible
if ! check_service; then
    exit 1
fi

echo ""

# Test 1: Valid PostgreSQL allocation
print_status $BLUE "============================================="
print_status $BLUE "Test 1: Valid PostgreSQL Allocation"
print_status $BLUE "============================================="

ALLOCATION_RESPONSE=$(test_endpoint "POST" "$BASE_URL/allocate" '{"dialect":"postgres"}' "200" "Allocating PostgreSQL database")

if [ $? -eq 0 ]; then
    # Extract pod name and connection string
    ALLOCATED_POD=$(echo "$ALLOCATION_RESPONSE" | jq -r '.pod_name' 2>/dev/null || echo "")
    CONN_STRING=$(echo "$ALLOCATION_RESPONSE" | jq -r '.connectionString' 2>/dev/null || echo "")
    
    if [ -n "$ALLOCATED_POD" ] && [ "$ALLOCATED_POD" != "null" ]; then
        print_status $GREEN "📊 Pod allocated: $ALLOCATED_POD"
        print_status $GREEN "🔗 Connection string: $CONN_STRING"
    else
        print_status $RED "❌ Failed to extract pod name from response"
    fi
fi

echo ""

# Test 2: Invalid dialect
print_status $BLUE "============================================="
print_status $BLUE "Test 2: Invalid Dialect (should fail)"
print_status $BLUE "============================================="

test_endpoint "POST" "$BASE_URL/allocate" '{"dialect":"mysql"}' "400" "Allocating with unsupported dialect"

echo ""

# Test 3: Missing dialect
print_status $BLUE "============================================="
print_status $BLUE "Test 3: Missing Dialect (should fail)"
print_status $BLUE "============================================="

test_endpoint "POST" "$BASE_URL/allocate" '{}' "400" "Allocating without dialect"

echo ""

# Test 4: Invalid JSON
print_status $BLUE "============================================="
print_status $BLUE "Test 4: Invalid JSON (should fail)"
print_status $BLUE "============================================="

test_endpoint "POST" "$BASE_URL/allocate" 'invalid json' "400" "Allocating with invalid JSON"

echo ""

# Test 5: Wrong HTTP method
print_status $BLUE "============================================="
print_status $BLUE "Test 5: Wrong HTTP Method (should fail)"
print_status $BLUE "============================================="

test_endpoint "GET" "$BASE_URL/allocate" "" "405" "Using GET instead of POST"

echo ""

# Test 6: Check metrics endpoint
print_status $BLUE "============================================="
print_status $BLUE "Test 6: Metrics Endpoint"
print_status $BLUE "============================================="

test_endpoint "GET" "$BASE_URL/metrics" "" "200" "Fetching metrics"

echo ""

# Test 7: Check pod status in Kubernetes
if [ -n "$ALLOCATED_POD" ] && [ "$ALLOCATED_POD" != "null" ]; then
    print_status $BLUE "============================================="
    print_status $BLUE "Test 7: Kubernetes Pod Status"
    print_status $BLUE "============================================="
    
    print_status $BLUE "🔍 Checking pod status in Kubernetes..."
    
    if timeout 10 kubectl get pod "$ALLOCATED_POD" -n database > /dev/null 2>&1; then
        pod_status=$(kubectl get pod "$ALLOCATED_POD" -n database -o jsonpath='{.status.phase}' 2>/dev/null || echo "Unknown")
        pod_labels=$(kubectl get pod "$ALLOCATED_POD" -n database -o jsonpath='{.metadata.labels}' 2>/dev/null || echo "{}")
        
        print_status $GREEN "✅ Pod exists in Kubernetes"
        print_status $GREEN "📊 Pod status: $pod_status"
        print_status $GREEN "🏷️  Pod labels: $pod_labels"
        
        # Check if pod is marked as busy
        if echo "$pod_labels" | grep -q '"state":"busy"'; then
            print_status $GREEN "✅ Pod is correctly marked as busy"
        else
            print_status $YELLOW "⚠️  Pod state might not be correctly set"
        fi
    else
        print_status $RED "❌ Pod not found in Kubernetes"
    fi
fi

echo ""

# Test 8: Release pod (if we have one)
if [ -n "$ALLOCATED_POD" ] && [ "$ALLOCATED_POD" != "null" ]; then
    print_status $BLUE "============================================="
    print_status $BLUE "Test 8: Pod Release"
    print_status $BLUE "============================================="
    
    test_endpoint "DELETE" "$BASE_URL/release?pod=$ALLOCATED_POD" "" "200" "Releasing allocated pod"
    
    # Clear the allocated pod so the trap doesn't try to clean it up again
    ALLOCATED_POD=""
    
    # Wait a moment and check if pod is actually deleted
    print_status $BLUE "🔍 Verifying pod deletion..."
    sleep 3
    
    if timeout 10 kubectl get pod "$ALLOCATED_POD" -n database > /dev/null 2>&1; then
        print_status $YELLOW "⚠️  Pod still exists (may take time to delete)"
    else
        print_status $GREEN "✅ Pod successfully deleted"
    fi
fi

echo ""
print_status $GREEN "🎉 All tests completed!"
print_status $BLUE "💡 Tips:"
print_status $BLUE "   - Check logs with: kubectl logs -f deployment/db-broker -n database"
print_status $BLUE "   - Monitor pods with: kubectl get pods -n database -w"
print_status $BLUE "   - View metrics at: $BASE_URL/metrics"
