var express = require('express'),
    $ = require('jquery'),
    socketio = require('socket.io');

var app = express.createServer();

/**
 * App configuration.
 */


app.configure(function () {
    app.set('views', __dirname);
    app.use(express.static(__dirname + '/public'));

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

tasks = [];
players = {};
answers = {};
task_desc = [];

function get_tasks() {
    tasks = [];
    task_count = 10;
    for (var i = 0; i < task_count; i++) {
        curtask = task_desc[Math.floor(Math.random() * task_desc.length)];
    
        // WARNING!!!
        // If responses will be shuffled, descriptions will not match.
        $.getJSON('http://geekbeta-nbeloglazov.dotcloud.com/task', 
            {type: curtask.type, level: '2'}, 
            function(task) {
                tasks.push(task);                
                console.log(task);
                if (tasks.length == task_count)
                    io.sockets.emit('game loaded');
            });
    }
}

$.getJSON('http://geekbeta-nbeloglazov.dotcloud.com/tasks', 
    {}, 
    function(tasks) {
        task_desc = tasks;
    });


function send_next_task(socket) {
    if (!players[socket.nick].ready) return;
    socket.emit('show task', tasks[players[socket.nick].next_task]);
    // if (players[socket.nick].next_task < tasks.length)
    players[socket.nick].next_task += 1;
}

function init_new_game() {
    answers = {};
    for (var pl in players) {
        players[pl].score = 0;
        players[pl].correct = 0;
        players[pl].next_task = 0;
        answers[pl] = [];
    }
    get_tasks();    
}

io.sockets.on('connection', function (socket) {
    socket.on('nickname', function(nick, fn) {
        console.log("received nickname " + nick)
        socket.nick = nick;
        players[nick] = {
            score: null,
            next_task: 0,
            ready: false,
            correct: 0
        };
        socket.broadcast.emit('announcement', nick + ' connected');
        io.sockets.emit('players', players);
        socket.emit('announcement', 'Welcome to Geek-Battle, ' + nick + '!');
    });
    
    socket.on('get task', function(ans) {
        // if (ans == false) setTimeout(send_next_task(socket), 7000);
        // else send_next_task(socket);
        if (ans) {
            players[socket.nick].score += 5;
            players[socket.nick].correct += 1;
            answers[socket.nick].push(true);
        } else if (players[socket.nick].next_task > 0) {
            players[socket.nick].score -= 3;
            answers[socket.nick].push(false);
        }
        send_next_task(socket);
        io.sockets.emit('players', players);
    });

    socket.on('new game', function() {
        if (players[socket.nick].ready) return;

        players[socket.nick].ready = true;
        players[socket.nick].score = null;
        all = true;
        for (var pl in players)
            if (!players[pl].ready)
                all = false;
        if (all) init_new_game();

        io.sockets.emit('players', players);
    });

    socket.on('game over', function() {
        players[socket.nick].ready = false;
        io.sockets.emit('players', players);
        socket.emit('results', answers, players);
    });

    socket.on('user message', function (msg) {
        socket.broadcast.emit('user message', socket.nick, msg);
    });

    socket.on('disconnect', function () {
        if (!socket.nick) return;

        delete players[socket.nick];
        socket.broadcast.emit('announcement', socket.nick + ' disconnected');
        socket.broadcast.emit('players', players);
    });
});
