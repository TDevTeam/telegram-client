import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { TelegramManager } from "./telegram/manager.js";
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

// Set up real-time event handlers
manager.on('newMessage', (data) => {
  io.emit('messageReceived', data);
});

manager.on('typingUpdate', (data) => {
  io.emit('typingStatus', data);
});

manager.on('unreadCountUpdate', (data) => {
  io.emit('unreadCountUpdated', data);
});

io.on("connection", (socket) => {
  console.log("Client connected");

  // Handle account-related events
  socket.on("getAccounts", () => {
    const accounts = manager.getAccounts();
    socket.emit("accounts", accounts);
  });

  socket.on("getChats", (accountId: string) => {
    const chats = manager.getChats(accountId);
    socket.emit("chats", { accountId, chats: Array.from(chats.values()) });  });

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

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

const PORT = config.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});