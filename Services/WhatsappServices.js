const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const path = require('path');
const fs = require('fs');


const SESSION_PATH = path.join(__dirname, '../whatsapp-session');


if (!fs.existsSync(SESSION_PATH)) {
    fs.mkdirSync(SESSION_PATH, { recursive: true, mode: 0o777 });
}

let isClientReady = false;
let reconnectAttempts = 0;
let reconnectInterval = null;
let qrDisplayed = false;


const client = new Client({
    authStrategy: new LocalAuth({
        clientId: "whatsapp-persistent",
        dataPath: SESSION_PATH
    }),
    puppeteer: {
        headless: 'new',
        executablePath: '/usr/bin/google-chrome',
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
            '--disable-features=site-per-process',
            '--no-zygote',
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
    qrMaxRetries: 3,
    authTimeoutMs: 60000,
    webVersionCache: {
        type: 'local',
        path: path.join(SESSION_PATH, '.wwebjs_cache'),
    },
    keepalive: true
});


client.on('qr', (qr) => {
    if (!qrDisplayed) {
        console.log('\n=========================');
        console.log('Scan QR Code to login:');
        console.log('=========================\n');
        qrcode.generate(qr, { small: true });
        qrDisplayed = true;
        
      
        setTimeout(() => {
            if (!isClientReady) {
                qrDisplayed = false;
            }
        }, 60000);
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
    
   
    fs.chmod(SESSION_PATH, 0o777, (err) => {
        if (err) console.error('Error setting session permissions:', err);
    });
});


client.on('auth_failure', async (msg) => {
    console.error('Authentication failed:', msg);
    isClientReady = false;
    qrDisplayed = false;
    
    
    setTimeout(async () => {
        try {
            await client.destroy();
            await new Promise(resolve => setTimeout(resolve, 5000));
            await client.initialize();
        } catch (error) {
            console.error('Auth retry failed:', error);
            startReconnectProcess('Authentication failed');
        }
    }, 10000);
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
  
        await new Promise(resolve => setTimeout(resolve, 10000));
        await client.initialize();
    } catch (error) {
        console.error('Immediate reconnection failed:', error);
        startReconnectProcess('Disconnected: ' + reason);
    }
});


client.on('change_state', state => {
    console.log('Connection state:', state);
    

    if (state === 'CONFLICT' || state === 'UNLAUNCHED') {
        setTimeout(async () => {
            try {
                await client.initialize();
            } catch (error) {
                console.error('State change retry failed:', error);
            }
        }, 5000);
    }
});


client.on('loading_screen', (percent, message) => {
    console.log('Loading:', percent, message);
});


const startReconnectProcess = async (reason) => {
    if (reconnectInterval) {
        clearInterval(reconnectInterval);
    }

    const attemptReconnect = async () => {
        if (!isClientReady && reconnectAttempts < 10) {
            console.log(`\nReconnection attempt ${reconnectAttempts + 1}`);
            try {
                await client.destroy();
                await new Promise(resolve => setTimeout(resolve, 5000));
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
                
                
                await new Promise(resolve => setTimeout(resolve, reconnectAttempts * 5000));
            }
        } else if (reconnectAttempts >= 10) {
            console.log('Max reconnection attempts reached. Please check server status.');
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
        startReconnectProcess('Connection check failed');
    }
}, 60000);


const initializeClient = async () => {
    try {
        console.log('\n=========================');
        console.log('Starting WhatsApp client...');
        console.log('=========================\n');
        
        
        fs.chmodSync(SESSION_PATH, 0o777);
        
        await client.initialize();
        
    } catch (error) {
        console.error('Initialization error:', error);
      
        setTimeout(initializeClient, 15000);
    }
};


process.on('SIGINT', async () => {
    console.log('\nReceived SIGINT. Maintaining connection...');
});

process.on('SIGTERM', async () => {
    console.log('\nReceived SIGTERM. Maintaining connection...');
});


process.on('uncaughtException', async (error) => {
    console.error('Uncaught Exception:', error);
    if (!isClientReady) {
        setTimeout(initializeClient, 10000);
    }
});

process.on('unhandledRejection', async (error) => {
    console.error('Unhandled Rejection:', error);
    if (!isClientReady) {
        setTimeout(initializeClient, 10000);
    }
});


initializeClient();

module.exports = {
    client,
    isClientReady: () => isClientReady
};