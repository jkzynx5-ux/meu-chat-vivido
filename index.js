const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const fs = require('fs');
const path = require('path');

app.use(express.json());
app.use(express.static(__dirname));

const USERS_FILE = path.join(__dirname, 'usuarios.json');
const MSGS_FILE = path.join(__dirname, 'mensagens.json');

if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, '[]');
if (!fs.existsSync(MSGS_FILE)) fs.writeFileSync(MSGS_FILE, '[]');

app.post('/registrar', (req, res) => {
    const novoUsuario = req.body;
    let usuarios = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    if (usuarios.find(u => u.username === novoUsuario.username)) {
        return res.status(400).json({ erro: "Usuário já existe!" });
    }
    usuarios.push(novoUsuario);
    fs.writeFileSync(USERS_FILE, JSON.stringify(usuarios, null, 2));
    res.json({ sucesso: true });
});

io.on('connection', (socket) => {
    socket.emit('historico', JSON.parse(fs.readFileSync(MSGS_FILE, 'utf8')));

    socket.on('entrar-chat', (user) => {
        socket.nomeReal = user.nome;
        socket.userNameUnico = user.username; // Usaremos isso para identificar a conta
        socket.avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.avatar}`;
    });

    socket.on('chat message', (msg) => {
        const objetoMsg = {
            usuarioLogado: socket.userNameUnico, // Identificador fixo da conta
            exibirNome: socket.nomeReal,
            texto: msg,
            avatar: socket.avatar
        };
        
        let msgs = JSON.parse(fs.readFileSync(MSGS_FILE, 'utf8'));
        msgs.push(objetoMsg);
        fs.writeFileSync(MSGS_FILE, JSON.stringify(msgs.slice(-50), null, 2));
        
        io.emit('chat message', objetoMsg);
    });
});

http.listen(process.env.PORT || 3000, () => console.log('Servidor ON'));