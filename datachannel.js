(function(module)
{
  // DataChannel polyfill using websockets as 'underlying data transport'
  var DataChannel = function()
  {
    var channel = {}

    // EventTarget interface
    channel._events = {};

    channel.addEventListener = function(type, listener)
    {
      channel._events[type] = channel._events[type] || [];
      channel._events[type].push(listener);
    };

    channel.dispatchEvent = function(event)
    {
      if(typeof event == "string")
        event = document.createEvent('Event').initEvent(event, true, true)

      var events = channel._events[event.type];
      if(!events)
        return;

      var args = Array.prototype.slice.call(arguments, 1);

      for(var i = 0, len = events.length; i < len; i++)
        events[i].apply(null, args);
    };

    channel.removeEventListener = function(type, listener)
    {
      var events = channel._events[type];
      if(!events)
        return;

      events.splice(events.indexOf(listener), 1)

      if(!events.length)
        delete channel._events[type]
    };

//    bufferedAmount;

//    onopen;
//    onerror;
//    onclose;
//    binaryType;

//    channel.close = function(){};

    channel.send = function(data)
    {
      rtc.emit("datachannel.send",
      {
        "socketId": channel._peer,
        "label": channel.label,
        "message": data
      })
    }

    channel.readyState = "connecting"

    return channel
  }
}).call(this);