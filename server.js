// File: server.js
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');

const app = express();
app.use(cors());
// 🔥 IMPORTANT FIX: Increased limit to 50mb so backup files don't get blocked
app.use(express.json({ limit: '50mb' })); 

// 🔐 TERE CREDENTIALS
const MY_GMAIL = 'sheikhtaj3010@gmail.com'; 
const APP_PASSWORD = 'vkpfhpbdpotculhl'; 

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: MY_GMAIL, pass: APP_PASSWORD }
});

// 🔥 IN-MEMORY OTP STORE (5 Min Expiry)
const otpStore = new Map();

// 🧠 CONTEXT-BASED EMAIL TEMPLATE ENGINE (For OTPs)
const getEmailTemplateContent = (type, otp) => {
  let title = "Verify Your Email";
  let message = "Use this 6-digit OTP to verify your SafeLocker recovery email. It expires in 5 minutes.";
  let subject = "SafeLocker: Email Verification OTP";

  switch (type) {
    case 'RESET_MASTER_PIN':
      title = "Reset Your Vault PIN";
      message = "Use this 6-digit OTP to reset your SafeLocker master PIN.<br><br>If you did not request this, ignore this email.";
      subject = "SafeLocker: Reset Master PIN";
      break;
    case 'FAKE_PIN_UNLOCK':
      title = "Unlock Fake Vault";
      message = "Use this 6-digit OTP to access your SafeLocker decoy vault.<br><br>This request was made to recover your fake PIN.";
      subject = "SafeLocker: Fake Vault Recovery";
      break;
    case 'CHANGE_PIN':
      title = "Confirm PIN Change";
      message = "Use this OTP to confirm your SafeLocker PIN update.";
      subject = "SafeLocker: Confirm PIN Change";
      break;
    case 'VERIFY_EMAIL':
    default:
      title = "Verify Your Email";
      message = "Use this 6-digit OTP to verify your SafeLocker recovery email. It expires in 5 minutes.";
      subject = "SafeLocker: Email Verification OTP";
      break;
  }

  // 🎨 Premium OTP Email Design
  const html = `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 40px 20px; text-align: center; background: #FAFAFB;">
    <div style="max-width: 90%; margin: auto; background: #F9FAFB; padding: 32px 20px; border-radius: 16px; border: 1px solid #E5E7EB; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
      <h2 style="color: #1A1A1A; margin-top: 0; font-size: 22px;">${title}</h2>
      <p style="color: #6B7280; font-size: 15px; line-height: 1.5; margin-bottom: 24px;">${message}</p>
      
      <div style="background: #EEF2FF; padding: 14px; border-radius: 12px; margin: 0 auto; max-width: 200px;">
        <h1 style="letter-spacing: 6px; color: #6C5CE7; margin: 0; font-size: 28px; font-weight: 800;">${otp}</h1>
      </div>
      
      <p style="color: #9CA3AF; font-size: 12px; margin-top: 32px;">This is an automated security message from SafeLocker.</p>
    </div>
  </div>
  `;

  return { subject, html };
};

