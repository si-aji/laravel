import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MultipartUpload, formatBytes, formatDuration } from '../../resources/js/Components/VideoUpload/MultipartUpload.js';

const file = () => new File([new Uint8Array(10)], 'lesson.mp4', { type: 'video/mp4', lastModified: 1 });
const session = { id: 'upload', video_id: 'video', part_size: 2, part_count: 5, complete_url: '/complete', resume_url: '/resume', part_url: '/part/__PART__', cancel_url: '/cancel' };
const metadata = { title: 'Lesson', description: '' };
const next = () => new Promise((resolve) => setImmediate(resolve));

function harness(overrides = {}) {
    const calls = [];
    const api = {
        async post(url, data) {
            calls.push({ url, data });
            if (url === '/adm/video-uploads') return { data: session };
            if (url === '/complete') return { data: { edit_url: '/edit' } };
            return { data: { url: `https://storage.example.test${url}?signature=secret`, headers: {} } };
        },
        async get() { return { data: { ...session, parts: [] } }; },
        async delete() { calls.push({ url: '/cancel' }); },
    };
    const store = new Map();
    const storage = { getItem: (key) => store.get(key), setItem: (key, value) => store.set(key, value), removeItem: (key) => store.delete(key) };
    const engine = new MultipartUpload({
        api, storage, key: 'test', sleep: async () => {},
        sendPart: async (url, headers, blob, progress) => { progress(blob.size); return `"${url.split('?')[0]}"`; },
        ...overrides,
    });
    return { engine, api, calls, store, storage };
}

test('uploads bounded parallel parts, preserves ordered ETags, and verifies before success', async () => {
    let active = 0;
    let maximum = 0;
    const { engine, calls, store } = harness({
        sendPart: async (url, headers, blob, progress) => {
            active++; maximum = Math.max(maximum, active);
            progress(blob.size); await next(); active--;
            return `"${url.split('/').pop().split('?')[0]}"`;
        },
    });
    await engine.start(file(), metadata);
    assert.equal(engine.state.phase, 'complete');
    assert.equal(engine.state.transferred, 10);
    assert(maximum <= 3 && maximum > 1);
    assert.deepEqual(calls.find((call) => call.url === '/complete').data.parts.map((part) => part.part_number), [1, 2, 3, 4, 5]);
    assert.equal(store.size, 0);
});

test('retries failed parts with fresh signatures, up to three attempts', async () => {
    const tries = new Map();
    const { engine, calls } = harness({
        sendPart: async (url, headers, blob, progress) => {
            const attempts = (tries.get(url) || 0) + 1; tries.set(url, attempts);
            progress(1);
            if (attempts < 3) throw new Error('Connection lost');
            progress(blob.size);
            return '"ok"';
        },
    });
    await engine.start(file(), metadata);
    assert.equal(engine.state.phase, 'complete');
    assert.equal(calls.filter((call) => call.url.startsWith('/part/')).length, 15);
    assert.equal(engine.state.transferred, 10);
});

test('failed verification stays retriable and does not reupload confirmed parts', async () => {
    const { engine, api, calls } = harness();
    const original = api.post;
    let completions = 0;
    api.post = async (url, data) => {
        if (url === '/complete' && completions++ === 0) throw new Error('Response lost');
        return original(url, data);
    };
    await engine.start(file(), metadata);
    assert.equal(engine.state.phase, 'error');
    const signed = calls.filter((call) => call.url.startsWith('/part/')).length;
    await engine.retry();
    assert.equal(engine.state.phase, 'complete');
    assert.equal(calls.filter((call) => call.url.startsWith('/part/')).length, signed);
});

test('pause aborts in-flight parts and does not complete or start more parts', async () => {
    let started = 0;
    const { engine, calls, store } = harness({
        sendPart: (url, headers, blob, progress, signal) => new Promise((resolve, reject) => {
            started++; progress(1);
            signal.addEventListener('abort', () => reject(new Error('aborted')));
        }),
    });
    const pending = engine.start(file(), metadata);
    await next();
    engine.pause();
    await pending;
    assert.equal(engine.state.phase, 'paused');
    assert.equal(started, 3);
    assert.equal(engine.state.transferred, 0);
    assert(!calls.some((call) => call.url === '/complete'));
    assert(!store.get('test').includes('signature=secret'));
});

