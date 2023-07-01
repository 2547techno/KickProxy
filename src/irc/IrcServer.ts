import EventEmitter from "events";
import { Server, Socket, createServer } from "net";

interface Client {
    socket: Socket;
    nick: string;
}

class IrcServer extends EventEmitter {
    host: string;
    port: number;
    server: Server;
    clients: Client[];

    constructor(host: string, port: number) {
        super();
        this.host = host;
        this.port = port;
        this.server = createServer(this.handleConnection);
        this.clients = [];
    }

    start() {
        this.server.listen(this.port, this.host, () => this.emit("start"))
    }

    handleConnection(socket: Socket) {
        console.log(`New client connected: ${socket.remoteAddress}:${socket.remotePort}`);
        const client: Client = {
            socket,
            nick: "anon"
        }
        this.clients.push(client);

        client.socket.write("Connected to proxy!\n");

        client.socket.on("data", () => console.log);
        client.socket.on("end", () => null);
    }

    stop() {
        this.server.close();
    }
}

export const irc = new IrcServer("localhost", 2456);