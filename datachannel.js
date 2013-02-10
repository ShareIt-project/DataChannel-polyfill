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

  //Holds the STUN server to use for PeerConnections.
  var SERVER = "stun:stun.l.google.com:19302";

  // Check if browser has support for native WebRTC DataChannel
  function checkSupport()
  {
    var pc = new RTCPeerConnection({"iceServers": [{"url": SERVER}]})

    try
    {
      pc.createDataChannel('DCPF_install__checkSupport')
    }
    catch(e)
    {
      return
    }

    return RTCPeerConnection.prototype.createDataChannel
  }

  // Check for native createDataChannel support to enable the polyfill
  var createDataChannel = checkSupport()

  // DataChannel polyfill using WebSockets as 'underlying data transport'
  function RTCDataChannel(configuration)
  {
    var self = this

    // Use a WebSocket as 'underlying data transport' to create the DataChannel
    this._udt = new WebSocket(ws_url)
    this._udt.addEventListener('close', function(event)
    {
      self.dispatchEvent(event)
    })
    this._udt.addEventListener('error', function(event)
    {
      self.dispatchEvent(event)
    })

    this.close = function(){this._udt.close()}
    this.send  = function(data){this._udt.send(data)}

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

  // Basic EventTarget functionality from on EventTarget.js
  // https://raw.github.com/piranna/EventTarget.js
  RTCDataChannel.prototype = new function()
  {
    var listeners = {};

    // EventTarget methods
    this.addEventListener = function(type, handler, bubble)
    {
      if(listeners[type] === undefined)
         listeners[type] = [];

      if(listeners[type].indexOf(handler) === -1)
         listeners[type].push(handler);
    };
    this.dispatchEvent = function(event)
    {
      var listenerArray = listeners[event.type];

      if(listenerArray !== undefined)
        for(var i=0, listener; listener=listenerArray[i]; i++)
          listener.call(this, event);
    };
    this.removeEventListener = function(type, handler)
    {
      var index = listeners[type].indexOf(listener);

      if(index !== -1)
        listeners[type].splice(index, 1);
    };

    // EventListeners
    this.__defineSetter__('onclose', function(handler)
    {
      this.addEventListener('close', handler, false)
    });
    this.__defineSetter__('onerror', function(handler)
    {
      this.addEventListener('error', handler, false)
    });
    this.__defineSetter__('onmessage', function(handler)
    {
      this.addEventListener('message', handler, false)
    });
    this.__defineSetter__('onopen', function(handler)
    {
      this.addEventListener('open', handler, false)
    });
  }

  // Create a signalling channel with a WebSocket on the proxy server with the
  // defined ID and wait for new 'create' messages to create new DataChannels
  function setId(pc, id)
  {
    if(pc._signaling)
       pc._signaling.close();

    pc._signaling = new WebSocket(ws_url)
    pc._signaling.onopen = function(event)
    {
      this.onmessage = function(event)
      {
        var args = JSON.parse(event.data)

        switch(args[0])
        {
          case 'create':
            ondatachannel(pc, args[1], args[2])
            break

          // Both peers support native DataChannels
          case 'create.native':
            // Make native DataChannels to be created by default
            pc.prototype.createDataChannel = createDataChannel
        }
      }

      this.send(JSON.stringify(['setId', "pc."+id, Boolean(createDataChannel)]))
    }
    pc._signaling.onerror = function(event)
    {
      console.error(event)
    }
  }

  // Set the PeerConnection peer ID
  function setPeerId(pc, peerId)
  {
    pc._peerId = "pc."+peerId
  }


  // Public function to initiate the creation of a new DataChannel
  RTCPeerConnection.prototype.createDataChannel = function(label, dataChannelDict)
  {
    if(!this._peerId)
    {
      console.warn("peerId is not defined")
      return
    }

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
        channel._udt.onopen = function(event)
        {
          // Wait until the other end of the channel is ready
          function onmessage(event)
          {
            var args = JSON.parse(event.data);

            var eventName = args[0]

            switch(eventName)
            {
              // Both peers support native DataChannels
              case 'create.native':
                // Close the ad-hoc signaling channel
                if(self._signaling)
                   self._signaling.close();

                // Make native DataChannels to be created by default
                self.prototype.createDataChannel = createDataChannel

                // Start native DataChannel connection
                self.createDataChannel(label, dataChannelDict)
                break

              // Connection through backend server is ready
              case 'ready':
                // Back-ward compatibility
                if(self.readyState)
                  self.signalingState = self.readyState
                // Back-ward compatibility

                // PeerConnection is closed, do nothing
                if(self.signalingState == "closed")
                  return;

                this.removeEventListener('message', onmessage)
                this.addEventListener('message', function(event)
                {
                  channel.dispatchEvent(event)
                })

                // Set channel as open
                var event = document.createEvent('Event')
                    event.initEvent('open', true, true)
                    event.channel = channel

                channel.dispatchEvent(event)
                break

              default:
                console.error("Unknown event '"+eventName+"'")
            }
          }

          channel._udt.addEventListener('message', onmessage)

          // Query to the other peer to create a new DataChannel with us
          channel.send(JSON.stringify(["create", self._peerId, configuration,
                                       Boolean(createDataChannel)]))
        }

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
        channel._udt.onopen = function(event)
        {
          this.addEventListener('message', function(event)
          {
            channel.dispatchEvent(event)
          })

          // Set channel as open
          channel.send(JSON.stringify(["ready", socketId]))

          var event = document.createEvent('Event')
              event.initEvent('datachannel', true, true)
              event.channel = channel

          pc.dispatchEvent(event);
        }
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
    setId(this, getId(description))

    setLocalDescription.call(this, description, successCallback, failureCallback)
  }

  RTCPeerConnection.prototype.setRemoteDescription = function(description,
                                                              successCallback,
                                                              failureCallback)
  {
    setPeerId(this, getId(description))

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