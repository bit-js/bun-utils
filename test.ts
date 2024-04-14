import { fs } from '.';

const match = fs.router.create({
    pattern: '**/*'
}).scan('./src');

Bun.serve({
    fetch(req) {
        return new Response(match(req).result);
    }
});
