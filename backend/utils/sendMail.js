const nodemailer = require("nodemailer");

const sendMail = async (options) => {
  const emailUser = process.env.EMAIL_USER || process.env.SMPT_MAIL;
  const emailPass = process.env.EMAIL_PASS || process.env.SMPT_PASSWORD;

  if (!emailUser || !emailPass) {
    console.log("Email skipped: mail credentials are not configured.");
    return { skipped: true };
  }

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || process.env.SMPT_HOST || "smtp.gmail.com",
    port: Number(process.env.EMAIL_PORT || process.env.SMPT_PORT || 587),
    secure: false,
    auth: {
      user: emailUser,
      pass: emailPass,
    },
  });

  const mailOptions = {
    from: `"Cartify" <${emailUser}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = sendMail;
