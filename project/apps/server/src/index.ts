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

io.on("connection", (socket) => {
  console.log("Client connected");

  // Handle account-related events
  socket.on("getAccounts", () => {
    const accounts = manager.getAccounts();
    socket.emit("accounts", accounts);
  });

  socket.on("getChats", (accountId: string) => {
    const chats = manager.getChats(accountId);
    socket.emit("chats", { accountId, chats });
  });

  socket.on("getMessages", (accountId: string, chatId: string) => {
    const messages = manager.getMessages(accountId);
    socket.emit("messages", { accountId, chatId, messages });
  });

  socket.on("sendMessage", async ({ accountId, chatId, message }) => {
    try {
      await manager.sendMessage(accountId, chatId, message);
      socket.emit("messageSent", { accountId, chatId, success: true });
    } catch (error) {
      socket.emit("messageSent", { accountId, chatId, success: false, error: error.message });
    }
  });

  socket.on("markAsRead", ({ accountId, chatId }) => {
    manager.markAsRead(accountId, chatId);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

const PORT = config.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});