DataChannel-polyfill
====================

Web browser polyfill that implement the WebRTC DataChannel API over a websocket

Credits
-------
Jesús Leganés Combarro "Piranna" <piranna@gmail.com>

This code can be found at https://github.com/piranna/DataChannel-polyfill

How to use it
-------------

The polyfill is splitted in two parts, the polyfill 'per se' at datachannel.js
and the server backend at server-datachannel.js (it needs Node.js, obviusly). To
use it it's a matter of three steps:

1. include the datachannel.js file on a script tag on the head section of yout
   HTML code and call to DCPF_install() function giving the backend server URL
   as parameter

2. run the backend server

3. there's no third step! :-)

Future work
-----------
* Remove the PeerConnection._datachannel attribute because it's outside the
  standard and allow to do the registration on client code (yes, uncroyable but
  doesn't works... :-( )

* Work using SSL (a problem with the certificates?)

* Detect and allow the coexistence of native and polyfill implementations on the
  same network (use polyfill if one of the two ends doesn't support native
  DataChannels)

* Implement the full API specification and maintain the code over the time
