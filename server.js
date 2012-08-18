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

function get_tasks() {
    tasks = [];
    task_count = 10;
    for (var i = 0; i < task_count; i++) {
        $.getJSON('http://geekbeta-nbeloglazov.dotcloud.com/task', 
            {type: 'base-conversion', level: '1'}, 
            function(task) {
                tasks.push(task);
                console.log(task);
                if (tasks.length == task_count)
                    io.sockets.emit('game loaded');
            });
    }
}

nicknames = {}
scores = {}
next_task = {}

function send_next_task(socket) {
    console.log("send " + next_task[socket.nickname] + " task to " + socket.nickname);
    socket.emit('show task', tasks[next_task[socket.nickname]]);
    if (next_task[socket.nickname] < tasks.length)
        next_task[socket.nickname] += 1;
}

io.sockets.on('connection', function (socket) {
    socket.on('nickname', function(nick, fn) {
        console.log("received nickname " + nick)
        socket.next_task = 0;
        socket.nickname = nick;
        nicknames[nick] = nick;
        scores[nick] = 0;
        socket.broadcast.emit('announcement', nick + ' connected');
        io.sockets.emit('nicknames', nicknames);
        socket.emit('announcement', 'Welcome to Geek-Battle, ' + nick + '!');
    });
    
    socket.on('get task', function(ans) {
        // if (ans == false) setTimeout(send_next_task(socket), 7000);
        // else send_next_task(socket);
        if (ans) {
            scores[socket.nickname] += 1;
        }
        send_next_task(socket);
        io.sockets.emit('scores', nicknames, scores, next_task);
    });

    socket.on('new game', function() {
        for (var s in nicknames)
            next_task[s] = 0;
        get_tasks(socket);
    });

    socket.on('user message', function (msg) {
        socket.broadcast.emit('user message', socket.nickname, msg);
    });

    socket.on('disconnect', function () {
        if (!socket.nickname) return;

        delete nicknames[socket.nickname];
        delete scores[socket.nickname];
        socket.broadcast.emit('announcement', socket.nickname + ' disconnected');
        socket.broadcast.emit('nicknames', nicknames);
    });
});
