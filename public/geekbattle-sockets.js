socket = io.connect();
socket.emit('get tasks description');
socket.on('tasks description', showTasksSelection);

socket.on('show task', showTask);

socket.on('options', function(options) {
    $('#select-duration').val(options.duration);
    $('#select-level').val(options.level);
    $('#select-questions').val(options.questions);
});

socket.on('game loaded', function() {
    $('#newgame').attr('disabled', true);
    $('select').attr('disabled', true);
    $('#sound-waiting-for-game')[0].play();
    game_tasks = [];
    my_answers = [];
    $('#status').everyTime(1000, 'timer', function(it) {
        $(this).html('Game starts in ' + (5-it));
    }, 5);
    $('#status').oneTime(4000, 'timer-sound', function() {
        $('#sound-game-started')[0].play();
    });
    $('#status').oneTime(5050, 'timer2', function() {
        socket.emit('get task', false);
        game_duration = parseInt($('#select-duration').val());
        game_playing = true;
        $(this).html('Game ends in ' + game_duration);
        $('#status').everyTime(1000, 'gametimer', function(it) {
            $(this).html('Game ends in ' + (game_duration-it));
        }, game_duration - 1);
        $('#status').oneTime(game_duration * 1000, 'endtimer', function() {
            $('#images').hide();
            $(this).html('<h2>Game over!</h2>');
            // $('#help').html('');
            socket.emit('game over');
            game_playing = false;
            $('#newgame').attr('disabled', false);
            $('select').attr('disabled', false);
        });
    });
});

socket.on('announcement', function (msg) {
    $('#lines').append($('<p>').append($('<em>').text(msg)));
    $('#sound-enter')[0].play();
    $('#lines').get(0).scrollTop = 10000000;
});

socket.on('players', function(players) {
    $('#nicknames').empty().append($('<select><option>New room</option></select>'));
    for (var pl in players) {
        total = players[pl].next_task - 1;
        if (total < 0) total = 0;
        text = pl;
        if (players[pl].score != null) text = text + ": " + players[pl].score +
            " (Q" + players[pl].next_task + ")";
        tag = '<b>';
        if (players[pl].ready) tag = '<i>';
        $('#nicknames').append($(tag).text(text));
    } 
});

var changeTooltipPosition = function(event) {
    if (!event) event = window.event;
    var tooltipX = event.pageX - 8;
    var tooltipY = event.pageY + 8;
    $('div.tooltip').css({top: tooltipY, left: tooltipX});
};

var showTooltip = function(event) {
    num = event.target.id.substr(3);
    task = game_tasks[num];
    var url = 'http://geekbeta-nbeloglazov.dotcloud.com/image?id=' + task.id;

    html = '<img id="question" src="' + url + '&type=question"/> <br/>';
    for (var i = 0; i < 4; i++) {
        style = 'style="border: #FFF 4px solid;"';
        if (("" + i) === my_answers[num]) style = 'style="border: #F00 4px solid;"';
        if (i === task.correct) style = 'style="border: #0F0 4px solid;"';
        html += '<img class="answers" src="' + url + '&type=choice&number=' + i + '" ' + style + '/>';
        if (i == 1) html += '<br/>';
    }
    $('div.tooltip').show().html(html);
    changeTooltipPosition();
};

var hideTooltip = function() {
    $('div.tooltip').hide();
};

socket.on('results', function(answers, players) {
    $('#box-table').css('visibility', 'visible');
    header = '<th>Nickname</th><th>Score</th><th>Solved</th><th>Answers</th>'
    table = '';
    list = [];
    for (var pl in players)
        list.push({score: players[pl].score, nick: pl});
    list.sort(function(a, b) {return b.score - a.score});
    for (var i in list) {
        pl = list[i].nick;
        if (players[pl].score == null) return;
        img = '';
        $.each(answers[pl], function(index, value) {
            box = "Box_Red";
            if (value) box = "Box_Green";

            new_img = '<img src="' + box + '.png">';
            if (pl === $('#nick').val()) new_img = '<img src="' + box + '.png" id="ans' + index + '">';
            img += new_img;
        });
        rclass = "other"
        if (i == 0) rclass = "gold";
        if (i == 1)
            if (list[1].score != list[0].score) rclass = "silver";
            else rclass = "gold";

        if (i == 2) {
            e01 = list[1].score == list[0].score;
            e12 = list[2].score == list[1].score;
            if (e01 && e12) rclass = "gold";
            if (!e01 && e12) rclass = "silver";
            if (!e12) rclass = "bronze";
        }

        row = '<tr class="' + rclass + '">' + '<td>' + pl + '</td><td>' +
            players[pl].score + '</td><td>' +
            players[pl].correct + ' of ' + (players[pl].next_task-1) + '</td><td>' +
            img + '</td></tr>';

        table += row;
    }
    $('#box-table').html('<table width="100%" align="center">' + header + table + '</table>');

    for (var i in list) {
        if (list[i].nick != $('#nick').val()) continue;
        $.each(answers[list[i].nick], function(index, value) {
            $('#ans' + index)
                .on('mousemove', changeTooltipPosition)
                .on('mouseenter', showTooltip)
                .on('mouseleave', hideTooltip);
        });
    }
});

socket.on('user message', message);
socket.on('reconnect', function () {
      $('#lines').remove();
      message('System', 'Reconnected to the server');
});

socket.on('reconnecting', function () {
      message('System', 'Attempting to re-connect to the server');
});

socket.on('error', function (e) {
      message('System', e ? e : 'A unknown error occurred');
});

socket.on('beep', function() {
    $('#sound-beep')[0].play();
});

function message (from, msg) {
      $('#lines').append($('<p>').append($('<b>').text(from), msg));
      $('#lines').get(0).scrollTop = 10000000;
      if (from != 'System')
          $('#sound-message-received')[0].play();
}