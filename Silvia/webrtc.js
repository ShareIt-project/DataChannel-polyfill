var PeerConnection = window.PeerConnection || window.webkitPeerConnection00


var localStream = null;
var peerConn = null;
var started = false;

var socket = new WebSocket('ws://localhost:8001/');
	// accept connection request
	socket.onmessage = function(evt)
	{
	  console.log("RECEIVED: "+evt.data);

	  if(!started)
	  {
	    createPeerConnection();

	    console.log('Adding local stream...');
	    peerConn.addStream(localStream);

	    started = true;
	  }

	  // Message returned from other side
	  console.log('Processing signaling message...');
	  peerConn.processSignalingMessage(evt.data);
	}

var sourcevid = document.getElementById('sourcevid');
var remotevid = document.getElementById('remotevid');


function createPeerConnection()
{
  console.log("Creating peer connection");

  // when PeerConn is created, send setup data to peer via WebSocket
  function onSignal(message)
  {
    console.log("Sending setup signal");
    socket.send(message);
  }

  try
  {
    peerConn = new PeerConnection("STUN stun.l.google.com:19302", onSignal);
  }
  catch(e)
  {
    console.log("Failed to create PeerConnection, exception: " + e.message);
    return
  }

  // when remote adds a stream, hand it on to the local video element
  peerConn.onaddstream = function(event)
  {
    console.log("Added remote stream");
    remotevid.src = window.webkitURL.createObjectURL(event.stream);
  }

  // when remote removes a stream, remove it from the local video element
  peerConn.onremovestream = function(event)
  {
    console.log("Remove remote stream");
    remotevid.src = "";
  }
}


function startVideo()
{
  // Replace the source of the video element with the stream from the camera
  try  //try it with spec syntax
  {
    navigator.webkitGetUserMedia({audio: true, video: true}, successCallback, errorCallback);
  }
  catch(e)
  {
    navigator.webkitGetUserMedia("video,audio", successCallback, errorCallback);
  }

  function successCallback(stream)
  {
    sourcevid.src = window.webkitURL.createObjectURL(stream);
    localStream = stream;
  }

  function errorCallback(error)
  {
    console.error('An error occurred: [CODE ' + error.code + ']');
  }
}

function stopVideo()
{
  sourcevid.src = "";
}

// start the connection upon user request
function connect()
{
  if(!started && localStream)
  {
    createPeerConnection();

    console.log('Adding local stream...');
    peerConn.addStream(localStream);

    started = true;
  }
  else
    alert("Local stream not running yet.");
}

function hangUp()
{
  console.log("Hang up.");
  peerConn.close();
  peerConn = null;

  started = false;
}