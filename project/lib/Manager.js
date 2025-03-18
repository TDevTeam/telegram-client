import Account from './Account.js';
import fs from 'node:fs';
import {print} from './globals.js';
import {sessions} from "telegram";

const accounts = [];

export const getAccount = (id) => {
    return accounts
        .find(account => parseInt(account?.user?.id?.value) === parseInt(id));
}

export const addAccount = (account) => {
    accounts.push(account);
}

export const removeAccount = async (account) => {
    const index = accounts.indexOf(account);
    if (index !== -1) {
        const toRemove = accounts[index];
        await toRemove.disconnect();
        accounts.splice(index, 1);
    }
}

export const getAccounts = () => {
    return accounts;
}

export const setupFromFile = async () => {
    const storedAccounts =
        fs.readFileSync('./config/accounts.txt', 'utf8')
            .replace(/\r/g, '')
            .split('\n')
            .filter(Boolean)
            .map(line => line.trim())
            .map(line => line.split(':'))
            .map(([number, token]) => ({
                phone: `+${number}`,
                token,
            }))

    print('Found', storedAccounts.length, 'accounts stored in cache');

    for (const storedAccount of storedAccounts) {
        const account = new Account(
            new sessions.StringSession(storedAccount.token),
        );

        const loggedIn = await account.connect();
        if (!loggedIn) {
            account.print('Failed to log in to account from cache');
            continue;
        }

        addAccount(account);
    }

    await exportToFile();
}

export const exportToFile = async () => {
    const storedAccounts =
        accounts
            .map(account => `${account.user.phone}:${account.client.session.save()}`);

    fs.writeFileSync('./config/accounts.txt', storedAccounts.join('\n'));
}

setInterval(exportToFile, 1000 * 60 * 5);