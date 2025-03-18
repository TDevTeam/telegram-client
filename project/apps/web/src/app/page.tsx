"use client";

import { useEffect, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AccountSwitcher } from "@/components/account-switcher";
import { ChatArea } from "@/components/chat-area";
import { useSocket } from "@/lib/socket";
import { Account } from "@/types";

export default function Home() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const socket = useSocket();

  useEffect(() => {

    socket.on("accounts", (accounts: Account[]) => {
      setAccounts(accounts);
      if (!selectedAccount && accounts.length > 0) {
        setSelectedAccount(accounts[0]);
      }
    });

    socket.emit("getAccounts");

    return () => {
      socket?.off("accounts");
    };
  }, [socket, selectedAccount]);

  return (
    <div className="flex h-screen">
      <div className="w-64 border-r">
        <ScrollArea className="h-screen">
          <div className="p-4">
            <AccountSwitcher
              accounts={accounts}
              selectedAccount={selectedAccount}
              onSelect={setSelectedAccount}
            />
          </div>
        </ScrollArea>
      </div>
      <div className="flex-1">
        {selectedAccount ? (
          <ChatArea account={selectedAccount} />
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="text-muted-foreground">Select an account to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
}