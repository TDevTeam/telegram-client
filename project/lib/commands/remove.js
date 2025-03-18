// removes a bot account
export const name = 'remove';
export const description = '\`/remove <id>\`  |  Remove an account from the bot';

export const execute = async (message, args, bot, Manager, Account) => {
    const [id] = args;

    if (!id) {
        return bot.sendMessage(
            message.chat.id,
            `You forgot an ID ☹️\n\nUsage: \`/remove <id>\``, {
                parse_mode: 'Markdown',
                reply_to_message_id: message.message_id,
            });
    }

    const account = Manager.getAccount(id);

    if (!account) {
        return bot.sendMessage(
            message.chat.id,
            `No account found with ID \`${id}\` ☹️`, {
                parse_mode: 'Markdown',
                reply_to_message_id: message.message_id,
            });
    }

    Manager.removeAccount(account);
    Manager.exportToFile();

    return bot.sendMessage(
        message.chat.id,
        `Removed account \`${account.displayName}\` (\`${account.userId}\`) from watching list. 👍\nView all accounts with \`/list\``, {
            parse_mode: 'Markdown',
            reply_to_message_id: message.message_id,
        });
}
