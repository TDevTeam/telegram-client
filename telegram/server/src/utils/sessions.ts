import fs from "fs"
import path from "path"

// Session storage
const SESSIONS_FILE = path.join(__dirname, "../../data/sessions.json")

// Ensure the data directory exists
function ensureDataDirExists() {
  const dataDir = path.dirname(SESSIONS_FILE)
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }
}

// Load sessions from file
export function loadSessions(): Record<string, string> {
  ensureDataDirExists()

  try {
    if (fs.existsSync(SESSIONS_FILE)) {
      const data = fs.readFileSync(SESSIONS_FILE, "utf8")
      return JSON.parse(data)
    }
  } catch (error) {
    console.error("Error loading sessions:", error)
  }
  return {}
}

// Save sessions to file
export function saveSessions(sessions: Record<string, string>) {
  ensureDataDirExists()

  try {
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2))
  } catch (error) {
    console.error("Error saving sessions:", error)
  }
}

