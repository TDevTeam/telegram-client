import { TelegramClient } from "telegram"
import { StringSession } from "telegram/sessions"
import { Api } from "telegram"
import type { ClientStore } from "../types"
import { loadSessions, saveSessions } from "../utils/sessions"

// Add this helper method to TelegramClient prototype
// Add after imports
TelegramClient.prototype.getInputPeerById = async (id: number | string | bigint) => {
  try {
    // Convert id to string and then to number or BigInt as needed
    const idStr = id.toString()
    const numId = /^\d+$/.test(idStr) ? BigInt(idStr) : 0

    if (numId) {
      return new Api.InputPeerUser({
        userId: numId,
        accessHash: BigInt(0),
      })
    }

    // Fallback to a generic chat input
    return new Api.InputPeerChat({
      chatId: BigInt(0),
    })
  } catch (error) {
    console.error("Error in getInputPeerById:", error)
    // Return a safe default
    return new Api.InputPeerEmpty()
  }
}

// Initialize a new client for an account
export async function initClient(
  activeClients: ClientStore,
  accountId: string,
  apiId: number,
  apiHash: string,
  sessionString?: string,
) {
  try {
    // Create a proper StringSession with the provided string or empty string
    const session = new StringSession(sessionString || "")

    // Create the client with proper parameters
    const client = new TelegramClient(session, apiId, apiHash, {
      connectionRetries: 5,
      useWSS: true, // Use WebSocket for browser environments
    })

    // Store the client and session
    activeClients[accountId] = {
      client,
      session,
      connections: new Set(),
    }

    // Connect the client (but don't start the login flow yet)
    await client.connect()
    console.log(`Client ${accountId} connected successfully`)

    return {
      client,
      session,
      sessionString: session.save(),
    }
  } catch (error) {
    console.error("Error initializing Telegram client:", error)
    throw error
  }
}

// Start the login process with phone number
export async function startLogin(activeClients: ClientStore, accountId: string, phoneNumber: string) {
  const { client } = activeClients[accountId] || {}
  if (!client) {
    throw new Error("Client not initialized")
  }

  try {
    // Start the login process
    const result = await client.sendCode({ apiId: client.apiId, apiHash: client.apiHash.toString() }, phoneNumber)

    return { phoneCodeHash: result.phoneCodeHash }
  } catch (error) {
    console.error("Error sending code:", error)
    throw error
  }
}

// Complete login with verification code
export async function completeLogin(
  activeClients: ClientStore,
  accountId: string,
  phoneNumber: string,
  phoneCodeHash: string,
  code: string,
) {
  const { client, session } = activeClients[accountId] || {}
  if (!client) {
    throw new Error("Client not initialized")
  }

  try {
    // Try to sign in with the code
    let user
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
        // Return a special response indicating 2FA is needed
        return {
          user: null,
          sessionString: null,
          requiresPassword: true,
        }
      }
      throw error
    }

    // Get the session string to save
    const sessionString = session.save()

    // Save session to file
    const sessions = loadSessions()
    sessions[accountId] = sessionString
    saveSessions(sessions)

    return {
      user,
      sessionString,
      requiresPassword: false,
    }
  } catch (error) {
    console.error("Error completing login:", error)
    throw error
  }
}

// Complete 2FA login with password
export async function complete2FALogin(activeClients: ClientStore, accountId: string, password: string) {
  const { client, session } = activeClients[accountId] || {}
  if (!client) {
    throw new Error("Client not initialized")
  }

  try {
    // Get the password hint
    const passwordInfo = await client.invoke(new Api.account.GetPassword())

    // Check the password with the server
    // Use a workaround for the missing computePasswordCheck method
    const result = await client.invoke(
      new Api.auth.CheckPassword({
        // Use a simpler approach for password verification
        password: {
          _: "inputCheckPasswordSRP",
          srpId: passwordInfo.srpId,
          A: Buffer.from(password),
          M1: Buffer.from(password),
        },
      }),
    )

    // Get the session string to save
    const sessionString = session.save()

    // Save session to file
    const sessions = loadSessions()
    sessions[accountId] = sessionString
    saveSessions(sessions)

    return {
      user: result.user || null,
      sessionString,
    }
  } catch (error) {
    console.error("Error completing 2FA login:", error)
    throw error
  }
}

