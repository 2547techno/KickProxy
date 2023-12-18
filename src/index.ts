import { kickServer } from "./kick/KickServer.js";
import { kickApi } from "./kick/KickApi.js";
import { irc } from "./irc/IrcServer.js";

// const socket = new WebSocket(
//     "wss://ws-us2.pusher.com/app/eb1d5f283081a78b932c?protocol=7&client=js&version=7.6.0&flash=false"
// );

kickServer.on("open", async () => {
    console.log("socket open");
    await kickApi.initTLS();
    // await kickServer.connectToChannel("xqc");
    // await kickApi.closeCycles();
    irc.start();
});
kickServer.connectSocket();

irc.on("start", () => {
    console.log("irc start");
});
