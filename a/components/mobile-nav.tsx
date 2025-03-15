"use client"

import { Menu } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { ChatList } from "@/components/chat-list"
import { useMobile } from "@/hooks/use-mobile"

export function MobileNav() {
  const isMobile = useMobile()

  if (!isMobile) {
    return null
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle Menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0 w-[280px] sm:w-[350px]">
        <ChatList />
      </SheetContent>
    </Sheet>
  )
}

