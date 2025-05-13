import fs from 'fs/promises';
import path from 'path';
import { Message } from '../types';

interface FeedMessage {
  id: string;
  accountId: string;
  chatId: string;
  message: Message;
  timestamp: number;
  dismissed: boolean;
}

export class FeedManager {
  private feedPath: string;
  private feedMessages: FeedMessage[] = [];

  constructor() {
    this.feedPath = path.join(process.cwd(), 'data', 'feed.json');
    this.loadFeed();
  }

  private async loadFeed() {
    try {
      await fs.mkdir(path.dirname(this.feedPath), { recursive: true });
      const data = await fs.readFile(this.feedPath, 'utf-8');
      this.feedMessages = JSON.parse(data);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        this.feedMessages = [];
        await this.saveFeed();
      } else {
        console.error('Error loading feed:', error);
      }
    }
  }

  private async saveFeed() {
    try {
      await fs.writeFile(this.feedPath, JSON.stringify(this.feedMessages, null, 2));
    } catch (error) {
      console.error('Error saving feed:', error);
    }
  }

  public async addMessage(accountId: string, chatId: string, message: Message) {
    // Don't add messages from self
    if (message.isFromMe) return;

    const feedMessage: FeedMessage = {
      id: `${accountId}-${chatId}-${message.id}`,
      accountId,
      chatId,
      message,
      timestamp: Date.now(),
      dismissed: false
    };

    this.feedMessages.unshift(feedMessage);
    await this.saveFeed();
    return feedMessage;
  }

  public async dismissMessage(messageId: string) {
    const message = this.feedMessages.find(m => m.id === messageId);
    if (message) {
      message.dismissed = true;
      await this.saveFeed();
    }
  }

  public getActiveMessages() {
    return this.feedMessages.filter(m => !m.dismissed);
  }

  public async cleanup() {
    // Remove dismissed messages older than 7 days
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    this.feedMessages = this.feedMessages.filter(m => 
      !m.dismissed || m.timestamp > sevenDaysAgo
    );
    await this.saveFeed();
  }
} 