import { AccountSidebar } from "@/components/account-sidebar"
import { AccountSwitcher } from "@/components/account-switcher"
import { ChatList } from "@/components/chat-list"
import { ChatView } from "@/components/chat-view"
import { MobileNav } from "@/components/mobile-nav"

export default function Home() {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <AccountSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
          <MobileNav />
          <div className="flex w-full items-center justify-between">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold">Multi-Telegram</h1>
            </div>
            <div className="flex items-center gap-2">
              <AccountSwitcher />
            </div>
          </div>
        </header>
        <div className="flex flex-1 overflow-hidden">
          <aside className="hidden w-[300px] flex-col border-r bg-muted/20 md:flex">
            <ChatList />
          </aside>
          <main className="flex flex-1 flex-col">
            <ChatView />
          </main>
        </div>
      </div>
    </div>
  )
}

