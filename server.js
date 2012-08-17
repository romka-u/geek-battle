var express = require('express'),
    $ = require('jquery'),
    socketio = require('socket.io');

var app = express.createServer();

/**
 * App configuration.
 */


app.configure(function () {
    app.set('views', __dirname);

    // make a custom html template
    app.register('.html', {
    compile: function(str, options){
      return function(locals){
        return str;
      };
    }
    });
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

io = socketio.listen(app);
io.configure(function () { 
    io.set("transports", ["xhr-polling"]); 
    io.set("polling duration", 10); 
});

var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
$.support.cors = true;
$.ajaxSettings.xhr = function () {
    return new XMLHttpRequest;
}

var tasks = [];

function get_tasks(socket) {
    tasks = [];
    for (var i = 0; i < 5; i++) {
        $.getJSON('http://geekbeta-nbeloglazov.dotcloud.com/task', 
            {type: 'base-conversion', level: '3'}, 
            function(task) {
                tasks.push(task);
                console.log(task);
                if (tasks.length == 5)
                    socket.emit('game loaded');
            });
    }
}

nicknames = {}

io.sockets.on('connection', function (socket) {
    socket.next_task = 0;
    socket.nickname = nick = (socket.id).toString().substr(0, 7);
    nicknames[nick] = nick
    socket.broadcast.emit('announcement', nick + ' connected');
    io.sockets.emit('nicknames', nicknames);

    socket.on('get task', function() {
        socket.emit('show task', tasks[socket.next_task]);
        if (socket.next_task < 5)
            socket.next_task += 1
    });

    socket.on('new game', function() {
        socket.next_task = 0;
        get_tasks(socket);
    });

    socket.on('user message', function (msg) {
        socket.broadcast.emit('user message', socket.nickname, msg);
    });

    socket.on('disconnect', function () {
        if (!socket.nickname) return;

        delete nicknames[socket.nickname];
        socket.broadcast.emit('announcement', socket.nickname + ' disconnected');
        socket.broadcast.emit('nicknames', nicknames);
    });
});
