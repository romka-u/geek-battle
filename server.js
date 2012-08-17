var express = require('express');

var app = express.createServer();

/**
 * App configuration.
 */


app.configure(function () {
  // app.use(stylus.middleware({ src: __dirname + '/public', compile: compile }));
  // app.use(express.static(__dirname + '/public'));
  app.set('views', __dirname);
  // app.set('view engine', 'html');

  // make a custom html template
  app.register('.html', {
    compile: function(str, options){
      return function(locals){
        return str;
      };
    }
  });
/*
  function compile (str, path) {
    return stylus(str)
      .set('filename', path)
      .use(nib());
  };
*/
});

/**
 * App routes.
 */

app.get('/', function (req, res) {
  res.render('index.html', { layout: false });
});

/**
 * App listen.
 */

var port = process.env.PORT || 3000;
app.listen(port, function () {
  var addr = app.address();
  console.log('   app listening on http://' + addr.address + ':' + addr.port);
});

// Socket.io

socket=require("socket.io");
io=socket.listen(app);
io.configure(function () { 
  io.set("transports", ["xhr-polling"]); 
  io.set("polling duration", 10); 
});
/* io.sockets.on("connection",function(socket){
    console.log("new connection");
    socket.on("eventA",function(data){
        io.sockets.emit("eventB",data);
    }); 
}); */

var $ = require("jquery");
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
$.support.cors = true;
$.ajaxSettings.xhr = function () {
    return new XMLHttpRequest;
}

var tasks = [];

function get_tasks(socket) {
  tasks = [];
  for (var i = 0; i < 5; i++) {
    $.getJSON('http://geekbeta-nbeloglazov.dotcloud.com/task', {type: 'base-conversion', level: '3'}, function(task) {
      tasks.push(task);
      console.log(task);
      if (tasks.length == 5)
	socket.emit('game loaded');
    });
  }
}

io.sockets.on('connection', function (socket) {
  socket.next_task = 0;

  socket.on('set nickname', function (name) {
    socket.set('nickname', name, function () {
      socket.emit('ready');
    });
  });

  socket.on('msg', function () {
    socket.get('nickname', function (err, name) {
      console.log('Chat message by ', name);
    });
  });

  socket.on('get task', function() {
    socket.emit('show task', tasks[socket.next_task]);
    if (socket.next_task < 5)
      socket.next_task += 1
  });

  socket.on('new game', function() {
    socket.next_task = 0;
    get_tasks(socket);
  });
});
