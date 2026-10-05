const nodemailer = require('nodemailer');

// Cấu hình Transporter từ biến môi trường
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // true cho cổng 465, false cho các cổng khác
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || ''
  }
});

/**
 * Gửi email thông báo
 * @param {string} to - Email người nhận
 * @param {string} subject - Tiêu đề email
 * @param {string} html - Nội dung HTML
 */
async function sendEmail(to, subject, html) {
  try {
    if (!to) return { success: false, error: 'Thiếu email người nhận' };

    // Nếu chưa cấu hình cấu hình SMTP trong env thì log mô phỏng (tránh lỗi crash)
    if (!process.env.SMTP_USER) {
      console.log(`✉️ [Email Mock] Gửi đến: ${to} | Tiêu đề: ${subject}`);
      return { success: true, mocked: true };
    }

    const info = await transporter.sendMail({
      from: `"TravelOps CRM" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html
    });

    console.log(`✉️ [Email Sent] MessageID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ [Email Error]', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendEmail
};
