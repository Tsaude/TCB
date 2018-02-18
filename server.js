'use strict';

const express = require('express');
const app = express();
const http = require('http').Server(app);

app.use(express.static('static'));

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

http.listen(3001, function(){
  console.log('listening on *:3001');
});

const io = require('socket.io')(http);

require("./chess")(io);