var app = require('express').createServer();
app.listen(8000);


//SERVER
var WebSocketServer = require('ws').Server


// Used for callback publish and subscribe
if(typeof rtc === "undefined")
  var rtc = {};

//Array to store connections
var sockets = [];

var room = []

var listen = function(server)
{
  if(typeof server === 'number')
    var options = {port: server};
  else
    var options = {server: server};

  var manager = new WebSocketServer({server: server});

  manager.rtc = rtc;
  attachEvents(manager);

  return manager;
};

function attachEvents(manager)
{
  manager.on('connection', function(socket)
  {
    socket.onmessage = function(msg)
    {
      var json = JSON.parse(msg.data);

      var soc = rtc.getSocket(json.data.socketId);
      if(soc)
      {
	    switch(json.eventName)
	    {
		  //Receive ICE candidates and send to the correct socket
		  case'send_ice_candidate':
		    msg = {"eventName": "receive_ice_candidate",
		           "data": {"label": json.data.label,
		                    "candidate": json.data.candidate,
		                    "socketId": socket.id
		                    }
		           }
		  break

		  //Receive offer and send to correct socket
		  case 'send_offer':
		    msg = {"eventName": "receive_offer",
		           "data": {"sdp": json.data.sdp,
		                    "socketId": socket.id
		                    }
		           }
		  break

		  //Receive answer and send to correct socket
		  case 'send_answer':
		    msg = {"eventName": "receive_answer",
		           "data": {"sdp": json.data.sdp,
		                    "socketId": socket.id
		                    }
		           }
		  break

          default:
            return
	    }

        console.log(json.eventName);

        soc.send(JSON.stringify(msg), function(error)
        {
          if(error)
            console.log(error);
        });
	  }
    }

    socket.onclose = function()
    {
      console.log('close');

      // remove socket
      sockets.splice(sockets.indexOf(socket), 1);

      // remove from room and send remove_peer_connected to all sockets in room
      var index = room.indexOf(socket.id);
      if(index !== -1)
      {
        room.splice(index, 1);

        for(var j = 0; j < room.length; j++)
        {
          console.log(room[j]);

          var soc = rtc.getSocket(room[j]);
          soc.send(JSON.stringify(
          {
            "eventName": "remove_peer_connected",
            "data":
            {
              "socketId": socket.id
            }
          }), function(error)
          {
            if(error)
              console.log(error);
          });
        }
      }
    }

	// generate a 4 digit hex code randomly
	function S4()
	{
	  return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
	}

	// make a REALLY COMPLICATED AND RANDOM id, kudos to dennis
	function id()
	{
	  return S4()+S4() +"-"+ S4() +"-"+ S4() +"-"+ S4() +"-"+ S4()+S4()+S4();
	}

    socket.id = id();
    console.log('new socket got id: ' + socket.id);

    sockets.push(socket);

    // manages the built-in room functionality
    var connectionsId = [];

    room.push(socket.id);

    for(var i = 0; i < room.length; i++)
    {
      var id = room[i];

      if(id != socket.id)
      {
        connectionsId.push(id);
        var soc = rtc.getSocket(id);

        // inform the peers that they have a new peer
        if(soc)
          soc.send(JSON.stringify(
          {
            "eventName": "new_peer_connected",
            "data":
            {
              "socketId": socket.id
            }
          }), function(error)
          {
            if (error)
              console.log(error);
          });
      }
    }

    // send new peer a list of all prior peers
    socket.send(JSON.stringify(
    {
      "eventName": "get_peers",
      "data":
      {
        "connections": connectionsId
      }
    }), function(error)
    {
      if(error)
        console.log(error);
    });
  });
}

rtc.getSocket = function(id)
{
  for(var i = 0; i < sockets.length; i++)
  {
    var socket = sockets[i];
    if(id === socket.id)
      return socket;
  }
}


var webRTC = listen(app);


app.get('/', function(req, res) {
  res.sendfile(__dirname + '/index.html');
});

app.get('/style.css', function(req, res) {
  res.sendfile(__dirname + '/style.css');
});

app.get('/webrtc.io.js', function(req, res) {
  res.sendfile(__dirname + '/webrtc.io.js');
});

app.get('/datachannel.js', function(req, res) {
  res.sendfile(__dirname + '/datachannel.js');
});

app.get('/client.js', function(req, res) {
  res.sendfile(__dirname + '/client.js');
});