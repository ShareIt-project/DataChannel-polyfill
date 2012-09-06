// Fallbacks for vendor-specific variables until the spec is finalized.
var PeerConnection = window.PeerConnection || window.webkitPeerConnection00;

(function(module)
{
  // Check if browser has support for native WebRTC DataChannel
  if(PeerConnection.prototype.createDataChannel)
    return;

  console.log("Adding DataChannel polyfill...");

  var SERVER = "wss://localhost:8002"

  // DataChannel polyfill using WebSockets as 'underlying data transport'
  function DataChannel()
  {
    // Use a WebSocket as 'underlying data transport' to create the DataChannel
    this._udt = new WebSocket(SERVER)

    this.close = this._udt.close
    this.send  = this._udt.send

    this.readyState = "connecting"
  }

  PeerConnection.prototype._setId = function(id)
  {
    var socket = new WebSocket(SERVER)
        socket.onopen = function()
        {
            socket.onmessage = function(message)
            {
                var args = JSON.parse(message.data)

                if(args[0] == 'create' && args[1] == this._peerId)
                    this._ondatachannel(args[2])
            }

            socket.send(JSON.stringify(['setId', id]))
        }
  }

  PeerConnection.prototype._setPeerId = function(peerId)
  {
    this._peerId = peerId
  }

  // Add required methods to PeerConnection
  PeerConnection.prototype._createDataChannel = function(configuration)
  {
    var channel = new DataChannel()
        channel.label = configuration.label
        channel.reliable = true

    if(configuration.reliable != undefined)
      channel.reliable = configuration.reliable

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

    var channel = this._createDataChannel(configuration)
        channel._udt.onopen = function()
        {
          channel._udt.onmessage = function(message)
          {
            if(message.data == 'ready')
            {
              if(this.readyState == "closed")
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

          channel.send(JSON.stringify(["create", this._peerId, configuration]))
        }

    return channel
  }

  PeerConnection.prototype._ondatachannel = function(data)
  {
    if(!this._peerId)
    {
      console.warn("peerId is not defined")
      return
    }

    if(this.readyState == "closed")
      return;

    var channel = this._createDataChannel(data.configuration)
        channel._udt.onopen = function()
        {
            this._udt.onmessage = function(message)
            {
              if(channel.onmessage)
                channel.onmessage(message)
            }

            channel.readyState = "open"

            channel.send(JSON.stringify(["ready", this._peerId]))

            var evt = document.createEvent('Event')
                evt.initEvent('datachannel', true, true)
                evt.channel = channel

            if(this.ondatachannel)
                this.ondatachannel(evt);
        }
  });
}).call(this);