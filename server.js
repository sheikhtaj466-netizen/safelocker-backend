// File: server.js
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' })); 

const MY_GMAIL = 'sheikhtaj3010@gmail.com'; 
const APP_PASSWORD = 'glxhtrgmweljavdc'; 

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: MY_GMAIL, pass: APP_PASSWORD }
});

app.get('/', (req, res) => { res.status(200).send('SafeLocker Cloud Engine is ALIVE! 🚀'); });

const otpStore = new Map();

// 🔥 OTP EMAIL GENERATOR (MATCHES IMAGE 2 & 3 EXACTLY)
const getEmailTemplateContent = (type, otp) => {
  let title = "Verify Your Email";
  let message = "Use this 6-digit OTP to verify your SafeLocker recovery email. It expires in 5 minutes.";
  let subject = "SafeLocker: Email Verification OTP";
  let themeColor = "#6C5CE7"; // Default Purple
  let bgBox = "#EEF2FF";

  if (type === 'VAULT_WIPE') {
    title = "⚠️ URGENT: Vault Reset Requested";
    message = "Use this 6-digit OTP to authorize a complete wipe of your SafeLocker data.<br><br><b>WARNING:</b> This will permanently delete all local data. An emergency backup will be sent to this email before the wipe occurs.";
    subject = "🚨 ALERT: SafeLocker Reset OTP";
    themeColor = "#DC2626"; // 🔥 Danger Red
    bgBox = "#FEF2F2"; // 🔥 Light Red Box
  } else if (type === 'RESET_MASTER_PIN') {
    title = "Reset Your Vault PIN";
    message = "Use this 6-digit OTP to reset your SafeLocker master PIN.";
    subject = "SafeLocker: Reset Master PIN";
  }

  // Exact vertical layout from your images
  const html = `
  <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding: 40px 20px; text-align: center; background: #FAFAFB;">
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

// NORMAL BACKUP
app.post('/send-backup', async (req, res) => {
  const { email, backupData, hint, deviceId } = req.body; 
  if (!email || !backupData) return res.status(400).json({ success: false, message: 'Missing data' });
  const fileName = `SafeLocker_Backup_${Date.now()}.json`;

  const backupHtml = `
  <div style="font-family: -apple-system, sans-serif; padding: 40px 20px; text-align: center; background: #F8F9FB;">
    <div style="max-width: 90%; margin: auto; background: #FFFFFF; padding: 36px 24px; border-radius: 24px; border: 1px solid #EEF1F5;">
      <div style="background: #E0F2FE; width: 72px; height: 72px; border-radius: 36px; margin: 0 auto 20px auto; display: flex; align-items: center; justify-content: center;">
        <span style="font-size: 34px;">☁️</span>
      </div>
      <h2 style="color: #0F172A; margin-top: 0; font-size: 24px; font-weight: 800;">Secure Cloud Backup</h2>
      <p style="color: #64748B; font-size: 15px; margin-bottom: 24px;">Your automated encrypted vault backup has been successfully generated.</p>
    </div>
  </div>`;

  try {
    await transporter.sendMail({
      from: `"SafeLocker Cloud" <${MY_GMAIL}>`,
      to: email,
      subject: "SafeLocker: Premium Encrypted Backup 🛡️",
      html: backupHtml,
      attachments: [{ filename: fileName, content: backupData, contentType: 'application/json' }]
    });
    res.status(200).json({ success: true, message: 'Backup sent!' });
  } catch (error) { res.status(500).json({ success: false }); }
});

// 🔥 PREMIUM HORIZONTAL WIPE BACKUP (FILE ATTACHMENT)
app.post('/send-wipe-backup', async (req, res) => {
  const { email, backupData, device, time } = req.body;
  if (!email || !backupData) return res.status(400).json({ success: false, message: 'Missing data' });

  const fileName = `SafeLocker_WIPE_BACKUP_${Date.now()}.slbackup`; 

  const backupHtml = `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 30px 15px; background-color: #F3F4F6;">
    <div style="max-width: 500px; margin: 0 auto; background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.03);">
      
      <div style="border-bottom: 1px solid #EEF2F6; padding: 20px; background: #FAFAFA;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td width="54" valign="middle">
              <div style="background: #FEE2E2; width: 44px; height: 44px; border-radius: 12px; text-align: center; line-height: 44px; font-size: 20px;">🚨</div>
            </td>
            <td valign="middle">
              <h2 style="margin: 0; color: #111827; font-size: 18px; font-weight: 800;">Emergency Vault Backup</h2>
              <p style="margin: 2px 0 0 0; color: #64748B; font-size: 13px; font-weight: 500;">Auto-generated before secure wipe</p>
            </td>
          </tr>
        </table>
      </div>

      <div style="padding: 24px 20px;">
        <p style="margin-top: 0; color: #334155; font-size: 14px; line-height: 1.6; font-weight: 500;">
          Your SafeLocker vault was successfully wiped. An encrypted backup of your data was captured right before deletion and is attached.
        </p>
        
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 20px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px;">
          <tr>
            <td style="padding: 16px;">
              <p style="margin: 0 0 8px 0; color: #64748B; font-size: 13px;">Format: <strong style="color: #0F172A;">AES-256 Encrypted (.slbackup)</strong></p>
              <p style="margin: 0 0 8px 0; color: #64748B; font-size: 13px;">Time: <strong style="color: #0F172A;">${time || new Date().toLocaleString()}</strong></p>
              <p style="margin: 0; color: #64748B; font-size: 13px;">Device: <strong style="color: #0F172A;">${device || 'Verified Device'}</strong></p>
            </td>
          </tr>
        </table>
      </div>

      <div style="background: #FEF2F2; padding: 16px 20px; border-top: 1px solid #FECACA;">
        <p style="margin: 0; color: #B91C1C; font-size: 12px; font-weight: 700;">⚠️ Keep this file safe. Restore requires your Master PIN.</p>
      </div>

    </div>
  </div>`;

  try {
    await transporter.sendMail({
      from: `"SafeLocker Cloud" <${MY_GMAIL}>`,
      to: email,
      subject: "🚨 SafeLocker: Emergency Reset Backup",
      html: backupHtml,
      attachments: [{ filename: fileName, content: backupData, contentType: 'application/octet-stream' }]
    });
    res.status(200).json({ success: true, message: 'Wipe backup sent!' });
  } catch (error) { res.status(500).json({ success: false }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Engine running on ${PORT}`));
