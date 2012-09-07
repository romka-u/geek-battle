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
    res.render('index_new.html', { layout: false });
});

    // $.getJSON('https://oauth.vk.com/access_token?client_id=3112763&client_secret=rVHtaJ1Kb4DOdlzPIbrE&code=790&callback=?',
    //     null,
    //     function(resp) {
    //         console.log('Answer');
    //         console.log(resp);
    //     });

app.get('/vktoken', function (req, res) {
    console.log(req);
    res.write(req);
    res.end();
});

app.get('/vklogin', function (req, res) {
    console.log(req.query.code);
    $.ajax({
        type: "GET",
        url: "https://oauth.vk.com/access_token",
        data: "client_id=3112763&redirect_uri=http://geek-battle.herokuapp.com/vktoken&client_secret=rVHtaJ1Kb4DOdlzPIbrE&code=" + req.query.code,
        complete: function(msg){
            console.log(msg);
        }
    });
    res.end();
});

app.get('/help', function (req, res) {
    res.render('help.html', { layout: false });
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
task_count = 3;

options = {
    level: '2',
    duration: '60',
    questions: 'mixed'
};

function ask_for_task() {
    if (options.questions == 'mixed')
        curtask = task_desc[Math.floor(Math.random() * task_desc.length)];
    else
        $.each(task_desc, function(index, value) {
            if (value.type == options.questions)
                curtask = value;
        });
    
    $.getJSON('http://geekbeta-nbeloglazov.dotcloud.com/task', 
        {type: curtask.type, level: options.level}, 
        function(task) {
            tasks.push(task);                
            console.log(task);
            if (tasks.length == task_count)
                io.sockets.emit('game loaded');
        });
}

function get_tasks() {
    tasks = [];
    task_count = 3;
    for (var i = 0; i < task_count; i++)
        ask_for_task();
}

$.getJSON('http://geekbeta-nbeloglazov.dotcloud.com/tasks', 
    {}, 
    function(tasks) {
        console.log("Tasks received");
        task_desc = tasks;
    });


function send_next_task(socket) {
    if (!players[socket.nick].ready) return;
    socket.emit('show task', tasks[players[socket.nick].next_task]);
    players[socket.nick].next_task += 1;
    if (players[socket.nick].next_task > task_count - 2)
        ask_for_task();
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

function check_new_game() {
    all = true;
    any = false;
    for (var pl in players) {
        any = true;
        if (!players[pl].ready)
            all = false;
    }
    if (all && any) init_new_game();
}

io.sockets.on('connection', function (socket) {
    socket.on('nickname', function(nick, fn) {
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
        socket.emit('options', options);
    });

    socket.on('get tasks description', function() {
        socket.emit('tasks description', task_desc);
    });
    
    socket.on('get task', function(ans) {
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

    socket.on('get task example', function(task_type) {
        $.getJSON('http://geekbeta-nbeloglazov.dotcloud.com/task', 
        {type: task_type, level: 2}, 
        function(task) {
            socket.emit('show task example', task);
        });
    });

    socket.on('new game', function() {
        if (players[socket.nick].ready) return;

        players[socket.nick].ready = true;
        players[socket.nick].score = null;
        check_new_game();

        io.sockets.emit('players', players);
    });

    socket.on('game over', function() {
        players[socket.nick].ready = false;
        io.sockets.emit('players', players);
        socket.emit('results', answers, players);
    });

    socket.on('user message', function (msg) {
        if (msg == "/beep")
            io.sockets.emit('beep');
        else
            socket.broadcast.emit('user message', socket.nick, msg);
    });

    socket.on('disconnect', function () {
        if (!socket.nick) return;

        delete players[socket.nick];
        check_new_game();
        socket.broadcast.emit('announcement', socket.nick + ' disconnected');
        socket.broadcast.emit('players', players);
    });

    socket.on('set-duration', function(duration) {
        for (pl in players)
            players[pl].ready = false;
        options.duration = duration;
        socket.broadcast.emit('options', options);
        io.sockets.emit('players', players);
    });

    socket.on('set-questions', function(questions) {
        for (pl in players)
            players[pl].ready = false;
        options.questions = questions;
        socket.broadcast.emit('options', options);
        io.sockets.emit('players', players);
    });

    socket.on('set-level', function(level) {
        for (pl in players)
            players[pl].ready = false;
        options.level = level;
        socket.broadcast.emit('options', options);
        io.sockets.emit('players', players);
    });
});
