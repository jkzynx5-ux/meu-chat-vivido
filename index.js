const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const path = require('path');

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

io.on('connection', (socket) => {
  
  // Quando o usuário preenche a tela de login
  socket.on('novo-usuario', (dados) => {
    socket.username = dados.nome || "Anônimo";
    socket.avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${dados.avatar}`;
    console.log(`${socket.username} entrou no chat!`);
  });

  // Quando uma mensagem é enviada
  socket.on('chat message', (msg) => {
    io.emit('chat message', {
      texto: msg,
      usuario: socket.username || "Anônimo",
      avatar: socket.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=default"
    });
  });

  socket.on('disconnect', () => {
    console.log('Usuário saiu');
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`Servidor ON na porta ${PORT}`);
});