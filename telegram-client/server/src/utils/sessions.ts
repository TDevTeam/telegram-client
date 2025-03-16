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
      if (!data || data.trim() === "") {
        console.log("Sessions file exists but is empty, returning empty object")
        return {}
      }
      try {
        return JSON.parse(data)
      } catch (parseError) {
        console.error("Error parsing sessions JSON:", parseError)
        // Create a backup of the corrupted file
        const backupPath = `${SESSIONS_FILE}.backup-${Date.now()}`
        fs.copyFileSync(SESSIONS_FILE, backupPath)
        console.log(`Created backup of corrupted sessions file at ${backupPath}`)
        return {}
      }
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
    // Create a temporary file first
    const tempFile = `${SESSIONS_FILE}.temp`
    fs.writeFileSync(tempFile, JSON.stringify(sessions, null, 2))

    // Then rename it to the actual file (atomic operation)
    fs.renameSync(tempFile, SESSIONS_FILE)
    console.log("Sessions saved successfully")
  } catch (error) {
    console.error("Error saving sessions:", error)
  }
}

