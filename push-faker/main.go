package main

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"sync"

	"github.com/gorilla/websocket"
)

type message struct {
	MessageType  string            `json:"messageType"`
	UAID         string            `json:"uaid,omitempty"`
	ChannelID    string            `json:"channelID,omitempty"`
	Status       int               `json:"status,omitempty"`
	PushEndpoint string            `json:"pushEndpoint,omitempty"`
	UseWebPush   bool              `json:"use_webpush,omitempty"`
	Version      string            `json:"version,omitempty"`
	Headers      map[string]string `json:"headers,omitempty"`
	Data         string            `json:"data,omitempty"`
}

type delivery struct {
	ChannelID string `json:"channelID"`
	Bytes     int    `json:"bytes"`
	Encoding  string `json:"encoding"`
	Vapid     bool   `json:"vapid"`
	TTL       string `json:"ttl"`
	Status    int    `json:"status"`
}

type faker struct {
	host       string
	mutex      sync.Mutex
	channels   map[string]*websocket.Conn
	deliveries []delivery
	counter    int
}

func (f *faker) handleSocket(w http.ResponseWriter, r *http.Request) {
	upgrader := websocket.Upgrader{CheckOrigin: func(*http.Request) bool { return true }}
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("upgrade: %v", err)
		return
	}
	defer conn.Close()

	for {
		_, raw, err := conn.ReadMessage()
		if err != nil {
			return
		}
		var in message
		if err := json.Unmarshal(raw, &in); err != nil {
			continue
		}
		log.Printf("recv %s %s", in.MessageType, in.ChannelID)

		var out any
		switch in.MessageType {
		case "hello":
			uaid := in.UAID
			if uaid == "" {
				uaid = f.nextID("uaid")
			}
			out = message{MessageType: "hello", UAID: uaid, Status: 200, UseWebPush: true}
		case "register":
			f.mutex.Lock()
			f.channels[in.ChannelID] = conn
			f.mutex.Unlock()
			out = message{
				MessageType:  "register",
				ChannelID:    in.ChannelID,
				Status:       200,
				PushEndpoint: fmt.Sprintf("http://%s/push/%s", f.host, in.ChannelID),
			}
		case "unregister":
			f.mutex.Lock()
			delete(f.channels, in.ChannelID)
			f.mutex.Unlock()
			out = message{MessageType: "unregister", ChannelID: in.ChannelID, Status: 200}
		case "ack":
			continue
		default:
			out = map[string]any{}
		}
		if err := conn.WriteJSON(out); err != nil {
			return
		}
	}
}

func (f *faker) nextID(prefix string) string {
	f.mutex.Lock()
	defer f.mutex.Unlock()
	f.counter++
	return fmt.Sprintf("%s-%08d-0000-0000-0000-000000000000", prefix, f.counter)
}

func (f *faker) handlePush(w http.ResponseWriter, r *http.Request) {
	channelID := strings.TrimPrefix(r.URL.Path, "/push/")
	if channelID == "" || r.Method != http.MethodPost {
		w.WriteHeader(http.StatusNotFound)
		return
	}
	body, err := io.ReadAll(r.Body)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	encoding := r.Header.Get("Content-Encoding")
	if encoding == "" {
		encoding = "aes128gcm"
	}
	f.mutex.Lock()
	conn := f.channels[channelID]
	// A real push service answers 410 for a subscription the browser has dropped, which is what
	// tells the application server to forget it. Answering 201 for everything would hide that.
	status := http.StatusCreated
	if conn == nil {
		status = http.StatusGone
	}
	f.deliveries = append(f.deliveries, delivery{
		ChannelID: channelID,
		Bytes:     len(body),
		Encoding:  encoding,
		Vapid:     strings.HasPrefix(strings.ToLower(r.Header.Get("Authorization")), "vapid"),
		TTL:       r.Header.Get("TTL"),
		Status:    status,
	})
	f.mutex.Unlock()

	log.Printf("push %s %d bytes -> %d", channelID, len(body), status)

	if conn != nil {
		if err := conn.WriteJSON(message{
			MessageType: "notification",
			ChannelID:   channelID,
			Version:     f.nextID("version"),
			Headers:     map[string]string{"encoding": encoding},
			Data:        base64.RawURLEncoding.EncodeToString(body),
		}); err != nil {
			log.Printf("notify: %v", err)
		}
	}
	w.WriteHeader(status)
}

func (f *faker) handleDeliveries(w http.ResponseWriter, _ *http.Request) {
	f.mutex.Lock()
	defer f.mutex.Unlock()
	w.Header().Set("Content-Type", "application/json")
	if f.deliveries == nil {
		_, _ = w.Write([]byte("[]"))
		return
	}
	_ = json.NewEncoder(w).Encode(f.deliveries)
}

func main() {
	host := os.Getenv("PUSH_FAKER_HOST")
	if host == "" {
		log.Fatal("PUSH_FAKER_HOST is not set")
	}
	port := os.Getenv("PUSH_FAKER_PORT")
	if port == "" {
		log.Fatal("PUSH_FAKER_PORT is not set")
	}

	f := &faker{host: fmt.Sprintf("%s:%s", host, port), channels: make(map[string]*websocket.Conn)}

	mux := http.NewServeMux()
	mux.HandleFunc("/push/", f.handlePush)
	mux.HandleFunc("/deliveries", f.handleDeliveries)
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if websocket.IsWebSocketUpgrade(r) {
			f.handleSocket(w, r)
			return
		}
		w.WriteHeader(http.StatusOK)
	})

	log.Printf("push faker on %s", f.host)
	log.Fatal(http.ListenAndServe(":"+port, mux))
}
