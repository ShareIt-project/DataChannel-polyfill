// SSL Certificates
var fs = require('fs');

var options = {key:  fs.readFileSync('certs/privatekey.pem').toString(),
               cert: fs.readFileSync('certs/certificate.pem').toString(),
               ca:  [fs.readFileSync('certs/certrequest.csr').toString()]}

// Server
var server = require('https').createServer(options).listen(8001);
var WebSocketServer = require('ws').Server
var wss = new WebSocketServer({server: server});

//Array to store connections
wss.sockets = {}

wss.on('connection', function(socket)
{
    socket._emit = function()
    {
        var args = Array.prototype.slice.call(arguments, 0);

        socket.send(JSON.stringify(args), function(error)
        {
            if(error)
                console.log(error);
        });
    }

    // Message received
    socket.onmessage = function(message)
    {
        console.log("socket.onmessage = '"+message.data+"'")
        var args = JSON.parse(message.data)

        var eventName = args[0]
        var socketId  = args[1]

        var soc = wss.sockets[socketId]
        if(soc)
        {
            args[1] = socket.id

            soc._emit.apply(soc, args);
        }
        else
        {
            socket._emit(eventName+'.error', socketId);
            console.warn(eventName+': '+socket.id+' -> '+socketId);
        }
    });

    // Set and register a sockedId if it was not set previously
    // Mainly for WebSockets server
    if(socket.id == undefined)
    {
        socket.id = id()
        wss.sockets[socket.id] = socket
    }

    socket._emit('PeerConnection.setId', socket.id)
    console.log("Connected socket.id: "+socket.id)
})

// generate a 4 digit hex code randomly
function S4() {
  return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
}

// make a REALLY COMPLICATED AND RANDOM id, kudos to dennis
function id() {
  return (S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4());
}


// DataChannel proxy server
var server = require('https').createServer(options).listen(8002);
var WebSocketServer = require('ws').Server
var wss = new WebSocketServer({server: server});

wss.on('connection', function(socket)
{
    // Message received
    socket.onmessage = function(message)
    {
        if(socket.peer != undefined)
            socket.peer.send(message)
    });

    console.log("Connected socket.id: "+socket.id)
})