// Frontend API client for communicating with the backend

// Base URL for API requests
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api"

// Generic fetch function with error handling
async function fetchAPI<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "API request failed")
    }

    return await response.json()
  } catch (error) {
    console.error(`API Error (${endpoint}):`, error)
    throw error
  }
}

// Initialize a client for an account
export async function initializeClient(accountId: string, apiId: string, apiHash: string) {
  return fetchAPI("/init", {
    method: "POST",
    body: JSON.stringify({ accountId, apiId, apiHash }),
  })
}

// Start the login process
export async function startLogin(accountId: string, phoneNumber: string) {
  return fetchAPI("/login/start", {
    method: "POST",
    body: JSON.stringify({ accountId, phoneNumber }),
  })
}

// Complete login with verification code
export async function completeLogin(accountId: string, phoneNumber: string, phoneCodeHash: string, code: string) {
  return fetchAPI("/login/complete", {
    method: "POST",
    body: JSON.stringify({ accountId, phoneNumber, phoneCodeHash, code }),
  })
}

// Complete 2FA login with password
export async function complete2FALogin(accountId: string, password: string) {
  return fetchAPI("/login/2fa", {
    method: "POST",
    body: JSON.stringify({ accountId, password }),
  })
}

// Fetch chats for an account
export async function fetchChats(accountId: string) {
  return fetchAPI(`/chats?accountId=${accountId}`)
}

// Fetch messages for a chat
export async function fetchMessages(accountId: string, chatId: string) {
  return fetchAPI(`/messages?accountId=${accountId}&chatId=${chatId}`)
}

// Send a message
export async function sendMessage(accountId: string, chatId: string, message: string) {
  return fetchAPI("/messages/send", {
    method: "POST",
    body: JSON.stringify({ accountId, chatId, message }),
  })
}

// Mark messages as read
export async function markMessagesAsRead(accountId: string, chatId: string, messageIds: string[]) {
  return fetchAPI("/messages/read", {
    method: "POST",
    body: JSON.stringify({ accountId, chatId, messageIds }),
  })
}

// Toggle chat mute status
export async function toggleChatMute(accountId: string, chatId: string, mute: boolean) {
  return fetchAPI("/chats/mute", {
    method: "POST",
    body: JSON.stringify({ accountId, chatId, mute }),
  })
}

// Toggle chat pin status
export async function toggleChatPin(accountId: string, chatId: string, pin: boolean) {
  return fetchAPI("/chats/pin", {
    method: "POST",
    body: JSON.stringify({ accountId, chatId, pin }),
  })
}

