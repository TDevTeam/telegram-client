import { TelegramClient } from "telegram";
import { TelegramManager } from "./manager.js";
import { config } from "../config.js";
import TelegramBot from "node-telegram-bot-api";

interface FeedMessage {
  id: string;
  text: string;
  timestamp: number;
  accountId: string;
  chatId: string;
  messageId: string
  sender?: {
    id: string;
    name: string;
    chatTitle?: string;
  };
}

export class FeedBot {
  private bot: TelegramBot;
  private manager: TelegramManager;
  private targetGroupId: string;
  private pendingReplies: Map<number, { accountId: string; chatId: string; messageId: string }> = new Map();

  constructor(manager: TelegramManager, botToken: string, targetGroupId: string) {
    this.manager = manager;
    this.targetGroupId = targetGroupId;
    this.bot = new TelegramBot(botToken, { polling: true });
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    // Handle callback queries (button clicks)
    this.bot.on('callback_query', async (callbackQuery) => {
      if (!callbackQuery.message) return;

      const [action, accountId, chatId, messageId] = callbackQuery.data?.split(':') || [];
      const userId = callbackQuery.from.id;

      if (action === 'reply') {
        // Store the pending reply state with account info
        this.pendingReplies.set(userId, { 
          accountId, 
          chatId, 
          messageId: messageId // Store the original message ID
        });
        await this.bot.sendMessage(callbackQuery.message.chat.id, "Please type your reply message by replying to **this** message.", {
          reply_to_message_id: callbackQuery.message.message_id
        });
      } else if (action === 'dismiss') {
        // Remove the message from the feed
        await this.bot.deleteMessage(callbackQuery.message.chat.id, callbackQuery.message.message_id);
      }

      // Answer the callback query to remove the loading state
      await this.bot.answerCallbackQuery(callbackQuery.id);
    });

    // Handle reply messages
    this.bot.on('message', async (msg) => {
      const userId = msg.from?.id;
      if (!userId) return;

      const pendingReply = this.pendingReplies.get(userId);
      if (pendingReply && msg.text) {
        try {
          // Convert messageId to a number and ensure it's within valid range
          const messageIdNum = parseInt(pendingReply.messageId);
          if (isNaN(messageIdNum) || messageIdNum > 2147483647 || messageIdNum < -2147483648) {
            throw new Error('Invalid message ID');
          }

          // Send the reply using the TelegramManager's sendMessage method
          await this.manager.sendMessage(
            pendingReply.accountId,
            pendingReply.chatId,
            msg.text,
            messageIdNum.toString() // Pass the validated message ID
          );
          
          // Clear the pending reply
          this.pendingReplies.delete(userId);
          
          // Confirm to the user
          await this.bot.sendMessage(msg.chat.id, "Reply sent successfully!", {
            reply_to_message_id: msg.message_id
          });
        } catch (error) {
          console.error('Failed to send reply:', error);
          await this.bot.sendMessage(msg.chat.id, "Failed to send reply. Please try again.", {
            reply_to_message_id: msg.message_id
          });
        }
      }
    });
  }

  public async sendFeedMessage(message: FeedMessage) {
    console.log('Received message:', JSON.stringify(message, null, 2));
    const formattedMessage = this.formatFeedMessage(message);
    
    // Ensure message ID is within valid range
    const messageId = parseInt(message.messageId);
    const feedMessageId = parseInt(message.id);
    if (isNaN(messageId) || messageId > 2147483647 || messageId < -2147483648) {
      console.error('Message ID out of range:', message.id);
      return;
    }
    
    await this.bot.sendMessage(this.targetGroupId, formattedMessage, {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "Reply",
              callback_data: `reply:${message.accountId}:${message.chatId}:${messageId}`
            },
            {
              text: "Dismiss",
              callback_data: `dismiss:${message.accountId}:${message.chatId}:${feedMessageId}`
            }
          ]
        ]
      }
    });
  }

  private formatFeedMessage(message: FeedMessage): string {
    const timestamp = new Date(message.timestamp).toLocaleString();
    const account = this.manager.getAccounts().find(acc => acc.id === message.accountId);
    const accountInfo = account ? `📱 Account: ${account.displayName}\n` : '';
    const chatInfo = message.sender?.chatTitle ? `💬 Chat: ${message.sender.chatTitle}\n` : '';
    const sender = message.sender ? `👤 From: ${message.sender.name}\n` : '';
    return `${accountInfo}${chatInfo}${sender}\n💬 ${message.text}\n\n⏰ Time: ${timestamp}`;
  }

  public stop() {
    this.bot.stopPolling();
  }
} 