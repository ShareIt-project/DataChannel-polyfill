// SSL Certificates
var fs = require('fs');

var options = {key:  fs.readFileSync('certs/privatekey.pem').toString(),
               cert: fs.readFileSync('certs/certificate.pem').toString(),
               ca:  [fs.readFileSync('certs/certrequest.csr').toString()]}

// HTTP server
var server = require('https').createServer(options)
    server.listen(8000);

var WebSocketServer = require('ws').Server
  , wss = new WebSocketServer({server: server});

wss.on('connection', function(ws)
{
    ws.on('message', function(message)
    {
        console.log('received: %s', message);
    });
    ws.send('something');
});