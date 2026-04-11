// File: server.js
require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const rateLimit = require('express-rate-limit'); 

const app = express();

// 🛠️ FIX 1: Trust Render's Proxy (Ye Rate Limiter ko crash hone se rokenge)
app.set('trust proxy', 1); 

// 📡 GLOBAL RADAR
app.use((req, res, next) => {
  console.log(`[RADAR] 🚨 Incoming Request: ${req.method} ${req.url} from ${req.ip}`);
  next();
});

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' })); 

const otpLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, 
  max: 10, 
  message: { success: false, message: "Too many OTP requests." },
  standardHeaders: true, 
  legacyHeaders: false, 
});

const MY_GMAIL = process.env.EMAIL_USER; 
const APP_PASSWORD = process.env.EMAIL_PASS; 

// 🛠️ THE ULTIMATE FIX: Port 587 (STARTTLS) + Strict Timeouts
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,          // 465 hata kar 587 use kar rahe hain (Most reliable for cloud)
  secure: false,      // 587 ke liye ye false hona zaroori hai
  requireTLS: true,   // Security ke liye STARTTLS force karega
  auth: { user: MY_GMAIL, pass: APP_PASSWORD },
  connectionTimeout: 10000, // 10 second mein connect nahi hua toh fail ho jayega, hang nahi hoga
  greetingTimeout: 10000,
  socketTimeout: 10000
});

app.get('/', (req, res) => { res.status(200).send('SafeLocker Ultra-Secure Engine is ALIVE! 🛡️🚀'); });

const otpStore = new Map();

const getEmailTemplateContent = (type, otp) => {
  let title = "Verify Your Email";
  let message = "Use this 6-digit OTP to verify your SafeLocker recovery email. It expires in 5 minutes.";
  let subject = "SafeLocker: Email Verification OTP";
  let themeColor = "#6C5CE7"; 

  if (type === 'VAULT_WIPE') {
    title = "⚠️ URGENT: Vault Reset Requested";
    subject = "🚨 ALERT: SafeLocker Reset OTP";
    themeColor = "#DC2626"; 
  } else if (type === 'RESET_MASTER_PIN') {
    title = "Reset Your Vault PIN";
    subject = "SafeLocker: Reset Master PIN";
  }

  const html = `
  <div style="font-family: sans-serif; padding: 40px 20px; text-align: center; background: #FAFAFB;">
    <div style="max-width: 90%; margin: auto; background: #FFFFFF; padding: 32px 20px; border-radius: 16px; border: 1px solid #E5E7EB;">
      <h2 style="color: ${themeColor};">${title}</h2>
      <p style="color: #6B7280; font-size: 15px;">${message}</p>
      <h1 style="letter-spacing: 6px; color: ${themeColor}; font-size: 28px;">${otp}</h1>
    </div>
  </div>`;
  return { subject, html };
};

app.post('/send-otp', otpLimiter, async (req, res) => {
  const { email, otpType } = req.body; 
  console.log(`🚀 [ROUTE HIT] Processing OTP for: ${email}`);

  if (!email) return res.status(400).json({ success: false, message: 'Email is required' });
  if (!MY_GMAIL || !APP_PASSWORD) {
    console.log(`❌ [AUTH ERROR] Gmail credentials missing!`);
    return res.status(500).json({ success: false, message: 'Server Email Auth not configured.' });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore.set(email, { otp, expires: Date.now() + 5 * 60000 });
  const template = getEmailTemplateContent(otpType, otp);
  
  try {
    console.log(`⏳ Sending email via Nodemailer (IPv4 Forced)...`);
    await transporter.sendMail({ from: `"SafeLocker Security" <${MY_GMAIL}>`, to: email, subject: template.subject, html: template.html });
    console.log(`✅ [SUCCESS] Email sent to: ${email}`);
    res.status(200).json({ success: true, message: 'OTP sent successfully!' });
  } catch (error) { 
    console.error(`❌ [NODEMAILER ERROR]`, error.message);
    res.status(500).json({ success: false, error: error.message }); 
  }
});

app.post('/verify-otp', (req, res) => {
  const { email, otp } = req.body;
  const record = otpStore.get(email);
  if (!record || Date.now() > record.expires) return res.status(400).json({ success: false, message: 'OTP expired or invalid.' }); 
  if (record.otp === otp) { 
    otpStore.delete(email); 
    return res.status(200).json({ success: true, message: 'OTP Verified!' }); 
  }
  res.status(400).json({ success: false, message: 'Invalid OTP.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 RADAR Engine running on port ${PORT}`));
