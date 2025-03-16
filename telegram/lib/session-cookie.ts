// Cookie management for Telegram session strings

// Save session string to cookie
export function saveSessionToCookie(accountId: string, sessionString: string) {
  // Calculate expiration date (30 days from now)
  const expirationDate = new Date()
  expirationDate.setDate(expirationDate.getDate() + 30)

  // Set the cookie with proper encoding
  document.cookie = `telegram_session_${accountId}=${encodeURIComponent(sessionString)};path=/;expires=${expirationDate.toUTCString()};SameSite=Strict;`
}

// Get session string from cookie
export function getSessionFromCookie(accountId: string): string | null {
  const cookies = document.cookie.split(";")
  const cookieName = `telegram_session_${accountId}=`

  for (let i = 0; i < cookies.length; i++) {
    const cookie = cookies[i].trim()
    if (cookie.indexOf(cookieName) === 0) {
      return decodeURIComponent(cookie.substring(cookieName.length, cookie.length))
    }
  }

  return null
}

// Clear session cookie
export function clearSessionCookie(accountId: string) {
  document.cookie = `telegram_session_${accountId}=;path=/;expires=Thu, 01 Jan 1970 00:00:01 GMT;`
}

// Get all session cookies
export function getAllSessionCookies(): Record<string, string> {
  const cookies = document.cookie.split(";")
  const sessions: Record<string, string> = {}

  for (let i = 0; i < cookies.length; i++) {
    const cookie = cookies[i].trim()
    if (cookie.indexOf("telegram_session_") === 0) {
      const parts = cookie.split("=")
      if (parts.length === 2) {
        const accountId = parts[0].substring("telegram_session_".length)
        sessions[accountId] = decodeURIComponent(parts[1])
      }
    }
  }

  return sessions
}

