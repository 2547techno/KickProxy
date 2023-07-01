import { require } from "./require.js";
const { request } = require("../bin/boringssl.node");
const ssl: (config: Config, _: string, __: string) => SSLResponse = request;

enum HTTPMethod {
    GET,
    POST,
}

interface Config extends DefaultConfig {
    uri: string;
    method: HTTPMethod;
    body: string;
}

interface DefaultConfig {
    host: string;
    headers: string[][];
}

export interface SSLResponse {
    status: number;
    bodyJson: string;
}

export class KickApi {
    private defaultConfig: DefaultConfig;

    constructor() {
        this.defaultConfig = {
            host: "kick.com",
            headers: [
                [
                    "user-agent",
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.51 Safari/537.36",
                ],
            ],
        };
    }

    async request(method: HTTPMethod, endpoint: string, body = "") {
        const config: Config = {
            ...this.defaultConfig,
            uri: new URL(endpoint, "https://kick.com").href,
            method,
            body,
        };

        return await ssl(config, "", "");
    }

    async get(endpoint: string) {
        return await this.request(HTTPMethod.GET, endpoint);
    }

    async post(endpoint: string, body: string) {
        return await this.request(HTTPMethod.POST, endpoint, body);
    }
}
