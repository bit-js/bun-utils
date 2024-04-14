// @ts-check
import { run, bench, group } from 'mitata';
import { fs } from '..';
import { FileSystemRouter } from 'bun';

for (let i = 0; i < 15; ++i) bench('noop', () => { });

const paths = ['/', '/route', '/notfound'];
const reqs = paths.map(path => new Request('http://localhost:3000' + path));

const dir = `${import.meta.dir}/public`;
const emptyRes = new Response();

function createNativeMatcher() {
    const router = new FileSystemRouter({
        style: 'nextjs', dir
    });

    /**
     * @param {Request} req
     */
    return (req) => {
        const res = router.match(req);
        return res === null ? emptyRes : new Response(res.filePath);
    }
}

function createCustomMatcher() {
    const router = fs.router.create({
        pattern: '**/*',
        on: (path) => path
    });

    const match = router.scan(dir);

    /**
     * @param {Request} req
     */
    return (req) => {
        const { result } = match(req);
        return result === null ? emptyRes : new Response(result);
    }
}

const native = createNativeMatcher();
const custom = createCustomMatcher();

// Validation
for (let i = 0, { length } = paths; i < length; ++i)
    if (await native(reqs[i]).text() !== await custom(reqs[i]).text())
        throw new Error('Something went wrong!');

// Main
group('FS router', () => {
    bench('Native', () => reqs.map(native));
    bench('Custom', () => reqs.map(custom));
});
run();
