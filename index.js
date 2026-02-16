const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const fs = require('fs');

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ limit: '20mb', extended: true }));
app.use(express.static(__dirname));

const USERS_FILE = 'usuarios.json';
const MSGS_FILE = 'mensagens_privadas.json';

if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, '[]');
if (!fs.existsSync(MSGS_FILE)) fs.writeFileSync(MSGS_FILE, '[]');

// Buscar usuário para iniciar chat
app.get('/buscar/:username', (req, res) => {
    const usuarios = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    const encontrado = usuarios.find(u => u.username === req.params.username);
    if (encontrado) {
        res.json({ nome: encontrado.nome, username: encontrado.username, avatar: encontrado.avatar });
    } else {
        res.status(404).json({ erro: "Não encontrado" });
    }
});

app.post('/registrar', (req, res) => {
    const novo = req.body;
    let usuarios = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    if (usuarios.find(u => u.username === novo.username)) return res.status(400).send();
    usuarios.push(novo);
    fs.writeFileSync(USERS_FILE, JSON.stringify(usuarios, null, 2));
    res.json({ sucesso: true });
});

io.on('connection', (socket) => {
    socket.on('entrar', (user) => {
        socket.username = user.nome;
        socket.userUnico = user.username;
        socket.join(user.username); // Sala individual do usuário
    });

    socket.on('typing', (dados) => {
        socket.to(dados.para).emit('user-typing', { from: socket.userUnico, typing: dados.typing });
    });

    socket.on('private message', (dados) => {
        const agora = new Date();
        const hora = agora.getHours().toString().padStart(2, '0') + ':' + agora.getMinutes().toString().padStart(2, '0');

        const novaMsg = {
            de: socket.userUnico,
            para: dados.para,
            texto: dados.texto || null,
            imagem: dados.imagem || null,
            audio: dados.audio || null,
            hora: hora
        };

        let msgs = JSON.parse(fs.readFileSync(MSGS_FILE, 'utf8'));
        msgs.push(novaMsg);
        fs.writeFileSync(MSGS_FILE, JSON.stringify(msgs.slice(-500), null, 2));

        io.to(dados.para).to(socket.userUnico).emit('new message', novaMsg);
    });

    socket.on('carregar-conversa', (amigo) => {
        const msgs = JSON.parse(fs.readFileSync(MSGS_FILE, 'utf8'));
        const conversa = msgs.filter(m => 
            (m.de === socket.userUnico && m.para === amigo) || 
            (m.de === amigo && m.para === socket.userUnico)
        );
        socket.emit('historico-privado', conversa);
    });
});

http.listen(3000, () => console.log('Servidor ON'));