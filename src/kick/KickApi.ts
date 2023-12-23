import initCycleTLS, { CycleTLSClient, CycleTLSResponse } from "cycletls";
import exitHook from "exit-hook";
import { require } from "../require.js";
import { logger } from "../logs.js";
const { cycles: cyclesConfig } = require("../config.json");

enum HTTPMethod {
    GET = "get",
    POST = "post",
}

class KickApi {
    private static instance: KickApi;
    private cycles: CycleTLSClient | null;
    private config: object;

    constructor(cyclesConfig: object) {
        if (KickApi.instance)
            throw new Error(
                "Cannot instantiate singleton more than once, use .getInstance()"
            );
        KickApi.instance = this;

        this.cycles = null;
        this.config = cyclesConfig;
    }

    getInstance() {
        return KickApi.instance;
    }

    async initTLS() {
        if (this.cycles) throw new Error("CyclesTLS already initialized");

        this.cycles = await initCycleTLS.default();
        logger.log("CYCLES", "Initialized");
    }

    async closeCycles() {
        await this.cycles?.exit();
        logger.log("CYCLES", "Closed");
    }

    async request(method: HTTPMethod, endpoint: string, body?: string) {
        if (!this.cycles) return {} as CycleTLSResponse;
        return await this.cycles(
            new URL(endpoint, "https://kick.com").href,
            {
                ...this.config,
                body,
            },
            method
        );
    }

    async get(endpoint: string) {
        return await this.request(HTTPMethod.GET, endpoint);
    }

    async post(endpoint: string, body: string) {
        return await this.request(HTTPMethod.POST, endpoint, body);
    }

    async getChannel(channel: string) {
        return await this.get(`api/v2/channels/${channel}`);
    }
}

export const kickApi = new KickApi(cyclesConfig);

exitHook(async () => {
    await kickApi.closeCycles();
});
