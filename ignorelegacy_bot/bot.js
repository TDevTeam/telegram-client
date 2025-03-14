const TelegramBot = require('node-telegram-bot-api');
const botToken = "7534228882:AAHYudeWiRrRef93Iz0YuRgkScm4lbBkWhE";
const targetChatId = '-1002324172114';
const bot = new TelegramBot(botToken, { polling: true });
bot.sendMessage(targetChatId, "Bot started!");