import { Api, TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import { NewMessage } from "telegram/events/index.js";
import { config } from "../config.js";

interface Account {
  id: string;
  displayName: string;
  isOnline: boolean;
  client: TelegramClient;
}

export class TelegramManager {
  private accounts: Map<string, Account> = new Map();
  private messages: Map<string, any[]> = new Map();

  constructor() {
    this.loadAccounts();
  }

  private async loadAccounts() {
    // Load accounts from your existing config/accounts.txt
    const accounts = []; // Load from file
    
    for (const account of accounts) {
      await this.addAccount(account);
    }
  }

  private async addAccount(accountData: any) {
    const session = new StringSession(accountData.token);
    const client = new TelegramClient(
      session,
      config.API_ID,
      config.API_HASH,
      {}
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
      };

      this.accounts.set(account.id, account);
      this.messages.set(account.id, []);

      client.addEventHandler(this.handleNewMessage.bind(this), new NewMessage({}));

      console.log(`Added account: ${account.displayName}`);
    } catch (error) {
      console.error("Failed to connect account:", error);
    }
  }

  private async handleNewMessage(event: any) {
    const message = event.message;
    const accountId = message.peerId.userId.toString();
    const account = this.accounts.get(accountId);

    if (!account) return;

    const messages = this.messages.get(accountId) || [];
    messages.push({
      id: message.id.toString(),
      text: message.message,
      fromMe: false,
      timestamp: Date.now(),
    });

    this.messages.set(accountId, messages);
  }

  public getAccounts() {
    return Array.from(this.accounts.values()).map(({ client, ...account }) => account);
  }

  public getMessages(accountId: string) {
    return this.messages.get(accountId) || [];
  }

  public async sendMessage(accountId: string, text: string) {
    const account = this.accounts.get(accountId);
    if (!account) return;

    try {
      await account.client.sendMessage("me", { message: text });
      
      const messages = this.messages.get(accountId) || [];
      messages.push({
        id: Date.now().toString(),
        text,
        fromMe: true,
        timestamp: Date.now(),
      });
      
      this.messages.set(accountId, messages);
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  }
}