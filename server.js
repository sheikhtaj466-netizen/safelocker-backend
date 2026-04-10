// File: server.js
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' })); 

const MY_GMAIL = 'sheikhtaj3010@gmail.com'; 
const APP_PASSWORD = 'vkpfhpbdpotculhl'; 

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: MY_GMAIL, pass: APP_PASSWORD }
});

app.get('/', (req, res) => { res.status(200).send('SafeLocker Cloud Engine is ALIVE! 🚀'); });

const otpStore = new Map();

const getEmailTemplateContent = (type, otp) => {
  let title = "Verify Your Email";
  let message = "Use this 6-digit OTP to verify your SafeLocker recovery email. It expires in 5 minutes.";
  let subject = "SafeLocker: Email Verification OTP";
  let themeColor = "#6C5CE7";
  let bgBox = "#EEF2FF";

  switch (type) {
    case 'RESET_VAULT': // 🔥 NEW PREMIUM WARNING OTP
      title = "⚠️ URGENT: Vault Reset Requested";
      message = "Use this 6-digit OTP to authorize a complete wipe of your SafeLocker data.<br><br><b>WARNING:</b> This will permanently delete all local data. An emergency backup will be sent to this email before the wipe occurs.";
      subject = "🚨 ALERT: SafeLocker Reset OTP";
      themeColor = "#DC2626";
      bgBox = "#FEF2F2";
      break;
    case 'RESET_MASTER_PIN':
      title = "Reset Your Vault PIN";
      message = "Use this 6-digit OTP to reset your SafeLocker master PIN.";
      subject = "SafeLocker: Reset Master PIN";
      break;
    case 'VERIFY_EMAIL':
    default:
      title = "Verify Your Email";
      message = "Use this 6-digit OTP to verify your SafeLocker recovery email.";
      subject = "SafeLocker: Email Verification OTP";
      break;
  }

  const html = `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px 20px; text-align: center; background: #FAFAFB;">
    <div style="max-width: 90%; margin: auto; background: #FFFFFF; padding: 32px 20px; border-radius: 16px; border: 1px solid #E5E7EB; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
      <h2 style="color: ${themeColor}; margin-top: 0; font-size: 22px;">${title}</h2>
      <p style="color: #6B7280; font-size: 15px; line-height: 1.5; margin-bottom: 24px;">${message}</p>
      <div style="background: ${bgBox}; padding: 14px; border-radius: 12px; margin: 0 auto; max-width: 200px;">
        <h1 style="letter-spacing: 6px; color: ${themeColor}; margin: 0; font-size: 28px; font-weight: 800;">${otp}</h1>
      </div>
      <p style="color: #9CA3AF; font-size: 12px; margin-top: 32px;">Automated security message from SafeLocker.</p>
    </div>
  </div>`;
  return { subject, html };
};

app.post('/send-otp', async (req, res) => {
  const { email, otpType } = req.body; 
  if (!email) return res.status(400).json({ success: false, message: 'Email is required' });
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore.set(email, { otp, expires: Date.now() + 5 * 60000 });
  const template = getEmailTemplateContent(otpType, otp);
  try {
    await transporter.sendMail({ from: `"SafeLocker Security" <${MY_GMAIL}>`, to: email, subject: template.subject, html: template.html });
    res.status(200).json({ success: true, message: 'OTP sent successfully!' });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.post('/verify-otp', (req, res) => {
  const { email, otp } = req.body;
  const record = otpStore.get(email);
  if (!record || Date.now() > record.expires) { otpStore.delete(email); return res.status(400).json({ success: false, message: 'OTP expired or invalid.' }); }
  if (record.otp === otp) { otpStore.delete(email); return res.status(200).json({ success: true, message: 'OTP Verified!' }); }
  res.status(400).json({ success: false, message: 'Invalid OTP.' });
});

app.post('/send-backup', async (req, res) => {
  const { email, backupData, hint, deviceId, isEmergencyReset } = req.body; // 🔥 NEW FLAG
  if (!email || !backupData) return res.status(400).json({ success: false, message: 'Missing data' });

  const date = new Date().toLocaleString();
  const fileName = `SafeLocker_${isEmergencyReset ? 'WIPE_BACKUP' : 'Backup'}_${Date.now()}.json`;

  // 🔥 DYNAMIC PREMIUM THEME (Red for Reset, Blue for Normal)
  const icon = isEmergencyReset ? "🚨" : "☁️";
  const iconBg = isEmergencyReset ? "#FEE2E2" : "#E0F2FE";
  const titleColor = isEmergencyReset ? "#DC2626" : "#0F172A";
  const title = isEmergencyReset ? "Emergency Vault Reset Backup" : "Secure Cloud Backup";
  const message = isEmergencyReset 
    ? "Your SafeLocker vault was just factory reset. As a security measure, an automatic emergency backup of your data was generated before the wipe." 
    : "Your automated encrypted vault backup has been successfully generated and securely delivered.";

  const backupHtml = `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px 20px; text-align: center; background: #F8F9FB;">
    <div style="max-width: 90%; margin: auto; background: #FFFFFF; padding: 36px 24px; border-radius: 24px; border: 1px solid #EEF1F5; box-shadow: 0 12px 32px rgba(15,23,42,0.05);">
      <div style="background: ${iconBg}; width: 72px; height: 72px; border-radius: 36px; margin: 0 auto 20px auto; display: flex; align-items: center; justify-content: center;">
        <span style="font-size: 34px;">${icon}</span>
      </div>
      <h2 style="color: ${titleColor}; margin-top: 0; font-size: 24px; font-weight: 800;">${title}</h2>
      <p style="color: #64748B; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">${message}</p>
      
      <div style="background: #F8F9FB; padding: 18px; border-radius: 16px; text-align: left; margin-bottom: 24px; border: 1px solid #EEF1F5;">
        <p style="margin: 6px 0; color: #475569; font-size: 14px;"><strong>Encryption:</strong> AES-256-GCM V5</p>
        <p style="margin: 6px 0; color: #475569; font-size: 14px;"><strong>Date:</strong> ${date}</p>
        <p style="margin: 6px 0; color: #475569; font-size: 14px;"><strong>Device:</strong> ${deviceId || 'Verified Device'}</p>
      </div>
      <div style="background: #FEF2F2; padding: 12px; border-radius: 12px;">
        <p style="color: #EF4444; font-size: 13px; font-weight: 700; margin: 0;">⚠️ IMPORTANT: Keep this attached JSON file safe.</p>
      </div>
    </div>
  </div>`;

  try {
    await transporter.sendMail({
      from: `"SafeLocker Cloud" <${MY_GMAIL}>`,
      to: email,
      subject: isEmergencyReset ? "🚨 SafeLocker: Emergency Reset Backup" : "SafeLocker: Premium Encrypted Backup 🛡️",
      html: backupHtml,
      attachments: [{ filename: fileName, content: backupData, contentType: 'application/json' }]
    });
    res.status(200).json({ success: true, message: 'Backup sent!' });
  } catch (error) { res.status(500).json({ success: false }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Engine running on ${PORT}`));
         
