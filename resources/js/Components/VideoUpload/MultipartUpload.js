import axios from 'axios';

export const web = axios.create({ headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' } });

export function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes < 0) return '0 B';
    const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
    const power = Math.min(Math.floor(Math.log(Math.max(bytes, 1)) / Math.log(1024)), units.length - 1);
    return `${(bytes / 1024 ** power).toFixed(power === 0 ? 0 : 1)} ${units[power]}`;
}

export function formatDuration(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return 'Estimating…';
    const total = Math.ceil(seconds);
    if (total < 60) return `${total}s`;
    return `${Math.floor(total / 60)}m ${total % 60}s`;
}

export function transferPart(url, headers, blob, onProgress, signal) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', url);
        Object.entries(headers).forEach(([key, value]) => xhr.setRequestHeader(key, value));
        const abort = () => xhr.abort();
        const finish = (callback, value) => {
            signal.removeEventListener('abort', abort);
            callback(value);
        };
        xhr.upload.onprogress = (event) => onProgress(Math.min(event.loaded, blob.size));
        xhr.onload = () => {
            if (xhr.status < 200 || xhr.status >= 300) return finish(reject, new Error('A video part could not be uploaded.'));
            const etag = xhr.getResponseHeader('ETag');
            if (!etag) return finish(reject, new Error('Storage did not expose ETag. Check the bucket CORS settings before retrying.'));
            finish(resolve, etag);
        };
        xhr.onerror = () => finish(reject, new Error('Storage could not be reached. Check your connection and bucket CORS settings.'));
        xhr.onabort = () => finish(reject, new DOMException('Upload paused', 'AbortError'));
        signal.addEventListener('abort', abort, { once: true });
        if (signal.aborted) return finish(reject, new DOMException('Upload paused', 'AbortError'));
        xhr.send(blob);
    });
}

function message(error) {
    if (error.response?.status === 401 || error.response?.status === 419) return 'Your session expired. Sign in again, then reselect the same file to resume.';
    return error.response?.data?.message || error.message || 'The upload did not finish. Try again.';
}

