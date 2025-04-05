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

      const chatId = message.chatId?.toString();

      if (!chatId) {
        console.warn("NewMessage event received without a chatId:", event);
        return;
      }

      let chat = this.chats.get(account.id)?.get(chatId);
      if (!chat) {
        try {
          const peer = await account.client.getInputEntity(chatId);
          const entity = await account.client.getEntity(peer);

          if (entity) {
            let title = "Unknown Chat";
            let isGroup = false;
            let avatar: string | undefined = undefined;

            if (entity instanceof Api.User) {
              title = entity.firstName || entity.username || `User ${entity.id.toString()}`;
              isGroup = false;
              avatar = entity.photo ? await this.getProfilePhotoUrl(account.client, entity) : undefined;
            } else if (entity instanceof Api.Chat || entity instanceof Api.Channel) {
              title = entity.title || `Chat ${entity.id.toString()}`;
              isGroup = true;
              avatar = entity.photo ? await this.getProfilePhotoUrl(account.client, entity) : undefined;
            } else {
               console.warn(`Fetched entity for ${chatId} is of unexpected type:`, entity?.className);
            }

            const newChat: Chat = {
              id: entity.id.toString(),
              title: title,
              unreadCount: 0,
              isGroup: isGroup,
              avatar: avatar,
              lastMessage: undefined,
              permissions: undefined,
              cooldown: undefined,
              participants: undefined,
            };

            const accountChats = this.chats.get(account.id);
            if (accountChats) {
              accountChats.set(newChat.id, newChat);
              chat = newChat;
              this.emit("chatUpdate", { accountId: account.id, chat: newChat });
              console.log(`Dynamically added chat ${newChat.title} (${newChat.id}) for account ${account.displayName}`);
            } else {
              console.error(`Account chat map not found for account ${account.id} when adding chat ${newChat.id}`);
              return;
            }
          } else {
            console.error(`Failed to fetch entity details for chat ID: ${chatId}`);
            return;
          }
        } catch (error) {
          console.error(`Error fetching or processing entity for chat ID ${chatId}:`, error);
          return;
        }
      }

      const formattedMessage = await this.formatMessage(
        account.client,
        message
      );
      this.addMessageToCache(account.id, chatId, formattedMessage);

      // Always update the last message for the chat in the local cache
      if (chat) {
          chat.lastMessage = formattedMessage;
          // Optionally, emit an event specifically for last message update if needed elsewhere
          // this.emit("chatLastMessageUpdate", { accountId: account.id, chatId, message: formattedMessage });
      } else {
          // This case should theoretically not happen due to the check/fetch logic above,
          // but adding a log just in case.
          console.warn(`Chat ${chatId} not found when trying to update last message for account ${account.id}`);
      }

      // Emit the generic newMessage event for the client
      this.emit("newMessage", {
        accountId: account.id,
        chatId,
        message: formattedMessage,
      });

      // Only increment unread count and notify if the message is not from self
      if (!formattedMessage.isFromMe && chat) {
        chat.unreadCount++;
        this.emit("unreadCountUpdate", {
          accountId: account.id,
          chatId,
          unreadCount: chat.unreadCount,
        });
        // Emit global update after receiving a new unread message
        this.emit("globalUnreadUpdate", {
          accountId: account.id,
          totalUnreadCount: this._calculateGlobalUnread(account.id)
        });
      }
    }, new NewMessage({}));

    account.client.addEventHandler(async (update) => {
      if (
        update instanceof Api.UpdateUserTyping ||
        update instanceof Api.UpdateChatUserTyping
      ) {
        let chatId: string | undefined;
        let userId: string | undefined;

        if (update instanceof Api.UpdateChatUserTyping) {
          // Group/Channel chat typing
          chatId = update.chatId?.toString();
          // User ID is inside the fromId field for group typings
          if (update.fromId instanceof Api.PeerUser) {
            userId = update.fromId.userId?.toString();
          } else {
            // Handle cases where fromId might be PeerChat/PeerChannel if needed, though typically it's PeerUser for typing
             console.warn("UpdateChatUserTyping received with non-PeerUser fromId:", update.fromId);
          }
        } else if (update instanceof Api.UpdateUserTyping) {
          // Private chat typing - the user ID acts as both chat and user ID
          userId = update.userId?.toString();
          chatId = userId; // In 1-on-1 chat, peer ID is the user ID
        }

        if (!chatId || !userId) {
          console.warn("Could not determine chatId or userId from typing update:", update);
          return;
        }

        const accountChatTyping = this.typingUsers.get(account.id);
        if (!accountChatTyping) {
           console.error(`Typing map not found for account ${account.id}`);
           return; // Cannot proceed without the account's typing map
        }

        const chatTyping = accountChatTyping.get(chatId) || new Set<string>();
        accountChatTyping.set(chatId, chatTyping); // Ensure the map has the chat entry

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

  // Helper to calculate total unread count for an account
  private _calculateGlobalUnread(accountId: string): number {
    const accountChats = this.chats.get(accountId);
    if (!accountChats) return 0;

    let totalUnread = 0;
    for (const chat of accountChats.values()) {
      totalUnread += chat.unreadCount || 0;
    }
    return totalUnread;
  }

  // Public getter for initial fetch by client
  public getGlobalUnreadCount(accountId: string): number {
     return this._calculateGlobalUnread(accountId);
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
          maxId: 0, // Mark all as read up to the latest
        })
      );

      // Update local state after successful API call
      chat.unreadCount = 0;
      this.emit("unreadCountUpdate", {
        accountId,
        chatId,
        unreadCount: 0,
      });
      // Emit global update after marking read
      this.emit("globalUnreadUpdate", {
        accountId,
        totalUnreadCount: this._calculateGlobalUnread(accountId)
      });
    } catch (error) {
      console.error("Failed to mark messages as read:", error);
      // Potentially re-throw or handle specific errors (like PEER_ID_INVALID)
      throw error; // Re-throw original error
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

      // Also update the last message in the chat cache
      if (chat) {
        chat.lastMessage = formattedMessage;
      } else {
         // Should not happen given the check at the start, but log if it does
         console.warn(`Chat ${chatId} not found when trying to update last message after sending for account ${accountId}`);
      }

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