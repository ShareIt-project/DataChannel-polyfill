// Fallbacks for vendor-specific variables until the spec is finalized.
var PeerConnection = window.PeerConnection || window.webkitPeerConnection00;

(function(module)
{
  // Check if browser has support for native WebRTC DataChannel
  if(PeerConnection.prototype.createDataChannel)
    return;

  console.log("Adding DataChannel polyfill...");

  var SERVER = "ws://localhost:8002"
//  var SERVER = "wss://localhost:8002"

  // DataChannel polyfill using WebSockets as 'underlying data transport'
  function DataChannel()
  {
    // Use a WebSocket as 'underlying data transport' to create the DataChannel
    this._udt = new WebSocket(SERVER)

    this.close = function(){this._udt.close()}
    this.send  = function(data, onerror){this._udt.send(data, onerror)}

    this.readyState = "connecting"
  }

  PeerConnection.prototype._setId = function(id)
  {
    var self = this

    var socket = new WebSocket(SERVER)
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

  PeerConnection.prototype._setPeerId = function(peerId)
  {
    this._peerId = "pc."+peerId
  }

  // Add required methods to PeerConnection
  PeerConnection.prototype._createDataChannel = function(configuration)
  {
    var channel = new DataChannel()
        channel.label = configuration.label
        channel.reliable = true

    if(configuration.reliable != undefined)
      channel.reliable = configuration.reliable

    this._datachannels = this._datachannels || {}
    this._datachannels[configuration.label] = channel

    var self = this

    channel._udt.onclose = function()
    {
      delete self._datachannels[channel.label]

      if(channel.onclose)
        channel.onclose()
    }

    return channel
  }

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
          channel._udt.onmessage = function(message)
          {
            if(message.data == 'ready')
            {
              if(self.readyState == "closed")
                return;

              channel._udt.onmessage = function(message)
              {
                if(channel.onmessage)
                  channel.onmessage(message)
              }

              channel.readyState = "open"

              if(channel.onopen)
                channel.onopen()
            }
          }

          channel.send(JSON.stringify(["create", self._peerId, configuration]))
        }

    return channel
  }

  PeerConnection.prototype._ondatachannel = function(socketId, configuration)
  {
    if(this.readyState == "closed")
      return;

    var self = this

    var channel = this._createDataChannel(configuration)
        channel._udt.onopen = function()
        {
            channel._udt.onmessage = function(message)
            {
              if(channel.onmessage)
                channel.onmessage(message)
            }

            channel.readyState = "open"

            channel.send(JSON.stringify(["ready", socketId]))

            var evt = document.createEvent('Event')
                evt.initEvent('datachannel', true, true)
                evt.channel = channel

            if(self.ondatachannel)
                self.ondatachannel(evt);
        }
  }

  function getId(description)
  {
    var result = description.toSdp().replace(/(\r\n|\n|\r)/gm, '\n')

    var patt1=new RegExp("o=.+");
    var result = patt1.exec(result)

    console.log(result[0])
    return result[0]
  }

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
}).call(this);