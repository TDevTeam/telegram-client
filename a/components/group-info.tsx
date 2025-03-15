"use client"

import { useState } from "react"
import { X, Image, Users, Bell, BellOff, UserPlus, File, Settings, Search, Trash2 } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { type ChatType, type MediaItemType, useTelegramStore } from "@/context/telegram-store"

interface GroupInfoProps {
  chat: ChatType
  media: MediaItemType[]
  onMemberClick: (memberId: string) => void
  onClose: () => void
}

export function GroupInfo({ chat, media, onMemberClick, onClose }: GroupInfoProps) {
  const { updateChat } = useTelegramStore()
  const [isMuted, setIsMuted] = useState(chat.muted)
  const [memberSearch, setMemberSearch] = useState("")
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [groupName, setGroupName] = useState(chat.name)
  const [groupDescription, setGroupDescription] = useState(chat.description || "")

  const handleMuteToggle = () => {
    setIsMuted(!isMuted)
    updateChat(chat.id, { muted: !isMuted })
  }

  const handleSaveChanges = () => {
    updateChat(chat.id, {
      name: groupName,
      description: groupDescription,
    })
    setShowEditDialog(false)
  }

  const filteredMembers =
    chat.members?.filter(
      (member) =>
        member.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
        member.username.toLowerCase().includes(memberSearch.toLowerCase()),
    ) || []

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="font-semibold">{chat.type === "group" ? "Group Info" : "Channel Info"}</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-col items-center p-6 gap-4">
        <Avatar className="h-24 w-24">
          <AvatarImage src={chat.avatar} alt={chat.name} />
          <AvatarFallback>{chat.name.slice(0, 2)}</AvatarFallback>
        </Avatar>
        <div className="text-center">
          <h3 className="text-xl font-bold">{chat.name}</h3>
          <p className="text-sm text-muted-foreground">
            {chat.type === "group" ? `${chat.memberCount} members` : `${chat.subscriberCount} subscribers`}
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleMuteToggle}>
            {isMuted ? <BellOff className="mr-2 h-4 w-4" /> : <Bell className="mr-2 h-4 w-4" />}
            {isMuted ? "Unmute" : "Mute"}
          </Button>
          {chat.isAdmin && (
            <Button variant="outline" size="sm" onClick={() => setShowEditDialog(true)}>
              <Settings className="mr-2 h-4 w-4" />
              Edit
            </Button>
          )}
        </div>
      </div>

      <Separator />

      {chat.description && (
        <div className="p-4">
          <h4 className="text-sm font-medium mb-2">Description</h4>
          <p className="text-sm">{chat.description}</p>
        </div>
      )}

      <div className="p-4">
        <h4 className="text-sm font-medium mb-2">Info</h4>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Created by</span>
            <span>{chat.createdBy}</span>
          </div>
          {chat.createdAt && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Created</span>
              <span>{chat.createdAt}</span>
            </div>
          )}
        </div>
      </div>

      <Separator />

      <Tabs defaultValue="members" className="flex-1">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="members">
            <Users className="h-4 w-4 mr-2" />
            {chat.type === "group" ? "Members" : "Subscribers"}
          </TabsTrigger>
          <TabsTrigger value="media">
            <Image className="h-4 w-4 mr-2" />
            Media
          </TabsTrigger>
          <TabsTrigger value="files">
            <File className="h-4 w-4 mr-2" />
            Files
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="flex-1 overflow-y-auto">
          <div className="p-4">
            <div className="relative mb-4">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search members..."
                className="pl-8"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              {filteredMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-2 hover:bg-muted rounded-md cursor-pointer"
                  onClick={() => onMemberClick(member.id)}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={member.avatar} alt={member.name} />
                      <AvatarFallback>{member.name.slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{member.name}</p>
                        {member.role === "admin" && (
                          <Badge variant="outline" className="text-xs">
                            Admin
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{member.username}</p>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {member.online ? "online" : member.lastSeen ? member.lastSeen : ""}
                  </div>
                </div>
              ))}
            </div>

            {chat.isAdmin && chat.type === "group" && (
              <Button className="w-full mt-4" variant="outline">
                <UserPlus className="mr-2 h-4 w-4" />
                Add Members
              </Button>
            )}
          </div>
        </TabsContent>

        <TabsContent value="media" className="flex-1 p-4 overflow-y-auto">
          <div className="grid grid-cols-3 gap-2">
            {media
              .filter((item) => item.type === "image")
              .map((item) => (
                <div key={item.id} className="aspect-square rounded-md overflow-hidden">
                  <img src={item.url || "/placeholder.svg"} alt="Media" className="w-full h-full object-cover" />
                </div>
              ))}
          </div>
          {media.filter((item) => item.type === "image").length === 0 && (
            <div className="flex items-center justify-center h-32">
              <p className="text-sm text-muted-foreground">No media found</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="files" className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-2">
            {media
              .filter((item) => item.type === "file")
              .map((item) => (
                <div key={item.id} className="flex items-center justify-between p-2 bg-muted rounded-md">
                  <div className="flex items-center">
                    <File className="h-4 w-4 mr-2" />
                    <div>
                      <p className="text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.size}</p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">{item.date}</span>
                </div>
              ))}
            {media.filter((item) => item.type === "file").length === 0 && (
              <div className="flex items-center justify-center h-32">
                <p className="text-sm text-muted-foreground">No files found</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {chat.isAdmin && (
        <div className="p-4 border-t">
          <Button variant="destructive" className="w-full">
            <Trash2 className="mr-2 h-4 w-4" />
            {chat.type === "group" ? "Delete Group" : "Delete Channel"}
          </Button>
        </div>
      )}

      {/* Edit Group/Channel Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {chat.type === "group" ? "Group" : "Channel"}</DialogTitle>
            <DialogDescription>
              Make changes to your {chat.type === "group" ? "group" : "channel"} settings.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={groupName} onChange={(e) => setGroupName(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Input id="description" value={groupDescription} onChange={(e) => setGroupDescription(e.target.value)} />
            </div>
            {chat.type === "group" && (
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="private">Private Group</Label>
                  <p className="text-sm text-muted-foreground">Only members can see messages</p>
                </div>
                <Switch id="private" defaultChecked={true} />
              </div>
            )}
            {chat.type === "channel" && (
              <div className="grid gap-2">
                <Label htmlFor="channel-link">Channel Link</Label>
                <Input id="channel-link" placeholder="t.me/" defaultValue="t.me/yourchannel" />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveChanges}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

