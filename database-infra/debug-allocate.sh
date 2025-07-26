#!/bin/bash

echo "🚀 Quick Database Broker Test"
echo "============================="

# Test with very short timeout to see if we get any response at all
echo "📝 Testing allocate endpoint with 5-second timeout..."

# Make the request in background and kill it after 5 seconds
curl -X POST http://localhost:8080/allocate \
     -H "Content-Type: application/json" \
     -d '{"dialect":"postgres"}' &
CURL_PID=$!

# Wait 5 seconds then kill the request
sleep 5
kill $CURL_PID 2>/dev/null

echo ""
echo "⏰ Request sent with 5-second timeout"

# Test a simpler endpoint - metrics should respond quickly
echo ""
echo "📊 Testing metrics endpoint..."
if curl -s --max-time 3 http://localhost:8080/metrics | head -3; then
    echo "✅ Metrics endpoint working"
else
    echo "❌ Metrics endpoint not responding"
fi

# Check if any pods changed state recently
echo ""
echo "🔍 Checking recent pod activities..."
kubectl get events -n database --sort-by='.lastTimestamp' | tail -5

echo ""
echo "🏷️  Current pod states:"
kubectl get pods -n database -l state=busy --no-headers | wc -l | awk '{print "Busy pods: " $1}'
kubectl get pods -n database -l state=free --no-headers | wc -l | awk '{print "Free pods: " $1}'
