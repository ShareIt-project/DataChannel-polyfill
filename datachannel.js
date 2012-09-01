// Fallbacks for vendor-specific variables until the spec is finalized.
var PeerConnection = window.PeerConnection || window.webkitPeerConnection00;

(function(module)
{
  // Check if browser has support for native WebRTC DataChannel
  if(PeerConnection.prototype.createDataChannel)
    return;

  console.log("Adding DataChannel polyfill...");

  var SERVER = "wss://localhost:8000"

  // Create a per PeerConnection underalying data transport
  function createUDT(pc)
  {
    pc._udt = new WebSocket(SERVER)

    pc._udt.emit = function()
    {
      var args = Array.prototype.slice.call(arguments, 0);

      pc._udt.send(JSON.stringify(args), function(error)
      {
        if(error)
          console.log(error);
      });
    }

    pc._udt.onopen = function()
    {
      pc._udt.onmessage = function(msg)
      {
        var args = JSON.parse(msg.data)

        var eventName = args[0]
        var socketId  = args[1]

        switch(eventName)
        {
          case "PeerConnection.setId":
            pc._id = socketId
            break

          case "PeerConnection.setPeerId":
            pc._peerId = socketId
            break

          case "PeerConnection.createDataChannel":
            pc._ondatachannel({configuration: {label: args[3]}})
            break

          case "DataChannel.send":
            break
        }
      }
    }
  }

  PeerConnection.prototype.datachannel_getId = function(peerId)
  {
    return this._id
    //
  }

  PeerConnection.prototype.datachannel_setPeerId = function(peerId)
  {
    this._peerId = peerId
    //
  }

  // Add required methods to PeerConnection
  PeerConnection.prototype._createDataChannel = function(label, reliable)
  {
    var channel = new DataChannel()
        channel.label = label
        channel.reliable = true

    if(reliable != undefined)
      channel.reliable = reliable

    this._datachannels = this._datachannels || {}
    this._datachannels[label] = channel
    channel._pc = this

    return channel
  }

  PeerConnection.prototype.createDataChannel = function(label, dataChannelDict)
  {
    if(this.readyState == "closed")
      throw INVALID_STATE_ERR;

    label = label || ""
    dataChannelDict = dataChannelDict || {}

    var channel = this._createDataChannel(label, dataChannelDict.reliable)

    if(!this._udt)
        createUDT(this);
    this._udt.emit("PeerConnection.createDataChannel", this._peerId, label)

    return channel
  }

  PeerConnection.prototype._ondatachannel = function(data)
  {
    if(this.readyState == "closed")
      return;

    var configuration = data.configuration

    var channel = this._createDataChannel(configuration.label,
                                           configuration.reliable)

    channel.readyState = "open"

    if(!this._udt)
        createUDT(this);
    this._udt.emit("datachannel.ready", this._peerId, channel.label)

    var evt = document.createEvent('Event')
        evt.initEvent('datachannel', true, true)
        evt.channel = channel

    if(this.ondatachannel)
      this.ondatachannel(evt);
  });

  // DataChannel polyfill using websockets as 'underlying data transport'
  function DataChannel()
  {
//    bufferedAmount;

//    onopen;
//    onerror;
//    onclose;
//    binaryType;

//    channel.close = function(){};

    this.send = function(data)
    {
      this._pc._udt.emit("DataChannel.send", this._pc._peerId, this.label, data)
    }

    this.readyState = "connecting"
  }
}).call(this);