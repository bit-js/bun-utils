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
    ws: { 
        // Bun WebSocket options
        publishToSelf: true
    }
});
```

Or with an already created server instance without `ws.serve`.
```ts
ws.bind(server);
```

## File system router
A fast file-system router for Bun.
```ts
import { fs } from '@bit-js/bun-utils';

const router = fs.router.create({
    // File glob pattern to search for
    pattern: '**/*',

    // Convert a file path to a route pathname, eg. "./[id].ts" -> "/:id".
    // By default it handles NextJS-style file path.
    style(path) {},

    // Return the data you want to obtain from a file to match later.
    // Defaults to returning a BunFile corresponds to the file path.
    on(path) {}
});

const match = router.scan('./public');

Bun.serve({
    fetch(req) {
        const ctx = match(req);

        ctx.result; // The matching result
        ctx.path; // The pathname without starting slash
        ctx.params; // The parsed path parameters
    }
});
```
