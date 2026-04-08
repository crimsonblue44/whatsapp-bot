const { loadData, saveData } = require('./database');

const MAX_WARNINGS = 3;

async function handleWarnings(client, msg, chat, contact) {
    const body = msg.body?.trim();
    if (!body) return;
    const isAdmin = await isGroupAdmin(msg, chat);

    if (body.startsWith('!warn')) {
        if (!isAdmin) return msg.reply('❌ Only admins can issue warnings.');
        const mentioned = await msg.getMentions();
        if (!mentioned.length) return msg.reply('⚠️ Usage: !warn @user [reason]');
        const target = mentioned[0];
        const reason = body.replace('!warn', '').replace(`@${target.number}`, '').trim() || 'No reason given';
        const result = await addWarning(chat.id._serialized, target.id._serialized, reason, target.pushname || target.number);
        await chat.sendMessage(
            `⚠️ *WARNING ISSUED*\n\n👤 User: @${target.number}\n📝 Reason: ${reason}\n🔢 Warnings: ${result.count}/${MAX_WARNINGS}\n\n` +
            (result.count >= MAX_WARNINGS ? `🚨 *MAX WARNINGS — Removing...*` : `_${MAX_WARNINGS - result.count} warning(s) left before removal_`),
            { mentions: [target] }
        );
        if (result.count >= MAX_WARNINGS) {
            try {
                await chat.removeParticipants([target.id._serialized]);
                await chat.sendMessage(`🚫 @${target.number} removed for reaching ${MAX_WARNINGS} warnings.`, { mentions: [target] });
                await clearWarnings(chat.id._serialized, target.id._serialized);
            } catch (e) {
                await chat.sendMessage(`❌ Could not remove @${target.number} automatically.`, { mentions: [target] });
            }
        }
        return;
    }

    if (body.startsWith('!warnings')) {
        const mentioned = await msg.getMentions();
        if (!mentioned.length) return msg.reply('⚠️ Usage: !warnings @user');
        const target = mentioned[0];
        const data = await getWarnings(chat.id._serialized, target.id._serialized);
        if (!data || data.count === 0) return chat.sendMessage(`✅ @${target.number} has no warnings.`, { mentions: [target] });
        let log = `📋 *Warnings for @${target.number}*\n\n🔢 Total: ${data.count}/${MAX_WARNINGS}\n\n`;
        data.history.forEach((w, i) => { log += `${i + 1}. 📝 ${w.reason}\n   🕐 ${new Date(w.timestamp).toLocaleString()}\n\n`; });
        return chat.sendMessage(log, { mentions: [target] });
    }

    if (body.startsWith('!clearwarn')) {
        if (!isAdmin) return msg.reply('❌ Only admins can clear warnings.');
        const mentioned = await msg.getMentions();
        if (!mentioned.length) return msg.reply('⚠️ Usage: !clearwarn @user');
        const target = mentioned[0];
        await clearWarnings(chat.id._serialized, target.id._serialized);
        return chat.sendMessage(`✅ Warnings cleared for @${target.number}`, { mentions: [target] });
    }

    if (body === '!warnlist') {
        if (!isAdmin) return msg.reply('❌ Only admins can view warnings.');
        const db = loadData();
        const groupWarns = db.warnings?.[chat.id._serialized] || {};
        const warned = Object.entries(groupWarns).filter(([, v]) => v.count > 0);
        if (!warned.length) return msg.reply('✅ No active warnings.');
        let list = `📋 *Active Warnings*\n\n`;
        warned.forEach(([userId, data]) => { list += `👤 ${data.name || userId.split('@')[0]}: ${data.count}/${MAX_WARNINGS}\n`; });
        return msg.reply(list);
    }
}

async function addWarning(groupId, userId, reason, name) {
    const db = loadData();
    if (!db.warnings) db.warnings = {};
    if (!db.warnings[groupId]) db.warnings[groupId] = {};
    if (!db.warnings[groupId][userId]) db.warnings[groupId][userId] = { count: 0, history: [], name };
    const entry = db.warnings[groupId][userId];
    entry.count += 1;
    entry.name = name;
    entry.history.push({ reason, timestamp: Date.now() });
    saveData(db);
    return entry;
}

async function getWarnings(groupId, userId) {
    const db = loadData();
    return db.warnings?.[groupId]?.[userId] || { count: 0, history: [] };
}

async function clearWarnings(groupId, userId) {
    const db = loadData();
    if (db.warnings?.[groupId]?.[userId]) {
        db.warnings[groupId][userId] = { count: 0, history: [] };
        saveData(db);
    }
}

async function isGroupAdmin(msg, chat) {
    try {
        const sender = msg.author || msg.from;
        const participant = chat.participants.find(p => p.id._serialized === sender);
        return participant?.isAdmin || participant?.isSuperAdmin || false;
    } catch { return false; }
}

module.exports = { handleWarnings
