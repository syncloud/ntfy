package main

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/tls"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/base64"
	"encoding/json"
	"encoding/pem"
	"fmt"
	"io"
	"log"
	"math/big"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

func selfSigned(host string) (tls.Certificate, []byte, error) {
	key, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		return tls.Certificate{}, nil, err
	}
	template := x509.Certificate{
		SerialNumber:          big.NewInt(1),
		Subject:               pkix.Name{CommonName: host},
		DNSNames:              []string{host},
		NotBefore:             time.Now().Add(-time.Hour),
		NotAfter:              time.Now().Add(24 * time.Hour),
		KeyUsage:              x509.KeyUsageDigitalSignature | x509.KeyUsageCertSign,
		ExtKeyUsage:           []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth},
		BasicConstraintsValid: true,
		IsCA:                  true,
	}
	der, err := x509.CreateCertificate(rand.Reader, &template, &template, &key.PublicKey, key)
	if err != nil {
		return tls.Certificate{}, nil, err
	}
	return tls.Certificate{Certificate: [][]byte{der}, PrivateKey: key}, der, nil
}

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
				PushEndpoint: fmt.Sprintf("https://%s/push/%s", f.host, in.ChannelID),
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
	tlsPort := os.Getenv("PUSH_FAKER_TLS_PORT")
	if tlsPort == "" {
		log.Fatal("PUSH_FAKER_TLS_PORT is not set")
	}
	certFile := os.Getenv("PUSH_FAKER_CERT_FILE")
	if certFile == "" {
		log.Fatal("PUSH_FAKER_CERT_FILE is not set")
	}

	f := &faker{host: fmt.Sprintf("%s:%s", host, tlsPort), channels: make(map[string]*websocket.Conn)}

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

	certificate, der, err := selfSigned(host)
	if err != nil {
		log.Fatalf("certificate: %v", err)
	}
	pemBytes := pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: der})
	if err := os.WriteFile(certFile, pemBytes, 0644); err != nil {
		log.Fatalf("writing certificate: %v", err)
	}

	go func() {
		log.Printf("push faker socket on %s:%s", host, port)
		log.Fatal(http.ListenAndServe(":"+port, mux))
	}()

	log.Printf("push faker endpoint on https://%s", f.host)
	server := &http.Server{
		Addr:      ":" + tlsPort,
		Handler:   mux,
		TLSConfig: &tls.Config{Certificates: []tls.Certificate{certificate}},
	}
	log.Fatal(server.ListenAndServeTLS("", ""))
}
