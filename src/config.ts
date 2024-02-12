import { evaluate } from "@pkl-community/pkl-eval"
import { readFileSync } from "fs"
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import path from "path";
const __dirname = dirname(fileURLToPath(import.meta.url));

async function loadConfig() {
    const file = readFileSync(path.join(__dirname, "../config.pkl")).toString()
    // console.log(file)
    return JSON.parse(await evaluate(file, { format: "json" }));
}

export const config = await loadConfig()