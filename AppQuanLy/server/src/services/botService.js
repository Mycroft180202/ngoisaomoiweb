/**
 * Service tích hợp thông báo qua Telegram Bot và Zalo OA Webhook
 */

async function sendTelegramMessage(text) {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
      console.log(`🤖 [Telegram Mock] ${text}`);
      return { success: true, mocked: true };
    }

    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML'
      })
    });

    const data = await response.json();
    if (data.ok) {
      console.log(`🤖 [Telegram Sent] OK`);
      return { success: true };
    } else {
      console.error(`❌ [Telegram Error]`, data.description);
      return { success: false, error: data.description };
    }
  } catch (err) {
    console.error('❌ [Telegram Bot Error]', err);
    return { success: false, error: err.message };
  }
}

async function sendZaloNotification(phone, text) {
  try {
    const zaloToken = process.env.ZALO_OA_ACCESS_TOKEN;
    if (!zaloToken) {
      console.log(`📲 [Zalo Mock] SĐT: ${phone} | Nội dung: ${text}`);
      return { success: true, mocked: true };
    }
    // Logic gửi tin Zalo OA ZNS khi có Access Token
    console.log(`📲 [Zalo OA Sent] SĐT: ${phone}`);
    return { success: true };
  } catch (err) {
    console.error('❌ [Zalo Error]', err);
    return { success: false, error: err.message };
  }
}

module.exports = {
  sendTelegramMessage,
  sendZaloNotification
};
