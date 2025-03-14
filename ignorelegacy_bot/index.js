const { Api, TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const input = require("input");
const TelegramBot = require("node-telegram-bot-api");

const apiId = 20730239;
const apiHash = "72c82b71fc9db0a2808cdbeca34912e7";
const botToken = "7534228882:AAHYudeWiRrRef93Iz0YuRgkScm4lbBkWhE";
const targetChatId = "-1002324172114";

const bot = new TelegramBot(botToken, { polling: true });

const client = new TelegramClient(
  new StringSession(
    "1BAAOMTQ5LjE1NC4xNjcuOTEBuyXE1/pXWSLnG/eVXksgCdYwG+tFzbP2ZN2W9GU5evd97dImoU+oAZEexlc4fsIExxPssFwDxLltkO6fPNeObrmatv6BJyvqVDSdvgvyDqn4INDbVdb7Fn2W0c0gHX4pLY8qsfTFSJBJgQr+eQiotA8goa2fLxN88GmPC753VMDVuFAdwFqkl/B05r51AQ7ooToJGOZtsxRhDioxIHbu88cJKLaZCoyplqZc1Om8HtilgoOJpYw1Z51sWhHqARZ2guUXe5qaRLUN9GZV7NtZbGWgI38N0DN9P0oT7LDJ3xACcCFXAvHRVsXmmn9LBEkDWrUD194U4ZDGZapLfYneElQ="
  ),
  apiId,
  apiHash,
  {
    connectionRetries: 5,
  }
);

async function getSenderUsername(senderId) {
  try {
    const sender = await client.getEntity(senderId);
    return sender.username || sender.firstName;
  } catch (error) {
    console.error("Error getting username:", error);
    return "Unknown";
  }
}

async function isAdmin(chatId, userId) {
  try {
    const chat = await client.getEntity(chatId);
    const fullChat = await client.invoke(
      new Api.messages.GetFullChat({
        chatId: chatId,
      })
    );

    const participant = fullChat.fullChat.participants.find(
      (p) => p.userId === userId && p.rank !== null
    );

    return Boolean(participant?.rank);
  } catch (error) {
    console.error("Error checking admin status:", error);
    return false;
  }
}

async function handleMedia(message) {
  let mediaInfo = "";

  if (message.media) {
    switch (message.media._) {
      case "messageMediaPhoto":
        mediaInfo = "[Photo]";
        break;
      case "messageMediaDocument":
        mediaInfo = `[File: ${message.media.document.id}]`;
        break;
      case "messageMediaVideo":
        mediaInfo = "[Video]";
        break;
      case "messageMediaAudio":
        mediaInfo = "[Audio]";
        break;
      case "messageMediaWebPage":
        mediaInfo = "[Web Page]";
        break;
      default:
        mediaInfo = `[${message.media.constructor.name}]`;
    }
  }

  return mediaInfo;
}

bot.onText(/\/test/, async (msg) => {
  if (msg.chat.type === "private") {
    bot.sendMessage(msg.chat.id, "b");
  }
});

(async () => {
  try {
    await client.start({
      phoneNumber: async () => await input.text("Please enter your number: "),
      password: async () => await input.text("Please enter your password: "),
      phoneCode: async () =>
        await input.text("Please enter the code you received: "),
      onError: (err) => console.log(err),
    });
    // await client.invoke(
    //   new Api.messages.ImportChatInvite({
    //     hash: "3p6zrMuoBh41NzY0",
    //   })
    // );

    client.addEventHandler(async (event) => {
      try {
        const message = await event.message;
        if (!message) return;
        const botId = await bot.getMe();
        console.log(String(message.senderId), String(botId.id));
        if (String(message.senderId) === String(botId.id)) return;
        if (message.out) return;

        // Get chat information
        const chatId = message.peerId.channelId || message.peerId.chatId;
        const chat = await client.getEntity(chatId);

        // Skip if muted
        const notifySettings = await client.invoke(
          new Api.account.GetNotifySettings({
            peer: await client.getInputEntity(message.peerId),
          })
        );
        if (notifySettings.muteUntil && notifySettings.muteUntil !== 0) {
          return;
        }

        // Get sender information
        const senderUsername = await getSenderUsername(message.senderId);
        const isReply = Boolean(message.replyToMsgId);

        // Handle media
        const mediaInfo = await handleMedia(message);

        // Format message text
        let messageText = message.message || "";
        if (mediaInfo) {
          messageText += `\n${mediaInfo}`;
        }

        // Create formatted message
        const formattedMessage = `
Message: ${messageText}
From Group: ${chat.title || chat.username || chatId}
Sender: @${senderUsername}
Message ID: ${message.id}
Chat ID: ${chatId}
${isReply ? "\n[Reply to message]" : ""}
`;

        // Send to target chat
        await bot.sendMessage(targetChatId, formattedMessage);

        // Check if someone replies to the bot's message
        bot.on("message", async (reply) => {
          if (reply.chat.id === Number(targetChatId) && reply.reply_to_message) {
            const originalMessageText = reply.reply_to_message.text;
            const matches = originalMessageText.match(/Message ID: (\d+)\nChat ID: (-?\d+)/);
            
            if (matches) {
              const originalMessageId = Number(matches[1]);
              const originalChatId = Number(matches[2]);
              
              try {
                const chatEntity = await client.getInputEntity(originalChatId);
                await client.invoke(
                  new Api.messages.SendMessage({
                    peer: chatEntity,
                    message: reply.text,
                    replyToMsgId: 589,
                  })
                );
              } catch (error) {
                console.error("Error sending reply:", error);
                bot.sendMessage(targetChatId, "Failed to send reply: No permission or chat not accessible");
              }
            }
          }
        });
      } catch (error) {
        console.error("Error handling event:", error);
      }
    });
  } catch (error) {
    console.error("Error in main process:", error);
  }
})();