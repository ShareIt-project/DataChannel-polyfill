/**
 * DataChannel polyfill
 * 
 * Web browser polyfill that implements the WebRTC DataChannel API over a
 * websocket. It implements the full latest DataChannel API specification
 * defined at 2013-01-16.
 * 
 * Copyright (C) 2012-2013 Jesús Leganés Combarro "Piranna" <piranna@gmail.com>
 * 
 * This code can be found at https://github.com/piranna/DataChannel-polyfill
 * 
 * 
 * This program is free software: you can redistribute it and/or modify it under
 * the terms of the GNU Affero General Public License as published by the Free
 * Software Foundation, either version 3 of the License, or (at your option) any
 * later version.
 * 
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more
 * details.
 * 
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */


/**
 * Install the polyfill
 * @param {String} ws_url URL to the backend server
 */
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

  var createDataChannel;
  var supportReliable = false;

  //Holds the STUN server to use for PeerConnections.
  var SERVER = "stun:stun.l.google.com:19302";

  // Check if browser has support for native WebRTC DataChannel
  var pc = new RTCPeerConnection({iceServers: [{url: SERVER}]},
                                 {optional: [{RtpDataChannels: true}]})

  try
  {
    // Check native
    pc.createDataChannel('DCPF_install__checkSupport',{reliable:false}).close();

    // Native support available, store the function
    createDataChannel = pc.createDataChannel

    // Check reliable
    pc.createDataChannel('DCPF_install__checkSupport').close();

    // Native reliable support available
    supportReliable = true
  }
  catch(e){}
  finally
  {
    pc.close()
  }


  // DataChannel polyfill using WebSockets as 'underlying data transport'
  function RTCDataChannel(label, dataChannelDict)
  {
    var self = this

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
    var reliable = (dataChannelDict.reliable != undefined) ? dataChannelDict.reliable : true
    this.__defineGetter__("reliable", function()
    {
      return reliable;
    });
  }
  RTCDataChannel.prototype = new EventTarget()


  function createUDT(pc, channel, onopen)
  {
    pc._channels = pc._channels || {}
    pc._channels[channel.label] = channel

    if(!pc._peerId)
    {
      console.warn("No peer ID")
      return
    }

    console.info("Creating UDT")

    // Use a WebSocket as 'underlying data transport' to create the DataChannel
    channel._udt = new WebSocket(ws_url)
    channel._udt.addEventListener('close', function(event)
    {
//      if(error && channel.onerror)
//      {
//        channel.onerror(error)
//        return
//      }

      channel.dispatchEvent(event);
    })
    channel._udt.addEventListener('error', function(event)
    {
      channel.dispatchEvent(event);
    })
    channel._udt.addEventListener('open', function(event)
    {
      onopen(channel, pc)
    })
  }


  // Public function to initiate the creation of a new DataChannel
  if(createDataChannel && !supportReliable && Reliable)
  {
    RTCPeerConnection.prototype.createDataChannel = function(label, dataChannelDict)
    {
      dataChannelDict = dataChannelDict || {}
      dataChannelDict.reliable = false

      var channel = new Reliable(createDataChannel.call(this, label, dataChannelDict))
          channel.label = label

      return channel
    }

    var dispatchEvent = RTCPeerConnection.prototype.dispatchEvent;
    RTCPeerConnection.prototype.dispatchEvent = function(event)
    {
      if(type == 'datachannel' && !(event.channel instanceof Reliable))
      {
        var channel = event.channel

        event.channel = new Reliable(channel)
        event.channel.label = channel.label
      }

      dispatchEvent.call(this, event)
    };
  }

  else
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

      var channel = new RTCDataChannel(label, dataChannelDict)

      createUDT(this, channel, onopen)

      return channel
    }


  // Private function to 'catch' the 'ondatachannel' event
  function ondatachannel(pc, socketId, label, dataChannelDict)
  {
    // Back-ward compatibility
    if(pc.readyState)
      pc.signalingState = pc.readyState
    // Back-ward compatibility

    if(pc.signalingState == "closed")
      return;

    var channel = new RTCDataChannel(label, dataChannelDict)

    createUDT(pc, channel, function(channel)
    {
      // Set onmessage event to bypass messages to user defined function
      channel._udt.onmessage = function(event)
      {
        channel.dispatchEvent(event);
      }

      // Set channel as open
      channel.send(JSON.stringify(["ready", socketId]))

      var event = document.createEvent('Event')
          event.initEvent('datachannel', true, true)
          event.channel = channel

      pc.dispatchEvent(event);
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
        {
          // Close the ad-hoc signaling channel
          if(pc._signaling)
             pc._signaling.close();

          // Make native DataChannels to be created by default
          pc.createDataChannel = createDataChannel

          // Start native DataChannel connection
          channel._udt = pc.createDataChannel(channel.label, channel.reliable)
        }
        break

        // Connection through backend server is ready
        case 'ready':
        {
          // Back-ward compatibility
          if(pc.readyState)
             pc.signalingState = pc.readyState
          // Back-ward compatibility

          // PeerConnection is closed, do nothing
          if(self.signalingState == "closed")
            return;

          // Set onmessage event to bypass messages to user defined function
          channel._udt.onmessage = function(event)
          {
            channel.dispatchEvent(event);
          }

          // Set channel as open
          var event = document.createEvent('Event')
              event.initEvent('open', true, true)

          channel.dispatchEvent(event);
        }
        break

        default:
          console.error("Unknown event '"+eventName+"'")
      }
    }

    // Query to the other peer to create a new DataChannel with us
    channel.send(JSON.stringify(['create', pc._peerId, channel.label,
                                 channel.reliable, Boolean(createDataChannel)]))
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

  if(!createDataChannel)
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
    this._signaling.onopen = function(event)
    {
      this.onmessage = function(event)
      {
        var args = JSON.parse(event.data)

        switch(args[0])
        {
          case 'create':
            ondatachannel(self, args[1], args[2], {reliable: args[3]})
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

  if(!createDataChannel)
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

  if(createDataChannel && !supportReliable && Reliable)
  {
    var createOffer  = RTCPeerConnection.prototype.createOffer;
    var createAnswer = RTCPeerConnection.prototype.createAnswer;

    RTCPeerConnection.prototype.createOffer = function(successCallback,
                                                       failureCallback,
                                                       constraints)
    {
      createOffer.call(this, function(offer)
      {
        offer.sdp = Reliable.higherBandwidthSDP(offer.sdp);
        successCallback(offer)
      },
      failureCallback, constraints)
    }

    RTCPeerConnection.prototype.createAnswer = function(successCallback,
                                                        failureCallback,
                                                        constraints)
    {
      createAnswer.call(this, function(answer)
      {
        answer.sdp = Reliable.higherBandwidthSDP(answer.sdp);
        successCallback(answer)
      },
      failureCallback, constraints)
    }
  }



  // Notify to the user if we have native DataChannels support or not
  if(createDataChannel)
  {
    if(supportReliable)
    {
      console.log("Both native and polyfill WebRTC DataChannel are available");
      return "native";
    }

    if(Reliable)
      console.warn("Native WebRTC DataChannel is not reliable, using polyfill instead");
    else
      console.error("Native WebRTC DataChannel is not reliable and not included polyfill");

    return "native no reliable";
  }

  console.warn("WebRTC DataChannel is only available thought polyfill");
  return "polyfill";
}