"use client"

import { useState } from "react"
import { Check, ChevronsUpDown, Settings } from "lucide-react"

import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

const accounts = [
  {
    id: "1",
    name: "Alex Johnson",
    username: "@alexj",
    email: "alex@example.com",
    avatarUrl: "/placeholder.svg?height=40&width=40",
  },
  {
    id: "2",
    name: "Sarah Miller",
    username: "@sarahm",
    email: "sarah@example.com",
    avatarUrl: "/placeholder.svg?height=40&width=40",
  },
]

type Account = (typeof accounts)[number]

export function AccountSwitcher() {
  const [open, setOpen] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<Account>(accounts[0])
  const [showSettingsDialog, setShowSettingsDialog] = useState(false)
  const [autoDownload, setAutoDownload] = useState(true)
  const [saveToGallery, setSaveToGallery] = useState(false)
  const [dataUsage, setDataUsage] = useState("wifi")

  return (
    <>
      <div className="flex items-center gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              aria-label="Select an account"
              className="w-[200px] justify-between"
            >
              <Avatar className="mr-2 h-5 w-5">
                <AvatarImage src={selectedAccount.avatarUrl} alt={selectedAccount.name} />
                <AvatarFallback>{selectedAccount.name[0]}</AvatarFallback>
              </Avatar>
              {selectedAccount.name}
              <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0">
            <Command>
              <CommandList>
                <CommandInput placeholder="Search accounts..." />
                <CommandEmpty>No accounts found.</CommandEmpty>
                <CommandGroup heading="Accounts">
                  {accounts.map((account) => (
                    <CommandItem
                      key={account.id}
                      onSelect={() => {
                        setSelectedAccount(account)
                        setOpen(false)
                      }}
                      className="text-sm"
                    >
                      <Avatar className="mr-2 h-5 w-5">
                        <AvatarImage src={account.avatarUrl} alt={account.name} />
                        <AvatarFallback>{account.name[0]}</AvatarFallback>
                      </Avatar>
                      {account.name}
                      <Check
                        className={cn(
                          "ml-auto h-4 w-4",
                          selectedAccount.id === account.id ? "opacity-100" : "opacity-0",
                        )}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        <Button variant="ghost" size="icon" onClick={() => setShowSettingsDialog(true)}>
          <Settings className="h-4 w-4" />
        </Button>
      </div>

      {/* Account Settings Dialog */}
      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Account Settings</DialogTitle>
            <DialogDescription>Configure settings for {selectedAccount.name}.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto-download">Auto-download media</Label>
                <p className="text-sm text-muted-foreground">Automatically download photos and videos</p>
              </div>
              <Switch id="auto-download" checked={autoDownload} onCheckedChange={setAutoDownload} />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="save-to-gallery">Save to gallery</Label>
                <p className="text-sm text-muted-foreground">Save received media to your device's gallery</p>
              </div>
              <Switch id="save-to-gallery" checked={saveToGallery} onCheckedChange={setSaveToGallery} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="data-usage">Data Usage</Label>
              <select
                id="data-usage"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                value={dataUsage}
                onChange={(e) => setDataUsage(e.target.value)}
              >
                <option value="wifi">Download media on Wi-Fi only</option>
                <option value="mobile">Download media on mobile data</option>
                <option value="always">Always download media</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowSettingsDialog(false)}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

