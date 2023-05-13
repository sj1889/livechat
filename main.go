package main

import (
	"log"
	"net/http"
	"video-chat-app/server"
)

func main() {
	server.AllRooms.Init()

	// Add CORS middleware
	cors := func(handler http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Access-Control-Allow-Origin", "*")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusOK)
				return
			}
			handler.ServeHTTP(w, r)
		})
	}

	// Wrap the default ServeMux with the CORS middleware
	handler := cors(http.DefaultServeMux)

	http.HandleFunc("/login", server.UserLoginHandler)
	http.HandleFunc("/create", server.CreateRoomRequestHandler)
	http.HandleFunc("/join", server.JoinRoomRequestHandler)
	http.HandleFunc("/user", server.GenerateUserID)
	http.HandleFunc("/disconnect", server.RemoveUser)

	log.Println("Starting Server on Port 8000")
	err := http.ListenAndServe(":8000", handler)
	if err != nil {
		log.Fatal(err)
	}
}
