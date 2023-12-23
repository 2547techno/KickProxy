class Logger {
    log(category: string, message: string) {
        console.log(`[${category}]`, message);
    }
}

export const logger = new Logger();
