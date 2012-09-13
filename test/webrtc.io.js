//CLIENT
// Fallbacks for vendor-specific variables until the spec is finalized.
var PeerConnection = window.PeerConnection || window.webkitPeerConnection00 || window.mozPeerConnection;
var URL = window.URL || window.webkitURL || window.msURL || window.oURL;
var getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;

(function()
{
  var rtc = {};
  if('undefined' === typeof module)
    this.rtc = rtc;
  else
    module.exports = rtc;


  // Holds a connection to the server.
  rtc._socket = null;

  // Holds callbacks for certain events.
  rtc._events = {};

  rtc.on = function(eventName, callback)
  {
    rtc._events[eventName] = rtc._events[eventName] || [];
    rtc._events[eventName].push(callback);
  };

  rtc.fire = function(eventName, _)
  {
    var events = rtc._events[eventName];
    if(events == undefined)
        return;

    var args = Array.prototype.slice.call(arguments, 1);

    for(var i = 0; i < events.length; i++)
      events[i].apply(null, args);
  };

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
        rtc.fire(json.eventName, json.data);
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


      rtc.on('get_peers', function(data)
      {
        rtc.connections = data.connections;
      });

      rtc.on('receive_ice_candidate', function(data)
      {
        var candidate = new IceCandidate(data.label, data.candidate);
        rtc.peerConnections[data.socketId].processIceMessage(candidate);
      });

      rtc.on('new_peer_connected', function(data)
      {
        rtc.connections.push(data.socketId);

        rtc.createPeerConnection(data.socketId);
      });

      rtc.on('remove_peer_connected', function(data)
      {
        delete rtc.peerConnections[data.socketId];
      });

      rtc.on('receive_offer', function(data)
      {
        var pc = rtc.peerConnections[data.socketId];
        pc.setRemoteDescription(pc.SDP_OFFER, new SessionDescription(data.sdp));

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
            "socketId": data.socketId,
            "sdp": answer.toSdp()
          }
        }), function(error)
        {
          if(error)
            console.log(error);
        });

        pc.startIce();
      });

      rtc.on('receive_answer', function(data)
      {
        var pc = rtc.peerConnections[data.socketId];
        pc.setRemoteDescription(pc.SDP_ANSWER, new SessionDescription(data.sdp));
      });
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

      rtc.fire('ice candidate', candidate, moreToFollow);
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


  rtc.createStream = function(opt)
  {
    var options = {
        video: opt.video || false,
        audio: opt.audio || false
    };

    getUserMedia.call(navigator, options,
    function(stream)
    {
      rtc.createPeerConnections();
      rtc.sendOffers();
    },
    function()
    {
      alert("Could not connect stream.");
    });
  }
}).call(this);