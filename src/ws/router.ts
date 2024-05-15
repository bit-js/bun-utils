import type { WebSocketHandler, ServerWebSocket as BunServerWebSocket } from 'bun';

export interface ServerWebSocket<T = undefined> extends BunServerWebSocket<T> {
    handlers: Required<WebSocketHandler<T>>;
    server: BunServerWebSocket<T>;
}

export type BaseServerWebSocket = ServerWebSocket<any>;

interface RouterData {
    data: any;
    handlers: BaseServerWebSocket['handlers'];
    server: ServerWebSocket<any>;
}

/**
 * WebSocket router
 */
export class Router implements WebSocketHandler<RouterData> {
    public constructor(options?: WebSocketHandler<any>) {
        if (typeof options !== 'undefined') {
            for (const key in options)
                // @ts-expect-error Assign WebSocket options
                // eslint-disable-next-line
                this[key] = options[key];
        }
    }

    public open(ws: ServerWebSocket<RouterData>): void {
        const { data } = ws;
        ws.handlers = data.handlers;
        ws.data = data.data;
        ws.server = data.server;

        // eslint-disable-next-line
        data.handlers.open(ws);
    }

    public message(ws: BaseServerWebSocket, message: any): void {
        // eslint-disable-next-line
        ws.handlers.message(ws, message);
    }

    public ping(ws: BaseServerWebSocket, data: any): void {
        // eslint-disable-next-line
        ws.handlers.ping(ws, data);
    }

    public pong(ws: BaseServerWebSocket, data: any): void {
        // eslint-disable-next-line
        ws.handlers.pong(ws, data);
    }

    public close(ws: BaseServerWebSocket, code: any, reason: any): void {
        // eslint-disable-next-line
        ws.handlers.close(ws, code, reason);
    }

    public drain(ws: BaseServerWebSocket): void {
        // eslint-disable-next-line
        ws.handlers.drain(ws);
    }
}

