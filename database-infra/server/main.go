package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/fields"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
)

var (
	ns        = "database"
	freeGauge = prometheus.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "sandbox_databases_free", Help: "Number of free database sandboxes",
		},
		[]string{"dialect"},
	)
)

// Check if a pod is Ready
func isPodReady(p *corev1.Pod) bool {
	for _, cond := range p.Status.Conditions {
		if cond.Type == corev1.PodReady && cond.Status == corev1.ConditionTrue {
			return true
		}
	}
	return false
}

type AllocateReq struct {
	Dialect string `json:"dialect"`
}

type AllocateResp struct {
	Conn string `json:"connectionString"`
	Pod  string `json:"pod_name"`
}

func main() {
	config, err := rest.InClusterConfig()
	if err != nil {
		panic(err.Error())
	}
	cs, err := kubernetes.NewForConfig(config)
	if err != nil {
		panic(err.Error())
	}
	prometheus.MustRegister(freeGauge)
	// periodic metric refresh
	go func() {
		tick := time.NewTicker(15 * time.Second)
		for range tick.C {
			updateMetrics(cs)
		}
	}()

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

		// Validate supported dialects
		if req.Dialect != "postgres" && req.Dialect != "mysql" {
			http.Error(w, fmt.Sprintf("Unsupported dialect: %s. Supported dialects: 'postgres', 'mysql'", req.Dialect), http.StatusBadRequest)
			return
		}

		d := req.Dialect
		pod, err := grabOrCreatePod(cs, d)
		if err != nil {
			log.Printf("Failed to allocate pod for dialect %s: %v", d, err)
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		// Build connection string based on dialect
		var conn string
		switch d {
		case "postgres":
			conn = fmt.Sprintf(
				"postgres://admin:password@%s:5432/default_db?sslmode=disable",
				pod.Status.PodIP)
		case "mysql":
			conn = fmt.Sprintf(
				"mysql://admin:password@%s:3306/default_db",
				pod.Status.PodIP)
		}

		log.Printf("Successfully allocated pod %s for dialect %s", pod.Name, d)
		json.NewEncoder(w).Encode(AllocateResp{Conn: conn, Pod: pod.Name})
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

		log.Printf("Releasing pod: %s", pod)
		err := cs.CoreV1().Pods(ns).Delete(context.TODO(), pod, metav1.DeleteOptions{})
		if err != nil {
			log.Printf("Failed to delete pod %s: %v", pod, err)
			http.Error(w, fmt.Sprintf("Failed to delete pod: %v", err), http.StatusInternalServerError)
			return
		}

		log.Printf("Successfully released pod: %s", pod)
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{"status": "released", "pod": pod})
	})

	http.Handle("/metrics", promhttp.Handler())

	http.Handle("/healthz", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Simple health check that returns 200 OK
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	}))

	log.Fatal(http.ListenAndServe(":8080", nil))
}

func updateMetrics(cs *kubernetes.Clientset) {
	pods, err := cs.CoreV1().Pods(ns).List(context.TODO(), metav1.ListOptions{LabelSelector: "state=free"})
	if err != nil {
		log.Printf("Failed to list pods for metrics: %v", err)
		return
	}
	counts := map[string]int{}
	for _, p := range pods.Items {
		if !isPodReady(&p) {
			continue
		}
		d := p.Labels["dialect"]
		if d != "" {
			counts[d]++
		}
	}
	for d, v := range counts {
		freeGauge.WithLabelValues(d).Set(float64(v))
	}
}

func grabOrCreatePod(cs *kubernetes.Clientset, dialect string) (*corev1.Pod, error) {
	log.Printf("Looking for free pods with dialect=%s", dialect)
	// 1. look for a free pod that is Ready
	pods, err := cs.CoreV1().Pods(ns).List(context.TODO(), metav1.ListOptions{
		LabelSelector: fmt.Sprintf("dialect=%s,state=free", dialect),
		FieldSelector: fields.OneTermEqualSelector("status.phase", "Running").String(),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to list pods: %v", err)
	}
	log.Printf("Found %d free pods (pre-filter)", len(pods.Items))
	for _, p := range pods.Items {
		if !isPodReady(&p) {
			log.Printf("Pod %s is not Ready yet; skipping", p.Name)
			continue
		}
		chosen := p
		log.Printf("Attempting to mark pod %s as busy", chosen.Name)
		if err := markBusy(cs, &chosen); err == nil {
			log.Printf("Successfully marked pod %s as busy", chosen.Name)
			return &chosen, nil
		} else {
			log.Printf("Failed to mark pod %s as busy: %v", chosen.Name, err)
		}
	}

	// 2. scale deployment +1
	var depName string
	switch dialect {
	case "postgres":
		depName = "pg-sandbox"
	case "mysql":
		depName = "mysql-sandbox"
	default:
		return nil, fmt.Errorf("unsupported dialect: %s", dialect)
	}
	scale, err := cs.AppsV1().Deployments(ns).GetScale(context.TODO(), depName, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get deployment scale: %v", err)
	}
	scale.Spec.Replicas++
	_, err = cs.AppsV1().Deployments(ns).UpdateScale(context.TODO(), depName, scale, metav1.UpdateOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to scale deployment: %v", err)
	}

	// 3. wait for new Ready pod with timeout
	log.Printf("Scaling deployment %s and waiting for new Ready pod", depName)
	timeout := time.After(60 * time.Second)
	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			// Poll for free pods periodically
			pods, err := cs.CoreV1().Pods(ns).List(context.TODO(), metav1.ListOptions{
				LabelSelector: fmt.Sprintf("dialect=%s,state=free", dialect),
				FieldSelector: fields.OneTermEqualSelector("status.phase", "Running").String(),
			})
			if err != nil {
				log.Printf("Error listing pods: %v", err)
				continue
			}
			for _, p := range pods.Items {
				if !isPodReady(&p) {
					continue
				}
				chosen := p
				log.Printf("Found new Ready free pod %s, marking as busy", chosen.Name)
				if err := markBusy(cs, &chosen); err == nil {
					log.Printf("Successfully allocated pod %s", chosen.Name)
					return &chosen, nil
				} else {
					log.Printf("Failed to mark pod %s as busy: %v", chosen.Name, err)
				}
			}
		case <-timeout:
			return nil, fmt.Errorf("timed out waiting for a free pod")
		}
	}
}

func markBusy(cs *kubernetes.Clientset, p *corev1.Pod) error {
	log.Printf("Marking pod %s as busy", p.Name)

	// Use a simple JSON patch to update the label
	patchData := []byte(`{"metadata":{"labels":{"state":"busy"}}}`)

	_, err := cs.CoreV1().Pods(ns).Patch(
		context.TODO(),
		p.Name,
		types.MergePatchType,
		patchData,
		metav1.PatchOptions{},
	)

	if err != nil {
		log.Printf("Failed to patch pod %s: %v", p.Name, err)
	}

	return err
}
