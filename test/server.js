var app = require('express').createServer();
    app.listen(8000);


app.get('/', function(req, res) {
  res.sendfile(__dirname + '/index.html');
});

app.get('/style.css', function(req, res) {
  res.sendfile(__dirname + '/style.css');
});

app.get('/datachannel.js', function(req, res) {
  res.sendfile(__dirname + '/datachannel.js');
});

app.get('/client.js', function(req, res) {
  res.sendfile(__dirname + '/client.js');
});


var WebSocketServer = require('ws').Server
var wss = new WebSocketServer({server: app});


//Array to store connections
var sockets = [];


wss.on('connection', function(socket)
{
  socket.onmessage = function(msg)
  {
    var json = JSON.parse(msg.data);

	function getSocket(id)
	{
	  for(var i = 0; i < sockets.length; i++)
	  {
	    var socket = sockets[i];
	    if(id === socket.id)
	      return socket;
	  }
	}

    var soc = getSocket(json.data.socketId);
    if(soc)
    {
	  switch(json.eventName)
	  {
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

    // remove socket and send remove_peer_connected to all other sockets
    sockets.splice(sockets.indexOf(socket), 1);

    for(var i = 0; i < sockets.length; i++)
    {
      var soc = sockets[i];

      console.log(soc.id);

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

  // Notify that there's a new peer connected and build a list of peers
  var connectionsId = [];

  for(var i = 0; i < sockets.length; i++)
  {
    var soc = sockets[i];

    connectionsId.push(soc.id);

    // inform the peers that they have a new peer
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

  sockets.push(socket);
});