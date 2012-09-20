function DCPF_install(ws_url)
{
  // Fallbacks for vendor-specific variables until the spec is finalized.
  var PeerConnection = window.PeerConnection || window.webkitPeerConnection00 || window.mozRTCPeerConnection;

  // Check if browser has support for WebRTC PeerConnection
  if(PeerConnection == undefined)
  {
    console.error("Your browser doesn't support PeerConnection, please use "+
                  "one of the latest versions of Chrome/Chromium or Firefox");
    return;
  }

  // Check if browser has support for native WebRTC DataChannel
  if((new PeerConnection("STUN stun.l.google.com:19302", function(){})).createDataChannel)
  {
    console.log("Using native DataChannel");
    return;
  }

  console.log("Adding DataChannel polyfill...");

  // DataChannel polyfill using WebSockets as 'underlying data transport'
  function DataChannel()
  {
    // Use a WebSocket as 'underlying data transport' to create the DataChannel
    this._udt = new WebSocket(ws_url)

    this.close = function(){this._udt.close()}
    this.send  = function(data, onerror){this._udt.send(data, onerror)}

    this.readyState = "connecting"
  }

  // Create a signalling channel with a WebSocket on the proxy server with the
  // defined ID and wait for new 'create' messages to create new DataChannels
  PeerConnection.prototype._setId = function(id)
  {
    var self = this

    var socket = new WebSocket(ws_url)
        socket.onopen = function()
        {
            socket.onmessage = function(message)
            {
                var args = JSON.parse(message.data)

                if(args[0] == 'create')
                    self._ondatachannel(args[1], args[2])
            }

            socket.send(JSON.stringify(['setId', "pc."+id]))
        }
  }

  // Set the PeerConnection peer ID
  PeerConnection.prototype._setPeerId = function(peerId)
  {
    this._peerId = "pc."+peerId
  }

  // Private DataChannel factory function
  PeerConnection.prototype._createDataChannel = function(configuration)
  {
    var channel = new DataChannel()
        channel.label = configuration.label
        channel.reliable = true

    if(configuration.reliable != undefined)
      channel.reliable = configuration.reliable

    channel._udt.onclose = function()
    {
      if(channel.onclose)
        channel.onclose()
    }

    return channel
  }

  // Public function to initiate the creation of a new DataChannel
  PeerConnection.prototype.createDataChannel = function(label, dataChannelDict)
  {
    if(!this._peerId)
    {
      console.warn("peerId is not defined")
      return
    }

    if(this.readyState == "closed")
      throw INVALID_STATE_ERR;

    label = label || ""
    dataChannelDict = dataChannelDict || {}

    var configuration = {label: label}
    if(dataChannelDict.reliable != undefined)
        configuration['reliable'] = dataChannelDict.reliable;

    var self = this

    var channel = this._createDataChannel(configuration)
        channel._udt.onopen = function()
        {
          // Wait until the other end of the channel is ready
          channel._udt.onmessage = function(message)
          {
            if(message.data == 'ready')
            {
              // PeerConnection is closed, do nothing
              if(self.readyState == "closed")
                return;

              // Set onmessage event to bypass messages to user defined function
              channel._udt.onmessage = function(message)
              {
                if(channel.onmessage)
                  channel.onmessage(message)
              }

              // Set channel as open
              channel.readyState = "open"

              if(channel.onopen)
                channel.onopen()
            }
          }

          // Query to the other peer to create a new DataChannel with us
          channel.send(JSON.stringify(["create", self._peerId, configuration]))
        }

    return channel
  }

  // Private function to 'catch' the 'ondatachannel' event
  PeerConnection.prototype._ondatachannel = function(socketId, configuration)
  {
    if(this.readyState == "closed")
      return;

    var self = this

    var channel = this._createDataChannel(configuration)
        channel._udt.onopen = function()
        {
            // Set onmessage event to bypass messages to user defined function
            channel._udt.onmessage = function(message)
            {
              if(channel.onmessage)
                channel.onmessage(message)
            }

            // Set channel as open
            channel.readyState = "open"

            channel.send(JSON.stringify(["ready", socketId]))

            var evt = document.createEvent('Event')
                evt.initEvent('datachannel', true, true)
                evt.channel = channel

            if(self.ondatachannel)
                self.ondatachannel(evt);
        }
  }

  // Get the SDP session ID from a RTCSessionDescription object
  function getId(description)
  {
    var result = description.toSdp().replace(/(\r\n|\n|\r)/gm, '\n')

    var patt1=new RegExp("o=.+");
    var result = patt1.exec(result)

    return result[0]
  }

  // Overwrite setters to catch the session IDs
  var setLocalDescription  = PeerConnection.prototype.setLocalDescription
  var setRemoteDescription = PeerConnection.prototype.setRemoteDescription

  PeerConnection.prototype.setLocalDescription = function(type, description)
  {
    this._setId(getId(description))

    setLocalDescription.call(this, type, description)
  }

  PeerConnection.prototype.setRemoteDescription = function(type, description)
  {
    this._setPeerId(getId(description))

    setRemoteDescription.call(this, type, description)
  }
}
