var port=process.env.PORT || 3000;
var http=require('http');
var app=http.createServer(function(req,res){
    res.write("server listening to port:"+port);
    res.end();
}).listen(port);
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

io.sockets.on('connection', function (socket) {
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
});
