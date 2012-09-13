var app = require('express').createServer();
app.listen(8000);


//SERVER
var WebSocketServer = require('ws').Server

var iolog = function() {};

for (var i = 0; i < process.argv.length; i++) {
  var arg = process.argv[i];
  if (arg === "-debug") {
    iolog = function(msg) {
      console.log(msg)
    }
    console.log('Debug mode on!');
  }
}


// Used for callback publish and subscribe
if (typeof rtc === "undefined") {
  var rtc = {};
}
//Array to store connections
rtc.sockets = [];

rtc.rooms = {};

// Holds callbacks for certain events.
rtc._events = {};

rtc.on = function(eventName, callback) {
  rtc._events[eventName] = rtc._events[eventName] || [];
  rtc._events[eventName].push(callback);
};

rtc.fire = function(eventName, _) {
  var events = rtc._events[eventName];
  var args = Array.prototype.slice.call(arguments, 1);

  if (!events) {
    return;
  }

  for (var i = 0, len = events.length; i < len; i++) {
    events[i].apply(null, args);
  }
};

var listen = function(server) {
  var manager;
  if (typeof server === 'number') { 
    manager = new WebSocketServer({
        port: server
      });
  } else {
    manager = new WebSocketServer({
      server: server
    });
  }

  manager.rtc = rtc;
  attachEvents(manager);
  return manager;
};

function attachEvents(manager)
{
  manager.on('connection', function(socket)
  {
    iolog('connect');

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
    iolog('new socket got id: ' + socket.id);

    rtc.sockets.push(socket);

    socket.on('message', function(msg)
    {
      var json = JSON.parse(msg);
      rtc.fire(json.eventName, json.data, socket);
    });

    socket.on('close', function()
    {
      iolog('close');

      // find socket to remove
      var i = rtc.sockets.indexOf(socket);
      // remove socket
      rtc.sockets.splice(i, 1);

      // remove from rooms and send remove_peer_connected to all sockets in room
      for (var key in rtc.rooms)
      {
        var room = rtc.rooms[key];
        var exist = room.indexOf(socket.id);

        if (exist !== -1) {
          room.splice(room.indexOf(socket.id), 1);
          for (var j = 0; j < room.length; j++) {
            console.log(room[j]);
            var soc = rtc.getSocket(room[j]);
            soc.send(JSON.stringify({
              "eventName": "remove_peer_connected",
              "data": {
                "socketId": socket.id
              }
            }), function(error) {
              if (error) {
                console.log(error);
              }
            });
          }

          break;
        }
      }
    });

    // manages the built-in room functionality
    var connectionsId = [];
    var roomList = rtc.rooms[""] || [];

    roomList.push(socket.id);
    rtc.rooms[""] = roomList;

    for (var i = 0; i < roomList.length; i++)
    {
      var id = roomList[i];

      if(id != socket.id)
      {
        connectionsId.push(id);
        var soc = rtc.getSocket(id);

        // inform the peers that they have a new peer
        if (soc) {
          soc.send(JSON.stringify({
            "eventName": "new_peer_connected",
            "data":{
              "socketId": socket.id
            }
          }), function(error) {
            if (error) {
              console.log(error);
            }
          });
        }
      }
    }

    // send new peer a list of all prior peers
    socket.send(JSON.stringify({
      "eventName": "get_peers",
      "data": {
        "connections": connectionsId
      }
    }), function(error) {
      if (error) {
        console.log(error);
      }
    });
  });

  //Receive ICE candidates and send to the correct socket
  rtc.on('send_ice_candidate', function(data, socket) {
    iolog('send_ice_candidate');
    var soc = rtc.getSocket(data.socketId);

    if (soc) {
      soc.send(JSON.stringify({
        "eventName": "receive_ice_candidate",
        "data": {
          "label": data.label,
          "candidate": data.candidate,
          "socketId": socket.id
        }
      }), function(error) {
        if (error) {
          console.log(error);
        }
      });
    }
  });

  //Receive offer and send to correct socket
  rtc.on('send_offer', function(data, socket) {
    iolog('send_offer');
    var soc = rtc.getSocket(data.socketId);

    if (soc) {
      soc.send(JSON.stringify({
        "eventName": "receive_offer",
        "data": {
          "sdp": data.sdp,
          "socketId": socket.id
      }
      }), function(error) {
        if (error) {
          console.log(error);
        }
      });
    }
  });

  //Receive answer and send to correct socket
  rtc.on('send_answer', function(data, socket) {
    iolog('send_answer');
    var soc = rtc.getSocket(data.socketId);

    if (soc) {
      soc.send(JSON.stringify({
        "eventName": "receive_answer",
        "data" : {
          "sdp": data.sdp,
          "socketId": socket.id
        }
      }), function(error) {
        if(error)
          console.log(error);
      });
    }
  });
}

rtc.getSocket = function(id)
{
  for(var i = 0; i < rtc.sockets.length; i++)
  {
    var socket = rtc.sockets[i];
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