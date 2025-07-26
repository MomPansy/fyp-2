# Database Broker Testing & Debugging

## Issues Found and Fixed

### 1. Input Validation Issues ❌➡️✅

**Problem**: The `/allocate` endpoint had no input validation:

- JSON decoding errors were ignored (`_ = json.NewDecoder(r.Body).Decode(&req)`)
- Empty dialect parameter was accepted
- Invalid dialects were processed without validation
- No HTTP method validation

**Fix**: Added comprehensive validation:

```go
// Method validation
if r.Method != http.MethodPost {
    http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
    return
}

// JSON validation
if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
    http.Error(w, fmt.Sprintf("Invalid JSON: %v", err), http.StatusBadRequest)
    return
}

// Dialect validation
if req.Dialect == "" {
    http.Error(w, "Dialect field is required", http.StatusBadRequest)
    return
}

if req.Dialect != "postgres" {
    http.Error(w, fmt.Sprintf("Unsupported dialect: %s. Currently only 'postgres' is supported", req.Dialect), http.StatusBadRequest)
    return
}
```

### 2. Username Inconsistency ❌➡️✅

**Problem**: Connection string used `admin` username but tests expected `sandbox`

```go
// Old (inconsistent)
postgres://admin:password@...
// But tests used: psql -U sandbox
```

**Fix**: Standardized on `admin` username throughout:

- Updated connection string generation to consistently use `admin`
- Updated test scripts to use `admin` instead of `sandbox`

### 3. Poor Error Handling ❌➡️✅

**Problem**:

- `/release` endpoint ignored deletion errors
- No logging for important operations
- Generic error responses

**Fix**: Added proper error handling and logging:

```go
log.Printf("Releasing pod: %s", pod)
err := cs.CoreV1().Pods(ns).Delete(context.TODO(), pod, metav1.DeleteOptions{})
if err != nil {
    log.Printf("Failed to delete pod %s: %v", pod, err)
    http.Error(w, fmt.Sprintf("Failed to delete pod: %v", err), http.StatusInternalServerError)
    return
}
```

### 4. Missing Request Validation ❌➡️✅

**Problem**: `/release` endpoint didn't validate the required `pod` parameter

**Fix**: Added parameter validation:

```go
pod := r.URL.Query().Get("pod")
if pod == "" {
    http.Error(w, "Pod parameter is required", http.StatusBadRequest)
    return
}
```

## Testing Strategy

### Automated Tests (`test-allocate-endpoint.go`)

Comprehensive test suite covering:

1. **Valid requests** - Ensure normal operation works
2. **Invalid dialect** - Test unsupported database types
3. **Empty requests** - Test missing request body
4. **Invalid JSON** - Test malformed JSON handling
5. **Missing fields** - Test required field validation
6. **Concurrent requests** - Test race conditions
7. **Metrics endpoint** - Verify monitoring works

### Test Scripts

1. **`test-comprehensive.sh`** - New comprehensive testing script
   - Checks server availability
   - Runs Go tests if available
   - Falls back to curl tests
   - Shows debugging information

2. **`test-client.sh`** - Updated existing script
   - Fixed username inconsistency
   - Tests full allocation/connection/release flow

## Running Tests

### Quick Test

```bash
cd database-infra
./test-comprehensive.sh
```

### Full Integration Test

```bash
cd database-infra
./test-minikube.sh  # Setup Minikube environment
./test-client.sh    # Test full workflow
```

### Manual Testing

```bash
# Test valid allocation
curl -X POST http://localhost:8080/allocate \
  -H "Content-Type: application/json" \
  -d '{"dialect":"postgres"}'

# Test invalid dialect
curl -X POST http://localhost:8080/allocate \
  -H "Content-Type: application/json" \
  -d '{"dialect":"mysql"}'

# Test empty request
curl -X POST http://localhost:8080/allocate \
  -H "Content-Type: application/json" \
  -d '{}'

# Check metrics
curl http://localhost:8080/metrics

# Release a pod
curl -X POST "http://localhost:8080/release?pod=POD_NAME"
```

## Debugging Commands

```bash
# Check pod status
kubectl get pods -n database

# Check server logs
kubectl logs -f deployment/db-broker -n database

# Describe a specific pod
kubectl describe pod <pod-name> -n database

# Check service endpoints
kubectl get endpoints -n database

# Port forward for local testing
kubectl port-forward -n database service/db-broker 8080:8080
```

## Security Considerations

⚠️ **Current limitations to address in production:**

1. **Hard-coded credentials** - Use Kubernetes secrets
2. **No authentication** - Add proper API authentication
3. **No rate limiting** - Prevent resource exhaustion
4. **No request size limits** - Prevent large payload attacks
5. **Cluster-wide permissions** - Use more restrictive RBAC

## Next Steps

1. Add support for additional database dialects (MySQL, MongoDB, etc.)
2. Implement proper authentication and authorization
3. Add request rate limiting
4. Implement resource quotas and limits
5. Add health check endpoints
6. Implement graceful shutdown
7. Add structured logging with different log levels
8. Add request tracing and correlation IDs
