var express = require('express');
var app = express();
var http = require('http');
var server = http.createServer(app);
var io = require('socket.io').listen(server);

server.listen(3000);

app.get('/', function (req, res) {
    res.sendfile(__dirname + '/main.html');
});


var rooms = [];              // 생성된 방을 담을 배열
var userRoom = '';
var clientCount;           // 입장한 방에 있는 사람들의 수


io.sockets.on('connection', function (socket) {

    // socket이 연결되면, 즉 회원이 아이디를 입력하면 현재 방 목록을 보여준다.
    socket.on('newUser', function (newUser) {
        socket.username = newUser;
        socket.emit('roomAction', rooms);

    });

    // 방을 만들 경우, 방 배열에 새로운 방을 넣는다.
    socket.on('makeRoom', function (newRoom) {

        rooms.push(newRoom);

        // 모든 클라이언트에게 'roomAction' 이벤트를 보낸다.
        io.emit('roomAction', rooms, userRoom);
    });

    socket.on('changeRoom', function (newRoom) {

        var beforeRoom = socket.room;

        // 현재 있는 방에서 다른 방으로 옮길 때, 먼저 이전 방을 떠난다.
        if (socket.room) {
            socket.leave(socket.room);
        }

        // 이전방에 있는 모든 클라이언트에게 'updateUserCount' 액션을 보낸다.
        io.of('/').in(beforeRoom).clients(function (error, clients) {
            io.to(beforeRoom).emit('updateUserCount', clients.length);
        });

        // 이전방에 떠난다는 메세지를 남기고

        socket.broadcast.to(socket.room).emit('updateChat', socket.username, 'has left room');
        socket.join(newRoom);
        socket.room = newRoom;
        userRoom = newRoom;

        //새로운 방에 입장 했다는 메시지를 남긴다.
        socket.broadcast.to(newRoom).emit('updateChat', socket.username, 'has entered room');


        socket.emit('roomAction', rooms, userRoom, clientCount);


        // 마찬가지고 새로운 방에 있는 모든 클라이언트에게 'updateUserCount'액션을 보낸다.
        io.of('/').in(newRoom).clients(function (error, clients) {
            io.to(newRoom).emit('updateUserCount', clients.length);
        });
    });

    socket.on('sendMsg', function (msg) {
        io.sockets.in(socket.room).emit('updateChat', socket.username, msg);
    });

    socket.on('disconnect', function () {

        // socket 연결이 끊어졌을 경우, 현재 방의 사람들에게 방을 떠난다는 메시지를 남긴다.
        socket.broadcast.to(socket.room).emit('updateChat', socket.username, 'has left room');

        // 현재 방에 접속한 모든 사람들에게 'updateUserCount' 액션을 보낸다.
        io.of('/').in(socket.room).clients(function (error, clients) {
            io.to(socket.room).emit('updateUserCount', clients.length);
        });
    });

});