test('leaving the workspace during initiation never starts transfers after the response arrives', async () => {
    const { engine, api, calls, store } = harness();
    let release;
    api.post = async (url) => {
        calls.push({ url });
        return new Promise((resolve) => { release = resolve; });
    };
    const pending = engine.start(file(), metadata);
    engine.dispose();
    release({ data: session });
    await pending;
    assert.equal(calls.length, 1);
    assert.equal(engine.file, null);
    assert.equal(JSON.parse(store.get('test')).session.id, 'upload');
});

test('resume trusts server-confirmed parts and uploads only the missing parts', async () => {
    const { engine, api, calls } = harness();
    engine.file = file();
    engine.state = { ...engine.state, ...metadata, session, filename: file().name, size: 10, phase: 'paused' };
    api.get = async () => ({ data: { ...session, parts: [{ part_number: 1, etag: '"one"' }, { part_number: 3, etag: '"three"' }] } });
    await engine.retry();
    assert.equal(engine.state.phase, 'complete');
    assert.deepEqual(calls.filter((call) => call.url.startsWith('/part/')).map((call) => call.url).sort(), ['/part/2', '/part/4', '/part/5']);
});

test('interrupted upload restores only metadata, requires matching file, and has independent account storage', async () => {
    const { engine, storage, store } = harness();
    engine.publish({ phase: 'paused', filename: 'lesson.mp4', size: 10, mime_type: 'video/mp4', last_modified: 1, session });
    const restored = new MultipartUpload({ storage, key: 'test' });
    assert.equal(restored.state.phase, 'interrupted');
    assert.equal(restored.file, undefined);
    await assert.rejects(() => restored.resumeWithFile(new File(['bad'], 'wrong.mp4')), /original/);
    assert.equal(new MultipartUpload({ storage, key: 'other-admin' }).state.phase, 'idle');
    assert(!store.get('test').includes('signature=secret'));
});

test('cancellation failure retains the session and allows retry', async () => {
    const { engine, api, store } = harness();
    engine.publish({ phase: 'paused', filename: 'lesson.mp4', size: 10, session });
    api.delete = async () => { throw new Error('offline'); };
    await engine.cancel();
    assert.equal(engine.state.phase, 'error');
    assert(engine.state.session);
    assert(store.has('test'));
    api.delete = async () => {};
    await engine.cancel();
    assert.equal(engine.state.phase, 'cancelled');
    assert.equal(store.size, 0);
});

test('a removed upload can be dismissed instead of trapping the user in a retry loop', async () => {
    const { engine, api } = harness();
    engine.publish({ phase: 'paused', filename: 'lesson.mp4', size: 10, session });
    api.delete = async () => { throw { response: { status: 404 } }; };
    await engine.cancel();
    assert.equal(engine.state.unavailable, true);
    assert.equal(engine.state.session, null);
    engine.clear();
    assert.equal(engine.state.phase, 'idle');
});

test('progress metrics use bytes over a rolling window and remain finite across idle periods', () => {
    let time = 1000;
    const { engine } = harness({ now: () => time });
    engine.state = { ...engine.state, phase: 'uploading', size: 1000, transferred: 500, startedAt: 1000 };
    engine.samples = [{ time: 1000, bytes: 0 }];
    engine.wireBytes = 500; time = 2000; engine.tick();
    assert.equal(engine.state.speed, 500);
    assert.equal(engine.state.remaining, 1);
    for (let i = 0; i < 10; i++) { time += 1000; engine.wireBytes += 10; engine.tick(); }
    assert(engine.state.speed > 0);
    engine.publish({ phase: 'paused' }); engine.tick();
    assert.equal(engine.state.speed, 0);
    assert.equal(engine.state.remaining, null);
    assert.equal(formatDuration(null), 'Estimating…');
    assert.equal(formatBytes(1024), '1.0 KiB');
});
