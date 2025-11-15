package main

import (
	"encoding/json"
	"io/ioutil"
	"log"
	"net/http"
	"os"
)

func main() {
	saveToken := os.Getenv("SAVE_TOKEN")
	configFile := "/usr/share/nginx/html/data/config.json"

	http.HandleFunc("/api/save", func(w http.ResponseWriter, r *http.Request) {
               w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
               w.Header().Set("Access-Control-Allow-Headers", "Content-Type, X-Save-Token")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		if r.Method != "POST" {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		if saveToken == "" {
			log.Println("CRITICAL: SAVE_TOKEN is not configured. Refusing to save.")
			http.Error(w, "Server is not configured for saving", http.StatusInternalServerError)
			return
		}

		tokenFromHeader := r.Header.Get("X-Save-Token")
		if tokenFromHeader != saveToken {
			http.Error(w, "Invalid token", http.StatusUnauthorized)
			return
		}

		body, err := ioutil.ReadAll(r.Body)
		if err != nil {
			http.Error(w, "Error reading request body", http.StatusInternalServerError)
			return
		}
		defer r.Body.Close()

		var js map[string]interface{}
		if json.Unmarshal(body, &js) != nil {
			http.Error(w, "Invalid JSON format", http.StatusBadRequest)
			return
		}

		prettyBody, _ := json.MarshalIndent(js, "", "  ")
		err = ioutil.WriteFile(configFile, prettyBody, 0644)
		if err != nil {
			http.Error(w, "Error writing config file", http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusOK)
		w.Write([]byte("Configuration saved successfully."))
		log.Println("Configuration file saved successfully.")
	})

	log.Println("Starting config saver on port 8899...")
	if err := http.ListenAndServe(":8899", nil); err != nil {
		log.Fatal(err)
	}
}
