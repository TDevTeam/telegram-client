import type { Account } from "@/lib/types"
import fs from "fs"
import path from "path"
import { v4 as uuidv4 } from "uuid"

// In a real application, this would use a database
// For this example, we'll simulate with in-memory storage
// and file persistence

class AccountManager {
  private accounts: Account[] = []
  private configPath: string
  private initialized = false

  constructor() {
    this.configPath = path.join(process.cwd(), "data", "accounts.json")
    this.loadAccounts()
  }

  private async loadAccounts() {
    try {
      // Ensure the data directory exists
      const dataDir = path.join(process.cwd(), "data")
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true })
      }

      // Check if accounts file exists
      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, "utf8")
        this.accounts = JSON.parse(data)
      } else {
        // Create empty accounts file
        fs.writeFileSync(this.configPath, JSON.stringify([]))
      }

      this.initialized = true
    } catch (error) {
      console.error("Error loading accounts:", error)
      // Initialize with empty array if there's an error
      this.accounts = []
      this.initialized = true
    }
  }

  private async saveAccounts() {
    try {
      const dataDir = path.join(process.cwd(), "data")
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true })
      }

      fs.writeFileSync(this.configPath, JSON.stringify(this.accounts, null, 2))
    } catch (error) {
      console.error("Error saving accounts:", error)
    }
  }

  async getAccounts(): Promise<Account[]> {
    // Wait for initialization if needed
    if (!this.initialized) {
      await new Promise<void>((resolve) => {
        const checkInterval = setInterval(() => {
          if (this.initialized) {
            clearInterval(checkInterval)
            resolve()
          }
        }, 100)
      })
    }

    return this.accounts
  }

  async addAccount(username: string): Promise<Account> {
    const existingAccount = this.accounts.find((account) => account.username === username)

    if (existingAccount) {
      throw new Error(`Account with username ${username} already exists`)
    }

    const newAccount: Account = {
      id: uuidv4(),
      username,
      status: "offline",
      lastActive: new Date().toISOString(),
    }

    this.accounts.push(newAccount)
    await this.saveAccounts()

    return newAccount
  }

  async removeAccount(id: string): Promise<void> {
    const accountIndex = this.accounts.findIndex((account) => account.id === id)

    if (accountIndex === -1) {
      throw new Error(`Account with id ${id} not found`)
    }

    this.accounts.splice(accountIndex, 1)
    await this.saveAccounts()
  }

  async updateAccountStatus(id: string, status: "online" | "offline" | "connecting"): Promise<Account> {
    const account = this.accounts.find((account) => account.id === id)

    if (!account) {
      throw new Error(`Account with id ${id} not found`)
    }

    account.status = status
    account.lastActive = new Date().toISOString()

    await this.saveAccounts()
    return account
  }
}

// Create a singleton instance
export const accountManager = new AccountManager()

