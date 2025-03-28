"use client";


import { useEffect, useRef, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AccountSwitcher } from "@/components/account-switcher";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { io } from "socket.io-client";

import { Send } from "lucide-react";
import type { Account, Message } from "@/types";

const socket = io("http://localhost:3001");

export default function Home() {
	const [accounts, setAccounts] = useState<Account[]>([]);
	const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
	const [isConnected, setIsConnected] = useState(false);
	const [messages, setMessages] = useState<Message[]>([]);
	const [input, setInput] = useState("");
	const scrollRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		socket.on("connect", () => {
			setIsConnected(true);
		});

		socket.on("disconnect", () => {
			setIsConnected(false);
		});

		return () => {
			socket.off("connect");
			socket.off("disconnect");
		};
	}, []);

	useEffect(() => {
		if (!isConnected) return;

		const handleAccounts = (accounts: Account[]) => {
			console.log("Received accounts:", accounts);
			setAccounts(accounts);
			if (!selectedAccount && accounts.length > 0) {
				setSelectedAccount(accounts[0]);
			}
		};

		socket.on("accounts", handleAccounts);

		return () => {
			socket.off("accounts", handleAccounts);
		};
	}, [isConnected, selectedAccount]);

	useEffect(() => {
		if (!isConnected) return;
		socket.emit("getAccounts");
	}, [isConnected]);

	useEffect(() => {
		if (!selectedAccount) return;

		socket.on("messages", (newMessages: Message[]) => {
			setMessages(newMessages);
			setTimeout(() => {
				scrollRef.current?.scrollIntoView({ behavior: "smooth" });
			}, 100);
		});

		socket.emit("getMessages", selectedAccount.id);

		return () => {
			socket.off("messages");
		};
	}, [selectedAccount]);

	const handleSend = () => {
		if (!input.trim() || !selectedAccount) return;

		socket.emit("sendMessage", {
			accountId: selectedAccount.id,
			message: input,
		});

		setInput("");
	};

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

					<div className="flex flex-col h-full">
						<div className="p-4 border-b">
							<h2 className="text-lg font-semibold">{selectedAccount.displayName}</h2>
						</div>
						<ScrollArea className="flex-1 p-4">
							<div className="space-y-4">
								{messages.map((message) => (
									<div
										key={message.id}
										className={`flex ${
											message.fromMe ? "justify-end" : "justify-start"
										}`}
									>
										<div
											className={`max-w-[70%] rounded-lg p-3 ${
												message.fromMe
													? "bg-primary text-primary-foreground"
													: "bg-muted"
											}`}
										>
											<p>{message.text}</p>
											<span className="text-xs opacity-70">
												{new Date(message.timestamp).toLocaleTimeString()}
											</span>
										</div>
									</div>
								))}
								<div ref={scrollRef} />
							</div>
						</ScrollArea>
						<div className="p-4 border-t">
							<form
								onSubmit={(e) => {
									e.preventDefault();
									handleSend();
								}}
								className="flex gap-2"
							>
								<Input
									value={input}
									onChange={(e) => setInput(e.target.value)}
									placeholder="Type a message..."
								/>
								<Button type="submit">
									<Send className="h-4 w-4" />
								</Button>
							</form>
						</div>
					</div>
				) : (
					<div className="flex h-full items-center justify-center">
						<p className="text-muted-foreground">
							Select an account to start chatting
						</p>
					</div>
				)}
			</div>
		</div>
	);
}