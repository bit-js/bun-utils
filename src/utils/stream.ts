import { file as blob } from 'bun';

/**
 * Stream a file
 */
export function file(path: string): () => Response {
    const target = blob(path);
    return () => new Response(target);
}
