"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import type { Account } from "@/lib/types"
import { PlusCircle, Trash2 } from "lucide-react"

interface AccountSwitcherProps {
  accounts: Account[]
  activeAccount: Account | null
  onSwitchAccount: (account: Account) => void
  onAddAccount: (username: string) => void
  onRemoveAccount: (id: string) => void
}

export function AccountSwitcher({
  accounts,
  activeAccount,
  onSwitchAccount,
  onAddAccount,
  onRemoveAccount,
}: AccountSwitcherProps) {
  const [newUsername, setNewUsername] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false)
  const [accountToRemove, setAccountToRemove] = useState<Account | null>(null)

  const handleAddAccount = () => {
    if (newUsername.trim()) {
      onAddAccount(newUsername.trim())
      setNewUsername("")
      setIsAddDialogOpen(false)
    }
  }

  const handleRemoveAccount = () => {
    if (accountToRemove) {
      onRemoveAccount(accountToRemove.id)
      setAccountToRemove(null)
      setIsRemoveDialogOpen(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Accounts</span>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon">
                <PlusCircle className="h-5 w-5" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Account</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <Input placeholder="Username" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} />
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button onClick={handleAddAccount}>Add Account</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-[300px] overflow-y-auto">
          {accounts.length === 0 ? (
            <div className="px-4 py-3 text-sm text-muted-foreground">No accounts added yet</div>
          ) : (
            <ul className="divide-y">
              {accounts.map((account) => (
                <li key={account.id}>
                  <div
                    className={`flex items-center justify-between px-4 py-3 cursor-pointer ${
                      activeAccount?.id === account.id ? "bg-accent" : "hover:bg-muted"
                    }`}
                    onClick={() => onSwitchAccount(account)}
                  >
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                        {account.username.charAt(0).toUpperCase()}
                      </div>
                      <div className="ml-3">
                        <p className="font-medium">{account.username}</p>
                        <p className="text-xs text-muted-foreground">{account.status}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation()
                        setAccountToRemove(account)
                        setIsRemoveDialogOpen(true)
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>

      <Dialog open={isRemoveDialogOpen} onOpenChange={setIsRemoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Account</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>
              Are you sure you want to remove <strong>{accountToRemove?.username}</strong>? This action cannot be
              undone.
            </p>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button variant="destructive" onClick={handleRemoveAccount}>
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

