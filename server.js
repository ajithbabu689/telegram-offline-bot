const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

// ⚠️ REPLACE THIS WITH YOUR ACTUAL TELEGRAM BOT TOKEN
const BOT_TOKEN = '8508043458:AAG3dURU7M5uX7M2t1FGoMHiYP6mSFZP-hc';
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

let lastEspPing = 0; 
const OFFLINE_THRESHOLD = 45000; // 45 seconds timeout

// 1. ESP32 calls this endpoint every 15s to update heartbeat
app.get('/ping', (req, res) => {
  lastEspPing = Date.now();
  res.send('OK');
});

// 2. Telegram Webhook endpoint - triggers whenever a user sends a message
app.post('/telegram-webhook', async (req, res) => {
  const message = req.body.message;
  
  if (message && message.text) {
    const chatId = message.chat.id;
    const timeSinceLastPing = Date.now() - lastEspPing;

    // Check if ESP32 hasn't pinged in over 45 seconds
    if (timeSinceLastPing > OFFLINE_THRESHOLD) {
      await axios.post(`${TELEGRAM_API}/sendMessage`, {
        chat_id: chatId,
        text: "⚠️ Lachu is offline at the moment. Pls try after some time..."
      });
    }
  }
  
  res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
