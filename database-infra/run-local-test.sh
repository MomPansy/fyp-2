#!/bin/bash

# Script to run local testing of the database broker
set -e

echo "🚀 Starting Database Broker Local Test"
echo "======================================"

# Check if we're in the right directory
if [ ! -f "server/main.go" ]; then
    echo "❌ Error: Please run this script from the database-infra directory"
    exit 1
fi

# Function to cleanup background processes
cleanup() {
    echo "🧹 Cleaning up..."
    if [ ! -z "$SERVER_PID" ]; then
        kill $SERVER_PID 2>/dev/null || true
    fi
    # Kill any process using port 8080
    lsof -ti:8080 | xargs kill -9 2>/dev/null || true
}

# Set trap to cleanup on exit
trap cleanup EXIT

# Check if kubectl is available (for Kubernetes testing)
if command -v kubectl &> /dev/null && kubectl cluster-info &> /dev/null; then
    echo "✅ Kubernetes cluster available - trying real server"
    
    # Build the real server
    echo "📦 Building real server..."
    cd server
    go build -o ../db-broker main.go
    cd ..
    
    # Start the real server
    echo "🏃 Starting real server on port 8080..."
    ./db-broker &
    SERVER_PID=$!
    
    # Give server time to start
    sleep 3
    
    # Check if server is running
    if curl -s http://localhost:8080/metrics &> /dev/null; then
        echo "✅ Real server is running"
        USE_REAL_SERVER=true
    else
        echo "❌ Real server failed to start - falling back to mock"
        kill $SERVER_PID 2>/dev/null || true
        USE_REAL_SERVER=false
    fi
else
    echo "⚠️  No Kubernetes cluster available - using mock server"
    USE_REAL_SERVER=false
fi

# If real server didn't work, use mock server
if [ "$USE_REAL_SERVER" != true ]; then
    echo "🤖 Starting mock server for testing..."
    cd mock
    go run server.go &
    SERVER_PID=$!
    cd ..
    
    # Give mock server time to start
    sleep 2
    
    # Check if mock server is running
    if ! curl -s http://localhost:8080/metrics &> /dev/null; then
        echo "❌ Mock server failed to start"
        exit 1
    fi
    echo "✅ Mock server is running"
fi

# Run the tests
echo ""
echo "🧪 Running comprehensive tests..."
go run test-allocate-endpoint.go

echo ""
echo "✅ All tests completed!"
echo ""
if [ "$USE_REAL_SERVER" = true ]; then
    echo "📝 Tests ran against REAL Kubernetes server"
else
    echo "📝 Tests ran against MOCK server (no Kubernetes required)"
    echo "   To test with real Kubernetes, ensure kubectl is configured"
fi
