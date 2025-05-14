import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { TelegramManager } from "./telegram/manager.js";
import { FeedManager } from "./feed/manager.js";
import { FeedBot } from "./telegram/bot.js";
import { config } from "./config.js";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
  pingTimeout: 60000,
  transports: ['websocket', 'polling'],
  path: '/socket.io/',
});

app.use(cors({
  origin: "http://localhost:3000",
  credentials: true,
}));

app.use(express.json());

const manager = new TelegramManager();
const feedManager = new FeedManager();
const bot = new FeedBot(manager, config.BOT_TOKEN, config.BOT_TARGET_GROUP_ID);

// Set up real-time event handlers
manager.on('newMessage', async (data) => {
  io.emit('messageReceived', data);
  
  // Add message to feed if it's not from self
  if (!data.message.isFromMe) {
    const feedMessage = await feedManager.addMessage(data.accountId, data.chatId, data.message);
    if (feedMessage) {
      io.emit('feedUpdate', feedMessage);
      
      // Get chat information
      const chats = manager.getChats(data.accountId);
      const chat = Array.isArray(chats) ? chats.find(c => c.id === data.chatId) : chats.get(data.chatId);
      const chatTitle = chat?.title || 'Unknown Chat';
      
      // Send the feed message to the Telegram group
      await bot.sendFeedMessage({
        id: feedMessage.id,
        messageId: feedMessage.message.id,
        text: feedMessage.message.text,
        timestamp: feedMessage.timestamp,
        accountId: feedMessage.accountId,
        chatId: feedMessage.chatId,
        sender: {
          id: feedMessage.message.sender?.id || '',
          name: feedMessage.message.sender?.name || 'Unknown',
          chatTitle: chatTitle
        }
      });
    }
  }
});

manager.on('typingUpdate', (data) => {
  io.emit('typingStatus', data);
});

manager.on('unreadCountUpdate', (data) => {
  io.emit('unreadCountUpdated', data);
});

// Cleanup feed periodically
setInterval(() => {
  feedManager.cleanup();
}, 24 * 60 * 60 * 1000); // Run cleanup once per day

io.on("connection", (socket) => {
  console.log("Client connected");

  // Handle account-related events
  socket.on("getAccounts", () => {
    const accounts = manager.getAccounts();
    socket.emit("accounts", accounts);
  });

  socket.on("getChats", (accountId: string) => {
    const chats = manager.getChats(accountId);
    socket.emit("chats", { accountId, chats: Array.from(chats.values()) });
  });

  socket.on("getMessages", async (accountId: string, chatId: string) => {
    try {
      const messages = await manager.getMessages(accountId, chatId, 50);
      socket.emit("messages", { accountId, chatId, messages });
    } catch (error) {
      socket.emit("error", { 
        type: "getMessages",
        message: error.message 
      });
    }
  });

  socket.on("sendMessage", async ({ accountId, chatId, message, replyToId }) => {
    try {
      const sentMessage = await manager.sendMessage(accountId, chatId, message, replyToId);
      socket.emit("messageSent", { 
        accountId, 
        chatId, 
        success: true, 
        message: sentMessage 
      });
    } catch (error) {
      socket.emit("messageSent", { 
        accountId, 
        chatId, 
        success: false, 
        error: error.message 
      });
    }
  });

  socket.on("markAsRead", async ({ accountId, chatId }) => {
    try {
      await manager.markAsRead(accountId, chatId);
      socket.emit("markedAsRead", { 
        accountId, 
        chatId, 
        success: true 
      });
    } catch (error) {
      socket.emit("markedAsRead", { 
        accountId, 
        chatId, 
        success: false, 
        error: error.message 
      });
    }
  });

  // Feed-related events
  socket.on("getFeed", async () => {
    const messages = feedManager.getActiveMessages();
    socket.emit("feed", messages);
  });

  socket.on("dismissFeedMessage", async (messageId: string) => {
    await feedManager.dismissMessage(messageId);
    socket.emit("feedMessageDismissed", messageId);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

// Cleanup on server shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Cleaning up...');
  bot.stop();
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

const PORT = config.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});