import { Api, TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import { NewMessage } from "telegram/events/index.js";
import { config } from "../config.js";
import { EventEmitter } from "node:events";
import JSBI from "jsbi";

interface Account {
  id: string;
  displayName: string;
  isOnline: boolean;
  avatar?: string;
  client: TelegramClient;
  phoneNumber: string;
  unreadCount: number;
  lastSeen?: Date;
}

interface Chat {
  id: string;
  title: string;
  unreadCount: number;
  lastMessage?: Message;
  isGroup: boolean;
  avatar?: string;
  permissions?: ChatPermissions;
  cooldown?: number;
  participants?: ChatParticipant[];
}

interface Message {
  id: string;
  text: string;
  isFromMe: boolean;
  timestamp: number;
  media?: string;
  sender?: {
    id: string;
    name: string;
    avatar?: string;
  };
  replyTo?: string;
  edited?: boolean;
  forwarded?: boolean;
}

interface ChatPermissions {
  canSendMessages: boolean;
  canSendMedia: boolean;
  canInviteUsers: boolean;
  canPinMessages: boolean;
}

interface ChatParticipant {
  id: string;
  name: string;
  avatar?: string;
  role: "admin" | "member" | "creator";
}

export class TelegramManager extends EventEmitter {
  private accounts: Map<string, Account> = new Map();
  private chats: Map<string, Map<string, Chat>> = new Map();
  private typingUsers: Map<string, Map<string, Set<string>>> = new Map();
  private messageCache: Map<string, Map<string, Message[]>> = new Map();
  private static readonly CACHE_SIZE = 100;
  private static readonly TYPING_TIMEOUT = 5000;

  constructor() {
    super();
    this.loadAccounts();
  }

  private async loadAccounts() {
    try {
      const accounts = [
        {
          token:
            "1BAAOMTQ5LjE1NC4xNjcuOTEBuyXE1/pXWSLnG/eVXksgCdYwG+tFzbP2ZN2W9GU5evd97dImoU+oAZEexlc4fsIExxPssFwDxLltkO6fPNeObrmatv6BJyvqVDSdvgvyDqn4INDbVdb7Fn2W0c0gHX4pLY8qsfTFSJBJgQr+eQiotA8goa2fLxN88GmPC753VMDVuFAdwFqkl/B05r51AQ7ooToJGOZtsxRhDioxIHbu88cJKLaZCoyplqZc1Om8HtilgoOJpYw1Z51sWhHqARZ2guUXe5qaRLUN9GZV7NtZbGWgI38N0DN9P0oT7LDJ3xACcCFXAvHRVsXmmn9LBEkDWrUD194U4ZDGZapLfYneElQ=",
        },
        {
          token:
            "1BAAOMTQ5LjE1NC4xNjcuOTEBu8Gz84boKViaq7QQHkBB3QtcH9+/iyLn5qVjovEuZlmyMJGtZL1+9jICYtv/mTyXd/cXYihIYqSR6YFS1wDsQF0rGATvzagb2OcM4hEkgTTQv2AO+rgJeHt9wjpeopBnN32WjZ4ToeUtaZ/pDopEyLhC+1fhq7WxM1GItb5HVw+MbZ9dM4cWiZXjHXoVQspSkbhtVJcGKmfLN+ZAHFTPxlvSoYBSXIevntt71BpKQYAwWDwdij8pG8NBijwy1dxQ2ioOZ4fztGxs8wV8RCqE2PnJLGIOwWxhzuZ1kQVfUDsqb7jgMftWHIWT6Sq9noNhuPg8EzMDtM6U3eHfi1ImNMA=",
        },
      ];
      for (const account of accounts) {
        await this.addAccount(account);
      }
    } catch (error) {
      console.error("Failed to load accounts:", error);
    }
  }

  private async loadChats(account: Account) {
    try {
      const dialogs = await account.client.getDialogs({});
      const chatsMap = new Map<string, Chat>();

      for (const dialog of dialogs) {
        const message = dialog.message;
        const sender = message?.sender && message.sender instanceof Api.User ? {
          id: message.sender.id.toString(),
          name: (message.sender as Api.User).firstName || (message.sender as Api.User).username || "Unknown",
          avatar: (message.sender as Api.User).photo ? await this.getProfilePhotoUrl(account.client, message.sender) : undefined
        } : undefined;

        const chat: Chat = {
          id: dialog.id.toString(),
          title: dialog.title,
          unreadCount: dialog.unreadCount,
          lastMessage: message ? {
            id: message.id.toString(),
            text: message.message || '',
            isFromMe: message.out || false,
            timestamp: message.date ? message.date * 1000 : Date.now(),
            sender,
            replyTo: message.replyTo?.replyToMsgId?.toString(),
            edited: Boolean(message.editDate),
            forwarded: Boolean(message.fwdFrom)
          } : undefined,
          isGroup: dialog.isGroup,
          avatar: dialog.entity && 'photo' in dialog.entity ? await this.getProfilePhotoUrl(account.client, dialog.entity) : undefined
        };
        chatsMap.set(chat.id, chat);
      }

      this.chats.set(account.id, chatsMap);
    } catch (error) {
      console.error("Failed to load chats:", error);
    }
  }

  private async addAccount(accountData: { token: string }) {    const session = new StringSession(accountData.token);    const client = new TelegramClient(session, config.API_ID, config.API_HASH, {
      connectionRetries: 5,
      retryDelay: 1000,
      useWSS: true,
    });

    try {
      await client.connect();
      const me = await client.getMe();

      if (!me) {
        throw new Error("Failed to get user info");
      }

      const account: Account = {
        id: me.id.toString(),
        displayName: me.username || me.firstName || "Unknown",
        isOnline: true,
        client,
        unreadCount: 0,
        phoneNumber: me.phone || "Unknown",
        avatar: me.photo ? await this.getProfilePhotoUrl(client, me) : undefined,
      };

      this.accounts.set(account.id, account);
      this.chats.set(account.id, new Map());
      this.typingUsers.set(account.id, new Map());
      this.messageCache.set(account.id, new Map());

      await this.setupEventHandlers(account);
      await this.loadChats(account);

      console.log(`Added account: ${account.displayName}`);
    } catch (error) {
      console.error("Failed to connect account:", error);
      throw error;
    }
  }

  private async setupEventHandlers(account: Account) {
    account.client.addEventHandler(async (event) => {
      const message = event.message;

      const chatId = message.peerId?.toString();

      if (!chatId) return;

      const formattedMessage = await this.formatMessage(
        account.client,
        message
      );
      this.addMessageToCache(account.id, chatId, formattedMessage);

      this.emit("newMessage", {
        accountId: account.id,
        chatId,
        message: formattedMessage,
      });

      if (!formattedMessage.isFromMe) {
        const chat = this.chats.get(account.id)?.get(chatId);
        if (chat) {
          chat.unreadCount++;
          this.emit("unreadCountUpdate", {
            accountId: account.id,
            chatId,
            unreadCount: chat.unreadCount,
          });
        }
      }
    }, new NewMessage({}));

    account.client.addEventHandler(async (update) => {
      if (
        update instanceof Api.UpdateUserTyping ||
        update instanceof Api.UpdateChatUserTyping
      ) {
        const chatId =
          update instanceof Api.UpdateChatUserTyping
            ? update.chatId.toString()
            : update.userId.toString();
        const userId =
          update instanceof Api.UpdateUserTyping
            ? update.userId.toString()
            : update.userId.toString();

        if (!chatId || !userId) return;

        const chatTyping =
          this.typingUsers.get(account.id)?.get(chatId) || new Set();
        chatTyping.add(userId);

        setTimeout(() => {
          chatTyping.delete(userId);
          this.emit("typingUpdate", {
            accountId: account.id,
            chatId,
            users: Array.from(chatTyping),
          });
        }, TelegramManager.TYPING_TIMEOUT);

        this.emit("typingUpdate", {
          accountId: account.id,
          chatId,
          users: Array.from(chatTyping),
        });
      }
    });
  }

  private async formatMessage(
    client: TelegramClient,
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    message: any
  ): Promise<Message> {
    // biome-ignore lint/suspicious/noImplicitAnyLet: <explanation>
    let sender;
    if (message.sender) {
      try {
        sender = {
          id: message.sender.id.toString(),
          name: message.sender.firstName || message.sender.username || "Unknown",
          avatar: message.sender.photo ? await this.getProfilePhotoUrl(client, message.sender) : undefined,
        };
      } catch (error) {
        console.error("Failed to get sender info:", error);
        sender = {
          id: message.sender.id.toString(),
          name: message.sender.firstName || message.sender.username || "Unknown",
        };
      }
    }

    return {
      id: message.id.toString(),
      text: message.message || "",
      isFromMe: message.out,
      timestamp: message.date * 1000,
      media: message.media
        ? await this.downloadMedia(client, message)
        : undefined,
      sender,
      replyTo: message.replyTo?.replyToMsgId?.toString(),
      edited: Boolean(message.editDate),
      forwarded: Boolean(message.fwdFrom),
    };
  }

  private async getProfilePhotoUrl(
    client: TelegramClient,
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    user: any
  ): Promise<string | undefined> {
    try {
      if (!user || !user.photo) {
        return undefined;
      }

      const inputEntity = await client.getInputEntity(user.id.toString());
      const buffer = await client.downloadProfilePhoto(inputEntity);
      return buffer
        ? `data:image/jpeg;base64,${buffer.toString("base64")}`
        : undefined;
    } catch (error) {
      console.error("Failed to get profile photo:", error);
      return undefined;
    }
  }

  public getAccounts() {
    return Array.from(this.accounts.values()).map(
      ({ client, ...account }) => account
    );
  }

  public getChats(accountId: string) {
    return this.chats.get(accountId) || [];
  }

  private async downloadMedia(
    client: TelegramClient,
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    message: any
  ): Promise<string | undefined> {
    try {
      const buffer = await client.downloadMedia(message.media);
      return buffer instanceof Buffer
        ? `data:image/jpeg;base64,${buffer.toString("base64")}`
        : undefined;
    } catch (error) {
      console.error("Failed to download media:", error);
      return undefined;
    }
  }

  private addMessageToCache(
    accountId: string,
    chatId: string,
    message: Message
  ) {
    const accountCache = this.messageCache.get(accountId);
    if (!accountCache) return;

    const chatMessages = accountCache.get(chatId) || [];
    chatMessages.push(message);

    if (chatMessages.length > TelegramManager.CACHE_SIZE) {
      chatMessages.shift();
    }

    accountCache.set(chatId, chatMessages);
  }

  public async getMessages(
    accountId: string,
    chatId: string,
    limit = 50
  ): Promise<Message[]> {
    const account = this.accounts.get(accountId);
    if (!account) throw new Error("Account not found");

    try {
      const messages = await account.client.getMessages(chatId, {
        limit,
        reverse: false,
      });

      const formattedMessages = await Promise.all(
        messages.map((msg) => this.formatMessage(account.client, msg))
      ).then(messages => messages.reverse());

      const accountCache = this.messageCache.get(accountId) || new Map();
      accountCache.set(chatId, formattedMessages);
      this.messageCache.set(accountId, accountCache);

      return formattedMessages;
    } catch (error) {
      console.error("Failed to get messages:", error);
      throw error;
    }
  }

  public async markAsRead(accountId: string, chatId: string): Promise<void> {
    const account = this.accounts.get(accountId);
    if (!account) throw new Error("Account not found");

    try {
      const chat = this.chats.get(accountId)?.get(chatId);
      if (!chat) throw new Error("Chat not found");

      await account.client.invoke(
        new Api.messages.ReadHistory({
          peer: await account.client.getInputEntity(chatId),
          maxId: 0,
        })
      );

      chat.unreadCount = 0;
      this.emit("unreadCountUpdate", {
        accountId,
        chatId,
        unreadCount: 0,
      });
    } catch (error) {
      console.error("Failed to mark messages as read:", error);
      throw error;
    }
  }

  public async sendMessage(
    accountId: string,
    chatId: string,
    text: string
  ): Promise<Message> {
    const account = this.accounts.get(accountId);
    if (!account) throw new Error("Account not found");

    const chat = this.chats.get(accountId)?.get(chatId);
    if (!chat) throw new Error("Chat not found");

    if (chat.permissions && !chat.permissions.canSendMessages) {
      throw new Error(
        "You don't have permission to send messages in this chat"
      );
    }

    if (chat.cooldown) {
      const lastMessage = chat.lastMessage;
      if (
        lastMessage &&
        Date.now() - lastMessage.timestamp < chat.cooldown * 1000
      ) {
        throw new Error(
          `Please wait ${chat.cooldown} seconds between messages`
        );
      }
    }

    try {
      await account.client.invoke(
        new Api.messages.SetTyping({
          peer: await account.client.getInputEntity(chatId),
          action: new Api.SendMessageTypingAction(),
        })
      );

      await new Promise((resolve) =>
        setTimeout(resolve, Math.min(text.length * 50, 2000))
      );

      const result = await account.client.sendMessage(chatId, {
        message: text,
      });

      const formattedMessage = await this.formatMessage(account.client, result);
      this.addMessageToCache(accountId, chatId, formattedMessage);

      this.emit("newMessage", {
        accountId,
        chatId,
        message: formattedMessage,
      });

      return formattedMessage;
    } catch (error) {
      console.error("Failed to send message:", error);
      throw error;
    }
  }
}