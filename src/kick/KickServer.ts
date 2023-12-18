import EventEmitter from "events";
import WebSocket, { CloseEvent, ErrorEvent, Event, MessageEvent } from "ws";
import { kickApi } from "./KickApi.js";
import { CycleTLSResponse } from "cycletls";

enum ChannelStatus {
    CONNECTING,
    CONNECTED,
}

interface PusherEventMessage {
    event: PusherEvent;
    data: object;
    channel: string;
}

enum PusherEvent {
    CONNECTION_ESTABLISHED = "pusher:connection_established",
    SUBSCRIPTION_SUCCEEDED = "pusher_internal:subscription_succeeded",
    CHAT_MESSAGE = "App\\Events\\ChatMessageEvent",
    PONG = "pusher:pong",
}

class KickServer extends EventEmitter {
    pusherUri: string;
    socket: WebSocket | null;
    channels: Map<number, ChannelStatus>;
    event: EventEmitter;

    constructor() {
        super();
        this.pusherUri =
            "wss://ws-us2.pusher.com/app/eb1d5f283081a78b932c?protocol=7&client=js&version=7.6.0&flash=false";
        this.socket = null;
        this.channels = new Map();
        this.event = new EventEmitter();
    }

    connectSocket() {
        this.socket = new WebSocket(
            "wss://ws-us2.pusher.com/app/eb1d5f283081a78b932c?protocol=7&client=js&version=7.6.0&flash=false"
        );

        this.socket.onopen = (event: Event) => this.emit("open", event);
        this.socket.onerror = (event: ErrorEvent) => this.emit("error", event);
        this.socket.onclose = (event: CloseEvent) => this.emit("close", event);

        this.socket.onmessage = (event: MessageEvent) => {
            this.emit("message", event);
            let eventMessage: PusherEventMessage;
            try {
                eventMessage = JSON.parse(event.data as string);
            } catch (err) {
                console.error(
                    "Couldn't parse message ",
                    (err as Error).message
                );
                return;
            }

            this.event.emit(eventMessage.event, {
                event: eventMessage.event,
                data: eventMessage.data,
                channel: eventMessage.channel,
            });
        };
    }

    disconnectSocket() {
        this.socket?.close();
        this.socket = null;
    }

    // {"event":"pusher:subscribe","data":{"auth":"","channel":"chatrooms.668.v2"}}
    private async subscribeToChannel(channelId: number) {
        if (this.channels.has(channelId)) {
            console.log("channel already connecting/connected");
            return;
        }

        new Promise((res, rej) => {
            this.socket?.send(
                JSON.stringify({
                    event: "pusher:subscribe",
                    data: {
                        channel: `chatrooms.${channelId}.v2`,
                        auth: null,
                    },
                })
            );
            this.channels.set(channelId, ChannelStatus.CONNECTING);
            console.log(`Subscribing to chatrooms.${channelId}.v2`);

            const timeout = setTimeout(() => {
                this.channels.delete(channelId);
                console.error(
                    `Timed out subscribing to 'chatrooms.${channelId}.v2'`
                );
                return rej();
            }, 5000);

            // {"event":"pusher_internal:subscription_succeeded","data":"{}","channel":"chatrooms.668.v2"}
            this.event.on(
                PusherEvent.SUBSCRIPTION_SUCCEEDED,
                (msg: PusherEventMessage) => {
                    const channelIdRegex = /^chatrooms\.(\d+)\.v2$/m;
                    const match = msg.channel.match(channelIdRegex);
                    if (!match) return;

                    const cid = parseInt(match[1]);
                    if (cid === channelId) {
                        clearTimeout(timeout);
                        this.channels.set(channelId, ChannelStatus.CONNECTED);
                        console.log(`Subscribed to chatrooms.${channelId}.v2`);
                        return res(channelId);
                    }
                }
            );
        });
    }

    async connectToChannel(channel: string) {
        const res: CycleTLSResponse = await kickApi.getChannel(channel);
        if (res === ({} as CycleTLSResponse) || typeof res.body !== "object")
            return;
        const { id } = res.body;

        if (!id) {
            throw new Error("Missing 'id' field in response");
        }

        await this.subscribeToChannel(id);
    }
}

export const kickServer = new KickServer();
