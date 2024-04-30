# `bun-utils`
An utilities library for Bun.

## WebSocket router
A WebSocket router for Bun.
```ts
import { ws } from '@bit-js/bun-utils';
```

To create a route.
```ts
const route = ws.route<{ id: string }>({
    message(ws) {
        ws.send(ws.data.id);
    }
})
```

Use in a request handler.
```ts
function fetch(req: Request) {
    return route.upgrade(req, { 
        data: { id: performance.now() } 
    });
}
```

Serve the fetch handler (this step creates the server and bind all routes).
```ts
const server = ws.serve({
    // Bun.serve options
    server: { fetch },

    // Bun WebSocket options
    ws: { publishToSelf: true }
});
```

Or with an already created server instance without `ws.serve`.
```ts
ws.bind(server);
```
