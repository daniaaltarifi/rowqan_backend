const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const path = require('path');
const fs = require('fs');


const SESSION_PATH = path.join(__dirname, '../whatsapp-session');


if (!fs.existsSync(SESSION_PATH)) {
    fs.mkdirSync(SESSION_PATH, { recursive: true });
}

let isClientReady = false;
let reconnectAttempts = 0;
let reconnectInterval = null;

const client = new Client({
    authStrategy: new LocalAuth({
        clientId: "whatsapp-persistent",
        dataPath: SESSION_PATH
    }),
    puppeteer: { 
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-gpu',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-extensions',
            '--disable-web-security',
            '--single-process',
            '--ignore-certificate-errors',
            '--disable-notifications',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-breakpad',
            '--no-first-run',
            '--window-size=1280,720',
            '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.81 Safari/537.36'
        ],
        defaultViewport: {
            width: 1280,
            height: 720
        },
        timeout: 0, 
        protocolTimeout: 0, 
    },
    restartOnAuthFail: true,
    takeoverOnConflict: true,
    qrMaxRetries: 0, 
    authTimeoutMs: 0, 
    webVersionCache: {
        type: 'local',
        path: path.join(SESSION_PATH, '.wwebjs_cache'),
    },
    keepalive: true
});


let qrDisplayed = false;
client.on('qr', (qr) => {
    if (!qrDisplayed) {
        console.log('\n=========================');
        console.log('Scan QR Code to login:');
        console.log('=========================\n');
        qrcode.generate(qr, { small: true });
        qrDisplayed = true;
    }
});

client.on('ready', () => {
    isClientReady = true;
    reconnectAttempts = 0;
    qrDisplayed = false;
    console.log('\n=========================');
    console.log('WhatsApp client is ready and connected!');
    console.log('Session is saved and will persist');
    console.log('=========================\n');

    if (reconnectInterval) {
        clearInterval(reconnectInterval);
        reconnectInterval = null;
    }
});

client.on('authenticated', () => {
    console.log('WhatsApp client is authenticated!');
    isClientReady = true;
    reconnectAttempts = 0;
    qrDisplayed = false;
});

client.on('auth_failure', async (msg) => {
    console.error('Authentication failed:', msg);
    isClientReady = false;
    qrDisplayed = false;
    startReconnectProcess('Authentication failed');
});


client.on('disconnected', async (reason) => {
    console.log('\n=========================');
    console.log('Client was disconnected:', reason);
    console.log('Attempting to reconnect...');
    console.log('=========================\n');
    
    isClientReady = false;
    qrDisplayed = false;
    

    try {
        await client.destroy();
        await new Promise(resolve => setTimeout(resolve, 5000));
        await client.initialize();
    } catch (error) {
        console.error('Immediate reconnection failed:', error);
        startReconnectProcess('Disconnected: ' + reason);
    }
});


client.on('change_state', state => {
    console.log('Connection state:', state);
});


client.on('loading_screen', (percent, message) => {
    console.log('Loading:', percent, message);
});


const startReconnectProcess = async (reason) => {
    if (reconnectInterval) {
        clearInterval(reconnectInterval);
    }

    const attemptReconnect = async () => {
        if (!isClientReady) {
            console.log(`\nReconnection attempt ${reconnectAttempts + 1}`);
            try {
                await client.destroy();
                await new Promise(resolve => setTimeout(resolve, 2000));
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
        } else {
            clearInterval(reconnectInterval);
            reconnectInterval = null;
        }
    };

    reconnectInterval = setInterval(attemptReconnect, 30000); 
    attemptReconnect();
};


setInterval(() => {
    if (!isClientReady) {
        console.log('Performing connection check...');
        checkConnection();
    }
}, 60000); 


const initializeClient = async () => {
    try {
        console.log('\n=========================');
        console.log('Starting WhatsApp client...');
        console.log('=========================\n');
        
        await client.initialize();
        
    } catch (error) {
        console.error('Initialization error:', error);
        setTimeout(initializeClient, 10000);
    }
};


process.on('SIGINT', async () => {
    console.log('\nReceived SIGINT. Maintaining connection...');
});

process.on('SIGTERM', async () => {
    console.log('\nReceived SIGTERM. Maintaining connection...');
});


initializeClient();

module.exports = {
    client,
    isClientReady: () => isClientReady
};