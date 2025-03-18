import TelegramBot from 'node-telegram-bot-api';
import * as Manager from './Manager.js';
import Account from './Account.js';
import {config} from './config.js';
import fs from 'node:fs';
import path from 'node:path';

const {
    'Telegram Bot Token': token,
    'Chat ID': defaultChatId,
} = config;

const botId = Number(token.split(':')[0]);

const bot = new TelegramBot(token, {
    polling: true,
});

const commands = {};
for (const file of fs.readdirSync('./lib/commands')) {
    if (!file.endsWith('.js'))
        continue;

    const command = await import(`file:///${path.join(process.cwd(), 'lib', 'commands', file)}`);
    if (!command.name || !command.execute) {
        console.error(`command file "${file}" is missing name or execute function`);
        continue;
    }

    commands[command.name] = command;
}

bot.on('callback_query', async (callbackQuery) => {
    try {
        const chatId = callbackQuery.message.chat.id;
        const messageId = callbackQuery.message.message_id;
        const data = callbackQuery.data;

        const [command, accountId, receivedChatId] = data.split('-');

        const account = Manager.getAccount(Number(accountId));
        if (!account) {
            return bot.answerCallbackQuery(callbackQuery.id, {
                show_alert: true,
                text: `The account "${accountId}" was not found connected to the bot ☹️\n\nReconnect the account and try again.`,
            });
        }

        let userInfoCache = {};
        const getUserInfo = async (userId) => {
            if (!userInfoCache[userId])
                userInfoCache[userId] =
                    await account.getUserInfo(userId);

            return userInfoCache[userId];
        }

        if (command === 'convo') {
            // const entity = await account.client.getEntity(userId);
            const chat = await account.client.getEntity(receivedChatId);

            if (!chat) {
                return bot.answerCallbackQuery(callbackQuery.id, {
                    show_alert: true,
                    text: `No chat found by id ${receivedChatId} from "${accountId}" ☹️`,
                });
            }

            const messages = await account.client.getMessages(chat, {
                limit: 20,
            });

            if (!messages || !messages.total) {
                return bot.answerCallbackQuery(callbackQuery.id, {
                    show_alert: true,
                    text: `No messages found for chat "${chat.id}" from "${accountId}" ☹️`,
                });
            }

            const textMessages = [];

            for (let message of [...messages].reverse()) {
                const {
                    senderId, date, text
                } = message;

                let finalText =
                    (text ?? `No content sent`);

                const sender = await getUserInfo(senderId);

                textMessages.push(`<code>${
                    new Date(date * 1000)
                        .toLocaleTimeString('en-US', {hour: '2-digit', minute: '2-digit', hour12: true})
                }</code> ${sender.username ? `@${sender.username}` : `${sender.firstName}${sender.lastName ? ` ${sender.lastName}` : ''}`}: <code>${finalText}</code>`);
            }

            const mappedUsernames = [];

            for (const receivedMessage of messages) {
                const {senderId} = receivedMessage;
                const user = await getUserInfo(senderId);

                if (user.username && !mappedUsernames.includes(user.username)) {
                    mappedUsernames.push(user.username);
                }
            }

            return bot.editMessageText(
                `Chat history between <b>${account.displayName || account.user.id}</b> (<code>${account.user.id}</code>) and <code>${mappedUsernames.join(', ')}</code>:\n\n` +
                textMessages.join('\n').substring(-1, 3000), {
                    chat_id: chatId,
                    message_id: messageId,
                    parse_mode: 'HTML',
                    reply_markup: {
                        inline_keyboard: [
                            [
                                {
                                    text: '📋 convo',
                                    callback_data: `convo-${accountId}-${chat.id}`,
                                    color: 'secondary'
                                }
                            ]
                        ]
                    },
                }).catch(error => {
                console.error(error);
            });
        }
    } catch (error) {
        console.error(error);
    }
});

bot.on('message', async msg => {
    try {
        // console.log(msg);
        const chatId = msg.chat.id;
        // if (chatId !== defaultChatId)
            // return;

        let { text } = msg;
        if (!text)
            text = `No text sent`;

        if (msg.reply_to_message) {
            const replyMessage = msg.reply_to_message;

            if (replyMessage.from.id === botId && replyMessage?.reply_markup?.inline_keyboard) {
                const [_, accountId, userId] =
                    replyMessage.reply_markup.inline_keyboard[0][0].callback_data.split('-');
                const account = Manager.getAccount(Number(accountId));

                if (!account) {
                    return bot.sendMessage(
                        chatId,
                        `The account "${accountId}" was not found connected to the bot ☹️\n\nReconnect the account and try again.`, {
                            parse_mode: 'Markdown',
                            reply_to_message_id: msg.message_id,
                        });
                }

                const entity = await account.client.getEntity(userId);
                const status = await bot.sendMessage(
                    chatId,
                    `Typing to ${entity.name || entity.id}...`, {
                        parse_mode: 'Markdown',
                        reply_to_message_id: msg.message_id,
                    }
                )

                await account.sendMessage(entity, text);

                return bot.deleteMessage(chatId, status.message_id)
            }
        }

        if (!text.startsWith('/'))
            return;

        const args = text
            .slice(1).split(/ +/g);
        const command = args
            .shift()
            .toLowerCase();

        const commandFile = commands[command];

        if (command === 'help') {
            const commandsList = Object.values(commands)
                .map(command => command.description)
                .join('\n');

            return bot.sendMessage(
                chatId,
                `**Commands:**\n\n${commandsList}`, {
                    parse_mode: 'Markdown',
                    reply_to_message_id: msg.message_id,
                });
        }

        if (!commandFile)
            return;

        commandFile.execute(msg, args, bot, Manager, Account);
    } catch (error) {
        console.error(error);
        return bot.sendMessage(
            msg.chat.id,
            `An error occurred while executing the command, most likely telegram limitations from the bot restarting ☹️\n\nCheck the console for a more detailed error.`, {
                parse_mode: 'Markdown',
                reply_to_message_id: msg.message_id,
            });
    }
});

export const sendGlobalMessage = (...args) =>
    bot.sendMessage(defaultChatId, ...args);