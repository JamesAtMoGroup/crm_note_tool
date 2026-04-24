const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

const FROM = `墨宇股份有限公司 <${process.env.GMAIL_FROM || 'xuecu@mogroup.tw'}>`;

async function sendMail({ to, subject, text }) {
  return transporter.sendMail({ from: FROM, to, subject, text });
}

module.exports = { sendMail };
