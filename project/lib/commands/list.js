// list all accounts
export const name = 'list';
export const description = '\`/list\`  |  List all accounts being watched';

export const execute = async (message, args, bot, Manager, Account) => {
    const accounts = Manager.getAccounts();

    if (!accounts.length) {
        return bot.sendMessage(
            message.chat.id,
            `No accounts are being watched. Add one with \`/add\`!`, {
                parse_mode: 'Markdown',
                reply_to_message_id: message.message_id,
            });
    }

    const accountsList = accounts
        .map((account) => {
            return `**${account.displayName || account.user.id}** (\`+${account.user.phone}\`)\n` +
                    `\`/remove ${account.user.id}\``;
        })
        .join('\n');

    return bot.sendMessage(
        message.chat.id,
        `**Accounts:**\n\n${accountsList}`, {
            parse_mode: 'Markdown',
            reply_to_message_id: message.message_id,
        });
}