export class MultipartUpload {
    constructor({ api = web, sendPart = transferPart, storage = null, key = '', now = () => Date.now(), sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)) } = {}) {
        this.api = api;
        this.sendPart = sendPart;
        this.storage = storage;
        this.key = key;
        this.now = now;
        this.sleep = sleep;
        this.listeners = new Set();
        this.controllers = new Set();
        this.parts = new Map();
        this.progress = new Map();
        this.generation = 0;
        this.disposed = false;
        this.samples = [];
        this.wireBytes = 0;
        this.state = { phase: 'idle', transferred: 0, elapsed: 0, speed: 0, remaining: null, error: null };
        try {
            const saved = JSON.parse(storage?.getItem(key) || 'null');
            if (saved && saved.filename && saved.size > 0) {
                this.state = { ...this.state, ...saved, phase: 'interrupted', needsFile: true };
                this.parts = new Map(saved.parts || []);
            }
        } catch { /* An unavailable browser store must not prevent uploads. */ }
    }

    subscribe = (listener) => {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    };

    snapshot = () => this.state;

    publish(update = {}) {
        this.state = { ...this.state, ...update };
        try {
            if (['idle', 'complete', 'cancelled'].includes(this.state.phase) || this.state.unavailable) {
                this.storage?.removeItem(this.key);
            } else {
                this.storage?.setItem(this.key, JSON.stringify({
                    filename: this.state.filename, size: this.state.size, mime_type: this.state.mime_type,
                    last_modified: this.state.last_modified, startedAt: this.state.startedAt,
                    session: this.state.session, metadata: this.state.metadata, requestId: this.state.requestId,
                    parts: [...this.parts], transferred: this.state.transferred,
                }));
            }
        } catch { /* Uploads remain usable when browser storage is disabled or full. */ }
        this.listeners.forEach((listener) => listener());
    }

    tick() {
        if (!this.state.startedAt) return;
        const now = this.now();
        this.samples = this.samples.filter((sample) => now - sample.time < 6000);
        const first = this.samples[0];
        const speed = this.state.phase === 'uploading' && first && now > first.time
            ? Math.max(0, (this.wireBytes - first.bytes) * 1000 / (now - first.time)) : 0;
        this.samples.push({ time: now, bytes: this.wireBytes });
        this.publish({
            elapsed: Math.max(0, (now - this.state.startedAt) / 1000),
            speed,
            remaining: speed > 0 ? Math.max(0, (this.state.size - this.state.transferred) / speed) : null,
        });
    }

    async start(file, metadata) {
        if (!['idle', 'complete', 'cancelled'].includes(this.state.phase)) throw new Error('Finish or cancel the current upload first.');
        this.file = file;
        this.wireBytes = 0;
        this.parts.clear();
        this.progress.clear();
        this.publish({
            phase: 'starting', filename: file.name, size: file.size, mime_type: file.type,
            last_modified: file.lastModified, startedAt: this.now(), transferred: 0,
            elapsed: 0, speed: 0, remaining: null,
            metadata, requestId: crypto.randomUUID(), session: null, error: null, needsFile: false,
            unavailable: false,
        });
        return this.begin();
    }

    async begin() {
        if (this.disposed) return;
        try {
            if (!this.state.session) {
                this.publish({ phase: 'starting', error: null });
                const { data } = await this.api.post('/adm/video-uploads', {
                    request_id: this.state.requestId, filename: this.state.filename, size: this.state.size,
                    mime_type: this.state.mime_type, ...this.state.metadata,
                });
                this.publish({ session: data });
            }
            if (this.disposed) return;
            return await this.run();
        } catch (error) {
            this.fail(error);
        }
    }

    async resumeWithFile(file, existing = null) {
        if (existing) {
            if (!['idle', 'complete', 'cancelled'].includes(this.state.phase)) throw new Error('Finish or cancel the current upload first.');
            this.parts.clear();
            this.publish({
                filename: existing.filename, size: existing.size, mime_type: existing.mime_type, last_modified: null,
                metadata: { title: existing.title || existing.filename, description: existing.description || '' },
                startedAt: this.now(), session: { ...existing, resume_url: `/adm/video-uploads/${existing.id}` },
            });
        }
        if (file.name !== this.state.filename || file.size !== this.state.size || (file.type && file.type !== this.state.mime_type)
            || (this.state.last_modified != null && file.lastModified !== this.state.last_modified)) {
            throw new Error('Select the original, unchanged file with the same name, size, and modification date.');
        }
        this.file = file;
        this.publish({ needsFile: false, error: null, phase: 'paused' });
        return this.retry();
    }

    async retry() {
        if (this.disposed) return;
        if (this.state.unavailable) return;
        if (!this.file) return this.publish({ needsFile: true, phase: 'interrupted' });
        if (!this.state.session) return this.begin();
        if (this.parts.size === this.state.session.part_count) return this.finish();
        try {
            this.publish({ phase: 'resuming', error: null });
            const { data } = await this.api.get(this.state.session.resume_url);
            this.parts = new Map(data.parts.map((part) => [part.part_number, part.etag]));
            this.publish({ session: data });
            if (this.disposed) return;
            return await this.run();
        } catch (error) {
            this.fail(error);
        }
    }

    countBytes() {
        const session = this.state.session;
        const confirmed = [...this.parts.keys()].reduce((total, part) => total + Math.min(session.part_size, this.state.size - (part - 1) * session.part_size), 0);
        return Math.min(this.state.size, confirmed + [...this.progress.values()].reduce((total, bytes) => total + bytes, 0));
    }

    async run() {
        if (this.disposed) return;
        const generation = ++this.generation;
        this.progress.clear();
        this.samples = [{ time: this.now(), bytes: this.wireBytes }];
        this.publish({ phase: 'uploading', error: null, transferred: this.countBytes() });
        const session = this.state.session;
        const queue = Array.from({ length: session.part_count }, (_, index) => index + 1).filter((part) => !this.parts.has(part));
        const worker = async () => {
            while (queue.length && generation === this.generation) {
                const part = queue.shift();
                const blob = this.file.slice((part - 1) * session.part_size, Math.min(part * session.part_size, this.state.size));
                let etag;
                for (let attempt = 0; attempt < 3; attempt++) {
                    if (generation !== this.generation) return;
                    this.progress.set(part, 0);
                    try {
                        const { data: signed } = await this.api.post(session.part_url.replace('__PART__', part));
                        if (generation !== this.generation) return;
                        const controller = new AbortController();
                        this.controllers.add(controller);
                        try {
                            etag = await this.sendPart(signed.url, signed.headers, blob, (bytes) => {
                                if (generation !== this.generation) return;
                                this.wireBytes += Math.max(0, bytes - (this.progress.get(part) || 0));
                                this.progress.set(part, bytes);
                                this.publish({ transferred: this.countBytes() });
                            }, controller.signal);
                        } finally {
                            this.controllers.delete(controller);
                        }
                        break;
                    } catch (error) {
                        this.progress.delete(part);
                        if (generation !== this.generation) return;
                        if (attempt === 2 || [401, 404, 419].includes(error.response?.status)) throw error;
                        await this.sleep(500 * 2 ** attempt);
                    }
                }
                if (generation !== this.generation) return;
                this.progress.delete(part);
                this.parts.set(part, etag);
                this.publish({ transferred: this.countBytes() });
            }
        };
        try {
            await Promise.all(Array.from({ length: Math.min(3, queue.length) }, worker));
            if (generation === this.generation) return await this.finish();
        } catch (error) {
            if (generation !== this.generation) return;
            this.stopTransfers();
            this.publish({ transferred: this.countBytes() });
            this.fail(error);
        }
    }

    async finish() {
        this.publish({ phase: 'verifying', error: null, transferred: this.state.size });
        try {
            const { data } = await this.api.post(this.state.session.complete_url, {
                parts: [...this.parts].sort(([a], [b]) => a - b).map(([part_number, etag]) => ({ part_number, etag })),
            });
            this.publish({
                phase: 'complete',
                edit_url: data.edit_url,
                stream_status: data.stream_status ?? null,
                speed: 0,
                remaining: 0,
            });
            this.file = null;
        } catch (error) {
            this.fail(error, 'Transfer finished, but verification did not finish. ');
        }
    }

    stopTransfers() {
        this.generation++;
        this.controllers.forEach((controller) => controller.abort());
        this.controllers.clear();
        this.progress.clear();
    }

    dispose() {
        this.disposed = true;
        this.stopTransfers();
        this.file = null;
    }

    pause() {
        if (this.state.phase !== 'uploading') return;
        this.stopTransfers();
        this.publish({ phase: 'paused', transferred: this.countBytes(), speed: 0, remaining: null });
    }

    async cancel() {
        if (!this.state.session || !['paused', 'error', 'interrupted', 'uploading'].includes(this.state.phase)) return;
        this.stopTransfers();
        this.publish({ phase: 'cancelling', error: null });
        try {
            await this.api.delete(this.state.session.cancel_url);
            this.file = null;
            this.parts.clear();
            this.publish({ phase: 'cancelled', session: null, speed: 0, remaining: null });
        } catch (error) {
            this.fail(error, 'Cancellation did not finish. ');
        }
    }

    fail(error, prefix = '') {
        if (error.response?.status === 404) {
            this.stopTransfers();
            this.publish({
                phase: 'error', session: null, unavailable: true, needsFile: false,
                error: 'This upload no longer exists or is no longer accessible. Check the library, then dismiss this upload to start another.',
            });
            return;
        }
        this.publish({ phase: 'error', error: prefix + message(error) });
    }

    clear() {
        if (!['complete', 'cancelled', 'error', 'interrupted'].includes(this.state.phase)
            || (['error', 'interrupted'].includes(this.state.phase) && this.state.session)) return;
        this.file = null;
        this.parts.clear();
        this.publish({ session: null });
        this.publish({ phase: 'idle', error: null });
    }
}
