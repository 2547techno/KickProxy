import EventEmitter from "events";
import { Server, Socket, createServer } from "net";
import { parse } from "irc-message-ts";
import { logger } from "../logs.js";

const MAX_CHANNELS_PER_CLIENT = 2;

interface Client {
    socket: Socket;
    nick: string;
    channels: Set<string>;
}

class IrcServer extends EventEmitter {
    host: string;
    port: number;
    server: Server;
    clients: Client[];
    channelMap: Map<string, Set<Client>>;

    constructor(host: string, port: number) {
        super();
        this.host = host;
        this.port = port;
        this.clients = [];
        this.channelMap = new Map<string, Set<Client>>();
        this.server = createServer(this.handleConnection.bind(this));
    }

    start() {
        this.server.listen(this.port, this.host, () => this.emit("start"));
    }

    joinChannel(client: Client, channel: string) {
        if (client.channels.size >= MAX_CHANNELS_PER_CLIENT) {
            throw new Error("Max joined channels reached!");
        }

        client.channels.add(channel);
        if (!this.channelMap.has(channel)) {
            this.channelMap.set(channel, new Set<Client>());
            this.emit("add", channel);
        }
        this.channelMap.get(channel)?.add(client);
    }

    partChannel(client: Client, channel: string) {
        client.channels.delete(channel);
        this.channelMap.get(channel)?.delete(client);
        if (this.channelMap.get(channel)?.size == 0) {
            this.channelMap.delete(channel);
            this.emit("delete", channel);
        }
    }

    handleConnection(socket: Socket) {
        logger.log(
            "IRC",
            `Client connected: ${socket.remoteAddress}:${socket.remotePort}`
        );
        const client: Client = {
            socket,
            nick: "anon",
            channels: new Set<string>(),
        };
        this.clients.push(client);

        socket.write(
            "Connected to proxy!\r\nType /raw JOIN #channel to connect to a channel!\r\n"
        );

        socket.on("data", (data) => {
            const parsed = parse(data.toString());
            switch (parsed?.command) {
                case "CAP":
                case "NICK":
                case "USER":
                    break;
                case "JOIN": {
                    const channel = parsed.param
                        .substring(1)
                        .replace(/\r|\n/gi, "");
                    socket.write(`Joining #${channel} ...\r\n`);
                    try {
                        this.joinChannel(client, channel);
                    } catch(err) {
                        socket.write(`Failed to join channel: ${(err as Error).message}\r\n`);
                        break;
                    }

                    socket.write(`Joined #${channel} !\r\n`);
                    break;
                }
                case "PART": {
                    const channel = parsed.param
                        .substring(1)
                        .replace(/\r|\n/gi, "");
                    socket.write(`Parting #${channel} ...\r\n`);
                    this.partChannel(client, channel);
                    socket.write(`Parted #${channel} !\r\n`);
                    break;
                }
                case "PRIVMSG": {
                    // console.log(data.toString());
                    break;
                }
                case "CHANNELS": {
                    socket.write(
                        `Channels joined:  ${Array.from(client.channels)
                            .map((c) => `#${c}`)
                            .join(", ")}\r\n`
                    );
                    break;
                }
                default:
                    // console.log(data.toString());
                    socket.write(
                        `Invalid message type: ${parsed?.command}\r\n`
                    );
                    break;
            }
        });

        const cleanUpClient = () => {
            this.channelMap.forEach((clients, channel) => {
                clients.delete(client);

                if (clients.size === 0) {
                    this.channelMap.delete(channel);
                }
            });

            this.clients.splice(this.clients.indexOf(client), 1);

            console.log(this.clients);
            console.log(this.channelMap);
        };

        socket.on("error", cleanUpClient);
        socket.on("end", cleanUpClient);
    }

    pushMessage(channel: string, message: string, username: string) {
        const clients = this.channelMap.get(channel) ?? [];

        for (const client of clients) {
            client.socket.write(
                `:${username} PRIVMSG #${channel.toLowerCase()} :${message}\r\n`
            );
        }
    }

    stop() {
        this.server.close();
    }
}

export const irc = new IrcServer("localhost", 2456);
