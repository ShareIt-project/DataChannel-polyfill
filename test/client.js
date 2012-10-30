var RTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection;

if(RTCPeerConnection == undefined)
  alert('Your browser is not supported or you have to turn on flags. In chrome'+
        ' you go to chrome://flags and turn on Enable PeerConnection remember '+
        'to restart chrome');


// Holds the STUN server to use for PeerConnections.
var SERVER = "stun:stun.l.google.com:19302";

// Reference to the lone PeerConnection instances.
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

    var pc = new RTCPeerConnection({"iceServers": [{"url": SERVER}]});

  peerConnections[id] = pc

  return pc;
}


function initDataChannel(pc, channel)
{
  console.log('initDataChannel');

  channel.onmessage = function(message)
  {
    var data = JSON.parse(message.data)

    addToChat(data.messages, data.color.toString(16))
  }
  channel.onclose = function()
  {
    delete pc._datachannels[channel.label]
  }

  pc._datachannels = {}
  pc._datachannels[channel.label] = channel
};


window.addEventListener('load', function()
{
  var socket = new WebSocket("ws://localhost:8000/");
	  socket.onopen = function()
	  {
	    socket.onmessage = function(message)
	    {
	      console.log("RECEIVED: "+message.data);

		  var args = JSON.parse(message.data);

		  var eventName = args[0]
		  var socketId  = args[1]

	      switch(eventName)
	      {
	        case 'peers':
	          for(var i = 0; i < socketId.length; i++)
	          {
	            // Create PeerConnection
	            var pc = createPeerConnection(socketId[i]);
					pc.onopen = function()
					{
                      var channel = pc.createDataChannel('chat')

					  initDataChannel(pc, channel)
					}

	            // Send offer to new PeerConnection
	            pc.createOffer(function(offer)
	            {
	                socket.send(JSON.stringify(["offer", socketId[i], offer.sdp]),
	                function(error)
	                {
	                  if(error)
	                    console.log(error);
	                });

	                pc.setLocalDescription(new RTCSessionDescription({sdp: offer.sdp,
	                                                                  type: 'offer'}));
	            },
	            function(code)
	            {
                    log("Failure callback: " + code);
                });
	          }
	        break

	        case 'offer':
	          var pc = peerConnections[socketId];
	          pc.setRemoteDescription(new RTCSessionDescription({sdp: args[2],
	                                                             type: 'offer'}));

	          // Send answer
	          pc.createAnswer(function(answer)
              {
	              socket.send(JSON.stringify(["answer", socketId, answer.sdp]),
                  function(error)
                  {
                    if(error)
                      console.error(error);
                  });

                  pc.setLocalDescription(new RTCSessionDescription({sdp: answer.sdp,
                                                                    type: 'answer'}));
              });
	        break

	        case 'answer':
	          var pc = peerConnections[socketId];
	          pc.setRemoteDescription(new RTCSessionDescription({sdp: args[2],
                                                                 type: 'answer'}));
            break

	        case 'peer.create':
	          var pc = createPeerConnection(socketId);
	              pc.ondatachannel = function(event)
	              {
	                initDataChannel(pc, event.channel)
	              }
	        break

	        case 'peer.remove':
	          delete peerConnections[socketId];
	        break
	      }
	    };
	  };
      socket.onerror = function(error)
      {
          console.error(error)
      }


  initChat();
})
