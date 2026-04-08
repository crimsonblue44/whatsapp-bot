const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { handleWarnings } = require('./modules/warnings');
const { handleAdminCommands } = require('./modules/admin');
const { handleGroupManagement } = require('./modules/groupManagement');

const client = new Client({
    authStrategy: new LocalAuth({ clientId: 'whatsapp-bot' }),
    puppeteer: {
        headless: true,
        executablePath: '/data/data/com.termux/files/usr/bin/chromium-browser',
        args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--no-first-run','--no-zygote','--single-process','--disable-gpu']
    }
});
client.on('qr', (qr) => { console.log('\n📱 Scan QR Code:\n'); qrcode.generate(qr, { small: true }); });
client.on('ready', () => { console.log('✅ Bot is ONLINE!'); });
client.on('authenticated', () => { console.log('🔐 Authenticated!'); });
client.on('disconnected', (reason) => { console.log('🔌 Disconnected:', reason); });
client.on('message_create', async (msg) => {
    try {
        const chat = await msg.getChat();
        const contact = await msg.getContact();
        if (chat.isGroup) {
            await handleWarnings(client, msg, chat, contact);
            await handleAdminCommands(client, msg, chat, contact);
            await handleGroupManagement(client, msg, chat, contact);
        }
    } catch (error) { console.error('❌ Error:', error.message); }
});
client.initialize();
