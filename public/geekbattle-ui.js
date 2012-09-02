game_playing = false;
game_tasks = [];
my_answers = [];

function showTask(task) {
    if (task == null || !game_playing) {
        $('.answers').hide();
        return;
    }

    game_tasks.push(task);
    $(document.body).removeClass('first');
    var url = 'http://geekbeta-nbeloglazov.dotcloud.com/image?id=' + task.id;
    $('#question').attr('src', url + '&type=question');
    $('.correct').removeClass('correct');
    $('.incorrect').removeClass('incorrect');
    for (var i = 0; i < 4; i++) {
        $('#choice_' + i).attr('src', url + '&type=choice&number=' + i);
        $('#choice_' + i).attr('correct', i === task.correct);
    }
    $('#images').show();
    $('.answers').show();
}

function showTasksSelection(tasks) {
    var options = $('#select-questions')[0].options;
    $.each(tasks, function() {
        var option = new Option(this.name, this.type);
        options[options.length] = option;
    });
}

$(function() {
    $('div.tooltip').hide();
    for (var i = 0; i < 4; i++) {
        $('#choice_' + i).click(function() {
            $(this).addClass($(this).attr('correct') == "true" ? 'correct' : 'incorrect');
            my_answers.push($(this).attr('id').substr(7));
            socket.emit('get task', $(this).attr('correct') == "true");
            $('.answers').hide();
            $('#images').css('background-color', $(this).attr('correct') == "true" ? '#00ff00' : '#ff0000');
            $('#images').flip({
                direction: 'rl',
                speed: 300,
                color: '#ffffff'
            });
        });
    }

    $('#button-options').on('click', function() {
        if ($('#options').is(':visible'))
            $('#options').fadeOut();
        else
            $('#options').show();
    });

    $('#newgame').on('click', function() {
        $('#status').html('Waiting for players...');
        $('#box-table').css('visibility', 'hidden');
        socket.emit('new game');
    });

    $('#set-nickname').submit(function() {
        if ($.trim($('#nick').val()) == "") return false;
        socket.emit('nickname', $('#nick').val());
        $('#splash').slideUp(2000, "easeInExpo");
        $('#main-table').removeClass('hide');
        // showLavaLamps();
        $('#options').hide();
        return false;
    });

    $('#send-message').submit(function() {
        var msg = $.trim($('#message').val());
        if (msg == "") return false;
        message('me', msg);
        socket.emit('user message', msg);
        // $('#sound-message-sent')[0].play();
        clear();
        return false;
    });

    function clear () {
        $('#message').val('').focus();
    }

    function showLavaLamps() {
        $("#ll-level").lavaLamp({
            fx: "easeOutBack", 
            speed: 700,
            click: function(event, menuItem) {
                task_level = menuItem.getAttribute('level');
            }
        });

        $("#ll-gametype").lavaLamp({
            fx: "easeOutBack", 
            speed: 700,
            click: function(event, menuItem) {
                // q_cnt = menuItem.getAttribute('qn');
            }
        });

        $("#ll-gamelength").lavaLamp({
            fx: "easeOutBack", 
            speed: 700,
            click: function(event, menuItem) {
                // q_cnt = menuItem.getAttribute('qn');
            }
        });
    }

    $('#select-duration').change(function() {
        socket.emit('set-duration', $(this).val());
    });

    $('#select-level').change(function() {
        socket.emit('set-level', $(this).val());
    });

    $('#select-questions').change(function() {
        socket.emit('set-questions', $(this).val());
    });
});

/*
function make_task_list(tasks) {
    list = "<li><a href='#'>Mixed</a>";
    task_desc = tasks;
    for (var i = 0; i < tasks.length; i++)
        list += "<li task_id='" + i + "''><a href='#'>" + tasks[i].name + "</a></li>";
    $('#ll1').html(list);

    $("#ll1").lavaLamp({
        fx: "backout", 
        speed: 700,
        click: function(event, menuItem) {
            id = menuItem.getAttribute('task_id');
            task_kind = id;
            if (id == null)
                $('#task_description').html("Use random tasks");
            else
                $('#task_description').html(
                    task_desc[id].description.replace(/\n/g, '<br/>').replace(/http:\S+/g, '<a href="$&">$&</a>')
                );
            return false;
        }
    });
}
*/