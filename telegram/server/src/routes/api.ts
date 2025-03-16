import type { Express } from "express"
import type { ClientStore } from "../types"
import { initClient, startLogin, completeLogin, complete2FALogin } from "../handlers/auth"
import { getDialogs, toggleMute, togglePin } from "../handlers/chats"
import { getMessages, sendMessage, markMessagesAsRead } from "../handlers/messages"
import { loadSessions } from "../utils/sessions"

export function setupApiRoutes(app: Express, activeClients: ClientStore) {
  // Get all accounts
  app.get("/api/accounts", (req, res) => {
    const accounts = Object.keys(activeClients).map((accountId) => {
      const { client } = activeClients[accountId]
      return {
        id: accountId,
        connected: client.connected,
      }
    })

    res.json({ accounts })
  })

  // Initialize client
  app.post("/api/init", async (req, res) => {
    try {
      const { accountId, apiId, apiHash } = req.body

      if (!accountId || !apiId || !apiHash) {
        return res.status(400).json({ success: false, error: "Missing required parameters" })
      }

      const apiIdNum = Number.parseInt(apiId, 10)
      if (isNaN(apiIdNum)) {
        return res.status(400).json({ success: false, error: "API ID must be a valid number" })
      }

      // Check if we have a saved session
      const sessions = loadSessions()
      const sessionString = sessions[accountId]

      const result = await initClient(activeClients, accountId, apiIdNum, apiHash, sessionString)

      res.json({
        success: true,
        sessionString: result.sessionString,
        hasSession: !!sessionString,
      })
    } catch (error) {
      console.error("Error initializing client:", error)
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  })

  // Start login
  app.post("/api/login/start", async (req, res) => {
    try {
      const { accountId, phoneNumber } = req.body

      if (!accountId || !phoneNumber) {
        return res.status(400).json({ success: false, error: "Missing required parameters" })
      }

      const result = await startLogin(activeClients, accountId, phoneNumber)

      res.json({
        success: true,
        phoneCodeHash: result.phoneCodeHash,
      })
    } catch (error) {
      console.error("Error starting login:", error)
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  })

  // Complete login
  app.post("/api/login/complete", async (req, res) => {
    try {
      const { accountId, phoneNumber, phoneCodeHash, code } = req.body

      if (!accountId || !phoneNumber || !phoneCodeHash || !code) {
        return res.status(400).json({ success: false, error: "Missing required parameters" })
      }

      const result = await completeLogin(activeClients, accountId, phoneNumber, phoneCodeHash, code)

      res.json({
        success: true,
        requiresPassword: result.requiresPassword,
        sessionString: result.sessionString,
        user: result.user,
      })
    } catch (error) {
      console.error("Error completing login:", error)
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  })

  // Complete 2FA login
  app.post("/api/login/2fa", async (req, res) => {
    try {
      const { accountId, password } = req.body

      if (!accountId || !password) {
        return res.status(400).json({ success: false, error: "Missing required parameters" })
      }

      const result = await complete2FALogin(activeClients, accountId, password)

      res.json({
        success: true,
        sessionString: result.sessionString,
        user: result.user,
      })
    } catch (error) {
      console.error("Error completing 2FA login:", error)
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  })

  // Get chats
  app.get("/api/chats", async (req, res) => {
    try {
      const { accountId } = req.query

      if (!accountId) {
        return res.status(400).json({ success: false, error: "Missing accountId parameter" })
      }

      const chats = await getDialogs(activeClients, accountId as string)

      res.json({
        success: true,
        chats,
      })
    } catch (error) {
      console.error("Error fetching chats:", error)
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  })

  // Get messages
  app.get("/api/messages", async (req, res) => {
    try {
      const { accountId, chatId } = req.query

      if (!accountId || !chatId) {
        return res.status(400).json({ success: false, error: "Missing required parameters" })
      }

      const messages = await getMessages(activeClients, accountId as string, chatId as string)

      res.json({
        success: true,
        messages,
      })
    } catch (error) {
      console.error("Error fetching messages:", error)
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  })

  // Send message
  app.post("/api/messages/send", async (req, res) => {
    try {
      const { accountId, chatId, message } = req.body

      if (!accountId || !chatId || !message) {
        return res.status(400).json({ success: false, error: "Missing required parameters" })
      }

      const result = await sendMessage(activeClients, accountId, chatId, message)

      res.json({
        success: true,
        messageId: result.id,
      })
    } catch (error) {
      console.error("Error sending message:", error)
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  })

  // Mark messages as read
  app.post("/api/messages/read", async (req, res) => {
    try {
      const { accountId, chatId, messageIds } = req.body

      if (!accountId || !chatId || !messageIds || !messageIds.length) {
        return res.status(400).json({ success: false, error: "Missing required parameters" })
      }

      await markMessagesAsRead(activeClients, accountId, chatId, messageIds)

      res.json({
        success: true,
      })
    } catch (error) {
      console.error("Error marking messages as read:", error)
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  })

  // Toggle chat mute
  app.post("/api/chats/mute", async (req, res) => {
    try {
      const { accountId, chatId, mute } = req.body

      if (!accountId || !chatId || mute === undefined) {
        return res.status(400).json({ success: false, error: "Missing required parameters" })
      }

      await toggleMute(activeClients, accountId, chatId, mute)

      res.json({
        success: true,
      })
    } catch (error) {
      console.error("Error toggling mute status:", error)
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  })

  // Toggle chat pin
  app.post("/api/chats/pin", async (req, res) => {
    try {
      const { accountId, chatId, pin } = req.body

      if (!accountId || !chatId || pin === undefined) {
        return res.status(400).json({ success: false, error: "Missing required parameters" })
      }

      await togglePin(activeClients, accountId, chatId, pin)

      res.json({
        success: true,
      })
    } catch (error) {
      console.error("Error toggling pin status:", error)
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  })
}

