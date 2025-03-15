"use client"

import { useState, useEffect } from "react"
import { BellOff, LogOut, Plus, Settings, Trash2, Edit, Check, User } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { AccountProfile } from "@/components/account-profile"
import { useTelegramStore } from "@/context/telegram-store"

export function AccountSidebar() {
  const { accounts, activeAccount, setActiveAccount } = useTelegramStore()
  const [showAccountsDialog, setShowAccountsDialog] = useState(false)
  const [showAddAccountDialog, setShowAddAccountDialog] = useState(false)
  const [editingAccount, setEditingAccount] = useState<(typeof accounts)[0] | null>(null)
  const [showEditAccountDialog, setShowEditAccountDialog] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState("")
  const [verificationCode, setVerificationCode] = useState("")
  const [showVerificationInput, setShowVerificationInput] = useState(false)
  const [showProfileSheet, setShowProfileSheet] = useState(false)

  const handleAddAccount = () => {
    setShowAddAccountDialog(true)
  }

  const handleSendCode = () => {
    // Mock sending verification code
    setShowVerificationInput(true)
  }

  const handleVerifyCode = () => {
    // Mock verification
    setShowAddAccountDialog(false)
    setShowVerificationInput(false)
    setPhoneNumber("")
    setVerificationCode("")
    // Would add the new account in a real app
  }

  const handleEditAccount = (account: (typeof accounts)[0]) => {
    setEditingAccount(account)
    setShowEditAccountDialog(true)
  }

  const handleSaveAccountEdit = () => {
    // Mock saving account changes
    setShowEditAccountDialog(false)
    setEditingAccount(null)
  }

  const handleAccountClick = (account: (typeof accounts)[0]) => {
    // Set the clicked account as active
    setActiveAccount(account.id)
  }

  const handleViewProfile = () => {
    setShowProfileSheet(true)
  }

  useEffect(() => {
    // This ensures the sidebar reflects the current active account
    const activeAcc = accounts.find((acc) => acc.active)
    if (activeAcc && activeAcc.id !== activeAccount.id) {
      setActiveAccount(activeAcc.id)
    }
  }, [accounts, activeAccount.id, setActiveAccount])

  return (
    <>
      <div className="hidden w-[70px] flex-col border-r bg-muted/10 lg:flex">
        <div className="flex flex-col items-center justify-center p-2">
          <Button variant="outline" size="icon" className="mt-2" onClick={handleAddAccount}>
            <Plus className="h-4 w-4" />
            <span className="sr-only">Add Account</span>
          </Button>
        </div>
        <div className="flex flex-1 flex-col items-center gap-2 p-2 overflow-y-auto">
          <TooltipProvider>
            {accounts.map((account) => (
              <Tooltip key={account.id}>
                <TooltipTrigger asChild>
                  <Button
                    variant={account.active ? "default" : "ghost"}
                    size="icon"
                    className="relative h-10 w-10 rounded-full"
                    onClick={() => handleAccountClick(account)}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={account.avatar} alt={account.name} />
                      <AvatarFallback>{account.name.slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    {account.unreadCount > 0 && !account.muted && (
                      <Badge className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 flex items-center justify-center">
                        {account.unreadCount}
                      </Badge>
                    )}
                    {account.muted && (
                      <div className="absolute -right-1 -top-1 h-5 w-5 rounded-full bg-background flex items-center justify-center">
                        <BellOff className="h-3 w-3" />
                      </div>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>{account.name}</p>
                  <p className="text-xs text-muted-foreground">{account.username}</p>
                  {account.muted && <p className="text-xs text-muted-foreground">Notifications muted</p>}
                </TooltipContent>
              </Tooltip>
            ))}
          </TooltipProvider>
        </div>
        <div className="flex flex-col items-center gap-2 p-2">
          <Separator className="my-2" />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={handleViewProfile}>
                  <User className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">View Profile</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-full"
                  onClick={() => setShowAccountsDialog(true)}
                >
                  <Settings className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Manage Accounts</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full">
                  <LogOut className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Log Out</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Profile Sheet */}
      <Sheet open={showProfileSheet} onOpenChange={setShowProfileSheet}>
        <SheetContent side="left" className="p-0 w-[350px] sm:w-[400px]">
          <AccountProfile account={activeAccount} onClose={() => setShowProfileSheet(false)} />
        </SheetContent>
      </Sheet>

      {/* Manage Accounts Dialog */}
      <Dialog open={showAccountsDialog} onOpenChange={setShowAccountsDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Manage Accounts</DialogTitle>
            <DialogDescription>Manage your Telegram accounts. You can add, edit, or remove accounts.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {accounts.map((account) => (
              <div key={account.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={account.avatar} alt={account.name} />
                    <AvatarFallback>{account.name.slice(0, 2)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{account.name}</p>
                    <p className="text-sm text-muted-foreground">{account.phone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => handleEditAccount(account)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAccountsDialog(false)}>
              Close
            </Button>
            <Button onClick={handleAddAccount}>
              <Plus className="mr-2 h-4 w-4" />
              Add Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Account Dialog */}
      <Dialog open={showAddAccountDialog} onOpenChange={setShowAddAccountDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Telegram Account</DialogTitle>
            <DialogDescription>Enter your phone number to add a new Telegram account.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {!showVerificationInput ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    placeholder="+1 (555) 123-4567"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                </div>
                <Button onClick={handleSendCode} className="w-full" disabled={!phoneNumber}>
                  Send Code
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Verification Code</Label>
                  <Input
                    id="code"
                    placeholder="Enter code"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground">We sent a code to {phoneNumber}</p>
                </div>
                <Button onClick={handleVerifyCode} className="w-full" disabled={!verificationCode}>
                  Verify
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Account Dialog */}
      <Dialog open={showEditAccountDialog} onOpenChange={setShowEditAccountDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Account</DialogTitle>
            <DialogDescription>Modify account settings for {editingAccount?.name}.</DialogDescription>
          </DialogHeader>
          {editingAccount && (
            <div className="py-4 space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={editingAccount.avatar} alt={editingAccount.name} />
                  <AvatarFallback>{editingAccount.name.slice(0, 2)}</AvatarFallback>
                </Avatar>
                <Button variant="outline" size="sm">
                  Change Photo
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-name">Display Name</Label>
                <Input id="edit-name" defaultValue={editingAccount.name} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-username">Username</Label>
                <Input id="edit-username" defaultValue={editingAccount.username} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="mute-notifications">Mute Notifications</Label>
                  <p className="text-sm text-muted-foreground">Silence all notifications from this account</p>
                </div>
                <Switch id="mute-notifications" defaultChecked={editingAccount.muted} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditAccountDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveAccountEdit}>
              <Check className="mr-2 h-4 w-4" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

