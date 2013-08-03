/*! datachannel.js build:1.0.0-3, development. Copyright(c) 2013 Jesús Leganés Combarro "Piranna" <piranna@gmail.com> */
(function(exports){
/**
 * @author mrdoob / http://mrdoob.com/
 * @author Jesús Leganés Combarro "Piranna" <piranna@gmail.com>
 */

var EventTarget = function()
{
	var listeners = {};

	this.addEventListener = function(type, listener)
	{
		if(listeners[type] === undefined)
			listeners[type] = [];

		if(listeners[type].indexOf(listener) === -1)
			listeners[type].push(listener);
	};

	this.dispatchEvent = function(event)
	{
		var listenerArray = (listeners[event.type] || []);

		var dummyListener = this['on' + event.type];
		if(typeof dummyListener == 'function')
			listenerArray = listenerArray.concat(dummyListener);

		for(var i=0, l=listenerArray.length; i<l; i++)
			listenerArray[i].call(this, event);
	};

	this.removeEventListener = function(type, listener)
	{
		var index = listeners[type].indexOf(listener);

		if(index !== -1)
			listeners[type].splice(index, 1);
	};
};

exports.EventTarget = EventTarget;/*! reliable.min.js build:0.1.0, production. Copyright(c) 2013 Michelle Bu <michelle@michellebu.com> */(function(e){function n(){this._pieces=[],this._parts=[]}function r(e){this.index=0,this.dataBuffer=e,this.dataView=new Uint8Array(this.dataBuffer),this.length=this.dataBuffer.byteLength}function i(e){this.utf8=e,this.bufferBuilder=new n}function o(e,t){if(!(this instanceof o))return new o(e);this._dc=e,s.debug=t,this._outgoing={},this._incoming={},this._received={},this._window=1e3,this._mtu=500,this._interval=0,this._count=0,this._queue=[],this._setupDC()}var t={};t.useBlobBuilder=function(){try{return new Blob([]),!1}catch(e){return!0}}(),t.useArrayBufferView=!t.useBlobBuilder&&function(){try{return(new Blob([new Uint8Array([])])).size===0}catch(e){return!0}}(),e.binaryFeatures=t,e.BlobBuilder=window.WebKitBlobBuilder||window.MozBlobBuilder||window.MSBlobBuilder||window.BlobBuilder,n.prototype.append=function(e){typeof e=="number"?this._pieces.push(e):(this._flush(),this._parts.push(e))},n.prototype._flush=function(){if(this._pieces.length>0){var e=new Uint8Array(this._pieces);t.useArrayBufferView||(e=e.buffer),this._parts.push(e),this._pieces=[]}},n.prototype.getBuffer=function(){this._flush();if(t.useBlobBuilder){var e=new BlobBuilder;for(var n=0,r=this._parts.length;n<r;n++)e.append(this._parts[n]);return e.getBlob()}return new Blob(this._parts)},e.BinaryPack={unpack:function(e){var t=new r(e);return t.unpack()},pack:function(e,t){var n=new i(t),r=n.pack(e);return r}},r.prototype.unpack=function(){var e=this.unpack_uint8();if(e<128){var t=e;return t}if((e^224)<32){var n=(e^224)-32;return n}var r;if((r=e^160)<=15)return this.unpack_raw(r);if((r=e^176)<=15)return this.unpack_string(r);if((r=e^144)<=15)return this.unpack_array(r);if((r=e^128)<=15)return this.unpack_map(r);switch(e){case 192:return null;case 193:return undefined;case 194:return!1;case 195:return!0;case 202:return this.unpack_float();case 203:return this.unpack_double();case 204:return this.unpack_uint8();case 205:return this.unpack_uint16();case 206:return this.unpack_uint32();case 207:return this.unpack_uint64();case 208:return this.unpack_int8();case 209:return this.unpack_int16();case 210:return this.unpack_int32();case 211:return this.unpack_int64();case 212:return undefined;case 213:return undefined;case 214:return undefined;case 215:return undefined;case 216:return r=this.unpack_uint16(),this.unpack_string(r);case 217:return r=this.unpack_uint32(),this.unpack_string(r);case 218:return r=this.unpack_uint16(),this.unpack_raw(r);case 219:return r=this.unpack_uint32(),this.unpack_raw(r);case 220:return r=this.unpack_uint16(),this.unpack_array(r);case 221:return r=this.unpack_uint32(),this.unpack_array(r);case 222:return r=this.unpack_uint16(),this.unpack_map(r);case 223:return r=this.unpack_uint32(),this.unpack_map(r)}},r.prototype.unpack_uint8=function(){var e=this.dataView[this.index]&255;return this.index++,e},r.prototype.unpack_uint16=function(){var e=this.read(2),t=(e[0]&255)*256+(e[1]&255);return this.index+=2,t},r.prototype.unpack_uint32=function(){var e=this.read(4),t=((e[0]*256+e[1])*256+e[2])*256+e[3];return this.index+=4,t},r.prototype.unpack_uint64=function(){var e=this.read(8),t=((((((e[0]*256+e[1])*256+e[2])*256+e[3])*256+e[4])*256+e[5])*256+e[6])*256+e[7];return this.index+=8,t},r.prototype.unpack_int8=function(){var e=this.unpack_uint8();return e<128?e:e-256},r.prototype.unpack_int16=function(){var e=this.unpack_uint16();return e<32768?e:e-65536},r.prototype.unpack_int32=function(){var e=this.unpack_uint32();return e<Math.pow(2,31)?e:e-Math.pow(2,32)},r.prototype.unpack_int64=function(){var e=this.unpack_uint64();return e<Math.pow(2,63)?e:e-Math.pow(2,64)},r.prototype.unpack_raw=function(e){if(this.length<this.index+e)throw new Error("BinaryPackFailure: index is out of range "+this.index+" "+e+" "+this.length);var t=this.dataBuffer.slice(this.index,this.index+e);return this.index+=e,t},r.prototype.unpack_string=function(e){var t=this.read(e),n=0,r="",i,s;while(n<e)i=t[n],i<128?(r+=String.fromCharCode(i),n++):(i^192)<32?(s=(i^192)<<6|t[n+1]&63,r+=String.fromCharCode(s),n+=2):(s=(i&15)<<12|(t[n+1]&63)<<6|t[n+2]&63,r+=String.fromCharCode(s),n+=3);return this.index+=e,r},r.prototype.unpack_array=function(e){var t=new Array(e);for(var n=0;n<e;n++)t[n]=this.unpack();return t},r.prototype.unpack_map=function(e){var t={};for(var n=0;n<e;n++){var r=this.unpack(),i=this.unpack();t[r]=i}return t},r.prototype.unpack_float=function(){var e=this.unpack_uint32(),t=e>>31,n=(e>>23&255)-127,r=e&8388607|8388608;return(t==0?1:-1)*r*Math.pow(2,n-23)},r.prototype.unpack_double=function(){var e=this.unpack_uint32(),t=this.unpack_uint32(),n=e>>31,r=(e>>20&2047)-1023,i=e&1048575|1048576,s=i*Math.pow(2,r-20)+t*Math.pow(2,r-52);return(n==0?1:-1)*s},r.prototype.read=function(e){var t=this.index;if(t+e<=this.length)return this.dataView.subarray(t,t+e);throw new Error("BinaryPackFailure: read index out of range")},i.prototype.pack=function(e){var n=typeof e;if(n=="string")this.pack_string(e);else if(n=="number")Math.floor(e)===e?this.pack_integer(e):this.pack_double(e);else if(n=="boolean")e===!0?this.bufferBuilder.append(195):e===!1&&this.bufferBuilder.append(194);else if(n=="undefined")this.bufferBuilder.append(192);else{if(n!="object")throw new Error('Type "'+n+'" not yet supported');if(e===null)this.bufferBuilder.append(192);else{var r=e.constructor;if(r==Array)this.pack_array(e);else if(r==Blob||r==File)this.pack_bin(e);else if(r==ArrayBuffer)t.useArrayBufferView?this.pack_bin(new Uint8Array(e)):this.pack_bin(e);else if("BYTES_PER_ELEMENT"in e)t.useArrayBufferView?this.pack_bin(e):this.pack_bin(e.buffer);else if(r==Object)this.pack_object(e);else if(r==Date)this.pack_string(e.toString());else{if(typeof e.toBinaryPack!="function")throw new Error('Type "'+r.toString()+'" not yet supported');this.bufferBuilder.append(e.toBinaryPack())}}}return this.bufferBuilder.getBuffer()},i.prototype.pack_bin=function(e){var t=e.length||e.byteLength||e.size;if(t<=15)this.pack_uint8(160+t);else if(t<=65535)this.bufferBuilder.append(218),this.pack_uint16(t);else{if(!(t<=4294967295))throw new Error("Invalid length");this.bufferBuilder.append(219),this.pack_uint32(t)}this.bufferBuilder.append(e)},i.prototype.pack_string=function(e){var t;if(this.utf8){var n=new Blob([e]);t=n.size}else t=e.length;if(t<=15)this.pack_uint8(176+t);else if(t<=65535)this.bufferBuilder.append(216),this.pack_uint16(t);else{if(!(t<=4294967295))throw new Error("Invalid length");this.bufferBuilder.append(217),this.pack_uint32(t)}this.bufferBuilder.append(e)},i.prototype.pack_array=function(e){var t=e.length;if(t<=15)this.pack_uint8(144+t);else if(t<=65535)this.bufferBuilder.append(220),this.pack_uint16(t);else{if(!(t<=4294967295))throw new Error("Invalid length");this.bufferBuilder.append(221),this.pack_uint32(t)}for(var n=0;n<t;n++)this.pack(e[n])},i.prototype.pack_integer=function(e){if(-32<=e&&e<=127)this.bufferBuilder.append(e&255);else if(0<=e&&e<=255)this.bufferBuilder.append(204),this.pack_uint8(e);else if(-128<=e&&e<=127)this.bufferBuilder.append(208),this.pack_int8(e);else if(0<=e&&e<=65535)this.bufferBuilder.append(205),this.pack_uint16(e);else if(-32768<=e&&e<=32767)this.bufferBuilder.append(209),this.pack_int16(e);else if(0<=e&&e<=4294967295)this.bufferBuilder.append(206),this.pack_uint32(e);else if(-2147483648<=e&&e<=2147483647)this.bufferBuilder.append(210),this.pack_int32(e);else if(-0x8000000000000000<=e&&e<=0x8000000000000000)this.bufferBuilder.append(211),this.pack_int64(e);else{if(!(0<=e&&e<=0x10000000000000000))throw new Error("Invalid integer");this.bufferBuilder.append(207),this.pack_uint64(e)}},i.prototype.pack_double=function(e){var t=0;e<0&&(t=1,e=-e);var n=Math.floor(Math.log(e)/Math.LN2),r=e/Math.pow(2,n)-1,i=Math.floor(r*Math.pow(2,52)),s=Math.pow(2,32),o=t<<31|n+1023<<20|i/s&1048575,u=i%s;this.bufferBuilder.append(203),this.pack_int32(o),this.pack_int32(u)},i.prototype.pack_object=function(e){var t=Object.keys(e),n=t.length;if(n<=15)this.pack_uint8(128+n);else if(n<=65535)this.bufferBuilder.append(222),this.pack_uint16(n);else{if(!(n<=4294967295))throw new Error("Invalid length");this.bufferBuilder.append(223),this.pack_uint32(n)}for(var r in e)e.hasOwnProperty(r)&&(this.pack(r),this.pack(e[r]))},i.prototype.pack_uint8=function(e){this.bufferBuilder.append(e)},i.prototype.pack_uint16=function(e){this.bufferBuilder.append(e>>8),this.bufferBuilder.append(e&255)},i.prototype.pack_uint32=function(e){var t=e&4294967295;this.bufferBuilder.append((t&4278190080)>>>24),this.bufferBuilder.append((t&16711680)>>>16),this.bufferBuilder.append((t&65280)>>>8),this.bufferBuilder.append(t&255)},i.prototype.pack_uint64=function(e){var t=e/Math.pow(2,32),n=e%Math.pow(2,32);this.bufferBuilder.append((t&4278190080)>>>24),this.bufferBuilder.append((t&16711680)>>>16),this.bufferBuilder.append((t&65280)>>>8),this.bufferBuilder.append(t&255),this.bufferBuilder.append((n&4278190080)>>>24),this.bufferBuilder.append((n&16711680)>>>16),this.bufferBuilder.append((n&65280)>>>8),this.bufferBuilder.append(n&255)},i.prototype.pack_int8=function(e){this.bufferBuilder.append(e&255)},i.prototype.pack_int16=function(e){this.bufferBuilder.append((e&65280)>>8),this.bufferBuilder.append(e&255)},i.prototype.pack_int32=function(e){this.bufferBuilder.append(e>>>24&255),this.bufferBuilder.append((e&16711680)>>>16),this.bufferBuilder.append((e&65280)>>>8),this.bufferBuilder.append(e&255)},i.prototype.pack_int64=function(e){var t=Math.floor(e/Math.pow(2,32)),n=e%Math.pow(2,32);this.bufferBuilder.append((t&4278190080)>>>24),this.bufferBuilder.append((t&16711680)>>>16),this.bufferBuilder.append((t&65280)>>>8),this.bufferBuilder.append(t&255),this.bufferBuilder.append((n&4278190080)>>>24),this.bufferBuilder.append((n&16711680)>>>16),this.bufferBuilder.append((n&65280)>>>8),this.bufferBuilder.append(n&255)};var s={debug:!1,inherits:function(e,t){e.super_=t,e.prototype=Object.create(t.prototype,{constructor:{value:e,enumerable:!1,writable:!0,configurable:!0}})},extend:function(e,t){for(var n in t)t.hasOwnProperty(n)&&(e[n]=t[n]);return e},pack:BinaryPack.pack,unpack:BinaryPack.unpack,log:function(){if(s.debug){var e=[];for(var t=0;t<arguments.length;t++)e[t]=arguments[t];e.unshift("Reliable: "),console.log.apply(console,e)}},setZeroTimeout:function(e){function r(r){t.push(r),e.postMessage(n,"*")}function i(r){r.source==e&&r.data==n&&(r.stopPropagation&&r.stopPropagation(),t.length&&t.shift()())}var t=[],n="zero-timeout-message";return e.addEventListener?e.addEventListener("message",i,!0):e.attachEvent&&e.attachEvent("onmessage",i),r}(this),blobToArrayBuffer:function(e,t){var n=new FileReader;n.onload=function(e){t(e.target.result)},n.readAsArrayBuffer(e)},blobToBinaryString:function(e,t){var n=new FileReader;n.onload=function(e){t(e.target.result)},n.readAsBinaryString(e)},binaryStringToArrayBuffer:function(e){var t=new Uint8Array(e.length);for(var n=0;n<e.length;n++)t[n]=e.charCodeAt(n)&255;return t.buffer},randomToken:function(){return Math.random().toString(36).substr(2)}};o.prototype.send=function(e){var t=s.pack(e,!0);if(t.size<this._mtu){this._handleSend(["no",t]);return}this._outgoing[this._count]={ack:0,chunks:this._chunk(t)},s.debug&&(this._outgoing[this._count].timer=new Date),this._sendWindowedChunks(this._count),this._count+=1},o.prototype._setupInterval=function(){var e=this;this._timeout=setInterval(function(){var t=e._queue.shift();if(t._multiple)for(var n=0,r=t.length;n<r;n+=1)e._intervalSend(t[n]);else e._intervalSend(t)},this._interval)},o.prototype._intervalSend=function(e){var t=this;e=s.pack(e,!0),s.blobToBinaryString(e,function(e){t._dc.send(e)}),t._queue.length===0&&(clearTimeout(t._timeout),t._timeout=null)},o.prototype._processAcks=function(){for(var e in this._outgoing)this._outgoing.hasOwnProperty(e)&&this._sendWindowedChunks(e)},o.prototype._handleSend=function(e){var t=!0;for(var n=0,r=this._queue.length;n<r;n+=1){var i=this._queue[n];i===e?t=!1:i._multiple&&i.indexOf(e)!==-1&&(t=!1)}t&&(this._queue.push(e),this._timeout||this._setupInterval())},o.prototype._setupDC=function(){var e=this;this._dc.onmessage=function(t){var n=t.data,r=n.constructor;if(r===String){var i=s.binaryStringToArrayBuffer(n);n=s.unpack(i),e._handleMessage(n)}}},o.prototype._handleMessage=function(e){var t=e[1],n=this._incoming[t],r=this._outgoing[t],i;switch(e[0]){case"no":var o=t;if(!!o){var u=document.createEvent("Event");u.initEvent("message",!0,!0),u.data=s.unpack(o),this.dispatchEvent(u)}break;case"end":i=n,this._received[t]=e[2];if(!i)break;this._ack(t);break;case"ack":i=r;if(!!i){var a=e[2];i.ack=Math.max(a,i.ack),i.ack>=i.chunks.length?(s.log("Time: ",new Date-i.timer),delete this._outgoing[t]):this._processAcks()}break;case"chunk":i=n;if(!i){var f=this._received[t];if(f===!0)break;i={ack:["ack",t,0],chunks:[]},this._incoming[t]=i}var l=e[2],c=e[3];i.chunks[l]=new Uint8Array(c),l===i.ack[2]&&this._calculateNextAck(t),this._ack(t);break;default:this._handleSend(e)}},o.prototype._chunk=function(e){var t=[],n=e.size,r=0;while(r<n){var i=Math.min(n,r+this._mtu),o=e.slice(r,i),u={payload:o};t.push(u),r=i}return s.log("Created",t.length,"chunks."),t},o.prototype._ack=function(e){var t=this._incoming[e].ack;this._received[e]===t[2]&&(this._complete(e),this._received[e]=!0),this._handleSend(t)},o.prototype._calculateNextAck=function(e){var t=this._incoming[e],n=t.chunks;for(var r=0,i=n.length;r<i;r+=1)if(n[r]===undefined){t.ack[2]=r;return}t.ack[2]=n.length},o.prototype._sendWindowedChunks=function(e){s.log("sendWindowedChunks for: ",e);var t=this._outgoing[e],n=t.chunks,r=[],i=Math.min(t.ack+this._window,n.length);for(var o=t.ack;o<i;o+=1)if(!n[o].sent||o===t.ack)n[o].sent=!0,r.push(["chunk",e,o,n[o].payload]);t.ack+this._window>=n.length&&r.push(["end",e,n.length]),r._multiple=!0,this._handleSend(r)},o.prototype._complete=function(e){s.log("Completed called for",e);var t=this,n=this._incoming[e].chunks,r=new Blob(n);s.blobToArrayBuffer(r,function(e){var n=document.createEvent("Event");n.initEvent("message",!0,!0),n.data=s.unpack(e),t.dispatchEvent(n)}),delete this._incoming[e]},o.prototype._listeners={},o.prototype.addEventListener=function(e,t,n){e=="message"?(this._listeners[e]===undefined&&(this._listeners[e]=[]),this._listeners[e].indexOf(t)===-1&&this._listeners[e].push(t)):this._dc.addEventListener(e,t,n)},o.prototype.dispatchEvent=function(e){if(type=="message"){var t=this._listeners[e.type]||[],n=this["on"+e.type];typeof n=="function"&&(t=t.concat(n));for(var r=0,i=t.length;r<i;r++)t[r].call(this,e)}else this._dc.dispatchEvent(e)},o.prototype.removeEventListener=function(e,t){if(e=="message"){var n=this._listeners[e].indexOf(t);n!==-1&&this._listeners[e].splice(n,1)}else this._dc.removeEventListener(e,t)},o.prototype.__defineGetter__("readyState",function(){return this._dc.readyState}),o.higherBandwidthSDP=function(e){var t=e.split("b=AS:30"),n="b=AS:102400";return t.length>1?t[0]+n+t[1]:e},o.prototype.addEventListener=function(e,t){this._dc.addEventListener(e,t)},o.prototype.dispatchEvent=function(e){this._dc.dispatchEvent(e)},o.prototype.removeEventListener=function(e,t){this._dc.removeEventListener(e,t)},o.prototype.onmessage=function(e){},e.Reliable=o})(this)/**
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

    EventTarget.call(this)

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

    // id
    var id = (dataChannelDict.id != undefined) ? dataChannelDict.id : 0
    this.__defineGetter__("id", function()
    {
      return id;
    });

    // maxRetransmitTime
    var maxRetransmitTime = (dataChannelDict.maxRetransmitTime != undefined) ? dataChannelDict.maxRetransmitTime : null
    this.__defineGetter__("maxRetransmitTime", function()
    {
      return maxRetransmitTime;
    });

    // maxRetransmits
    var maxRetransmits = (dataChannelDict.maxRetransmits != undefined) ? dataChannelDict.maxRetransmits : null
    this.__defineGetter__("maxRetransmits", function()
    {
      return maxRetransmits;
    });

    if(maxRetransmitTime && maxRetransmits)
      throw SyntaxError

    var reliable = !(maxRetransmitTime || maxRetransmits)

    // negotiated
    var negotiated = (dataChannelDict.negotiated != undefined) ? dataChannelDict.negotiated : false
    this.__defineGetter__("negotiated", function()
    {
      return negotiated;
    });

    // ordered
    var ordered = (dataChannelDict.ordered != undefined) ? dataChannelDict.ordered : false
    this.__defineGetter__("ordered", function()
    {
      return ordered;
    });

    // protocol
    var protocol = (dataChannelDict.protocol != undefined) ? dataChannelDict.protocol : ""
    this.__defineGetter__("protocol", function()
    {
      return protocol;
    });
  }


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
      var channel = event.channel;

      if(event.type == 'datachannel' && !(channel instanceof Reliable))
      {
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
      // Set channel as open
      channel.send(JSON.stringify(["ready", socketId]))

      // Set onmessage event to bypass messages to user defined function
      channel._udt.onmessage = function(event)
      {
        channel.dispatchEvent(event);
      }

      // Set channel as open
      var event = document.createEvent('Event')
          event.initEvent('open', true, true)

      channel.dispatchEvent(event);
    })

    var event = document.createEvent('Event')
        event.initEvent('datachannel', true, true)
        event.channel = channel

    pc.dispatchEvent(event);
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

exports.DCPF_install = DCPF_install;
})(this);