// 🔥 1. SEND OTP ROUTE
app.post('/send-otp', async (req, res) => {
  const { email, otpType } = req.body; 
  if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore.set(email, { otp, expires: Date.now() + 5 * 60000 });
  const template = getEmailTemplateContent(otpType, otp);

  try {
    await transporter.sendMail({
      from: `"SafeLocker Security" <${MY_GMAIL}>`,
      to: email,
      subject: template.subject,
      html: template.html
    });
    res.status(200).json({ success: true, message: 'OTP sent successfully!' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 🔥 2. VERIFY OTP ROUTE
app.post('/verify-otp', (req, res) => {
  const { email, otp } = req.body;
  const record = otpStore.get(email);

  if (!record) return res.status(400).json({ success: false, message: 'OTP not requested or expired.' });
  if (Date.now() > record.expires) {
    otpStore.delete(email);
    return res.status(400).json({ success: false, message: 'OTP expired.' });
  }
  if (record.otp === otp) {
    otpStore.delete(email); 
    return res.status(200).json({ success: true, message: 'OTP Verified successfully!' });
  }
  
  res.status(400).json({ success: false, message: 'Invalid OTP.' });
});

// 🔥 3. SEND SECURITY ALERT ROUTE
app.post('/send-alert', async (req, res) => {
  const { email, subject, message } = req.body;
  if (!email || !subject || !message) return res.status(400).json({ success: false, message: 'Email, subject and message are required' });

  const formattedMessage = message.replace(/\n/g, '<br>');
  const alertHtml = `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 40px 20px; text-align: center; background: #FAFAFB;">
    <div style="max-width: 90%; margin: auto; background: #F9FAFB; padding: 32px 20px; border-radius: 16px; border: 1px solid #FEE2E2; box-shadow: 0 10px 25px rgba(239, 68, 68, 0.1);">
      <div style="background: #FEE2E2; width: 64px; height: 64px; border-radius: 32px; margin: 0 auto 20px auto; display: flex; align-items: center; justify-content: center;">
        <span style="font-size: 32px;">🛡️</span>
      </div>
      <h2 style="color: #111827; margin-top: 0; font-size: 22px;">Security Alert</h2>
      <div style="background: #FFFFFF; padding: 20px; border-radius: 12px; border: 1px solid #F3F4F6; margin-bottom: 24px; text-align: left;">
        <p style="color: #4B5563; font-size: 15px; line-height: 1.6; margin: 0;">${formattedMessage}</p>
      </div>
      <p style="color: #9CA3AF; font-size: 12px; margin-top: 20px;">This is an automated security alert from SafeLocker. Do not reply to this email.</p>
    </div>
  </div>
  `;

  try {
    await transporter.sendMail({ from: `"SafeLocker Alert" <${MY_GMAIL}>`, to: email, subject: subject, html: alertHtml });
    res.status(200).json({ success: true, message: 'Security alert sent successfully!' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to send alert' });
  }
});

// =========================================================
// 🔥 4. PREMIUM CLOUD BACKUP DELIVERY ROUTE (ATTACHMENT)
// =========================================================
app.post('/send-backup', async (req, res) => {
  const { email, backupData, hint, deviceId } = req.body;

  if (!email || !backupData) {
    return res.status(400).json({ success: false, message: 'Email and backup data are required' });
  }

  const date = new Date().toLocaleString();
  // 🔥 IMPORTANT FIX: Gmail strictly checks extensions. Changed to .json
  const fileName = `SafeLocker_Backup_${Date.now()}.json`;

  // 🎨 Ultra-Premium Email Template
  const backupHtml = `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px 20px; text-align: center; background: #F8F9FB;">
    <div style="max-width: 90%; margin: auto; background: #FFFFFF; padding: 36px 24px; border-radius: 24px; border: 1px solid #EEF1F5; box-shadow: 0 12px 32px rgba(15,23,42,0.05);">
      <div style="background: #E0F2FE; width: 72px; height: 72px; border-radius: 36px; margin: 0 auto 20px auto; display: flex; align-items: center; justify-content: center;">
        <span style="font-size: 34px;">☁️</span>
      </div>
      <h2 style="color: #0F172A; margin-top: 0; font-size: 24px; font-weight: 800;">Secure Cloud Backup</h2>
      <p style="color: #64748B; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">Your automated encrypted vault backup has been successfully generated and securely delivered to your inbox.</p>
      
      <div style="background: #F8F9FB; padding: 18px; border-radius: 16px; text-align: left; margin-bottom: 24px; border: 1px solid #EEF1F5;">
        <p style="margin: 6px 0; color: #475569; font-size: 14px;"><strong>Encryption:</strong> AES-256-GCM V5</p>
        <p style="margin: 6px 0; color: #475569; font-size: 14px;"><strong>Date:</strong> ${date}</p>
        <p style="margin: 6px 0; color: #475569; font-size: 14px;"><strong>Device:</strong> ${deviceId || 'Verified SafeLocker Device'}</p>
        <p style="margin: 6px 0; color: #0284C7; font-size: 14px;"><strong>Hint:</strong> ${hint || 'No hint set'}</p>
      </div>
      
      <div style="background: #FEF2F2; padding: 12px; border-radius: 12px;">
        <p style="color: #EF4444; font-size: 13px; font-weight: 700; margin: 0;">⚠️ IMPORTANT: Keep this attached JSON file safe. It can only be restored using your original Master PIN or Recovery Code.</p>
      </div>
    </div>
  </div>
  `;

  try {
    await transporter.sendMail({
      from: `"SafeLocker Cloud" <${MY_GMAIL}>`,
      to: email,
      subject: "SafeLocker: Your Premium Encrypted Backup 🛡️",
      html: backupHtml,
      attachments: [
        {
          filename: fileName,
          content: backupData,
          contentType: 'application/json' 
        }
      ]
    });
    res.status(200).json({ success: true, message: 'Backup sent to email!' });
  } catch (error) {
    console.error('Error sending backup:', error);
    res.status(500).json({ success: false, message: 'Failed to send backup email' });
  }
});

const PORT = process.env.PORT || 3000;
// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Smart Context-Aware Backend running on port ${PORT}`);
});
