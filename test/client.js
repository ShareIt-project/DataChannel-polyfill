var PeerConnection = window.PeerConnection  || window.webkitPeerConnection00;
    PeerConnection = PeerConnection         || window.mozPeerConnection;

if(PeerConnection == undefined)
  alert('Your browser is not supported or you have to turn on flags. In chrome'+
        ' you go to chrome://flags and turn on Enable PeerConnection remember '+
        'to restart chrome');


// Holds the STUN server to use for PeerConnections.
var SERVER = "STUN stun.l.google.com:19302";

// Reference to the lone PeerConnection instance.
var peerConnections = {};


// Chat functions

function addToChat(msg, color)
{
  // Sanitize the input
  msg = msg.replace(/</g, '&lt;');

  if(color)
    msg = '<span style="color: ' + color + '; padding-left: 15px">' + msg + '</span>';
  else
    msg = '<strong style="padding-left: 15px">' + msg + '</strong>';

  var messages = document.getElementById('messages');
      messages.innerHTML = messages.innerHTML + msg + '<br>';
      messages.scrollTop = 10000;
}

function initChat()
{
  var input = document.getElementById("chatinput");
  var color = "#"+((1<<24)*Math.random()|0).toString(16);

  input.addEventListener('keydown', function(event)
  {
    var key = event.which || event.keyCode;
    if(key === 13)
    {
      for(var peerConnection in peerConnections)
      {
        var channel = peerConnections[peerConnection]._datachannels['chat']
        if(channel)
          channel.send(JSON.stringify({"messages": input.value, "color": color}),
          function(error)
          {
            if(error)
              console.log(error);
          });
      }

      addToChat(input.value);
      input.value = "";
    }
  }, false);
}


// Create PeerConnection

function createPeerConnection(id)
{
  console.log('createPeerConnection');

  var pc = new PeerConnection(SERVER, function(candidate, moreToFollow){});

  pc.onopen = function()
  {
    var label = 'chat'

    var channel = pc.createDataChannel(label)
        channel.onmessage = function(message)
        {
          var data = JSON.parse(message.data)

          addToChat(data.messages, data.color.toString(16));
        }

//    pc._datachannels = {}
//    pc._datachannels[label] = channel
  };

  peerConnections[id] = pc

  return pc;
}


window.addEventListener('load', function()
{
  var socket = new WebSocket("ws://localhost:8000/");
	  socket.onopen = function()
	  {
	    socket.onmessage = function(msg)
	    {
	      console.log("RECEIVED: "+msg.data);

	      var json = JSON.parse(msg.data);

	      switch(json.eventName)
	      {
	        case 'get_peers':
	          var connections = json.data.connections;

	          for(var i = 0; i < connections.length; i++)
	          {
	            // Create PeerConnection
	            var pc = createPeerConnection(connections[i]);

	            // Send offer to new PeerConnection

	            // TODO: Abstract away video: true, audio: true for offers
	            var offer = pc.createOffer({
	              video: true,
	              audio: true
	            });

	            socket.send(JSON.stringify(
	            {
	              "eventName": "send_offer",
	              "data":
	              {
	                "socketId": connections[i],
	                "sdp": offer.toSdp()
	              }
	            }), function(error)
	            {
	              if(error)
	                console.log(error);
	            });

	            pc.setLocalDescription(pc.SDP_OFFER, offer);
	          }
	        break

	        case 'receive_offer':
	          var pc = peerConnections[json.data.socketId];
	          pc.setRemoteDescription(pc.SDP_OFFER,
	                                  new SessionDescription(json.data.sdp));

	          // Send answer

	          // TODO: Abstract away video: true, audio: true for answers
	          var answer = pc.createAnswer(pc.remoteDescription.toSdp(),
	          {
	            video: true,
	            audio: true
	          });

	          socket.send(JSON.stringify(
	          {
	            "eventName": "send_answer",
	            "data":
	            {
	              "socketId": json.data.socketId,
	              "sdp": answer.toSdp()
	            }
	          }), function(error)
	          {
	            if(error)
	              console.log(error);
	          });

	          pc.setLocalDescription(pc.SDP_ANSWER, answer);
	        break

	        case 'receive_answer':
	          var pc = peerConnections[json.data.socketId];
	          pc.setRemoteDescription(pc.SDP_ANSWER,
	                                  new SessionDescription(json.data.sdp));
            break

	        case 'new_peer_connected':
	          createPeerConnection(json.data.socketId);
	        break

	        case 'remove_peer_connected':
	          delete peerConnections[json.data.socketId];
	        break
	      }
	    };

	    socket.onerror = function(err)
	    {
	      console.log('onerror: '+err);
	    };
	  };


  initChat();
})