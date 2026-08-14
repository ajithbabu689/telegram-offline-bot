const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

// ⚠️ YOUR TELEGRAM BOT TOKEN
const BOT_TOKEN = 'YOUR_TELEGRAM_BOT_TOKEN_HERE';
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// Both Chat IDs to receive the offline alert
const CHAT_IDS = ['828079759', '2034653694']; 

let lastEspPing = Date.now(); 
let isOfflineAlertSent = false; // Prevents sending repeated alerts
let pendingCommands = [];
const OFFLINE_THRESHOLD = 45000; // 45 seconds timeout

// Helper function to send alert to both users
async function sendOfflineNotification() {
  for (const chatId of CHAT_IDS) {
    try {
      await axios.post(`${TELEGRAM_API}/sendMessage`, {
        chat_id: chatId,
        text: "🚨 *I will be on sleep 😴!*\nWill come back soon...⌛️",
        parse_mode: 'Markdown'
      });
    } catch (err) {
      console.error(`Failed to send alert to ${chatId}:`, err.message);
    }
  }
}

// 1. Background Monitor (Runs every 10 seconds on Render)
setInterval(() => {
  const timeSinceLastPing = Date.now() - lastEspPing;

  // Check if ESP32 missed pings for > 45s AND we haven't alerted yet
  if (timeSinceLastPing > OFFLINE_THRESHOLD && !isOfflineAlertSent) {
    console.log("ESP32 lost connection! Sending offline alerts...");
    sendOfflineNotification();
    isOfflineAlertSent = true; // Mark as sent so it doesn't spam
  }
}, 10000);

// 2. ESP32 Heartbeat Endpoint
app.get('/ping', (req, res) => {
  lastEspPing = Date.now();
  
  // If ESP32 was offline and comes back online, reset flag
  if (isOfflineAlertSent) {
    isOfflineAlertSent = false;
  }

  // Return pending commands to ESP32
  res.json({ commands: pendingCommands });
  pendingCommands = [];
});

// 3. Telegram Webhook Endpoint
app.post('/telegram-webhook', async (req, res) => {
  const message = req.body.message;
  
  if (message && message.text) {
    const chatId = message.chat.id;
    const timeSinceLastPing = Date.now() - lastEspPing;

    if (timeSinceLastPing > OFFLINE_THRESHOLD) {
      await axios.post(`${TELEGRAM_API}/sendMessage`, {
        chat_id: chatId,
        text: "⚠️ Lachu is offline at the moment. Pls try after some time"
      });
    } else {
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
