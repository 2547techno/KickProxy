import EventEmitter from "events";
import { Server, Socket, createServer } from "net";
import { parse } from "irc-message-ts";

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
        console.log(
            `New client connected: ${socket.remoteAddress}:${socket.remotePort}`
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
                    this.joinChannel(client, channel);
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
                    console.log(data.toString());
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
                    console.log(data.toString());
                    socket.write(
                        `Invalid message type: ${parsed?.command}\r\n`
                    );
                    break;
            }
        });
        socket.on("end", () => null);
    }

    pushMessage(channel: string, message: string, username: string) {
        const clients = this.channelMap.get(channel) ?? [];

        for (const client of clients) {
            client.socket.write(`:${username} PRIVMSG #${channel.toLowerCase()} :${message}\r\n`);
        }
    }

    stop() {
        this.server.close();
    }
}

export const irc = new IrcServer("localhost", 2456);
