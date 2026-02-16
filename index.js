const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const fs = require('fs');
const path = require('path');

// Aumenta o limite para suportar o envio das fotos de perfil em Base64
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
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
    socket.on('join-room', (dados) => {
        socket.leave(socket.currentRoom);
        socket.join(dados.sala);
        socket.currentRoom = dados.sala;
        socket.username = dados.user.nome;
        socket.userUnico = dados.user.username;
        socket.avatar = dados.user.avatar; // Foto da galeria salva aqui

        const todasMsgs = JSON.parse(fs.readFileSync(MSGS_FILE, 'utf8'));
        const msgsSala = todasMsgs.filter(m => m.sala === dados.sala);
        socket.emit('historico', msgsSala);
    });

    socket.on('typing', (status) => {
        socket.to(socket.currentRoom).emit('user-typing', {
            username: socket.username,
            typing: status
        });
    });

    socket.on('chat message', (msg) => {
        const agora = new Date();
        const horaFormatada = agora.getHours().toString().padStart(2, '0') + ':' + agora.getMinutes().toString().padStart(2, '0');

        const objetoMsg = {
            sala: socket.currentRoom,
            usuarioLogado: socket.userUnico,
            exibirNome: socket.username,
            texto: msg,
            avatar: socket.avatar,
            hora: horaFormatada
        };
        
        let msgs = JSON.parse(fs.readFileSync(MSGS_FILE, 'utf8'));
        msgs.push(objetoMsg);
        fs.writeFileSync(MSGS_FILE, JSON.stringify(msgs.slice(-100), null, 2));
        
        io.to(socket.currentRoom).emit('chat message', objetoMsg);
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log('Servidor ON'));