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
    public readonly handlers: Handler<T>;
    public readonly data: { data: any };

    private server!: Server;

    public constructor(handlers: Handler<T>) {
        if (typeof handlers.open === 'undefined')
            handlers.open = noop;
        if (typeof handlers.close === 'undefined')
            handlers.close = noop;
        if (typeof handlers.ping === 'undefined')
            handlers.ping = noop;
        if (typeof handlers.pong === 'undefined')
            handlers.pong = noop;
        if (typeof handlers.drain === 'undefined')
            handlers.drain = noop;

        this.handlers = handlers;
        this.data = { data: this };
    }

    public bind(server: Server): void {
        this.server = server;
    }

    public upgrade(req: Request, options?: {
        headers?: Bun.HeadersInit,
        data?: T
    }): boolean {
        if (typeof options === 'undefined')
            return this.server.upgrade(req, this.data);

        if (typeof options.data === 'undefined')
            // @ts-expect-error Assign handlers to upgrade
            options.data = this;
        else {
            // @ts-expect-error Assign handlers to upgrade
            options.data = {
                data: options.data,
                handlers: this.handlers,
                server: this.server
            };
        }

        return this.server.upgrade(req, options);
    }
}

export class WebSocketRouter {
    /**
     * Store all global routes to bind later
     */
    public readonly routes: Route<any>[] = [];

    /**
     * Create a route
     */
    public route<T>(handler: Handler<T>): Route<T> {
        const newRoute = new Route(handler);
        this.routes.push(newRoute);
        return newRoute;
    }

    /**
     * Bind all registered handlers to a server
     */
    public bind(server: Server): void {
        const { routes } = this;
        for (let i = 0, { length } = routes; i < length; ++i) routes[i].bind(server);
    }

    /**
     * Start a server and bind all registered handlers to a server
     */
    public serve(options: {
        server: Serve,
        ws?: Partial<WebSocketHandler<any>>
    }): Server {
        // @ts-expect-error Assign websocket handler
        options.server.websocket = typeof options.ws === 'undefined' ? new Router() : new Router(options.ws);

        const server = Bun.serve(options.server);

        const { routes } = this;
        for (let i = 0, { length } = routes; i < length; ++i) routes[i].bind(server);
        return server;
    }

    // eslint-disable-next-line
    static Router = WebSocketRouter;
}

export default new WebSocketRouter();
