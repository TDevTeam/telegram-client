import express from "express"
import http from "http"
import { WebSocketServer } from "ws"
import cors from "cors"
import dotenv from "dotenv"
import bodyParser from "body-parser"
import type { ClientStore, ExtendedWebSocket } from "./types"
import { setupApiRoutes } from "./routes/api"
import { loadSessions, saveSessions } from "./utils/sessions"
import { initClient } from "./handlers/auth"
import { setupUpdateHandlers } from "./utils/websocket"
import { Api } from "telegram"

function ensureClientExists(activeClients: ClientStore, accountId: string) {
  if (!activeClients[accountId]) {
    activeClients[accountId] = {
      client: null as any,
      session: null as any,
      connections: new Set(),
    }
  }
  return activeClients[accountId]
}

// Load environment variables
dotenv.config()

// Create Express app
const app = express()
const server = http.createServer(app)

// Enable CORS
app.use(cors())
app.use(bodyParser.json())

// Create WebSocket server
const wss = new WebSocketServer({ server })

// Store for active clients
const activeClients: ClientStore = {}

// Initialize all saved sessions on startup
async function initializeSavedSessions() {
  const sessions = loadSessions()

  for (const [accountId, sessionString] of Object.entries(sessions)) {
    try {
      const apiId = Number.parseInt(process.env.API_ID || "20730239")
      const apiHash = process.env.API_HASH || "72c82b71fc9db0a2808cdbeca34912e7"

      const { client } = await initClient(activeClients, accountId, apiId, apiHash, sessionString)

      // Set up event handlers
      setupUpdateHandlers(client, accountId, activeClients)

      console.log(`Initialized session for account ${accountId}`)
    } catch (error) {
      console.error(`Failed to initialize session for account ${accountId}:`, error)
    }
  }
}

// Setup API routes
setupApiRoutes(app, activeClients)

