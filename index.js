const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
  socket.on('novo-usuario', (dados) => {
    socket.username = dados.nome;
    socket.avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${dados.avatar}`;
  });

  socket.on('chat message', (msg) => {
    io.emit('chat message', {
      texto: msg,
      usuario: socket.username || "Anônimo",
      avatar: socket.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"
    });
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log('Rodando na porta ' + PORT));
