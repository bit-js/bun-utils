import { Glob, file, type BunFile, type GlobScanOptions } from 'bun';
import { join } from 'path/posix';

import { internal, Context } from '@bit-js/blitz';

export type Style = (path: string) => string;
export type DefaultStyle = 'basic';
export type GetInfo<T> = (path: string) => T;

export interface RouterOptions<T> {
    style?: DefaultStyle | Style;
    pattern: string;
    on?: GetInfo<T>;
}

/**
 * Default parsing for path
 */
const defaultStyleMap: Record<DefaultStyle, Style> = {
    basic(path) {
        let startBracketIdx = path.indexOf('[');

        // Slice out extension
        if (startBracketIdx === -1) {
            const startPathExt = path.lastIndexOf('.');
            if (startPathExt === -1) return path.endsWith('index') ? path.substring(0, path.length - 5) : path;

            // [47, 105, 110, 100, 101, 120] -> /index
            if (path.charCodeAt(startPathExt - 1) === 120) {
                if (path.charCodeAt(startPathExt - 2) === 101) {
                    if (path.charCodeAt(startPathExt - 3) === 100) {
                        if (path.charCodeAt(startPathExt - 4) === 110) {
                            if (path.charCodeAt(startPathExt - 5) === 105) {
                                if (startPathExt === 5 || path.charCodeAt(startPathExt - 6) === 47)
                                    return path.substring(0, startPathExt - 5);
                            }
                        }
                    }
                }
            }

            return path.substring(0, startPathExt);
        }

        let pathBuilder = '';
        let startIdx = 0;

        do {
            pathBuilder += path.substring(startIdx, startBracketIdx);

            // [...]
            if (path.charCodeAt(startBracketIdx + 1) === 46) {
                if (path.charCodeAt(startBracketIdx + 2) === 46) {
                    if (path.charCodeAt(3) === 46)
                        // eslint-disable-next-line
                        return pathBuilder + '*';
                }
            }

            pathBuilder += ':';

            startIdx = path.indexOf(']', startBracketIdx);
            pathBuilder += path.substring(startBracketIdx + 1, startIdx);

            ++startIdx;
            startBracketIdx = path.indexOf('[', startIdx);
        } while (startBracketIdx !== -1);

        // Slice out extension
        const startPathExt = path.lastIndexOf('.');

        if (startPathExt === -1)
            pathBuilder += path.endsWith('index') ? path.substring(startIdx, path.length - 5) : path.substring(startIdx);

        else if (path.charCodeAt(startPathExt - 1) === 120) {
            if (path.charCodeAt(startPathExt - 2) === 101) {
                if (path.charCodeAt(startPathExt - 3) === 100) {
                    if (path.charCodeAt(startPathExt - 4) === 110) {
                        if (path.charCodeAt(startPathExt - 5) === 105) {
                            if (startPathExt === 5 || path.charCodeAt(startPathExt - 6) === 47)
                                pathBuilder += path.substring(0, startPathExt - 5);
                        }
                    }
                }
            }
        }

        return pathBuilder;
    }
};

/**
 * Scan directory options
 */
export class ScanOptions implements GlobScanOptions {
    public readonly followSymlinks = true;
    public readonly throwErrorOnBrokenSymlink = true;
    public readonly onlyFiles = true;
    public readonly cwd: string;

    public constructor(dir: string) {
        this.cwd = dir;
    }
}

/**
 * Router compile options
 */
const compileOptions = { invokeResultFunction: false };

export class RequestContext<T> extends Context<any> {
    // @ts-expect-error Initialize later
    public result: T | null;
}

class Router<T> {
    public readonly style: Style;
    public readonly glob: Glob;
    public readonly on: GetInfo<T>;

    public constructor({ pattern, style, on }: RouterOptions<T>) {
        this.glob = new Glob(pattern);

        this.style = typeof style === 'undefined'
            ? defaultStyleMap.basic
            : typeof style === 'string' ?
                defaultStyleMap[style]
                : style;

        // @ts-expect-error Type will not match if an info is not provided and T is specified with a different type
        this.on = on ?? file;
    }

    /**
     * Scan a directory and returns a matching function
     */
    public scan(cwd: string = '.'): (req: Request) => RequestContext<T> {
        const { on, glob, style } = this;

        const router = new internal.Radix<T>();
        for (const path of glob.scanSync(new ScanOptions(cwd))) router.put(style(path), on(join(cwd, path)));

        const match = router.buildMatcher(compileOptions, null);

        return (req: Request) => {
            const ctx = new RequestContext<T>(req);
            ctx.result = match(ctx);
            return ctx;
        };
    }
}

/**
 * Create a fast file system router
 */
export function create<T = BunFile>(options: RouterOptions<T>): Router<T> {
    return new Router(options);
}
