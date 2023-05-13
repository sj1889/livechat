package server

import (
	"errors"
	"math/rand"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

// Participant describes a single entity in the hashmap
type Participant struct {
	userID string
	Host   bool
	Conn   *websocket.Conn
}

// RoomMap is the main hashmap [roomID string] -> [[]Participant]
type RoomMap struct {
	Mutex sync.RWMutex
	Map   map[string][]Participant
}

// Init initialises the RoomMap struct
func (r *RoomMap) Init() {
	r.Map = make(map[string][]Participant)
}

// Get will return the array of participants in the room
func (r *RoomMap) Get(roomID string) []Participant {
	r.Mutex.RLock()
	defer r.Mutex.RUnlock()

	return r.Map[roomID]
}

func (r *RoomMap) GetUserConn(roomID string, userID string) (*websocket.Conn, error) {
	r.Mutex.Lock()
	defer r.Mutex.Unlock()
	if participants, ok := r.Map[roomID]; ok {
		for i, p := range participants {
			if p.userID == userID {
				r.Map[roomID] = append(participants[:i], participants[i+1:]...)
				return p.Conn, nil
			}
		}
	}
	return nil, errors.New("participant not found")
}

// CreateRoom generate a unique room ID and return it -> insert it in the hashmap
func (r *RoomMap) CreateRoom() string {
	r.Mutex.Lock()
	defer r.Mutex.Unlock()

	rand.Seed(time.Now().UnixNano())
	var letters = []rune("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890")
	b := make([]rune, 8)

	for i := range b {
		b[i] = letters[rand.Intn(len(letters))]
	}

	roomID := string(b)
	r.Map[roomID] = []Participant{}

	return roomID
}

// InsertIntoRoom will create a participant and add it in the hashmap
func (r *RoomMap) InsertIntoRoom(roomID string, userID string, host bool, conn *websocket.Conn) {
	r.Mutex.Lock()
	defer r.Mutex.Unlock()

	p := Participant{userID, host, conn}
	r.Map[roomID] = append(r.Map[roomID], p)
}

func (r *RoomMap) RemoveUser(roomID string, userID string) {
	r.Mutex.Lock()
	defer r.Mutex.Unlock()
	if participants, ok := r.Map[roomID]; ok {
		for i, p := range participants {
			if p.userID == userID {
				r.Map[roomID] = append(participants[:i], participants[i+1:]...)
				break
			}
		}
	}
}

// DeleteRoom deletes the room with the roomID
func (r *RoomMap) DeleteRoom(roomID string) {
	r.Mutex.Lock()
	defer r.Mutex.Unlock()

	delete(r.Map, roomID)
}
