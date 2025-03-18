export const name = 'add';
export const description = `\`/add <phone number>\`  |  add an account to the bot`;
export const execute = async (message, args, bot, Manager, Account) => {
    let [phoneNumber] = args;

    if (!phoneNumber) {
        return bot.sendMessage(
            message.chat.id,
            `You forgot a phone number ☹️\n\nUsage: \`/add <phone number>\``, {
                parse_mode: 'Markdown',
                reply_to_message_id: message.message_id,
            });
    }

    if (!phoneNumber.includes('+')) {
        return bot.sendMessage(
            message.chat.id,
            `Phone number must include country code (e.g. +1) ☹️\n\nUsage: \`/add <phone number>\``, {
                parse_mode: 'Markdown',
                reply_to_message_id: message.message_id,
            });
    }

    phoneNumber = phoneNumber.replace(/\s/g, '');

    const pleaseWait = await bot.sendMessage(
        message.chat.id,
        `Attempting to log in to account token you provided...`, {
            parse_mode: 'Markdown',
            reply_to_message_id: message.message_id,
        });

    const account = new Account(
        null,
        () => phoneNumber,
        async () => {
            const request = await bot.sendMessage(
                message.chat.id,
                `Please **reply** to this specific message and enter the code sent to \`${phoneNumber}\`:`, {
                    parse_mode: 'Markdown',
                    reply_to_message_id: message.message_id,
                }
            );

            const code = await new Promise(resolve => {
                bot.onReplyToMessage(message.chat.id, request.message_id, (msg) => {
                    resolve(msg.text);
                });
            });

            await bot.deleteMessage(message.chat.id, request.message_id);

            return code;
        },
    );

    const attempt = await account.connect();

    if (!attempt)
        return bot.editMessageText(
            `Failed to log in to phone number you provided, most likely an invalid code. ☹️\n\nCheck the console for a more detailed error.`, {
                parse_mode: 'Markdown',
                chat_id: message.chat.id,
                message_id: pleaseWait.message_id,
            }
        )

    Manager.addAccount(account);
    await Manager.exportToFile();

    return bot.sendMessage(
        message.chat.id,
        `Added account \`${account.displayName}\` to watching list. 👍\nView all accounts with \`/list\``, {
            parse_mode: 'Markdown',
            reply_to_message_id: message.message_id,
            chat_id: message.chat.id,
        })
}