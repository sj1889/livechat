package server

import (
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

// AllRooms is the global hashmap for the server
var AllRooms RoomMap

func UserLogin(email string, password string) bool {
	return true
}

// Verify login credentials
func UserLoginHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	var credentials struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&credentials); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Check the user's credentials and set authenticated to true if valid
	Authenticated := UserLogin(credentials.Email, credentials.Password)
	fmt.Println("Authenticated: ", Authenticated)

	if Authenticated {
		response := struct {
			Authenticated bool `json:"authenticated"`
		}{
			Authenticated: true,
		}
		if err := json.NewEncoder(w).Encode(response); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
		}
	} else {
		response := struct {
			Authenticated bool `json:"authenticated"`
		}{
			Authenticated: false,
		}
		if err := json.NewEncoder(w).Encode(response); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
		}
	}
}

// CreateRoomRequestHandler Create a Room and return roomID
func CreateRoomRequestHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	roomID := AllRooms.CreateRoom()

	type resp struct {
		RoomID string `json:"roomID"`
	}
	json.NewEncoder(w).Encode(resp{RoomID: roomID})
}

func GenerateUserID(w http.ResponseWriter, r *http.Request) {
	type resp struct {
		UserID string `json:"userID"`
	}

	rand.Seed(time.Now().UnixNano())
	var letters = []rune("1234567890")
	b := make([]rune, 4)

	for i := range b {
		b[i] = letters[rand.Intn(len(letters))]
	}

	userID := string(b)
	json.NewEncoder(w).Encode(resp{UserID: userID})
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

type broadcastMsg struct {
	Message map[string]interface{}
	RoomID  string
	Client  *websocket.Conn
	Mutex   *sync.Mutex
}

var broadcast = make(chan broadcastMsg)

func broadcaster() {
	for {
		msg := <-broadcast

		for _, client := range AllRooms.Map[msg.RoomID] {
			x := msg.Client.UnderlyingConn()
			y := client.Conn.UnderlyingConn()
			if client.Conn != msg.Client {
				fmt.Println("From websocket: ", x)
				fmt.Println("Writing into websocket: ", y)
				msg.Mutex.Lock()
				err := client.Conn.WriteJSON(msg.Message)
				log.Println(err)
				if err != nil {
					log.Printf("Error sending message to client %s: %s\n", client.Conn.RemoteAddr(), err)
					client.Conn.Close()
					msg.Mutex.Unlock()
					continue
				}
				msg.Mutex.Unlock()
			}
		}
	}
}

// JoinRoomRequestHandler will join the client in a particular room
func JoinRoomRequestHandler(w http.ResponseWriter, r *http.Request) {
	roomID, ok1 := r.URL.Query()["roomID"]
	if !ok1 {
		log.Println("roomID missing in URL Parameters")
		return
	}

	UserID, ok2 := r.URL.Query()["userID"]
	if !ok2 {
		log.Println("roomID missing in URL Parameters")
		return
	}
	userID := UserID[0]

	ws, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Fatal("Web Socket Upgrade Error", err)
	}

	// defer ws.Close()

	mutex := &sync.Mutex{}
	AllRooms.InsertIntoRoom(roomID[0], userID, false, ws)

	go broadcaster()

	for {
		fmt.Println("running in the loop")
		var msg broadcastMsg

		err := ws.ReadJSON(&msg.Message)
		if err != nil {
			log.Println("Read Error: ", err)
			break
		}

		msg.Client = ws
		msg.RoomID = roomID[0]
		msg.Mutex = mutex
		log.Println("Message from ", ws.UnderlyingConn())
		log.Println(msg.Message)

		broadcast <- msg
	}
}

func RemoveUser(w http.ResponseWriter, r *http.Request) {
	roomID, ok1 := r.URL.Query()["roomID"]
	if !ok1 {
		log.Println("roomID missing in URL Parameters")
		return
	}

	UserID, ok2 := r.URL.Query()["userID"]
	if !ok2 {
		log.Println("roomID missing in URL Parameters")
		return
	}

	conn, err := AllRooms.GetUserConn(roomID[0], UserID[0])
	if err != nil {
		log.Println("User not found")
	}
	log.Println("Closing connection")
	conn.Close()
	log.Println("Closed connection")
	AllRooms.RemoveUser(roomID[0], UserID[0])
	log.Println("Members left: ", len(AllRooms.Map[roomID[0]]))

}
