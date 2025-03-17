// Main Express server file for backend
const express = require("express")
const http = require("http")
const WebSocket = require("ws")
const cors = require("cors")
const fs = require("fs")
const path = require("path")
const { v4: uuidv4 } = require("uuid")
const { TelegramClient } = require("telegram")
const { StringSession } = require("telegram/sessions")
const { Logger } = require("telegram/extensions/Logger")

// Load environment variables
require("dotenv").config()

// Telegram API configuration
const API_ID = process.env.TELEGRAM_API_ID
const API_HASH = process.env.TELEGRAM_API_HASH

if (!API_ID || !API_HASH) {
  console.error("TELEGRAM_API_ID and TELEGRAM_API_HASH must be set in environment variables")
  process.exit(1)
}

// Create Express app
const app = express()
const server = http.createServer(app)

// Initialize WebSocket server
const wss = new WebSocket.Server({ server })

// Enable CORS
app.use(cors())
app.use(express.json())

// Store active client connections
const connections = new Map()
// Store active Telegram clients
const telegramClients = new Map()

// Directory for account data
const DATA_DIR = path.join(__dirname, "..", "data")
const ACCOUNTS_FILE = path.join(DATA_DIR, "accounts.json")
const SESSIONS_DIR = path.join(DATA_DIR, "sessions")

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}
if (!fs.existsSync(SESSIONS_DIR)) {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true })
}

// Initialize accounts if the file doesn't exist
if (!fs.existsSync(ACCOUNTS_FILE)) {
  fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify([]))
}

// Legacy string session loading
function loadLegacyAccounts() {
  try {
    const legacyAccountsPath = path.join(__dirname, "..", "legacy", "config", "accounts.txt")

    if (fs.existsSync(legacyAccountsPath)) {
      const content = fs.readFileSync(legacyAccountsPath, "utf8")
      const lines = content.trim().split("\n")

      const accounts = []

      // Process each line in the legacy accounts file
      for (const line of lines) {
        if (!line.trim()) continue

        const [username, session] = line.split(":")
        if (username && session) {
          const account = {
            id: uuidv4(),
            username: username.trim(),
            status: "offline",
            session: session.trim(),
            lastActive: new Date().toISOString(),
          }
          accounts.push(account)
        }
      }

      // Save to the new format
      if (accounts.length > 0) {
        fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2))
        console.log(`Loaded ${accounts.length} legacy accounts`)
      }
    }
  } catch (error) {
    console.error("Error loading legacy accounts:", error)
  }
}

// Load accounts from file
function loadAccounts() {
  try {
    const data = fs.readFileSync(ACCOUNTS_FILE, "utf8")
    return JSON.parse(data)
  } catch (error) {
    console.error("Error loading accounts:", error)
    return []
  }
}

// Save accounts to file
function saveAccounts(accounts) {
  try {
    fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2))
  } catch (error) {
    console.error("Error saving accounts:", error)
  }
}

// Initialize Telegram client for an account
async function initTelegramClient(account) {
  if (telegramClients.has(account.id)) {
    // Client already exists
    return telegramClients.get(account.id)
  }

  // Set minimal log level
  Logger.setLevel("none")

  // Create string session from stored session data
  const stringSession = new StringSession(account.session || "")

  // Initialize client
  const client = new TelegramClient(stringSession, Number.parseInt(API_ID), API_HASH, { connectionRetries: 5 })

  try {
    // Start client (won't login if already logged in)
    await client.connect()

    // Check if we need to prompt for login
    if (!client.connected) {
      console.log(`Account ${account.username} is not connected. Please log in through the chat interface.`)
      account.status = "offline"
    } else {
      console.log(`Account ${account.username} connected successfully.`)
      account.status = "online"

      // Save updated session if it changed
      const newSession = client.session.save()
      if (newSession !== account.session) {
        account.session = newSession

        // Update accounts file
        const accounts = loadAccounts()
        const index = accounts.findIndex((a) => a.id === account.id)
        if (index !== -1) {
          accounts[index] = account
          saveAccounts(accounts)
        }
      }
    }

    // Store client for later use
    telegramClients.set(account.id, client)
    return client
  } catch (error) {
    console.error(`Error initializing Telegram client for ${account.username}:`, error)
    account.status = "offline"
    return null
  }
}

// Process command with legacy bot logic
async function processCommand(accountId, command) {
  // Get account
  const accounts = loadAccounts()
  const account = accounts.find((a) => a.id === accountId)
  if (!account) {
    return { content: "Account not found", error: true }
  }

  // Get client
  const client = telegramClients.get(accountId)
  if (!client || !client.connected) {
    return { content: "Client not connected. Please login first.", error: true }
  }

  // Legacy command processing logic
  try {
    // Parse command
    const [cmd, ...args] = command.trim().split(" ")

    switch (cmd.toLowerCase()) {
      case "help":
        return {
          content:
            "Available commands:\n" +
            "- help: Show this help message\n" +
            "- status: Show account status\n" +
            "- chat [username]: Open a chat with the specified username\n" +
            "- send [username] [message]: Send a message to the specified username",
          error: false,
        }

      case "status":
        return {
          content: `Account: ${account.username}\nStatus: ${account.status}\nLast active: ${account.lastActive}`,
          error: false,
        }

      case "chat":
        if (args.length < 1) {
          return { content: "Usage: chat [username]", error: true }
        }

        try {
          const username = args[0]
          const entity = await client.getEntity(username)
          return {
            content: `Chat opened with ${entity.username || entity.firstName || "user"}`,
            error: false,
          }
        } catch (error) {
          return { content: `Error: ${error.message}`, error: true }
        }

      case "send":
        if (args.length < 2) {
          return { content: "Usage: send [username] [message]", error: true }
        }

        try {
          const username = args[0]
          const messageText = args.slice(1).join(" ")

          await client.sendMessage(username, { message: messageText })
          return {
            content: `Message sent to ${username}`,
            error: false,
          }
        } catch (error) {
          return { content: `Error: ${error.message}`, error: true }
        }

      default:
        return { content: `Unknown command: ${cmd}. Type 'help' for available commands.`, error: true }
    }
  } catch (error) {
    console.error(`Error processing command for ${account.username}:`, error)
    return { content: `Error: ${error.message}`, error: true }
  }
}

