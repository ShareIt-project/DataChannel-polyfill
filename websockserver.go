package main

import (
	"fmt"
	"net/http"
	"code.google.com/p/go.net/websocket"
	"strings"
)

// ===================
// C O N N E C T I O N
// ===================

type connection struct {
	// The websocket connection.
	ws *websocket.Conn

	id string

	peer *connection

	// Buffered channel of outbound messages.
	send chan string
}

var connections map[string]*connection = make(map[string]*connection)

func (c *connection) reader() {
	for {

		fmt.Println(len(connections))

		var message string
		err := websocket.Message.Receive(c.ws, &message)
		if err != nil {
			fmt.Println(err)
			break
		}

		fmt.Println("R: " + c.id + " : " + message)

		if len(message) > 7 && message[0:8] == "connect:" {
			 {
				connectParts := strings.Split(message, ":")
				if len(connectParts) == 3 {
					c.id = connectParts[1]
					connections[c.id] = c

					if _,ok := connections[connectParts[2]]; ok {
						c.peer = connections[connectParts[2]]
						connections[connectParts[2]].peer = c
					}
				}
			}
		} else if (c.peer != nil) {

			c.peer.send <- message

		}

	}
	c.send <- "disconnect" // Send disconnect to my own writer.
	delete(connections, c.id) // Remove myself from connection map.
	fmt.Println("R: Connection lost:" + c.id)
	c.ws.Close()
}

func (c *connection) writer() {
	for {
		message := <- c.send
		if message == "disconnect" {
			break;
		}
		fmt.Println("W: " + c.id + " : " + message)
		err := websocket.Message.Send(c.ws, message)
		if err != nil {
			break
		}
	}
	fmt.Println("W: Connection lost:" + c.id)
	c.ws.Close()
}

// =======
// M A I N
// =======

func wsHandler(ws *websocket.Conn) {
	fmt.Println("NEW WEBSOCKET!");
	fmt.Println(ws.Config())
	fmt.Println(ws.RemoteAddr())
	c := &connection{send: make(chan string, 256), ws: ws}
	go c.writer()
	c.reader()
}

func main() {
	http.Handle("/", websocket.Handler(wsHandler));
	http.ListenAndServe(":8000", nil)
}
