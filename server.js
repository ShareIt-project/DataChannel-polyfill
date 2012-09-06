// SSL Certificates
var fs = require('fs');

var options = {key:  fs.readFileSync('certs/privatekey.pem').toString(),
               cert: fs.readFileSync('certs/certificate.pem').toString(),
               ca:  [fs.readFileSync('certs/certrequest.csr').toString()]}

// DataChannel proxy server
var server = require('https').createServer(options).listen(8002);
var WebSocketServer = require('ws').Server
var wss = new WebSocketServer({server: server});

//Array to store connections
wss.sockets = {}

wss.on('connection', function(socket)
{
    // Message received
    function onmessage_proxy(message)
    {
        socket.peer.send(message)
    };

    socket.onmessage = function(message)
    {
        console.log("socket.onmessage = '"+message.data+"'")
        var args = JSON.parse(message.data)

        var eventName = args[0]
        var socketId  = args[1]

        var soc = wss.sockets[socketId]

        switch(eventName)
        {
            case 'create':
                if(soc)
                {
                    args[1] = socket.id
                    soc.send(JSON.stringify(args))
                }
                else
                {
                    socket.send(JSON.stringify(['create.error', socketId]))
                    console.warn("[create] "+socketId+" don't exists");
                }

                break

            case 'ready':
                if(soc)
                {
                    socket.peer = soc
                    soc.peer = socket

                    socket.onmessage = onmessage_proxy
                    soc.onmessage = onmessage_proxy

                    delete wss.sockets[socketId]
                    delete wss.sockets[socket.id]

                    socket.send('ready')
                    soc.send('ready')
                }
                else
                {
                    socket.send(JSON.stringify(['ready.error', socketId]))
                    console.warn("[ready] "+socketId+" don't exists");
                }

                break

            case 'setId':
                wss.sockets[socketId] = socket
        }
    };

    // Peer connection is closed, close the other end
    socket.onclose = function()
    {
        if(socket.peer != undefined)
            socket.peer.close();
    };
})

// generate a 4 digit hex code randomly
function S4()
{
  return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1)
}

// make a REALLY COMPLICATED AND RANDOM id, kudos to dennis
function id()
{
  return S4()+S4() +"-"+ S4() +"-"+ S4() +"-"+ S4() +"-"+ S4()+S4()+S4()
}