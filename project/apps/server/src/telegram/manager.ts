import { Api, TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import { NewMessage } from "telegram/events/index.js";
import { config } from "../config.js";

interface Account {
  id: string;
  displayName: string;
  isOnline: boolean;
  avatar?: string;
  client: TelegramClient;
  unreadCount: number;
  lastSeen?: Date;
}

interface Chat {
  id: string;
  title: string;
  unreadCount: number;
  lastMessage?: string;
  lastMessageDate?: Date;
  isGroup: boolean;
  avatar?: string;
}

export class TelegramManager {
  private accounts: Map<string, Account> = new Map();
  private messages: Map<string, any[]> = new Map();
  private chats: Map<string, Chat[]> = new Map();
  private typingUsers: Map<string, Set<string>> = new Map();

  constructor() {
    this.loadAccounts();
  }

  private async loadAccounts() {
    try {
      const accounts = [{
        token: "1BAAOMTQ5LjE1NC4xNjcuOTEBuyXE1/pXWSLnG/eVXksgCdYwG+tFzbP2ZN2W9GU5evd97dImoU+oAZEexlc4fsIExxPssFwDxLltkO6fPNeObrmatv6BJyvqVDSdvgvyDqn4INDbVdb7Fn2W0c0gHX4pLY8qsfTFSJBJgQr+eQiotA8goa2fLxN88GmPC753VMDVuFAdwFqkl/B05r51AQ7ooToJGOZtsxRhDioxIHbu88cJKLaZCoyplqZc1Om8HtilgoOJpYw1Z51sWhHqARZ2guUXe5qaRLUN9GZV7NtZbGWgI38N0DN9P0oT7LDJ3xACcCFXAvHRVsXmmn9LBEkDWrUD194U4ZDGZapLfYneElQ="
      }];

      for (const account of accounts) {
        await this.addAccount(account);
      }
    } catch (error) {
      console.error("Failed to load accounts:", error);
    }
  }

  private async addAccount(accountData: any) {
    const session = new StringSession(accountData.token);
    const client = new TelegramClient(
      session,
      config.API_ID,
      config.API_HASH,
      {
        connectionRetries: 5,
        retryDelay: 1000,
        useWSS: true,
      }
    );

    try {
      await client.connect();
      const me = await client.getMe();

      if (!me) {
        console.error("Failed to get user info");
        return;
      }

      const account: Account = {
        id: me.id.toString(),
        displayName: me.username || me.firstName || "Unknown",
        isOnline: true,
        client,
        unreadCount: 0,
        avatar: me.photo?.photoId ? await this.getProfilePhoto(client, me.id) : undefined
      };

      this.accounts.set(account.id, account);
      this.messages.set(account.id, []);
      this.typingUsers.set(account.id, new Set());

      // Set up event handlers
      this.setupEventHandlers(account);
      await this.loadChats(account);

      console.log(`Added account: ${account.displayName}`);
    } catch (error) {
      console.error("Failed to connect account:", error);
    }
  }

  private async getProfilePhoto(client: TelegramClient, userId: string): Promise<string | undefined> {
    try {
      const photos = await client.getProfilePhotos(userId);
      if (photos && photos.length > 0) {
        const photo = photos[0];
        const buffer = await client.downloadProfilePhoto(userId);
        return buffer ? `data:image/jpeg;base64,${buffer.toString('base64')}` : undefined;
      }
    } catch (error) {
      console.error("Failed to get profile photo:", error);
    }
    return undefined;
  }

  private async loadChats(account: Account) {
    try {
      const dialogs = await account.client.getDialogs({});
      const chats: Chat[] = [];

      for (const dialog of dialogs) {
        const chat: Chat = {
          id: dialog.id.toString(),
          title: dialog.title,
          unreadCount: dialog.unreadCount,
          lastMessage: dialog.message?.message,
          lastMessageDate: dialog.message?.date ? new Date(dialog.message.date * 1000) : undefined,
          isGroup: dialog.isGroup,
          avatar: dialog.photo ? await this.getProfilePhoto(account.client, dialog.id.toString()) : undefined
        };
        chats.push(chat);
      }

      this.chats.set(account.id, chats);
    } catch (error) {
      console.error("Failed to load chats:", error);
    }
  }

  private setupEventHandlers(account: Account) {
    // Message handler
    account.client.addEventHandler(async (event) => {
      const message = event.message;
      const messages = this.messages.get(account.id) || [];
      
      messages.push({
        id: String(message.id),
        text: message.message,
        fromMe: message.fromId?.toString() === account.id,
        timestamp: Date.now(),
        media: message.media ? await this.processMedia(account.client, message) : undefined
      });

      this.messages.set(account.id, messages);
      
      // Update unread count
      if (!message.fromMe) {
        account.unreadCount++;
      }
    }, new NewMessage({}));

    // Update online status periodically
    setInterval(async () => {
      try {
        const user = await account.client.getMe();
        if (user) {
          account.isOnline = true;
          account.lastSeen = new Date();
        }
      } catch (error) {
        account.isOnline = false;
        console.error("Failed to update user status:", error);
      }
    }, 60000); // Check every minute
  }

  private async processMedia(client: TelegramClient, message: any) {
    if (!message.media) return undefined;

    try {
      const buffer = await client.downloadMedia(message.media, {
        workers: 1
      });
      if (buffer instanceof Buffer) {
        return `data:image/jpeg;base64,${buffer.toString('base64')}`;
      }
      return undefined;
    } catch (error) {
      console.error("Failed to process media:", error);
      return undefined;
    }
  }

  public getAccounts() {
    return Array.from(this.accounts.values()).map(({ client, ...account }) => account);
  }

  public getChats(accountId: string) {
    return this.chats.get(accountId) || [];
  }

  public getMessages(accountId: string) {
    return this.messages.get(accountId) || [];
  }

  public async sendMessage(accountId: string, chatId: string, text: string) {
    const account = this.accounts.get(accountId);
    if (!account) return;

    try {
      // Set typing status
      await account.client.invoke(new Api.messages.SetTyping({
        peer: chatId,
        action: new Api.SendMessageTypingAction(),
      }));

      // Simulate typing delay based on message length
      await new Promise(resolve => setTimeout(resolve, Math.min(text.length * 50, 2000)));

      // Send message
      const result = await account.client.sendMessage(chatId, { message: text });
      
      // Add to local messages
      const messages = this.messages.get(accountId) || [];
      messages.push({
        id: String(result.id),
        text,
        fromMe: true,
        timestamp: Date.now()
      });
      
      this.messages.set(accountId, messages);
    } catch (error) {
      console.error("Failed to send message:", error);
      throw error;
    }
  }

  public async markAsRead(accountId: string, chatId: string) {
    const account = this.accounts.get(accountId);
    if (!account) return;

    try {
      await account.client.invoke(new Api.messages.ReadHistory({
        peer: chatId,
        maxId: 0
      }));
      
      // Update local unread count
      account.unreadCount = Math.max(0, account.unreadCount - 1);
    } catch (error) {
      console.error("Failed to mark messages as read:", error);
    }
  }
}