
// db.js
const { MongoClient } = require("mongodb");

const uri = "mongodb://localhost:27017"; // ajuste se necessário
const client = new MongoClient(uri);
const dbName = "genialguard"; // substitua pelo nome correto do seu banco

let db;

const connectDB = async () => {
  try {
    await client.connect();
    db = client.db(dbName);
    console.log("✅ Conectado ao MongoDB");
  } catch (err) {
    console.error("Erro ao conectar ao MongoDB:", err);
  }
};

const getDB = () => {
  if (!db) {
    throw new Error("Banco de dados não conectado. Execute connectDB() primeiro.");
  }
  return db;
};

module.exports = { connectDB, getDB };
