import { Router } from './router';
import type { ServerWebSocket } from './router';
import type { Serve, Server, WebSocketHandler } from 'bun';

export interface Handler<T = undefined> {
    message: (ws: ServerWebSocket<T>, message: string | Buffer) => any;
    open?: (ws: ServerWebSocket<T>) => any;
    drain?: (ws: ServerWebSocket<T>) => any;
    close?: (ws: ServerWebSocket<T>, code: number, reason: string) => any;
    ping?: (ws: ServerWebSocket<T>, data: Buffer) => any;
    pong?: (ws: ServerWebSocket<T>, data: Buffer) => any;
}

// eslint-disable-next-line
const noop = () => { };

class Route<T> {
    public readonly handler: Handler<T>;

    // Default data to send if options.data is not specified
    public readonly payload: { handlers: Handler<T> };

    private server!: Server;

    public constructor(handler: Handler<T>) {
        if (typeof handler.open === 'undefined')
            handler.open = noop;
        if (typeof handler.close === 'undefined')
            handler.close = noop;
        if (typeof handler.ping === 'undefined')
            handler.ping = noop;
        if (typeof handler.pong === 'undefined')
            handler.pong = noop;
        if (typeof handler.drain === 'undefined')
            handler.drain = noop;

        this.handler = handler;
        this.payload = { handlers: handler };
    }

    public bind(server: Server): void {
        this.server = server;
    }

    public upgrade(req: Request, options?: {
        headers?: Bun.HeadersInit,
        data?: T
    }): boolean {
        if (typeof options === 'undefined')
            return this.server.upgrade(req);

        if (typeof options.data === 'undefined')
            // @ts-expect-error Assign handlers to upgrade
            options.data = this.payload;
        else
            // @ts-expect-error Assign handlers to upgrade
            options.data = { data: options.data, handlers: this.handler };

        return this.server.upgrade(req, options);
    }
}

/**
 * Store all global routes to bind later
 */
export const routes: Route<any>[] = [];

/**
 * Create a route
 */
export function route<T>(handler: Handler<T>): Route<T> {
    const newRoute = new Route(handler);
    routes.push(newRoute);
    return newRoute;
}

/**
 * Bind all registered handlers to a server
 */
export function bind(server: Server): void {
    for (let i = 0, { length } = routes; i < length; ++i) routes[i].bind(server);
}

/**
 * Start a server and bind all registered handlers to a server
 */
export function serve(options: {
    server: Serve,
    ws?: Partial<WebSocketHandler<any>>
}): Server {
    // @ts-expect-error Assign websocket handler
    options.server.websocket = typeof options.ws === 'undefined' ? new Router() : new Router(options.ws);

    const server = Bun.serve(options.server);
    for (let i = 0, { length } = routes; i < length; ++i) routes[i].bind(server);
    return server;
}

