# Genial Guard MVP – Backend API

Este é o backend do MVP do **Genial Guard**, um sistema de envio de mensagens seguras para clientes por parte de advogados.

## Tecnologias Utilizadas
- Node.js + Express
- MongoDB Atlas
- JavaScript puro

## Endpoints Disponíveis

### `POST /mensagem`
Cria uma nova mensagem segura.
**Body JSON:**
```json
{
  "advogado": "Nome do Advogado",
  "cliente": "Nome do Cliente",
  "mensagem": "Texto da mensagem segura"
}
```

### `GET /mensagem/:codigo`
Consulta os dados de uma mensagem segura.

### `PATCH /mensagem/:codigo/abrir`
Marca a mensagem como lida e grava a data da leitura.

## Como usar

1. **Clone o projeto:**
```bash
git clone <URL-do-seu-repositório>
cd genial-guard-api
```

2. **Instale as dependências:**
```bash
npm install
```

3. **Configure o MongoDB Atlas:**
- Crie uma conta gratuita: https://www.mongodb.com/cloud/atlas
- Crie um cluster, adicione seu IP e gere um usuário
- Copie a string de conexão e substitua em:
```js
mongoose.connect('mongodb+srv://<username>:<password>@<cluster>.mongodb.net/genialguard?retryWrites=true&w=majority')
```

4. **Inicie o servidor:**
```bash
node app.js
```

A API rodará localmente na porta 3000.

## Deploy sugerido (Render.com)
1. Acesse [https://render.com](https://render.com) e crie uma conta
2. Crie um novo Web Service
3. Conecte o repositório do GitHub
4. Configure o `start command`: `node app.js`

---
**Obs:** este projeto foi gerado com foco em velocidade para MVP. Pode ser expandido com autenticação, logging, controle de acesso e painel admin futuramente.
