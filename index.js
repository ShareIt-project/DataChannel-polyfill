var PeerConnection = window.PeerConnection || window.webkitDeprecatedPeerConnection || window.webkitPeerConnection00

var socket = new WebSocket('ws://localhost:8001/');
var sourcevid = document.getElementById('sourcevid');
var remotevid = document.getElementById('remotevid');
var localStream = null;
var peerConn = null;
var started = false;

var logg = function(s) { console.log(s); };

// when PeerConn is created, send setup data to peer via WebSocket
function onSignal(message) {
  logg("Sending setup signal");
  socket.send(message);
}

// when remote adds a stream, hand it on to the local video element
function onRemoteStreamAdded(event) {
  logg("Added remote stream");
  remotevid.src = window.webkitURL.createObjectURL(event.stream);
}

// when remote removes a stream, remove it from the local video element
function onRemoteStreamRemoved(event) {
  logg("Remove remote stream");
  remotevid.src = "";
}

function createPeerConnection() {
  try {
    peerConn = new PeerConnection("STUN stun.l.google.com:19302", onSignal);
  } catch (e) {
    console.log("Failed to create PeerConnection, exception: " + e.message);
  }

  peerConn.addEventListener("addstream", onRemoteStreamAdded, false);
  peerConn.addEventListener("removestream", onRemoteStreamRemoved, false)
}

// start the connection upon user request
function connect() {
  if (!started && localStream) {
    createPeerConnection();
    logg('Adding local stream...');
    peerConn.addStream(localStream);
    started = true;
  } else {
    alert("Local stream not running yet.");
  }
}

// accept connection request
socket.addEventListener("message", onMessage, false);
function onMessage(evt) {
  logg("RECEIVED: "+evt.data);
  if (!started) {
    createPeerConnection();
    logg('Adding local stream...');
    peerConn.addStream(localStream);
    started = true;
  }
  // Message returned from other side
  logg('Processing signaling message...');
  peerConn.processSignalingMessage(evt.data);
}

function hangUp() {
  logg("Hang up.");
  peerConn.close();
  peerConn = null;
  started = false;
}

function startVideo() {
    // Replace the source of the video element with the stream from the camera
    try { //try it with spec syntax
      navigator.webkitGetUserMedia({audio: true, video: true}, successCallback, errorCallback);
    } catch (e) {
      navigator.webkitGetUserMedia("video,audio", successCallback, errorCallback);
    }
    function successCallback(stream) {
        sourcevid.src = window.webkitURL.createObjectURL(stream);
        localStream = stream;
    }
    function errorCallback(error) {
        console.error('An error occurred: [CODE ' + error.code + ']');
    }
}
function stopVideo() {
  sourcevid.src = "";
}