package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"
)

// Mock server for testing the database broker API locally
// This simulates the behavior without requiring Kubernetes

type AllocateReq struct {
	Dialect string `json:"dialect"`
}

type AllocateResp struct {
	Conn string `json:"connectionString"`
	Pod  string `json:"pod_name"`
}

func main() {
	fmt.Println("🤖 Starting Mock Database Broker Server")
	fmt.Println("=======================================")
	fmt.Println("This is a mock server for testing API endpoints locally")
	fmt.Println("Real server requires Kubernetes cluster")
	fmt.Println()

	http.HandleFunc("/allocate", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		var req AllocateReq
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, fmt.Sprintf("Invalid JSON: %v", err), http.StatusBadRequest)
			return
		}

		// Validate dialect
		if req.Dialect == "" {
			http.Error(w, "Dialect field is required", http.StatusBadRequest)
			return
		}

		// For now, only support postgres
		if req.Dialect != "postgres" {
			http.Error(w, fmt.Sprintf("Unsupported dialect: %s. Currently only 'postgres' is supported", req.Dialect), http.StatusBadRequest)
			return
		}

		// Simulate pod allocation
		podName := fmt.Sprintf("mock-postgres-pod-%d", time.Now().Unix())
		conn := fmt.Sprintf("postgres://admin:password@%s.pg-sandbox.database.svc.cluster.local:5432/default_db?sslmode=disable", podName)

		log.Printf("Mock: Allocated pod %s for dialect %s", podName, req.Dialect)
		json.NewEncoder(w).Encode(AllocateResp{Conn: conn, Pod: podName})
	})

	http.HandleFunc("/release", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost && r.Method != http.MethodDelete {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		pod := r.URL.Query().Get("pod")
		if pod == "" {
			http.Error(w, "Pod parameter is required", http.StatusBadRequest)
			return
		}

		log.Printf("Mock: Released pod %s", pod)
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{"status": "released", "pod": pod})
	})

	http.HandleFunc("/metrics", func(w http.ResponseWriter, r *http.Request) {
		metrics := `# HELP sandbox_databases_free Free DB sandboxes
# TYPE sandbox_databases_free gauge
sandbox_databases_free{dialect="postgres"} 3
`
		w.Header().Set("Content-Type", "text/plain")
		w.Write([]byte(metrics))
	})

	fmt.Println("🚀 Mock server starting on :8080")
	fmt.Println("Available endpoints:")
	fmt.Println("  POST   /allocate")
	fmt.Println("  POST   /release")
	fmt.Println("  GET    /metrics")
	fmt.Println()
	log.Fatal(http.ListenAndServe(":8080", nil))
}
