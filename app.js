require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB conectado'))
  .catch(err => console.error('❌ Erro ao conectar no MongoDB:', err));

const MensagemSchema = new mongoose.Schema({
  codigo: String,
  advogado: String,
  cliente: String,
  mensagem: String,
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

app.post('/mensagem', async (req, res) => {
  console.log('req.body:', req.body);
  const { advogado, cliente, mensagem } = req.body;
  const novaMensagem = new Mensagem({
    codigo: gerarCodigo(),
    advogado,
    cliente,
    mensagem
  });
  //await novaMensagem.save();
  //res.status(201).json(novaMensagem);
  await novaMensagem.save();
  const msgCompleta = await Mensagem.findOne({ codigo: novaMensagem.codigo });
  res.status(201).json(msgCompleta);
});


app.get('/mensagem/:codigo', async (req, res) => {
  const msg = await Mensagem.findOne({ codigo: req.params.codigo });
  if (!msg) return res.status(404).json({ erro: 'Mensagem não encontrada' });
  res.json(msg);
});

app.patch('/mensagem/:codigo/abrir', async (req, res) => {
  const msg = await Mensagem.findOneAndUpdate(
    { codigo: req.params.codigo },
    { lida: true, dataLeitura: new Date() },
    { new: true }
  );
  if (!msg) return res.status(404).json({ erro: 'Mensagem não encontrada' });
  res.json(msg);
});
app.get('/status', (req, res) => {
  res.json({ status: 'ok' });
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API rodando na porta ${PORT}`));

//Webhook Twillo:
const axios = require('axios'); // se ainda não tiver instalado: npm install axios
app.use(require('body-parser').urlencoded({ extended: false }));

app.post('/webhook/twilio', async (req, res) => {
  const msg = req.body.Body || '';
  const from = req.body.From || '';

  console.log(`📩 Mensagem do advogado: ${msg} (de ${from})`);

  const [nomeCliente, celularCliente] = msg.split(' - ');
  if (!nomeCliente || !celularCliente) {
    res.set('Content-Type', 'text/xml');
    return res.send(`<Response><Message>Formato inválido. Use: Nome - 5511999999999</Message></Response>`);
  }

  const codigo = gerarCodigo();

  // Salva a mensagem no MongoDB
  const novaMensagem = new Mensagem({
    codigo,
    advogado: from,
    cliente: nomeCliente,
    mensagem: `Código de verificação: ${codigo}`
  });

  await novaMensagem.save();

  // Envia WhatsApp com o código para o cliente
  try {
    await axios.post(`https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_SID}/Messages.json`, null, {
      params: {
        From: 'whatsapp:+14155238886', // Sandbox Twilio
        To: `whatsapp:+${celularCliente}`, // Enviado pelo advogado no formato +55...
        Body: `Olá ${nomeCliente}, você recebeu uma mensagem segura do seu advogado via Genial Guard.\n\nCódigo de verificação: ${codigo}\n\nBaixe o app e digite o código para verificar a autenticidade.`
      },
      auth: {
        username: process.env.TWILIO_SID,
        password: process.env.TWILIO_TOKEN
      }
    });

    console.log(`✅ Código enviado para ${celularCliente}`);

    res.set('Content-Type', 'text/xml');
    return res.send(`<Response><Message>Mensagem enviada para ${nomeCliente}</Message></Response>`);
  } catch (err) {
    console.error('Erro ao enviar WhatsApp:', err);
    res.set('Content-Type', 'text/xml');
    return res.send(`<Response><Message>Erro ao enviar mensagem</Message></Response>`);
  }
});