// Initialize server
async function initServer() {
  // Try to load legacy accounts on first start
  loadLegacyAccounts()

  // Load accounts
  const accounts = loadAccounts()

  // Initialize Telegram clients for accounts with sessions
  for (const account of accounts) {
    if (account.session) {
      await initTelegramClient(account)
    }
  }

  // API Routes

  // GET /api/accounts - List all accounts
  app.get("/api/accounts", (req, res) => {
    try {
      const accounts = loadAccounts()
      // Don't send sensitive session data to the client
      const sanitizedAccounts = accounts.map(({ session, ...rest }) => rest)

      res.json(sanitizedAccounts)
    } catch (error) {
      console.error("Error getting accounts:", error)
      res.status(500).json({ error: "Failed to get accounts" })
    }
  })

  // POST /api/accounts - Add a new account
  app.post("/api/accounts", (req, res) => {
    try {
      const { username } = req.body

      if (!username) {
        return res.status(400).json({ error: "Username is required" })
      }

      const accounts = loadAccounts()

      // Check if account already exists
      if (accounts.some((a) => a.username === username)) {
        return res.status(400).json({ error: "Account with this username already exists" })
      }

      const newAccount = {
        id: uuidv4(),
        username,
        status: "offline",
        lastActive: new Date().toISOString(),
      }

      accounts.push(newAccount)
      saveAccounts(accounts)

      res.status(201).json(newAccount)
    } catch (error) {
      console.error("Error adding account:", error)
      res.status(500).json({ error: "Failed to add account" })
    }
  })

  // DELETE /api/accounts/:id - Remove an account
  app.delete("/api/accounts/:id", (req, res) => {
    try {
      const { id } = req.params

      const accounts = loadAccounts()
      const accountIndex = accounts.findIndex((a) => a.id === id)

      if (accountIndex === -1) {
        return res.status(404).json({ error: "Account not found" })
      }

      // Close Telegram client if it exists
      if (telegramClients.has(id)) {
        const client = telegramClients.get(id)
        if (client) {
          client.disconnect()
        }
        telegramClients.delete(id)
      }

      // Remove from accounts
      accounts.splice(accountIndex, 1)
      saveAccounts(accounts)

      res.json({ success: true })
    } catch (error) {
      console.error("Error removing account:", error)
      res.status(500).json({ error: "Failed to remove account" })
    }
  })

  // WebSocket connection handler
  wss.on("connection", (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`)
    const accountId = url.searchParams.get("accountId")

    if (!accountId) {
      ws.close(1008, "Account ID is required")
      return
    }

    console.log(`WebSocket connection established for account: ${accountId}`)

    // Store connection
    connections.set(accountId, ws)

    // Find account
    const accounts = loadAccounts()
    const account = accounts.find((a) => a.id === accountId)

    if (!account) {
      ws.send(
        JSON.stringify({
          type: "message",
          id: uuidv4(),
          content: "Account not found",
          sender: "system",
          timestamp: new Date().toISOString(),
        }),
      )
      return
    }

    // Initialize Telegram client
    initTelegramClient(account).then((client) => {
      if (!client || !client.connected) {
        ws.send(
          JSON.stringify({
            type: "message",
            id: uuidv4(),
            content: "Not connected to Telegram. Please provide login credentials.",
            sender: "system",
            timestamp: new Date().toISOString(),
          }),
        )
      } else {
        ws.send(
          JSON.stringify({
            type: "message",
            id: uuidv4(),
            content: `Connected to account ${account.username}. Type 'help' for available commands.`,
            sender: "system",
            timestamp: new Date().toISOString(),
          }),
        )
      }
    })

    // Message handler
    ws.on("message", async (message) => {
      try {
        const data = JSON.parse(message.toString())

        if (data.type === "message") {
          console.log(`Received message from account ${accountId}: ${data.content}`)

          // Process the message with legacy bot logic
          const response = await processCommand(accountId, data.content)

          // Send response
          ws.send(
            JSON.stringify({
              type: "message",
              id: uuidv4(),
              content: response.content,
              sender: response.error ? "system" : "bot",
              timestamp: new Date().toISOString(),
            }),
          )
        }
      } catch (error) {
        console.error("Error processing WebSocket message:", error)
        ws.send(
          JSON.stringify({
            type: "message",
            id: uuidv4(),
            content: `Error: ${error.message}`,
            sender: "system",
            timestamp: new Date().toISOString(),
          }),
        )
      }
    })

    // Close handler
    ws.on("close", () => {
      console.log(`WebSocket connection closed for account: ${accountId}`)
      connections.delete(accountId)
    })
  })

  // Start the server
  const PORT = process.env.EXPRESS_PORT || 4000
  server.listen(PORT, () => {
    console.log(`Express server listening on port ${PORT}`)
  })
}

// Start the server
initServer().catch((error) => {
  console.error("Error starting server:", error)
  process.exit(1)
})

