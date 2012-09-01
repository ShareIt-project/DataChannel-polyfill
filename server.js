// SSL Certificates
var fs = require('fs');

var options = {key:  fs.readFileSync('certs/privatekey.pem').toString(),
               cert: fs.readFileSync('certs/certificate.pem').toString(),
               ca:  [fs.readFileSync('certs/certrequest.csr').toString()]}

// HTTP server
var server = require('https').createServer(options)
    server.listen(8001);

var WebSocketServer = require('ws').Server
  , wss = new WebSocketServer({server: server});

//Array to store connections
wss._sockets = {}

wss.on('connection', function(socket)
{
    socket.id = id()
    wss._sockets[socket.id] = socket

    socket.emit = function()
    {
        var args = Array.prototype.slice.call(arguments, 0);

        socket.send(JSON.stringify(args), function(error)
        {
            if(error)
                console.log(error);
        });
    }

    socket.on('message', function(message)
    {
        console.log("socket.onmessage = '"+message+"'")
        var args = JSON.parse(message)

        var eventName = args[0]
        var socketId  = args[1]

//        var soc = io.sockets.sockets[socketId]
        var soc = wss._sockets[socketId]
        if(soc)
        {
            args[1] = socket.id

            soc.emit.apply(soc, args);
        }
        else
        {
            socket.emit(eventName+'.error', socketId);
            console.warn(eventName+': '+socket.id+' -> '+socketId);
        }
    });

    socket.emit('PeerConnection.setId', socket.id)
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