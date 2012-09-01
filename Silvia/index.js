var PeerConnection = window.PeerConnection || window.webkitPeerConnection00

var socket = new WebSocket('wss://localhost:8001/');
    socket.emit = function()
    {
        var args = Array.prototype.slice.call(arguments, 0);

        socket.send(JSON.stringify(args), function(error)
        {
            if(error)
                console.log(error);
        });
    }
    socket.addEventListener("message", function(msg)
    {
      console.log("RECEIVED: "+msg.data);

      var args = JSON.parse(msg.data)

      var eventName = args[0]
      var socketId  = args[1]

      switch(eventName)
      {
        case "PeerConnection.setId":
          socket._id = socketId
          document.getElementById('localId').value = socketId
          break

        case "PeerConnection.setPeerId":
          socket._peerId = socketId
          document.getElementById('remoteId').value = socketId
          break

        case "send":
          // accept connection request
          createPeerConnection();

          // Message returned from other side
          console.log('Processing signaling message...');
          peerConn.processSignalingMessage(args[3]);
      }
    }, false);

var peerConn = null;

function createPeerConnection()
{
  try
  {
    peerConn = new PeerConnection("STUN stun.l.google.com:19302",
    function(message)
    {
      // when PeerConn is created, send setup data to peer via WebSocket
      console.log("Sending setup signal");
      socket.emit("send", socket._peerId, message);
    });
  }
  catch(e)
  {
    console.log("Failed to create PeerConnection, exception: " + e.message);
  }
}


createPeerConnection()