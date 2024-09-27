const express = require('express');
const axios = require('axios');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const compression = require('compression');
const dotenv = require('dotenv');
const path = require('path');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

require('dotenv').config();
const app = express();
const PORT = process.env.PORT || 8080;
const apiKey = process.env.OPENAI_API_KEY; // Certifique-se de que essa linha está correta


// 1. Middleware de segurança com Helmet
app.use(helmet());

// 2. Habilita CORS (Cross-Origin Resource Sharing)
app.use(cors());

// 3. Logger de requisições HTTP
app.use(morgan('combined'));

// 4. Limitação de taxa para evitar ataques DDoS
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100 // limite de 100 requisições por IP
});
app.use(limiter);

// 5. Compressão das respostas HTTP para melhorar a performance
app.use(compression());

// 6. Parse de cookies
app.use(cookieParser());

// 7. Gerenciamento de sessões com UUID
app.use(session({
    genid: () => uuidv4(),
    secret: 'meu_segredo_super_secreto',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

// 8. Parse de JSON
app.use(express.json());

// 9. Parse de URL-encoded
app.use(bodyParser.urlencoded({ extended: true }));

// 10. Servir arquivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// 11. Middleware para simulação de latência em dev (útil para simular redes lentas)
app.use((req, res, next) => {
    if (process.env.NODE_ENV === 'development') {
        setTimeout(next, 1000); // 1 segundo de delay
    } else {
        next();
    }
});

// 12. Middleware para monitoramento de tempo de resposta
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const elapsed = Date.now() - start;
        console.log(`${req.method} ${req.originalUrl} - ${elapsed}ms`);
    });
    next();
});

// 13. Rota principal para verificar se o servidor está funcionando
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 14. Rota para enviar perguntas ao chatbot da OpenAI
app.post('/ask', async (req, res) => {
    const question = req.body.question;

    try {
        const response = await axios.post(
            'https://api.openai.com/v1/completions',
            {
                model: 'text-davinci-003',
                prompt: question,
                max_tokens: 150,
                n: 1,
                stop: null,
                temperature: 0.7,
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        const answer = response.data.choices[0].text.trim();
        res.json({ answer });
    } catch (error) {
        console.error('Erro ao comunicar com a OpenAI:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Erro ao comunicar com a OpenAI' });
    }
});

// 15. Rota para fazer upload de arquivos
app.post('/upload', (req, res) => {
    const file = req.files?.file;
    if (!file) return res.status(400).send('Nenhum arquivo foi enviado.');

    const uploadPath = path.join(__dirname, 'uploads', file.name);
    file.mv(uploadPath, (err) => {
        if (err) return res.status(500).send(err);
        res.send('Arquivo enviado com sucesso!');
    });
});

// 16. Rota para fazer download de arquivos
app.get('/download/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, 'uploads', filename);
    res.download(filePath);
});

// 17. Middleware para capturar erros 404
app.use((req, res, next) => {
    res.status(404).send('Página não encontrada');
});

// 18. Middleware para capturar erros 500
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Erro interno do servidor');
});

// 19. Rota para listar sessões ativas
app.get('/sessions', (req, res) => {
    res.json(req.session);
});

// 20. Rota para logout
app.post('/logout', (req, res) => {
    req.session.destroy();
    res.send('Logout realizado com sucesso!');
});

// 21. Rotas para lidar com dados de formulários
app.post('/form', (req, res) => {
    const { nome, email, mensagem } = req.body;
    res.send(`Formulário recebido! Nome: ${nome}, Email: ${email}, Mensagem: ${mensagem}`);
});

// 22. Rota para retornar data e hora atual
app.get('/time', (req, res) => {
    res.json({ datetime: new Date().toLocaleString() });
});

// 23. Rota para logar mensagens do sistema
app.post('/log', (req, res) => {
    const { message } = req.body;
    fs.appendFile('logs.txt', `${new Date().toISOString()} - ${message}\n`, (err) => {
        if (err) return res.status(500).send('Erro ao salvar log.');
        res.send('Log salvo com sucesso!');
    });
});

// 24. Rota para verificar status do servidor
app.get('/status', (req, res) => {
    res.json({ status: 'Servidor funcionando corretamente', uptime: process.uptime() });
});

// 25. Rota para exibir informações do sistema
app.get('/system-info', (req, res) => {
    res.json({
        platform: process.platform,
        version: process.version,
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
    });
});

// 26. Rota para cálculo simples (soma)
app.get('/calc/soma', (req, res) => {
    const { a, b } = req.query;
    const result = parseFloat(a) + parseFloat(b);
    res.json({ result });
});

// 27. Rota para cálculo simples (subtração)
app.get('/calc/subtracao', (req, res) => {
    const { a, b } = req.query;
    const result = parseFloat(a) - parseFloat(b);
    res.json({ result });
});

// 28. Rota para cálculo simples (multiplicação)
app.get('/calc/multiplicacao', (req, res) => {
    const { a, b } = req.query;
    const result = parseFloat(a) * parseFloat(b);
    res.json({ result });
});

// 29. Rota para cálculo simples (divisão)
app.get('/calc/divisao', (req, res) => {
    const { a, b } = req.query;
    if (parseFloat(b) === 0) return res.status(400).send('Divisão por zero não permitida');
    const result = parseFloat(a) / parseFloat(b);
    res.json({ result });
});

// 30. Rota para gerar UUID
app.get('/uuid', (req, res) => {
    res.json({ uuid: uuidv4() });
});

// Inicia o servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
