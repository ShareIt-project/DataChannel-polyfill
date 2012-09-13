var videos = [];
var rooms = [1,2,3,4,5];
var PeerConnection = window.PeerConnection || window.webkitPeerConnection00;

function removeVideo(socketId) {
  var video = document.getElementById('remote' + socketId);
  if (video) {
      videos.splice(videos.indexOf(video), 1);
      video.parentNode.removeChild(video);
  }
}

function addToChat(msg, color) {
  var messages = document.getElementById('messages');
  msg = sanitize(msg);
  if (color) {
    msg = '<span style="color: ' + color + '; padding-left: 15px">' + msg + '</span>';
  } else {
    msg = '<strong style="padding-left: 15px">' + msg + '</strong>';
  }
  messages.innerHTML = messages.innerHTML + msg + '<br>';
  messages.scrollTop = 10000;
}

function sanitize(msg) {
  return msg.replace(/</g, '&lt;');
}

function initNewRoom() {
  var button = document.getElementById("newRoom");

  button.addEventListener('click', function(event) {
    var chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz";
    var string_length = 8;
    var randomstring = '';
    for (var i=0; i<string_length; i++) {
      var rnum = Math.floor(Math.random() * chars.length);
      randomstring += chars.substring(rnum,rnum+1);
    }

    window.location.hash = randomstring;
    location.reload();
  })
}

function initChat() {
  var input = document.getElementById("chatinput");
  var color = "#"+((1<<24)*Math.random()|0).toString(16);

  input.addEventListener('keydown', function(event) {
    var key = event.which || event.keyCode;
    if (key === 13) {
      for(var peerConnection in rtc.peerConnections)
      {
        var channel = rtc.peerConnections[peerConnection]._datachannels['chat']
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

  rtc.on('peer connection opened', function(pc)
  {
    var channel = pc.createDataChannel('chat')
        channel.onmessage = function(message)
        {
          var data = JSON.parse(message.data)

          addToChat(data.messages, data.color.toString(16));
        }
  });
}


function init() {
  if(PeerConnection){
    rtc.createStream({"video": true, "audio": true});
  }else {
    alert('Your browser is not supported or you have to turn on flags. In chrome you go to chrome://flags and turn on Enable PeerConnection remember to restart chrome');
  }

  var room = window.location.hash.slice(1);

  //When using localhost
  rtc.connect("ws://localhost:8000/", room);

  rtc.on('disconnect stream', function(data) {
      console.log('remove ' + data);
      removeVideo(data);
  });

  initNewRoom();
  initChat();
}