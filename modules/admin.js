const { isGroupAdmin } = require('./warnings');

async function handleAdminCommands(client, msg, chat, contact) {
    const body = msg.body?.trim();
    if (!body) return;
    const isAdmin = await isGroupAdmin(msg, chat);

    if (body.startsWith('!promote')) {
        if (!isAdmin) return msg.reply('❌ Only admins can promote members.');
        const mentioned = await msg.getMentions();
        if (!mentioned.length) return msg.reply('⚠️ Usage: !promote @user');
        const target = mentioned[0];
        const participant = chat.participants.find(p => p.id._serialized === target.id._serialized);
        if (participant?.isAdmin || participant?.isSuperAdmin) return chat.sendMessage('ℹ️ Already an admin.', { mentions: [target] });
        try {
            await chat.promoteParticipants([target.id._serialized]);
            await chat.sendMessage(`👑 @${target.number} promoted to Admin! 🎉`, { mentions: [target] });
        } catch (e) { await msg.reply(`❌ Failed: ${e.message}`); }
        return;
    }

    if (body.startsWith('!demote')) {
        if (!isAdmin) return msg.reply('❌ Only admins can demote.');
        const mentioned = await msg.getMentions();
        if (!mentioned.length) return msg.reply('⚠️ Usage: !demote @user');
        const target = mentioned[0];
        try {
            await chat.demoteParticipants([target.id._serialized]);
            await chat.sendMessage(`📉 @${target.number} demoted from admin.`, { mentions: [target] });
        } catch (e) { await msg.reply(`❌ Failed: ${e.message}`); }
        return;
    }

    if (body.startsWith('!kick')) {
        if (!isAdmin) return msg.reply('❌ Only admins can kick members.');
        const mentioned = await msg.getMentions();
        if (!mentioned.length) return msg.reply('⚠️ Usage: !kick @user');
        const target = mentioned[0];
        const reason = body.replace('!kick', '').replace(`@${target.number}`, '').trim() || 'No reason given';
        const participant = chat.participants.find(p => p.id._serialized === target.id._serialized);
        if (participant?.isAdmin || participant?.isSuperAdmin) return msg.reply('❌ Cannot kick an admin. Demote first.');
        try {
            await chat.sendMessage(`🚫 @${target.number} removed.\n📝 Reason: ${reason}`, { mentions: [target] });
            await chat.removeParticipants([target.id._serialized]);
        } catch (e) { await msg.reply(`❌ Failed: ${e.message}`); }
        return;
    }

    if (body.startsWith('!add')) {
        if (!isAdmin) return msg.reply('❌ Only admins can add members.');
        const parts = body.split(' ');
        let number = parts[1]?.replace(/[^0-9]/g, '');
        if (!number) return msg.reply('⚠️ Usage: !add [number]');
        if (!number.endsWith('@c.us')) number = `${number}@c.us`;
        try {
            await chat.addParticipants([number]);
            await msg.reply(`✅ Added *${parts[1]}* successfully!`);
        } catch (e) { await msg.reply(`❌ Failed: ${e.message}`); }
        return;
    }

    if (body === '!ping') {
        await msg.reply(`🏓 *Pong!*\n✅ Bot is online!`);
        return;
    }
}

module.exports = { handleAdminCommands };
