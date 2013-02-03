//     DataChannel polyfill Web browser polyfill that implements the WebRTC
//     DataChannel API over a websocket. It implements the full latest DataChannel 
//     API specification defined at 2012-10-21.
//     Copyright (C) 2013  Jesús Leganés Combarro

//     This program is free software: you can redistribute it and/or modify
//     it under the terms of the GNU Affero General Public License as
//     published by the Free Software Foundation, either version 3 of the
//     License, or (at your option) any later version.

//     This program is distributed in the hope that it will be useful,
//     but WITHOUT ANY WARRANTY; without even the implied warranty of
//     MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//     GNU Affero General Public License for more details.

//     You should have received a copy of the GNU Affero General Public License
//     along with this program.  If not, see <http://www.gnu.org/licenses/>.

function DCPF_install(ws_url)
{
  // Fallbacks for vendor-specific variables until the spec is finalized.
  var RTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection;

  // Check if browser has support for WebRTC PeerConnection
  if(RTCPeerConnection == undefined)
  {
    console.error("Your browser doesn't support RTCPeerConnection, please use "+
                  "one of the latest versions of Chrome/Chromium or Firefox");
    return "old browser";
  }

//Holds the STUN server to use for PeerConnections.
  var SERVER = "stun:stun.l.google.com:19302";

  // Check if browser has support for native WebRTC DataChannel
  function checkSupport()
  {
      var pc = new RTCPeerConnection({iceServers: [{url: SERVER}]},
                                     {optional: [{RtpDataChannels: true}]})

      try
      {
          var channel = pc.createDataChannel('DCPF_install__checkSupport',
                                             {reliable: false})
              channel.close();
      }
      catch(e)
      {
          return
      }

      return pc.createDataChannel
  }

  // Check for native createDataChannel support to enable the polyfill
  var createDataChannel = checkSupport()

  // DataChannel polyfill using WebSockets as 'underlying data transport'
  function RTCDataChannel(configuration)
  {
    var self = this

    this._configuration = configuration


    this.close = function()
    {
      if(this._udt)
         this._udt.close()
    }
    this.send  = function(data)
    {
      if(this._udt)
         this._udt.send(data)
    }

    // binaryType
    this.__defineGetter__("binaryType", function()
    {
      return self._udt.binaryType;
    });
    this.__defineSetter__("binaryType", function(binaryType)
    {
      self._udt.binaryType = binaryType;
    });

    // bufferedAmount
    this.__defineGetter__("bufferedAmount", function()
    {
      if(!self._udt)
        return 0

      return self._udt.bufferedAmount;
    });

    // label
    var label = configuration.label
    this.__defineGetter__("label", function()
    {
      return label;
    });

    // readyState
    this.__defineGetter__("readyState", function()
    {
      if(!self._udt)
        return "connecting"

      switch(self._udt.readyState)
      {
        case 0: return "connecting"
        case 1: return "open"
        case 2: return "closing"
        case 3: return "closed"
      }
    });

    // reliable
    var reliable = (configuration.reliable != undefined) ? configuration.reliable : true
    this.__defineGetter__("reliable", function()
    {
      return reliable;
    });
  }


  function createUDT(pc, channel, onopen)
  {
    pc._channels = pc._channels || {}
    pc._channels[channel.label] = channel

    if(!pc._peerId)
      return

    console.info("Creating UDT")

    // Use a WebSocket as 'underlying data transport' to create the DataChannel
    channel._udt = new WebSocket(ws_url)
    channel._udt.onclose = function()
    {
//      if(error && channel.onerror)
//      {
//        channel.onerror(error)
//        return
//      }

      if(channel.onclose)
         channel.onclose()
    }
    channel._udt.onerror = function(error)
    {
      if(channel.onerror)
         channel.onerror(error)
    }
    channel._udt.onopen = function()
    {
      onopen(channel, pc)
    }
  }


  // Public function to initiate the creation of a new DataChannel
  RTCPeerConnection.prototype.createDataChannel = function(label, dataChannelDict)
  {
    // Back-ward compatibility
    if(this.readyState)
      this.signalingState = this.readyState
    // Back-ward compatibility

    if(this.signalingState == "closed")
      throw INVALID_STATE;

    if(!label)
        throw "'label' is not defined"
    dataChannelDict = dataChannelDict || {}

    var configuration = {label: label}
    if(dataChannelDict.reliable != undefined)
        configuration.reliable = dataChannelDict.reliable;

    var self = this

    var channel = new RTCDataChannel(configuration)

    createUDT(this, channel, onopen)

    return channel
  }


  // Private function to 'catch' the 'ondatachannel' event
  function ondatachannel(pc, socketId, configuration)
  {
    // Back-ward compatibility
    if(pc.readyState)
      pc.signalingState = pc.readyState
    // Back-ward compatibility

    if(pc.signalingState == "closed")
      return;

    var channel = new RTCDataChannel(configuration)

    createUDT(pc, channel, function(channel)
    {
      // Set onmessage event to bypass messages to user defined function
      channel._udt.onmessage = function(message)
      {
        if(channel.onmessage)
           channel.onmessage(message)
      }

      // Set channel as open
      channel.send(JSON.stringify(["ready", socketId]))

      var evt = document.createEvent('Event')
          evt.initEvent('datachannel', true, true)
          evt.channel = channel

      if(pc.ondatachannel)
         pc.ondatachannel(evt);
    })
  }

  function onopen(channel, pc)
  {
    // Wait until the other end of the channel is ready
    channel._udt.onmessage = function(message)
    {
      var args = JSON.parse(message.data);

      var eventName = args[0]

      switch(eventName)
      {
        // Both peers support native DataChannels
        case 'create.native':
          // Close the ad-hoc signaling channel
          if(pc._signaling)
             pc._signaling.close();

          // Make native DataChannels to be created by default
          pc.createDataChannel = createDataChannel

          // Start native DataChannel connection
          channel._udt = pc.createDataChannel(channel._configuration.label,
                                              {reliable: channel._configuration.reliable})

          channel._udt.onclose = channel._udt.onclose
          channel._udt.onerror = channel._udt.onerror
          channel._udt.onopen  = channel._udt.onopen
          break

        // Connection through backend server is ready
        case 'ready':
          // Back-ward compatibility
          if(pc.readyState)
             pc.signalingState = pc.readyState
          // Back-ward compatibility

          // PeerConnection is closed, do nothing
          if(self.signalingState == "closed")
            return;

          // Set onmessage event to bypass messages to user defined function
          channel._udt.onmessage = function(message)
          {
            if(channel.onmessage)
               channel.onmessage(message)
          }

          // Set channel as open
          if(channel.onopen)
             channel.onopen()
          break

          default:
            console.error("Unknown event '"+eventName+"'")
      }
    }

    // Query to the other peer to create a new DataChannel with us
    channel.send(JSON.stringify(["create", pc._peerId, channel._configuration,
                                 Boolean(createDataChannel)]))
  }


  // Get the SDP session ID from a RTCSessionDescription object
  function getId(description)
  {
    var pattern = /^o=.+/gm
    var result = pattern.exec(description.sdp);

    return result[0].substring(2)
  }

  // Overwrite setters to catch the session IDs
  var setLocalDescription  = RTCPeerConnection.prototype.setLocalDescription
  var setRemoteDescription = RTCPeerConnection.prototype.setRemoteDescription
  var closeRTC = RTCPeerConnection.prototype.close;

  RTCPeerConnection.prototype.close = function()
  {
    if(this._signaling)
       this._signaling.close();

    closeRTC.call(this);
  };

  RTCPeerConnection.prototype.setLocalDescription = function(description,
                                                             successCallback,
                                                             failureCallback)
  {
    var self = this

    // Create a signalling channel with a WebSocket on the proxy server with the
    // defined ID and wait for new 'create' messages to create new DataChannels
    if(this._signaling)
       this._signaling.close();

    this._signaling = new WebSocket(ws_url)
    this._signaling.onopen = function()
    {
      this.onmessage = function(message)
      {
        var args = JSON.parse(message.data)

        switch(args[0])
        {
          case 'create':
            ondatachannel(self, args[1], args[2])
            break

          // Both peers support native DataChannels
          case 'create.native':
            // Make native DataChannels to be created by default
            self.createDataChannel = createDataChannel
        }
      }

      this.send(JSON.stringify(['setId', "pc."+getId(description),
                                Boolean(createDataChannel)]))
    }
    this._signaling.onerror = function(error)
    {
      console.error(error)
    }

    setLocalDescription.call(this, description, successCallback, failureCallback)
  }

  RTCPeerConnection.prototype.setRemoteDescription = function(description,
                                                              successCallback,
                                                              failureCallback)
  {
    // Set the PeerConnection peer ID
    this._peerId = "pc."+getId(description)

    // Initialize pending channels
    for(var label in this._channels)
    {
      var channel = this._channels[label]

      if(channel._udt == undefined)
        createUDT(this, channel, onopen)
    }

    setRemoteDescription.call(this, description, successCallback, failureCallback)
  }

  // Notify to the user if we have native DataChannels support or not
  if(createDataChannel)
  {
    console.log("Both native and polyfill WebRTC DataChannel are available");
    return "native";
  }

  console.warn("WebRTC DataChannel is only available thought polyfill");
  return "polyfill";
}