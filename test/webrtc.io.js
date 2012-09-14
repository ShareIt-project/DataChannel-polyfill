//CLIENT
// Fallbacks for vendor-specific variables until the spec is finalized.
var PeerConnection = window.PeerConnection || window.webkitPeerConnection00 || window.mozPeerConnection;
var URL = window.URL || window.webkitURL || window.msURL || window.oURL;

var rtc = {};


// Holds the STUN server to use for PeerConnections.
var SERVER = "STUN stun.l.google.com:19302";

// Holds a connection to the server.
var socket = null;

// Reference to the lone PeerConnection instance.
var peerConnections = {};

// Array of known peer socket ids
var connections = [];

/**
 * Connects to the websocket server.
 */
rtc.connect = function(server)
{
  socket = new WebSocket(server);

  socket.onopen = function()
  {
    socket.onmessage = function(msg)
    {
      console.log("RECEIVED: "+msg.data);

      var json = JSON.parse(msg.data);

      switch(json.eventName)
      {
        case 'get_peers':
          connections = json.data.connections;
        break

        case 'receive_ice_candidate':
        {
          var candidate = new IceCandidate(json.data.label, json.data.candidate);
          peerConnections[json.data.socketId].processIceMessage(candidate);
        }
        break

        case 'new_peer_connected':
          connections.push(json.data.socketId);
          rtc.createPeerConnection(json.data.socketId);
        break

        case 'remove_peer_connected':
          delete peerConnections[json.data.socketId];
        break

        case 'receive_offer':
        {
          var pc = peerConnections[json.data.socketId];
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

          pc.startIce();
        }
        break

        case 'receive_answer':
        {
          var pc = peerConnections[json.data.socketId];
          pc.setRemoteDescription(pc.SDP_ANSWER, new SessionDescription(json.data.sdp));
        }
      }
    };

    socket.onerror = function(err)
    {
      console.log('onerror');
      console.log(err);
    };

    socket.onclose = function(data)
    {
      delete peerConnections[socket.id];
    };
  };
};


rtc.createPeerConnections = function()
{
  for(var i = 0; i < connections.length; i++)
    rtc.createPeerConnection(connections[i]);
};

rtc.createPeerConnection = function(id)
{
  console.log('createPeerConnection');

  var pc = new PeerConnection(SERVER, function(candidate, moreToFollow)
  {
    if(candidate)
      socket.send(JSON.stringify(
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

  peerConnections[id] = pc

  return pc;
};

rtc.sendOffers = function()
{
  for(var i = 0; i < connections.length; i++)
    rtc.sendOffer(connections[i]);
}

rtc.sendOffer = function(socketId)
{
  var pc = peerConnections[socketId];

  // TODO: Abstract away video: true, audio: true for offers
  var offer = pc.createOffer({
    video: true,
    audio: true
  });

  pc.setLocalDescription(pc.SDP_OFFER, offer);
  socket.send(JSON.stringify(
  {
    "eventName": "send_offer",
    "data":
    {
      "socketId": socketId,
      "sdp": offer.toSdp()
    }
  }), function(error)
  {
    if(error)
      console.log(error);
  });

  pc.startIce();
};