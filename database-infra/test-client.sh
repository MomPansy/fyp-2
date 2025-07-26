#!/bin/bash

# Database Broker Test Client
set -e

BASE_URL="http://localhost:8080"

echo "🧪 Testing Database Broker API"
echo "================================"

# Test 1: Allocate a PostgreSQL database
echo "📝 Test 1: Allocating PostgreSQL database..."
RESPONSE=$(curl -s -X POST "$BASE_URL/allocate" \
  -H "Content-Type: application/json" \
  -d '{"dialect":"postgres"}')

echo "Response: $RESPONSE"

if [[ $RESPONSE == *"connectionString"* ]]; then
    echo "✅ Allocation successful!"
    
    # Extract connection details
    CONN_STRING=$(echo $RESPONSE | jq -r '.connectionString')
    POD_NAME=$(echo $RESPONSE | jq -r '.pod_name')
    
    echo "📊 Connection String: $CONN_STRING"
    echo "🏷️  Pod Name: $POD_NAME"
    
    # Test 2: Verify database connection
    echo ""
    echo "📝 Test 2: Testing database connection..."
    
    # Extract connection details for psql
    if command -v psql &> /dev/null; then
        echo "🔌 Testing connection with psql..."
        
        # Convert connection string to psql format
        # Extract details from postgres://sandbox:password@host:port/db
        HOST=$(echo $CONN_STRING | sed -n 's/.*@\([^:]*\):.*/\1/p')
        PORT=$(echo $CONN_STRING | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
        DB=$(echo $CONN_STRING | sed -n 's/.*\/\([^?]*\).*/\1/p')
        
        # Port forward to the specific pod for testing
        echo "🌐 Setting up port forward to pod $POD_NAME..."
        kubectl port-forward -n database pod/$POD_NAME 5433:5432 &
        PG_PORT_FORWARD_PID=$!
        
        # Wait a moment for port forward to establish
        sleep 3
        
        # Test connection
        if PGPASSWORD=password psql -h localhost -p 5433 -U admin -d default_db -c "SELECT 1;" &> /dev/null; then
            echo "✅ Database connection successful!"
            
            # Run a simple test query
            echo "📋 Running test queries..."
            PGPASSWORD=password psql -h localhost -p 5433 -U admin -d default_db << EOF
CREATE TABLE test_table (id SERIAL PRIMARY KEY, message TEXT);
INSERT INTO test_table (message) VALUES ('Hello from Minikube!');
SELECT * FROM test_table;
DROP TABLE test_table;
EOF
            echo "✅ Test queries completed successfully!"
        else
            echo "❌ Database connection failed"
        fi
        
        # Cleanup port forward
        kill $PG_PORT_FORWARD_PID 2>/dev/null || true
    else
        echo "⚠️  psql not found, skipping connection test"
    fi
    
    # Test 3: Check metrics
    echo ""
    echo "📝 Test 3: Checking metrics..."
    METRICS=$(curl -s "$BASE_URL/metrics")
    if [[ $METRICS == *"sandbox_databases_free"* ]]; then
        echo "✅ Metrics endpoint working!"
        echo "📊 Free databases metric found"
    else
        echo "❌ Metrics endpoint not working properly"
    fi
    
    # Test 4: Release the database
    echo ""
    echo "📝 Test 4: Releasing database..."
    RELEASE_RESPONSE=$(curl -s -X POST "$BASE_URL/release?pod=$POD_NAME")
    echo "✅ Release request sent for pod: $POD_NAME"
    
else
    echo "❌ Allocation failed!"
    echo "Response: $RESPONSE"
fi

echo ""
echo "🏁 Testing completed!"
echo ""
echo "🔍 Additional debugging commands:"
echo "  kubectl get pods -n database"
echo "  kubectl logs -f deployment/db-broker -n database"
echo "  kubectl describe pod <pod-name> -n database"
