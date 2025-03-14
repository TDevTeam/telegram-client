import {Api, sessions, TelegramClient,} from 'telegram';
import {NewMessage} from 'telegram/events/NewMessage.js';

import {print, sleep} from "./globals.js";
import {sendGlobalMessage} from "./bot.js";

const API_ID = 20730239;
const API_HASH = '72c82b71fc9db0a2808cdbeca34912e7'
const TYPING_SPEED = 100; // WPM

class Account {
    session = new sessions.StringSession('');
    randomId = Date.now();
    client;

    user = {};
    userId = 0;
    displayName = '';

    onPhone = () => {
        this.disconnect();

        throw new Error('Phone number is required');
    };
    onCode = () => {
        this.disconnect();

        throw new Error('Code is required');
    };
    onPassword = () => {
        this.disconnect();

        throw new Error('Password is required');
    };

    print = (...args) => {
        print(
            `[${this.user?.username || this.user?.id || this.randomId}]`, ...args);
    }

    constructor(
        session = this.session,
        onPhone = this.onPhone,
        onCode = this.onCode,
        onPassword = this.onPassword,
    ) {
        this.session = session ?? this.session;
        this.onPhone = onPhone;
        this.onCode = onCode;
        this.onPassword = onPassword;

        this.client = new TelegramClient(
            this.session,
            API_ID,
            API_HASH,
            {
                connectionRetries: 1,
            },
        );

        this.client.on('error', error => {
            this.print(error);
        });

        this.client.addEventHandler(async event => {
            const {
                message
            } = event;

            // this.print(senderId, text, event);

            const author = await message.getSender();
            const chat = await message.getChat();

            if (
                parseInt(author.id) === parseInt(this.user.id)
            ) return this.print('Message from self, ignoring');

            const displayName =
                author.username ?
                    `@${author.username}` :
                    `${author.firstName}${author.lastName ? ` ${author.lastName}` : ''}`;

            if (chat.className === 'Channel')
                return // this.print('Message from channel, ignoring');

            return sendGlobalMessage(
                `${displayName} (<code>${author.id}</code>) to ${this.displayName} (<code>${this.user.id}</code>):\n\n` +
                message.text,
                {
                    parse_mode: 'HTML',
                    reply_markup: {
                        inline_keyboard: [
                            [
                                {
                                    text: '💬 view convo',
                                    callback_data: `convo-${this.user.id}-${chat.id}`,
                                }
                            ]
                        ]
                    }
                }
            )
        }, new NewMessage({}));
    }

    disconnect() {
        this.client.disconnect();
        this.client.destroy();

        this.print('Disconnected from account');

        return true;
    }

    async connect() {
        try {
            await this.client.start({
                phoneNumber: this.onPhone,
                password: this.onPassword,
                phoneCode: this.onCode,
                onError: (error) => {
                    this.disconnect();
                    throw new Error(error);
                }
            });

            this.user = await this.client.getMe();
            this.displayName = this.user.username || this.user.firstName || this.user.lastName;
            this.session = this.client.session.save();
            this.userId = this.user.id;

            this.print(`Signed in as "${this.displayName}" (${this.user.id})`);

            return this.user;
        } catch (error) {
            this.print('Failed to connect to account:', error);
        }

        return null;
    }

    async sendMessage(entity, message) {
        try {
            await this.client.invoke(new Api.messages.ReadHistory({
                peer: entity,
                maxId: 0,
            }));

            await sleep(3000);

            const typeTime = message.length / (TYPING_SPEED / 12);
            this.print('Typing for', typeTime, 'seconds before sending message')

            for (let i = 0; i < typeTime; i ++) {
                await sleep(1000);
                if (i % 5 === 0)
                    await this.client.invoke(new Api.messages.SetTyping({
                        peer: entity,
                        action: new Api.SendMessageTypingAction(),
                    }));
            }

            await this.client.sendMessage(entity, {
                message,
            });
        } catch (error) {
            this.print('Failed to send message to', entity.name, ':', error);
        }
    }

    async getUserInfo(userId) {
        userId = parseInt(userId?.value || userId);

        if (userId === this.user.id)
            return this.user;

        try {
            return await this.client.getEntity(userId);
        } catch (error) {
            this.print('Failed to get user entity for', userId, ':', error);
        }
    }

    async getMessages(entity, limit = 1) {
        try {
            return await this.client.getMessages(entity, {
                limit,
            });
        } catch (error) {
            this.print('Failed to get messages for', entity.id, ':', error);
        }
    }
}

export default Account;