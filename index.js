const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const fs = require('fs');
const path = require('path');

app.use(express.static(__dirname));

// Caminho do banco de dados
const dbPath = path.join(__dirname, 'mensagens.json');

// Função para ler mensagens do JSON
function lerMensagens() {
    try {
        if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, '[]');
        const dados = fs.readFileSync(dbPath, 'utf8');
        return JSON.parse(dados);
    } catch (err) { 
        return []; 
    }
}

// Função para salvar mensagem no JSON
function salvarMensagem(novaMsg) {
    const mensagens = lerMensagens();
    mensagens.push(novaMsg);
    if (mensagens.length > 50) mensagens.shift(); // Mantém as últimas 50
    fs.writeFileSync(dbPath, JSON.stringify(mensagens, null, 2));
}

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
    // Quando o usuário conecta, envia o histórico salvo
    socket.emit('historico', lerMensagens());

    socket.on('novo-usuario', (dados) => {
        socket.username = dados.nome || "Anônimo";
        socket.avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${dados.avatar}`;
    });

    socket.on('chat message', (msg) => {
        const objetoMsg = {
            id: socket.id, // ID temporário para saber quem é você
            texto: msg,
            usuario: socket.username || "Anônimo",
            avatar: socket.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"
        };
        salvarMensagem(objetoMsg);
        io.emit('chat message', objetoMsg);
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log('Servidor rodando na porta ' + PORT));