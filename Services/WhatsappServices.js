const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

// إنشاء العميل
const client = new Client({
  authStrategy: new LocalAuth({
    dataPath: './whatsapp-session'
  }),
  puppeteer: { 
    headless: 'new',
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage'
    ],
    timeout: 120000
  }
});

// متغير للتتبع حالة الاتصال
let isClientReady = false;

// معالجة الأحداث
client.on('qr', (qr) => {
  qrcode.generate(qr, {small: true});
  console.log('يرجى مسح رمز QR للاتصال بـ WhatsApp');
});

client.on('ready', () => {
  isClientReady = true;
  console.log('عميل WhatsApp جاهز للإرسال');
});

client.on('disconnected', (reason) => {
  isClientReady = false;
  console.log('تم قطع اتصال عميل WhatsApp:', reason);
  
  // محاولة إعادة الاتصال
  setTimeout(() => {
    console.log('جاري إعادة الاتصال...');
    client.initialize();
  }, 5000);
});

// تهيئة العميل
client.initialize();

// تصدير المتغيرات والوظائف
// في نهاية ملف whatsapp-client.js
module.exports = {
    client,
    isClientReady: () => isClientReady
  };