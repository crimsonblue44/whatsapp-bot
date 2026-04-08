const { isGroupAdmin } = require('./warnings');
const { loadData, saveData } = require('./database');
const messageTracker = new Map();

async function handleGroupManagement(client, msg, chat, contact) {
    const body = msg.body?.trim();
    if (!body) return;
    const isAdmin = await isGroupAdmin(msg, chat);
    const groupId = chat.id._serialized;
    const db = loadData();
    const groupSettings = db.groups?.[groupId] || {};

    if (groupSettings.antispam && !isAdmin) {
        const spamResult = await checkSpam(msg, contact, groupId);
        if (spamResult) {
            try {
                await msg.delete(true);
                await chat.sendMessage(`⚠️ @${contact.number} Spam detected! Slow down.`, { mentions: [contact] });
            } catch (e) {}
            return;
        }
    }

    if (groupSettings.antilink && !isAdmin) {
        const hasLink = /https?:\/\/[^\s]+|wa\.me\/[^\s]+|chat\.whatsapp\.com\/[^\s]+/i.test(body);
        if (hasLink) {
            try {
                await msg.delete(true);
                await chat.sendMessage(`🔗 @${contact.number} Links not allowed!`, { mentions: [contact] });
            } catch (e) {}
            return;
        }
    }

    if (body === '!mute') {
        if (!isAdmin) return msg.reply('❌ Only admins can mute.');
        try {
            await chat.setMessagesAdminsOnly(true);
            await chat.sendMessage('🔇 *Group MUTED* — Only admins can send messages.');
        } catch (e) { await msg.reply(`❌ Failed: ${e.message}`); }
        return;
    }

    if (body === '!unmute') {
        if (!isAdmin) return msg.reply('❌ Only admins can unmute.');
        try {
            await chat.setMessagesAdminsOnly(false);
            await chat.sendMessage('🔊 *Group UNMUTED* — Everyone can send messages.');
        } catch (e) { await msg.reply(`❌ Failed: ${e.message}`); }
        return;
    }

    if (body === '!lock') {
        if (!isAdmin) return msg.reply('❌ Only admins can lock.');
        try {
            await chat.setInfoAdminsOnly(true);
            await chat.sendMessage('🔒 *Group info LOCKED*');
        } catch (e) { await msg.reply(`❌ Failed: ${e.message}`); }
        return;
    }

    if (body === '!unlock') {
        if (!isAdmin) return msg.reply('❌ Only admins can unlock.');
        try {
            await chat.setInfoAdminsOnly(false);
            await chat.sendMessage('🔓 *Group info UNLOCKED*');
        } catch (e) { await msg.reply(`❌ Failed: ${e.message}`); }
        return;
    }

    if (body.startsWith('!antispam')) {
        if (!isAdmin) return msg.reply('❌ Only admins can toggle anti-spam.');
        const toggle = body.split(' ')[1]?.toLowerCase();
        if (!['on', 'off'].includes(toggle)) return msg.reply('⚠️ Usage: !antispam on/off');
        if (!db.groups) db.groups = {};
        if (!db.groups[groupId]) db.groups[groupId] = {};
        db.groups[groupId].antispam = toggle === 'on';
        saveData(db);
        await chat.sendMessage(toggle === 'on' ? '🛡️ Anti-Spam ENABLED' : '🛡️ Anti-Spam DISABLED');
        return;
    }

    if (body.startsWith('!antilink')) {
        if (!isAdmin) return msg.reply('❌ Only admins can toggle anti-link.');
        const toggle = body.split(' ')[1]?.toLowerCase();
        if (!['on', 'off'].includes(toggle)) return msg.reply('⚠️ Usage: !antilink on/off');
        if (!db.groups) db.groups = {};
        if (!db.groups[groupId]) db.groups[groupId] = {};
        db.groups[groupId].antilink = toggle === 'on';
        saveData(db);
        await chat.sendMessage(toggle === 'on' ? '🔗 Anti-Link ENABLED' : '🔗 Anti-Link DISABLED');
        return;
    }

    if (body === '!rules') {
        const rules = db.groups?.[groupId]?.rules ||
            `📜 *GROUP RULES*\n\n1️⃣ Be respectful\n2️⃣ No spam\n3️⃣ No links without permission\n4️⃣ No NSFW content\n5️⃣ Follow admin instructions\n\n_3 warnings = Removal_ ⚠️`;
        await msg.reply(rules);
        return;
    }

    if (body.startsWith('!setrules ')) {
        if (!isAdmin) return msg.reply('❌ Only admins can set rules.');
        const newRules = body.replace('!setrules ', '').trim();
        if (!db.groups) db.groups = {};
        if (!db.groups[groupId]) db.groups[groupId] = {};
        db.groups[groupId].rules = `📜 *GROUP RULES*\n\n${newRules}`;
        saveData(db);
        await msg.reply('✅ Rules updated!');
        return;
    }

    if (body.startsWith('!tagall')) {
        if (!isAdmin) return msg.reply('❌ Only admins can tag all.');
        const announcement = body.replace('!tagall', '').trim() || '📢 Attention everyone!';
        const participants = chat.participants;
        let tagMsg = `📢 *ANNOUNCEMENT*\n${announcement}\n\n`;
        const mentions = [];
        for (const p of participants) {
            const pContact = await client.getContactById(p.id._serialized).catch(() => null);
            if (pContact) { mentions.push(pContact); tagMsg += `@${p.id.user} `; }
        }
        await chat.sendMessage(tagMsg, { mentions });
        return;
    }

    if (body === '!groupinfo') {
        const participants = chat.participants;
        const admins = participants.filter(p => p.isAdmin || p.isSuperAdmin);
        const settings = db.groups?.[groupId] || {};
        await msg.reply(
            `ℹ️ *GROUP INFO*\n\n📛 Name: ${chat.name}\n👥 Members: ${participants.length}\n👑 Admins: ${admins.length}\n\n🛡️ *Bot Settings*\n• Anti-Spam: ${settings.antispam ? '✅ ON' : '❌ OFF'}\n• Anti-Link: ${settings.antilink ? '✅ ON' : '❌ OFF'}\n• Muted: ${chat.isReadOnly ? '🔇 YES' : '🔊 NO'}`
        );
        return;
    }
}

async function checkSpam(msg, contact, groupId) {
    const key = `${groupId}_${contact.number}`;
    const now = Date.now();
    const window = 5000;
    const limit = 5;
    if (!messageTracker.has(key)) messageTracker.set(key, []);
    const timestamps = messageTracker.get(key).filter(t => now - t < window);
    timestamps.push(now);
    messageTracker.set(key, timestamps);
    return timestamps.length > limit;
}

module.exports = { handleGroupManagement };
