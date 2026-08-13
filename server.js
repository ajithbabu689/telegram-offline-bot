const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

// ⚠️ YOUR TELEGRAM BOT TOKEN
const BOT_TOKEN = '8508043458:AAG3dURU7M5uX7M2t1FGoMHiYP6mSFZP-hc';
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

let lastEspPing = 0; 
let pendingCommands = []; // Holds commands for ESP32 when online
const OFFLINE_THRESHOLD = 45000; // 45 seconds timeout

// 1. ESP32 calls this endpoint every 15s to check in AND fetch commands
app.get('/ping', (req, res) => {
  lastEspPing = Date.now();
  
  // Send any waiting Telegram commands back to ESP32, then clear queue
  res.json({ commands: pendingCommands });
  pendingCommands = [];
});

// 2. Telegram Webhook endpoint
app.post('/telegram-webhook', async (req, res) => {
  const message = req.body.message;
  
  if (message && message.text) {
    const chatId = message.chat.id;
    const timeSinceLastPing = Date.now() - lastEspPing;

    // IF OFFLINE: Auto-reply
    if (timeSinceLastPing > OFFLINE_THRESHOLD) {
      await axios.post(`${TELEGRAM_API}/sendMessage`, {
        chat_id: chatId,
        text: "⚠️ Lachu is offline at the moment. Pls try after some time"
      });
    } 
    // IF ONLINE: Store command for ESP32 to fetch on next ping or trigger execution
    else {
      pendingCommands.push({
        chat_id: chatId,
        text: message.text
      });
    }
  }
  
  res.sendStatus(200);
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
