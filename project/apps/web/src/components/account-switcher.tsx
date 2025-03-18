import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Account } from "@/types";

interface AccountSwitcherProps {
  accounts: Account[];
  selectedAccount: Account | null;
  onSelect: (account: Account) => void;
}

export function AccountSwitcher({ accounts, selectedAccount, onSelect }: AccountSwitcherProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Accounts</h2>
      <div className="space-y-2">
        {accounts.map((account) => (
          <Button
            key={account.id}
            variant={selectedAccount?.id === account.id ? "secondary" : "ghost"}
            className="w-full justify-start"
            onClick={() => onSelect(account)}
          >
            <Avatar className="h-8 w-8 mr-2">
              <AvatarImage src={account.avatar} />
              <AvatarFallback>{account.displayName[0]}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col items-start">
              <span className="text-sm font-medium">{account.displayName}</span>
              <span className="text-xs text-muted-foreground">
                {account.isOnline ? "Online" : "Offline"}
              </span>
            </div>
          </Button>
        ))}
      </div>
    </div>
  );
}