// WebSocket connection handling
wss.on("connection", (ws: ExtendedWebSocket) => {
  console.log("New WebSocket connection")

  ws.isAlive = true

  // Handle messages from clients
  ws.on("message", async (message) => {
    try {
      const data = JSON.parse(message.toString())

      if (data.type === "auth") {
        // Authenticate the connection with an account ID
        const { accountId } = data

        if (!accountId) {
          ws.send(JSON.stringify({ type: "error", error: "Missing accountId" }))
          return
        }

        // Store the account ID with the connection
        ws.accountId = accountId

        // Add this connection to the account's connections
        if (activeClients[accountId]) {
          ensureClientExists(activeClients, accountId).connections.add(ws)
          console.log(`WebSocket authenticated for account ${accountId}`)

          // Send initial data
          ws.send(JSON.stringify({ type: "auth_success", accountId }))
        } else {
          // Try to initialize the client if it doesn't exist
          try {
            const apiId = Number.parseInt(process.env.API_ID || "20730239")
            const apiHash = process.env.API_HASH || "72c82b71fc9db0a2808cdbeca34912e7"

            // Check if we have a saved session
            const sessions = loadSessions()
            const sessionString = sessions[accountId]

            if (sessionString) {
              const { client } = await initClient(activeClients, accountId, apiId, apiHash, sessionString)

              // Set up event handlers
              setupUpdateHandlers(client, accountId, activeClients)

              ensureClientExists(activeClients, accountId).connections.add(ws)
              console.log(`WebSocket authenticated for account ${accountId} (initialized from saved session)`)

              // Send success message
              ws.send(
                JSON.stringify({
                  type: "auth_success",
                  accountId,
                  hasSession: true,
                }),
              )
            } else {
              // No saved session, need to start login flow
              const { client } = await initClient(activeClients, accountId, apiId, apiHash)

              // Set up event handlers
              setupUpdateHandlers(client, accountId, activeClients)

              ensureClientExists(activeClients, accountId).connections.add(ws)

              // Send message that login is needed
              ws.send(
                JSON.stringify({
                  type: "auth_success",
                  accountId,
                  hasSession: false,
                  needsLogin: true,
                }),
              )
            }
          } catch (error) {
            console.error(`Error initializing client for account ${accountId}:`, error)
            ws.send(
              JSON.stringify({
                type: "error",
                error: "Failed to initialize client",
                details: error instanceof Error ? error.message : String(error),
              }),
            )
          }
        }
      } else if (data.type === "login_phone") {
        // Start login with phone number
        const { accountId, phoneNumber } = data

        if (!accountId || !phoneNumber) {
          ws.send(JSON.stringify({ type: "error", error: "Missing required parameters" }))
          return
        }

        try {
          const { client } = activeClients[accountId] || {}
          if (!client) {
            throw new Error("Client not initialized")
          }

          // Start the login process
          const result = await client.sendCode({ apiId: client.apiId, apiHash: client.apiHash.toString() }, phoneNumber)

          // Send the phone code hash back to the client
          ws.send(
            JSON.stringify({
              type: "login_code_sent",
              phoneCodeHash: result.phoneCodeHash,
            }),
          )
        } catch (error) {
          console.error("Error sending code:", error)
          ws.send(
            JSON.stringify({
              type: "error",
              error: "Failed to send verification code",
              details: error instanceof Error ? error.message : String(error),
            }),
          )
        }
      } else if (data.type === "login_code") {
        // Complete login with verification code
        const { accountId, phoneNumber, phoneCodeHash, code } = data

        if (!accountId || !phoneNumber || !phoneCodeHash || !code) {
          ws.send(JSON.stringify({ type: "error", error: "Missing required parameters" }))
          return
        }

        try {
          const { client, session } = activeClients[accountId] || {}
          if (!client) {
            throw new Error("Client not initialized")
          }

          // Try to sign in with the code
          let user
          let requiresPassword = false

          try {
            user = await client.invoke(
              new Api.auth.SignIn({
                phoneNumber,
                phoneCodeHash,
                phoneCode: code,
              }),
            )
          } catch (error) {
            // Check if we need 2FA password
            if (error instanceof Error && error.message.includes("SESSION_PASSWORD_NEEDED")) {
              requiresPassword = true
              ws.send(
                JSON.stringify({
                  type: "login_2fa_needed",
                }),
              )
              return
            }
            throw error
          }

          // Get the session string to save
          const sessionString = session.save()

          // Save session to file
          const sessions = loadSessions()
          sessions[accountId] = sessionString
          saveSessions(sessions)

          // Send success message
          ws.send(
            JSON.stringify({
              type: "login_success",
              sessionString,
              user,
            }),
          )
        } catch (error) {
          console.error("Error completing login:", error)
          ws.send(
            JSON.stringify({
              type: "error",
              error: "Failed to verify code",
              details: error instanceof Error ? error.message : String(error),
            }),
          )
        }
      } else if (data.type === "login_2fa") {
        // Complete 2FA login with password
        const { accountId, password } = data

        if (!accountId || !password) {
          ws.send(JSON.stringify({ type: "error", error: "Missing required parameters" }))
          return
        }

        try {
          const { client, session } = activeClients[accountId] || {}
          if (!client) {
            throw new Error("Client not initialized")
          }

          let result
          try {
            // Get password info
            const passwordInfo = await client.invoke(new Api.account.GetPassword())

            // Simplified password check for compatibility
            result = await client.invoke(
              new Api.auth.CheckPassword({
                password: {
                  _: "inputCheckPasswordSRP",
                  srpId: (typeof passwordInfo.srpId === 'string' ? BigInt(passwordInfo.srpId) : passwordInfo.srpId) || BigInt(0),
                  A: Buffer.from(password),                  M1: Buffer.from(password),
                },
              }),
            )
          } catch (error) {
            console.error("Error checking password:", error)
            throw error
          }

          // Get the session string to save
          const sessionString = session.save()

          // Save session to file
          const sessions = loadSessions()
          sessions[accountId] = sessionString
          saveSessions(sessions)

          // Send success message
          ws.send(
            JSON.stringify({
              type: "login_success",
              sessionString,
              user: result,
            }),
          )
        } catch (error) {
          console.error("Error completing 2FA login:", error)
          ws.send(
            JSON.stringify({
              type: "error",
              error: "Failed to verify password",
              details: error instanceof Error ? error.message : String(error),
            }),
          )
        }
      } else if (data.type === "client_start") {
        // Handle client.start() flow
        const { accountId, phoneNumber } = data

        if (!accountId) {
          ws.send(JSON.stringify({ type: "error", error: "Missing accountId" }))
          return
        }

        try {
          const { client, session } = activeClients[accountId] || {}
          if (!client) {
            throw new Error("Client not initialized")
          }

          // Set up callbacks that will communicate via WebSocket
          const callbacks = {
            phoneNumber: async (): Promise<string> => {
              // Request phone number from client
              ws.send(
                JSON.stringify({
                  type: "request_phone",
                  accountId,
                }),
              )

              // Wait for response in a different message handler
              return phoneNumber || ""
            },
            password: async (): Promise<string> => {
              // Request 2FA password from client
              ws.send(
                JSON.stringify({
                  type: "request_password",
                  accountId,
                }),
              )

              // Create a promise that will be resolved when the client sends the password
              return new Promise<string>((resolve) => {
                const passwordHandler = (msg: MessageEvent) => {
                  try {
                    const data = JSON.parse(msg.data.toString())
                    if (data.type === "provide_password" && data.accountId === accountId) {
                      // Remove this handler once we get the password
                      ws.removeListener("message", passwordHandler)
                      resolve(data.password)
                    }
                  } catch (e) {
                    // Ignore parsing errors
                  }
                }

                // Add temporary handler for password response
                ws.on("message", passwordHandler)

                // Set a timeout to prevent hanging indefinitely
                setTimeout(() => {
                  ws.removeListener("message", passwordHandler)
                  resolve("") // Empty password will likely fail authentication
                }, 300000) // 5 minute timeout
              })
            },
            phoneCode: async (): Promise<string> => {
              // Request verification code from client
              ws.send(
                JSON.stringify({
                  type: "request_code",
                  accountId,
                }),
              )

              // Create a promise that will be resolved when the client sends the code
              return new Promise<string>((resolve) => {
                const codeHandler = (msg: MessageEvent) => {
                  try {
                    const data = JSON.parse(msg.data.toString())
                    if (data.type === "provide_code" && data.accountId === accountId) {
                      // Remove this handler once we get the code
                      ws.removeListener("message", codeHandler)
                      resolve(data.code)
                    }
                  } catch (e) {
                    // Ignore parsing errors
                  }
                }

                // Add temporary handler for code response
                ws.on("message", codeHandler)

                // Set a timeout to prevent hanging indefinitely
                setTimeout(() => {
                  ws.removeListener("message", codeHandler)
                  resolve("") // Empty code will likely fail authentication
                }, 300000) // 5 minute timeout
              })
            },
            onError: (err: Error) => {
              console.log("Login error:", err)
              ws.send(
                JSON.stringify({
                  type: "login_error",
                  error: err.message,
                }),
              )
            },
          }

          // Start the client with all callbacks
          // Use a type assertion to match the expected type
          await client.start(callbacks as any)

          console.log("Login successful")

          // Get the session string to save
          const sessionString = session.save()

          // Save session to file
          const sessions = loadSessions()
          sessions[accountId] = sessionString
          saveSessions(sessions)

          // Send success message
          ws.send(
            JSON.stringify({
              type: "login_success",
              sessionString,
            }),
          )
        } catch (error) {
          console.error("Error during login process:", error)
          ws.send(
            JSON.stringify({
              type: "error",
              error: "Failed to complete login",
              details: error instanceof Error ? error.message : String(error),
            }),
          )
        }
      } else if (data.type === "provide_phone") {
        // Client provided phone number for client.start flow
        // This is handled by the phoneNumber callback above
      } else if (data.type === "provide_code") {
        // Client provided verification code for client.start flow
        // This is handled by the phoneCode callback above
      } else if (data.type === "provide_password") {
        // Client provided 2FA password for client.start flow
        // This is handled by the password callback above
      }
    } catch (error) {
      console.error("Error processing WebSocket message:", error)
      ws.send(
        JSON.stringify({
          type: "error",
          error: "Invalid message format",
          details: error instanceof Error ? error.message : String(error),
        }),
      )
    }
  })
  // Handle disconnection
  ws.on("close", () => {
    console.log("WebSocket connection closed")

    // Remove this connection from the account's connections
    if (ws.accountId && activeClients[ws.accountId]) {
      activeClients[ws.accountId].connections.delete(ws)
    }
  })

  // Handle pings to keep the connection alive
  ws.on("pong", () => {
    ws.isAlive = true
  })
})

// Ping all clients periodically to keep connections alive
const interval = setInterval(() => {
  wss.clients.forEach((ws: ExtendedWebSocket) => {
    if (ws.isAlive === false) return ws.terminate()

    ws.isAlive = false
    ws.ping()
  })
}, 30000)

wss.on("close", () => {
  clearInterval(interval)
})

// Initialize saved sessions on startup
initializeSavedSessions().then(() => {
  console.log("Initialized all saved sessions")
})

// Start the server
const PORT = process.env.PORT || 3001
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

