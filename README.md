DataChannel-polyfill
====================

Web browser polyfill that implement the WebRTC DataChannel API over a websocket.
It implement the full latest DataChannel API specification defined at 2013-01-16.

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

There's also two (public) SSL enabled backend servers that you can use at
wss://datachannel-polyfill.nodejitsu.com and wss://datachannel-piranna.dotcloud.com.
Just for testing purposes please, the bandwidth is high, but not infinite... :-)

How to test it
--------------
On the 'test' folder you can find a little P2P chat that can be used for testing
or just learn how to use the DataChannel API. To run it

1. add a copy of datachannel.js file on the 'test' folder (a symbolic link is
   enought)

2. run the test server

3. run the backend server (by default is using the one at Nodejitsu)

4. open several browsers pointing to http://localhost:8000 to start chatting :-)

Don't worry about the dotcloud.yml and supervisord.conf files, they are specific
for the dotCloud backend server.

Requeriments
------------
* a web browser with the PeerConnection object (currently Chrome/Chromium >= 19)

* a Node.js server with the 'ws' module installed for the backend server

Future work
-----------
* Use native implementations if both ends support them (currently it requires at
  least one of the ends doesn't support native DataChannels so it can use the
  polyfill).

* Detect and allow the coexistence of native and polyfill implementations on the
  same network (use polyfill if one of the two ends doesn't support native
  DataChannels)
