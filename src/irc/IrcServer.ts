import EventEmitter from "events";
import { Server, Socket, createServer } from "net";

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
        this.channelMap = new Map<string, Set<Client>>()
        this.server = createServer(this.handleConnection.bind(this));
        setInterval(() => {
            // console.log(this.clients.map(c => c.channels));
            // console.log(this.channelMap);
            for(const client of this.clients) {
                client.channels.forEach(channel => {
                    client.socket.write(`:echo PRIVMSG #${channel} :echo${Math.floor(Math.random()*100)}\r\n`)
                })
            }
        }, 2000)
    }

    start() {
        this.server.listen(this.port, this.host, () => this.emit("start"))
    }

    joinChannel(client: Client, channel: string) {
        client.channels.add(channel)
        if (!this.channelMap.has(channel)) {
            this.channelMap.set(channel, new Set<Client>())
        }
        this.channelMap.get(channel)?.add(client)
    }

    partChannel(client: Client, channel: string) {
        client.channels.delete(channel)
        this.channelMap.get(channel)?.delete(client)
        if (this.channelMap.get(channel)?.size == 0) {
            this.channelMap.delete(channel)
        }
    }

    handleConnection(socket: Socket) {
        console.log(`New client connected: ${socket.remoteAddress}:${socket.remotePort}`);
        const client: Client = {
            socket,
            nick: "anon",
            channels: new Set<string>()
        }
        this.clients.push(client);

        socket.write("Connected to proxy!\r\nType /raw JOIN #channel to connect to a channel!\r\n");

        socket.on("data", data => {
            console.log(data.toString())
            if (data.toString().startsWith("JOIN #")) {
                const channel = data.toString().substring("JOIN #".length).split(" ")[0].replace(/\r|\n/gi, "")
                socket.write(`Joining #${channel} ...\r\n`)
                this.joinChannel(client, channel)
                socket.write(`Joined #${channel} !\r\n`)
            } else if (data.toString().startsWith("PART #")) {
                const channel = data.toString().substring("JOIN #".length).split(" ")[0].replace(/\r|\n/gi, "")
                socket.write(`Parting #${channel} ...\r\n`)
                this.partChannel(client, channel)
                socket.write(`Parted #${channel} !\r\n`)
            }
        });
        socket.on("end", () => null);
    }

    stop() {
        this.server.close();
    }
}

export const irc = new IrcServer("localhost", 2456);