const express = require('express');
const path = require('path');

const app = express();

const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static(path.join(__dirname, '../public'))); // Add that later on

let connectedUsers = [];

io.on('connection', socket => {
  console.log('A user connected');
  connectedUsers.push(socket.id);
  socket.broadcast.emit('update-user-list', { userIds: connectedUsers })

  socket.on('disconnect', () => {
    connectedUsers = connectedUsers.filter(user => user !== socket.id)
    socket.broadcast.emit('update-user-list', { userIds: connectedUsers })
  })

  socket.on('mediaOffer', data => {
    socket.to(data.to).emit('mediaOffer', {
      from: data.from,
      offer: data.offer
    });
  });
  
  socket.on('mediaAnswer', data => {
    socket.to(data.to).emit('mediaAnswer', {
      from: data.from,
      answer: data.answer
    });
  });

  socket.on('iceCandidate', data => {
    socket.to(data.to).emit('remotePeerIceCandidate', {
      candidate: data.candidate
    })
  })
});

http.listen(3000, () => {
  console.log('listening on *:3000');
});
