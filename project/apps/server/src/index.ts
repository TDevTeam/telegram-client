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
  },
});

app.use(cors());
app.use(express.json());

const manager = new TelegramManager();

io.on("connection", (socket) => {
  console.log("Client connected");

  socket.on("getAccounts", () => {
    const accounts = manager.getAccounts();
    console.log("getAccounts", accounts);
    socket.emit("accounts", accounts);
  });

  socket.on("getMessages", (accountId: string) => {
    const messages = manager.getMessages(accountId);
    socket.emit("messages", messages);
  });

  socket.on("sendMessage", ({ accountId, message }) => {
    manager.sendMessage(accountId, message);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

const PORT = config.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});