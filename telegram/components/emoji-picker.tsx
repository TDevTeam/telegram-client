"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Search } from "lucide-react"

const emojiCategories = {
  smileys: ["😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘"],
  gestures: ["👍", "👎", "👌", "✌️", "🤞", "🤟", "🤘", "🤙", "👈", "👉", "👆", "👇", "☝️", "✋", "🤚", "🖐️", "🖖"],
  hearts: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "💔", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟"],
  animals: ["🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮", "🐷", "🐸", "🐵", "🐔", "🐧"],
  food: ["🍏", "🍎", "🍐", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🍈", "🍒", "🍑", "🥭", "🍍", "🥥", "🥝", "🍅"],
}

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void
}

export function EmojiPicker({ onEmojiSelect }: EmojiPickerProps) {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredEmojis = searchQuery
    ? Object.values(emojiCategories)
        .flat()
        .filter((emoji) => emoji.includes(searchQuery))
    : null

  return (
    <div className="w-64 rounded-lg border bg-background p-2 shadow-lg">
      <div className="relative mb-2">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search emoji..."
          className="pl-8"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {searchQuery ? (
        <div className="grid grid-cols-7 gap-1 p-2">
          {filteredEmojis?.map((emoji) => (
            <button
              key={emoji}
              className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted"
              onClick={() => onEmojiSelect(emoji)}
            >
              {emoji}
            </button>
          ))}
        </div>
      ) : (
        <Tabs defaultValue="smileys">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="smileys">😀</TabsTrigger>
            <TabsTrigger value="gestures">👍</TabsTrigger>
            <TabsTrigger value="hearts">❤️</TabsTrigger>
            <TabsTrigger value="animals">🐶</TabsTrigger>
            <TabsTrigger value="food">🍏</TabsTrigger>
          </TabsList>

          {Object.entries(emojiCategories).map(([category, emojis]) => (
            <TabsContent key={category} value={category} className="mt-2">
              <ScrollArea className="h-[200px]">
                <div className="grid grid-cols-7 gap-1 p-2">
                  {emojis.map((emoji) => (
                    <button
                      key={emoji}
                      className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted"
                      onClick={() => onEmojiSelect(emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  )
}

