import { require } from "./require.js";
const { request: ssl } = require("../bin/boringssl.node")

export class KickApi {
    #defaultConfig;

    constructor() {
        this.defaultConfig = {
            host: "kick.com",
            headers: [
              [
                "user-agent",
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.51 Safari/537.36",
              ],
            ]
        };
    }

    async request(method, endpoint, body = "") {
        const config = {
            ...this.defaultConfig,
            uri:  new URL(endpoint, "https://kick.com").href,
            method,
            body
        }
        
        return await ssl(config, "", "")
    }

    async get(endpoint) {
        return await this.request("GET", endpoint)
    }

    async post(endpoint, body) {
        return await this.request("POST", endpoint, body)
    }
}