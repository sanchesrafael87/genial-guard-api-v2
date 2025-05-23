require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios');
const bodyParser = require('body-parser');

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB conectado'))
  .catch(err => console.error('❌ Erro ao conectar no MongoDB:', err));

// 📌 Schema atualizado
const MensagemSchema = new mongoose.Schema({
  codigo: String,
  advogado: String,
  cliente: String,
  mensagem: String,
  numeroOAB: String,
  endereco: String,
  carteiraFrenteUrl: String,
  carteiraVersoUrl: String,
  email: String,
  telefone: String,
  whatsapp: String,
  lida: { type: Boolean, default: false },
  dataEnvio: { type: Date, default: Date.now },
  dataLeitura: Date
});

const Mensagem = mongoose.model('Mensagem', MensagemSchema);

function gerarCodigo() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let code = 'g';
  for (let i = 0; i < 5; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}

// POST: criar nova mensagem
app.post('/mensagem', async (req, res) => {
  const codigo = gerarCodigo();
  const novaMensagem = new Mensagem({ codigo, ...req.body });

  await novaMensagem.save();
  const msgCompleta = await Mensagem.findOne({ codigo }).lean();
  res.status(201).json(msgCompleta);
});

// GET: buscar por código via query param
app.get("/mensagem", async (req, res) => {
  const codigo = req.query.codigo;
  const msg = await Mensagem.findOne({ codigo }).lean();
  if (!msg) return res.status(404).send("Não encontrado");
  res.json(msg);
});

// PATCH: marcar como lida
app.patch('/mensagem/:codigo/abrir', async (req, res) => {
  const msg = await Mensagem.findOneAndUpdate(
    { codigo: req.params.codigo },
    { lida: true, dataLeitura: new Date() },
    { new: true }
  );
  if (!msg) return res.status(404).json({ erro: 'Mensagem não encontrada' });
  res.json(msg);
});

// NOVO: POST verificar-codigo (usado pelo Flutter)
app.post('/verificar-codigo', async (req, res) => {
  const { codigo } = req.body;
  if (!codigo) return res.status(400).json({ erro: 'Código não informado' });

  const msg = await Mensagem.findOne({ codigo });
  if (!msg) return res.status(404).json({ erro: 'Código inválido' });

  res.json({
    advogado: msg.advogado,
    numeroOAB: msg.numeroOAB,
    endereco: msg.endereco,
    carteiraFrenteUrl: msg.carteiraFrenteUrl,
    carteiraVersoUrl: msg.carteiraVersoUrl,
    email: msg.email,
    telefone: msg.telefone,
    whatsapp: msg.whatsapp,
    mensagem: msg.mensagem,
    dataEnvio: msg.dataEnvio,
    lida: msg.lida
  });
});

// GET: status
app.get('/status', (req, res) => {
  res.json({ status: 'ok' });
});

// POST: webhook Twilio
app.post('/webhook/twilio', async (req, res) => {
  const msg = req.body.Body || '';
  const from = req.body.From || '';

  console.log(`📩 Mensagem do advogado: ${msg} (de ${from})`);

  const [nomeCliente, celularCliente] = msg.split(' - ');
  if (!nomeCliente || !celularCliente) {
    res.set('Content-Type', 'text/xml');
    return res.send(`<Response><Message>Formato inválido. Use: Nome - 551199999999</Message></Response>`);
  }

  const codigo = gerarCodigo();

  const novaMensagem = new Mensagem({
    codigo,
    advogado: from,
    cliente: nomeCliente,
    mensagem: `Código de verificação: ${codigo}`
  });

  await novaMensagem.save();

  try {
    await axios.post(
      `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_SID}/Messages.json`,
      null,
      {
        params: {
          From: 'whatsapp:+14155238886',
          To: `whatsapp:+${celularCliente}`,
          Body: `Olá ${nomeCliente}, você recebeu uma mensagem segura do seu advogado via Genial Guard.\n\nCódigo de verificação: ${codigo}\n\nBaixe o app e digite o código para verificar a autenticidade.`
        },
        auth: {
          username: process.env.TWILIO_SID,
          password: process.env.TWILIO_TOKEN
        }
      }
    );

    console.log(`✅ Código enviado para ${celularCliente}`);

    res.set('Content-Type', 'text/xml');
    return res.send(`<Response><Message>Mensagem enviada para ${nomeCliente}</Message></Response>`);
  } catch (err) {
    console.error('Erro ao enviar WhatsApp:', err);
    res.set('Content-Type', 'text/xml');
    return res.send(`<Response><Message>Erro ao enviar mensagem</Message></Response>`);
  }
});

// Iniciar servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 API rodando na porta ${PORT}`));