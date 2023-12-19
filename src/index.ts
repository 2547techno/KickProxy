import {
    PusherEvent,
    PusherEventMessage,
    kickServer,
} from "./kick/KickServer.js";
import { kickApi } from "./kick/KickApi.js";
import { irc } from "./irc/IrcServer.js";
import { logger } from "./logs.js";

irc.on("start", () => {
    logger.log("IRC", "Started");
});

irc.on("add", async (channel: string) => {
    await kickServer.connectToChannel(channel);
});

irc.on("delete", async (channel: string) => {
    await kickServer.disconnectFromChannel(channel);
});

kickServer.on("open", async () => {
    logger.log("KICK-SERVER", "Started");
    await kickApi.initTLS();
    irc.start();
});

kickServer.event.on(PusherEvent.CHAT_MESSAGE, (msg: PusherEventMessage) => {
    const data = JSON.parse(msg.data);
    if (!data) {
        return;
    }

    irc.pushMessage(
        kickServer.idToChannel.get(data.chatroom_id) ?? "",
        data.content,
        data.sender.username
    );
});

kickServer.connectSocket();
