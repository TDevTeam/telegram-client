import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import cors from "cors";
import { TelegramManager } from "./telegram/manager";
import { config } from "./config";

export function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    // cors: {
    //   origin: "http://localhost:8080", // Updated to match the Vite port
    //   methods: ["GET", "POST"],
    //   credentials: true,
    // },
    pingTimeout: 60000,
    transports: ['websocket', 'polling'],
    path: '/socket.io/',
  });

  // app.use(cors({
  //   origin: "http://localhost:8080", // Updated to match the Vite port
  //   credentials: true,
  // }));
  app.use(express.json());

  const manager = new TelegramManager();

  io.on("connection", (socket) => {
    console.log("Client connected");

    // Account management events
    socket.on("addAccount", async ({ phoneNumber }) => {
      try {
        const { phoneCodeHash } = await manager.startAuthentication(phoneNumber);
        socket.emit("authCodeRequested", { phoneNumber, phoneCodeHash });
      } catch (error) {
        socket.emit("authError", { error: error instanceof Error ? error.message : "Authentication failed" });
      }
    });

    socket.on("verifyCode", async ({ phoneNumber, phoneCode, phoneCodeHash }) => {
      try {
        const result = await manager.verifyCode(phoneNumber, phoneCode, phoneCodeHash);
        if (result.requires2FA) {
          socket.emit("2faRequired", { phoneNumber });
        } else {
          const accounts = manager.getAccounts();
          socket.emit("accountAdded", { success: true });
          io.emit("accountsUpdated", accounts); // Broadcast to all clients
        }
      } catch (error) {
        socket.emit("authError", { error: error instanceof Error ? error.message : "Verification failed" });
      }
    });

    socket.on("submit2FA", async ({ phoneNumber, password }) => {
      try {
        await manager.submit2FA(phoneNumber, password);
        const accounts = manager.getAccounts();
        socket.emit("accountAdded", { success: true });
        io.emit("accountsUpdated", accounts); // Broadcast to all clients
      } catch (error) {
        socket.emit("authError", { error: error instanceof Error ? error.message : "2FA verification failed" });
      }
    });

    socket.on("removeAccount", async (accountId) => {
      try {
        await manager.removeAccount(accountId);
        const accounts = manager.getAccounts();
        socket.emit("accountRemoved", { accountId });
        io.emit("accountsUpdated", accounts); // Broadcast to all clients
      } catch (error) {
        socket.emit("error", { error: error instanceof Error ? error.message : "Failed to remove account" });
      }
    });

    // Chat and message events
    socket.on("getAccounts", () => {
      const accounts = manager.getAccounts();
      socket.emit("accounts", accounts);
    });

    socket.on("getChats", async (accountId) => {
      try {
        const chats = manager.getChats(accountId);
        socket.emit("chats", { accountId, chats });
      } catch (error) {
        socket.emit("error", { error: error instanceof Error ? error.message : "Failed to get chats" });
      }
    });

    socket.on("getChatHistory", async ({ accountId, chatId, limit = 50, offsetId = 0 }) => {
      try {
        const history = await manager.getChatHistory(accountId, chatId, limit, offsetId);
        socket.emit("chatHistory", { accountId, chatId, messages: history });
      } catch (error) {
        socket.emit("error", { error: error instanceof Error ? error.message : "Failed to get chat history" });
      }
    });

    socket.on("sendMessage", async ({ accountId, chatId, message, replyToId }) => {
      try {
        const sentMessage = await manager.sendMessage(accountId, chatId, message, replyToId);
        socket.emit("messageSent", { accountId, chatId, message: sentMessage });
        io.emit("newMessage", { accountId, chatId, message: sentMessage }); // Broadcast to all clients
      } catch (error) {
        socket.emit("error", { error: error instanceof Error ? error.message : "Failed to send message" });
      }
    });

    socket.on("deleteMessages", async ({ accountId, chatId, messageIds }) => {
      try {
        await manager.deleteMessages(accountId, chatId, messageIds);
        io.emit("messagesDeleted", { accountId, chatId, messageIds }); // Broadcast to all clients
      } catch (error) {
        socket.emit("error", { error: error instanceof Error ? error.message : "Failed to delete messages" });
      }
    });

    // Chat actions
    socket.on("setTyping", async ({ accountId, chatId }) => {
      try {
        await manager.setTyping(accountId, chatId);
        io.emit("userTyping", { accountId, chatId }); // Broadcast to all clients
      } catch (error) {
        console.error("Failed to set typing status:", error);
      }
    });

    socket.on("markAsRead", async ({ accountId, chatId }) => {
      try {
        await manager.markAsRead(accountId, chatId);
        io.emit("messagesRead", { accountId, chatId }); // Broadcast to all clients
      } catch (error) {
        socket.emit("error", { error: error instanceof Error ? error.message : "Failed to mark as read" });
      }
    });

    // Media handling
    socket.on("sendMedia", async ({ accountId, chatId, mediaType, mediaData, caption }) => {
      try {
        const message = await manager.sendMedia(accountId, chatId, mediaType, mediaData, caption);
        socket.emit("mediaSent", { accountId, chatId, message });
        io.emit("newMessage", { accountId, chatId, message }); // Broadcast to all clients
      } catch (error) {
        socket.emit("error", { error: error instanceof Error ? error.message : "Failed to send media" });
      }
    });

    // Notification settings
    socket.on("updateNotificationSettings", async ({ accountId, chatId, settings }) => {
      try {
        await manager.updateNotificationSettings(accountId, chatId, settings);
        io.emit("notificationSettingsUpdated", { accountId, chatId, settings }); // Broadcast to all clients
      } catch (error) {
        socket.emit("error", { error: error instanceof Error ? error.message : "Failed to update notification settings" });
      }
    });

    // Handle real-time updates from TelegramManager
    manager.on("newMessage", (data) => {
      io.emit("newMessage", data);
    });

    manager.on("messageEdited", (data) => {
      io.emit("messageEdited", data);
    });

    manager.on("messageDeleted", (data) => {
      io.emit("messageDeleted", data);
    });

    manager.on("userTyping", (data) => {
      io.emit("userTyping", data);
    });

    manager.on("userOnlineStatus", (data) => {
      io.emit("userOnlineStatus", data);
    });

    manager.on("notification", (data) => {
      io.emit("notification", data);
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected");
    });
  });

  const PORT = config.PORT || 3001;

  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

  return httpServer;
}
