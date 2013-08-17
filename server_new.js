var express = require('express'),
    $ = require('jquery'),
    passport = require('passport'),
    VKStrategy = require('passport-vkontakte').Strategy,
    socketio = require('socket.io');

var app = express.createServer();

/**
 * Passport setup
 */
passport.serializeUser(function(user, done) {
      done(null, user);
});

passport.deserializeUser(function(obj, done) {
      done(null, obj);
});

passport.use(new VKStrategy({
    clientID:     "3112763",
    clientSecret: "rVHtaJ1Kb4DOdlzPIbrE",
    callbackURL:  "http://romka.people.yandex.net/auth/vkontakte/callback"
  },
  function(accessToken, refreshToken, profile, done) {
    // User.findOrCreate({ vkontakteId: profile.id }, function (err, user) {
      return done(null, profile);
    // });
  }
));

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

    app.use(express.cookieParser());
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(express.session({ secret: 'romka' }));
    app.use(passport.initialize());
    app.use(passport.session());
    app.use(app.router);
    app.use(express.static(__dirname + '/public'));
});

app.get('/auth/vkontakte',
  passport.authenticate('vkontakte'),
  function(req, res){
    // The request will be redirected to vk.com for authentication, so
    // this function will not be called.
  });

app.get('/auth/vkontakte/callback', 
  passport.authenticate('vkontakte', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/');
  });

/**
 * App routes.
 */

app.get('/login', function(req, res) {
    res.send("<a href='/auth/vkontakte'>Login with vk.com</a>");
});

// oh my code...
var last_user;

app.get('/', ensureAuthenticated, function (req, res) {
    // res.send(req.user);
    last_user = req.user;
    res.render('index_new.html', { layout: false });
});

function ensureAuthenticated(req, res, next) {
      if (req.isAuthenticated()) { return next(); }
        res.redirect('/login')
}

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
    
    $.getJSON('http://geekalarm-nbeloglazov.rhcloud.com/task', 
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

$.getJSON('http://geekalarm-nbeloglazov.rhcloud.com/tasks', 
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
        nick = last_user.id;
        name = last_user.displayName;
        socket.nick = nick;
        players[nick] = {
            score: null,
            next_task: 0,
            ready: false,
            correct: 0,
            name: last_user.displayName,
            photo: last_user.photos[0].value
        };
        socket.broadcast.emit('announcement', name + ' connected');
        io.sockets.emit('players', players);
        socket.emit('announcement', 'Welcome to Geek-Battle, ' + name + '!');
        socket.emit('options', options);
        socket.emit('mynick', nick);
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
        $.getJSON('http://geekalarm-nbeloglazov.rhcloud.com/task', 
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
            socket.broadcast.emit('user message', players[socket.nick].name, msg);
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
