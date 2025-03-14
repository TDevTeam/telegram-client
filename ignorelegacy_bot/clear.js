
const TelegramBot = require('node-telegram-bot-api');

const botToken = "7534228882:AAHYudeWiRrRef93Iz0YuRgkScm4lbBkWhE";
const targetChatId = '-2324172114';

const bot = new TelegramBot(botToken, { polling: false });

async function deleteAllMessages() {
    try {
        // Get updates to find message IDs
        const updates = await bot.getUpdates();
        
        // Extract all message IDs from the chat
        for (const update of updates) {
            if (update.message && update.message.chat.id === targetChatId) {
                try {
                    await bot.deleteMessage(targetChatId, update.message.message_id);
                } catch (err) {
                    console.error(`Failed to delete message ${update.message.message_id}:`, err.message);
                }
            }
        }
        
        console.log('Finished deleting messages');
    } catch (error) {
        console.error('Error deleting messages:', error);
    }
}

deleteAllMessages();
