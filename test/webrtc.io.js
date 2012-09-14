//CLIENT
// Fallbacks for vendor-specific variables until the spec is finalized.
var PeerConnection = window.PeerConnection || window.webkitPeerConnection00 || window.mozPeerConnection;
var URL = window.URL || window.webkitURL || window.msURL || window.oURL;

(function()
{
  var rtc = {};
  if('undefined' === typeof module)
    this.rtc = rtc;
  else
    module.exports = rtc;


  // Holds a connection to the server.
  rtc._socket = null;

  // Holds the STUN server to use for PeerConnections.
  rtc.SERVER = "STUN stun.l.google.com:19302";

  // Reference to the lone PeerConnection instance.
  rtc.peerConnections = {};

  // Array of known peer socket ids
  rtc.connections = [];

  /**
   * Connects to the websocket server.
   */
  rtc.connect = function(server)
  {
    rtc._socket = new WebSocket(server);

    rtc._socket.onopen = function()
    {
      rtc._socket.onmessage = function(msg)
      {
        console.log("RECEIVED: "+msg.data);

        var json = JSON.parse(msg.data);

        switch(json.eventName)
        {
	      case 'get_peers':
	        rtc.connections = json.data.connections;
	      break

	      case 'receive_ice_candidate':
	      {
	        var candidate = new IceCandidate(json.data.label, json.data.candidate);
	        rtc.peerConnections[json.data.socketId].processIceMessage(candidate);
	      }
	      break

	      case 'new_peer_connected':
	        rtc.connections.push(json.data.socketId);
	        rtc.createPeerConnection(json.data.socketId);
	      break

	      case 'remove_peer_connected':
	        delete rtc.peerConnections[json.data.socketId];
	      break

	      case 'receive_offer':
	      {
	        var pc = rtc.peerConnections[json.data.socketId];
	        pc.setRemoteDescription(pc.SDP_OFFER, new SessionDescription(json.data.sdp));

	        // Send answer
	        var offer = pc.remoteDescription;

	        // TODO: Abstract away video: true, audio: true for answers
	        var answer = pc.createAnswer(offer.toSdp(),
	        {
	          video: true,
	          audio: true
	        });

	        pc.setLocalDescription(pc.SDP_ANSWER, answer);
	        rtc._socket.send(JSON.stringify(
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

	        pc.startIce();
	      }
	      break

	      case 'receive_answer':
	      {
	        var pc = rtc.peerConnections[json.data.socketId];
	        pc.setRemoteDescription(pc.SDP_ANSWER, new SessionDescription(json.data.sdp));
	      }
        }
      };

      rtc._socket.onerror = function(err)
      {
        console.log('onerror');
        console.log(err);
      };

      rtc._socket.onclose = function(data)
      {
        delete rtc.peerConnections[rtc._socket.id];
      };
    };
  };


  rtc.sendOffers = function()
  {
    for(var i = 0; i < rtc.connections.length; i++)
      rtc.sendOffer(rtc.connections[i]);
  }

  rtc.createPeerConnections = function()
  {
    for(var i = 0; i < rtc.connections.length; i++)
      rtc.createPeerConnection(rtc.connections[i]);
  };

  rtc.createPeerConnection = function(id)
  {
    console.log('createPeerConnection');

    var pc = new PeerConnection(rtc.SERVER, function(candidate, moreToFollow)
    {
      if(candidate)
        rtc._socket.send(JSON.stringify(
        {
          "eventName": "send_ice_candidate",
          "data": {"label": candidate.label,
                   "candidate": candidate.toSdp(),
                   "socketId": id
                  }
        }),
        function(error)
        {
          if(error)
            console.log(error);
        });
    });

    pc.onopen = function()
    {
      var channel = pc.createDataChannel('chat')
          channel.onmessage = function(message)
          {
            var data = JSON.parse(message.data)

            addToChat(data.messages, data.color.toString(16));
          }
    };

    rtc.peerConnections[id] = pc

    return pc;
  };

  rtc.sendOffer = function(socketId)
  {
    var pc = rtc.peerConnections[socketId];
    // TODO: Abstract away video: true, audio: true for offers
    var offer = pc.createOffer({
      video: true,
      audio: true
    });

    pc.setLocalDescription(pc.SDP_OFFER, offer);
    rtc._socket.send(JSON.stringify({
      "eventName": "send_offer",
      "data": {
        "socketId": socketId,
        "sdp": offer.toSdp()
      }
    }), function(error) {
      if (error) {
        console.log(error);
      }
    });
    pc.startIce();
  };
}).call(this);