const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const path = require('path');


const client = new Client({
  authStrategy: new LocalAuth({
    clientId: "whatsapp-persistent",
    dataPath: path.join(__dirname, './whatsapp-session')
  }),
  puppeteer: { 
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-extensions',
      '--disable-web-security',
      '--single-process',
      '--disable-setuid-sandbox',
      '--ignore-certificate-errors'
    ],
    timeout: 0,
    executablePath: process.env.CHROME_PATH
  },
  restartOnAuthFail: true,
  takeoverOnConflict: true,
  qrMaxRetries: 5
});

let isClientReady = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 999999;
let reconnectInterval = null;


client.on('qr', (qr) => {
  console.log('New QR Code. Please scan:');
  qrcode.generate(qr, { small: true });
});


client.on('ready', () => {
  isClientReady = true;
  reconnectAttempts = 0;
  console.log('WhatsApp client is ready and connected!');
  

  if (reconnectInterval) {
    clearInterval(reconnectInterval);
    reconnectInterval = null;
  }
});


client.on('authenticated', () => {
  console.log('WhatsApp client is authenticated!');
  isClientReady = true;
  reconnectAttempts = 0;
});


client.on('auth_failure', async (msg) => {
  console.error('Authentication failed:', msg);
  isClientReady = false;
  

  startReconnectProcess('Authentication failed');
});


client.on('disconnected', async (reason) => {
  console.log('Client was disconnected:', reason);
  isClientReady = false;
  
 
  startReconnectProcess(reason);
});


const startReconnectProcess = (reason) => {
  if (reconnectInterval) {
    clearInterval(reconnectInterval);
  }

  const attemptReconnect = async () => {
    if (!isClientReady && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      console.log(`Reconnection attempt ${reconnectAttempts + 1} (Reason: ${reason})`);
      try {
        await client.initialize();
        if (isClientReady) {
          console.log('Reconnection successful!');
          clearInterval(reconnectInterval);
          reconnectInterval = null;
          reconnectAttempts = 0;
        }
      } catch (error) {
        console.error('Reconnection failed:', error.message);
        reconnectAttempts++;
      }
    } else if (isClientReady) {
      clearInterval(reconnectInterval);
      reconnectInterval = null;
    }
  };


  reconnectInterval = setInterval(attemptReconnect, 10000);
  attemptReconnect();
};


const checkConnection = () => {
  if (!isClientReady) {
    startReconnectProcess('Connection check failed');
  }
  return isClientReady;
};


setInterval(() => {
  if (!isClientReady) {
    console.log('Performing periodic connection check...');
    checkConnection();
  }
}, 30000);


process.on('SIGINT', async () => {
  console.log('Shutting down WhatsApp client...');
  try {
    if (reconnectInterval) {
      clearInterval(reconnectInterval);
    }
    await client.destroy();
    console.log('Client destroyed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error while shutting down:', error);
    process.exit(1);
  }
});


process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  if (!isClientReady) {
    startReconnectProcess('Unhandled rejection');
  }
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  if (!isClientReady) {
    startReconnectProcess('Uncaught exception');
  }
});


const initializeClient = async () => {
  try {
    await client.initialize();
    console.log('Initial client initialization started');
  } catch (error) {
    console.error('Initial initialization failed:', error);
    startReconnectProcess('Initial initialization failed');
  }
};


initializeClient();


module.exports = {
  client,
  isClientReady: () => isClientReady
};