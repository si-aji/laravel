import { Head, useForm } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

const api = '/adm/videos';
const pageSize = 10;

async function requestJson(url, options = {}) {
    const response = await fetch(url, {
        credentials: 'same-origin',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            ...options.headers,
        },
        ...options,
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
        const error = new Error(
            payload.reference
                ? `${payload.message ?? 'The request could not be completed.'} (Reference: ${payload.reference})`
                : payload.message ?? 'The request could not be completed.',
        );
        error.errors = payload.errors ?? {};
        throw error;
    }

    return payload.data;
}

function formatBytes(bytes) {
    if (bytes < 1024) {
        return `${Math.round(bytes)} B`;
    }

    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(seconds) {
    if (seconds === null || !Number.isFinite(seconds) || seconds < 0) {
        return 'Calculating…';
    }

    const roundedSeconds = Math.ceil(seconds);
    const hours = Math.floor(roundedSeconds / 3600);
    const minutes = Math.floor((roundedSeconds % 3600) / 60);
    const remainingSeconds = roundedSeconds % 60;

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }

    if (minutes > 0) {
        return `${minutes}m ${remainingSeconds}s`;
    }

    return `${remainingSeconds}s`;
}

function uploadPartWithProgress({ url, body, headers, onProgress, signal }) {
    return new Promise((resolve, reject) => {
        const request = new XMLHttpRequest();
        request.open('PUT', url);

        const abortRequest = () => request.abort();
        if (signal?.aborted) {
            reject(new DOMException('The upload part was interrupted.', 'AbortError'));
            return;
        }
        signal?.addEventListener('abort', abortRequest, { once: true });

        Object.entries(headers ?? {}).forEach(([name, value]) => {
            request.setRequestHeader(name, value);
        });

        request.upload.addEventListener('progress', (event) => {
            onProgress(event.loaded, event.lengthComputable ? event.total : null);
        });

        request.addEventListener('load', () => {
            if (request.status < 200 || request.status >= 300) {
                signal?.removeEventListener('abort', abortRequest);
                reject(new Error('A video part could not be uploaded. Try again or cancel the upload.'));
                return;
            }

            signal?.removeEventListener('abort', abortRequest);
            resolve(request.getResponseHeader('ETag'));
        });

        request.addEventListener('error', () => {
            signal?.removeEventListener('abort', abortRequest);
            reject(new Error('The video part could not reach storage. Check your connection and try again.'));
        });

        request.addEventListener('abort', () => {
            signal?.removeEventListener('abort', abortRequest);
            reject(new DOMException('The upload part was interrupted.', 'AbortError'));
        });

        request.send(body);
    });
}

function formatDate(value) {
    if (!value) {
        return 'Date unavailable';
    }

    return new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(new Date(value));
}

function statusLabel(status) {
    return status.replaceAll('_', ' ');
}

export default function AdminDashboard({ account }) {
    const { post, processing } = useForm();
    const fileInput = useRef(null);
    const uploadFormRef = useRef(null);
    const uploadStartedAtRef = useRef(null);
    const uploadedBytesRef = useRef(0);
    const previousSpeedSampleRef = useRef({ at: 0, uploaded: 0 });
    const uploadProgressTimerRef = useRef(null);
    const activePartAbortControllerRef = useRef(null);
    const completedPartsRef = useRef([]);
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [progress, setProgress] = useState(null);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortOrder, setSortOrder] = useState('newest');
    const [page, setPage] = useState(1);
    const [editingVideo, setEditingVideo] = useState(null);
    const [editTitle, setEditTitle] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [savingVideo, setSavingVideo] = useState(false);
    const [deletingVideoId, setDeletingVideoId] = useState(null);
    const [, setUploadId] = useState(null);
    const [videoToDelete, setVideoToDelete] = useState(null);
    const dialogRef = useRef(null);
    const dialogTriggerRef = useRef(null);
    const currentUploadIdRef = useRef(null);
    const activeUploadSessionRef = useRef(null);

    useEffect(() => {
        let active = true;

        requestJson(api, { method: 'GET' })
            .then((items) => {
                if (active) {
                    setVideos(items ?? []);
                }
            })
            .catch(() => {
                    if (active) {
                        setLoadError('Unable to load videos. Refresh the page to try again.');
                    }
            })
            .finally(() => {
                if (active) {
                    setLoading(false);
                }
            });

        return () => {
            active = false;
        };
    }, []);

    useEffect(() => () => {
        if (uploadProgressTimerRef.current !== null) {
            window.clearInterval(uploadProgressTimerRef.current);
        }
    }, []);

    useEffect(() => {
        if (editingVideo || videoToDelete) {
            const previousFocus = document.activeElement;
            const dialog = dialogRef.current;
            const focusableSelector = 'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href]';
            const focusableElements = dialog?.querySelectorAll(focusableSelector) ?? [];
            const firstFocusable = focusableElements[0];
            const lastFocusable = focusableElements[focusableElements.length - 1];

            firstFocusable?.focus();

            function handleKeyDown(event) {
                if (event.key === 'Escape') {
                    if (savingVideo || deletingVideoId) {
                        return;
                    }
                    setEditingVideo(null);
                    setVideoToDelete(null);
                    return;
                }

                if (
                    event.key === 'Tab'
                    && (event.target === document.activeElement)
                    && !dialog?.contains(event.target)
                ) {
                    event.preventDefault();
                    firstFocusable?.focus();
                    return;
                }

                if (event.key !== 'Tab' || focusableElements.length === 0) {
                    return;
                }

                if (event.shiftKey && document.activeElement === firstFocusable) {
                    event.preventDefault();
                    lastFocusable?.focus();
                } else if (!event.shiftKey && document.activeElement === lastFocusable) {
                    event.preventDefault();
                    firstFocusable?.focus();
                }
            }

            document.addEventListener('keydown', handleKeyDown);

            return () => {
                document.removeEventListener('keydown', handleKeyDown);
                const dialogIsClosing = !editingVideo && !videoToDelete;
                if (
                    dialogIsClosing
                    && previousFocus instanceof HTMLElement
                    && previousFocus.isConnected
                    && previousFocus !== document.body
                ) {
                    previousFocus.focus();
                }
            };
        }

        return undefined;
    }, [editingVideo, videoToDelete, savingVideo, deletingVideoId]);

    function signOut(event) {
        event.preventDefault();
        post('/adm/sign-out');
    }

    async function uploadVideo(event) {
        event.preventDefault();
        const file = fileInput.current?.files?.[0];
        if (!file) {
            setError('Choose a video file to upload.');
            return;
        }

        setBusy(true);
        setError('');
        setMessage('');
        setProgress({
            uploaded: 0,
            total: file.size,
            percent: 0,
            elapsedSeconds: 0,
            remainingSeconds: null,
            bytesPerSecond: 0,
        });
        uploadStartedAtRef.current = Date.now();
        uploadedBytesRef.current = 0;
        previousSpeedSampleRef.current = { at: uploadStartedAtRef.current, uploaded: 0 };
        completedPartsRef.current = [];
        currentUploadIdRef.current = null;
        activeUploadSessionRef.current = null;
        if (uploadProgressTimerRef.current !== null) {
            window.clearInterval(uploadProgressTimerRef.current);
        }

        try {
            const session = await requestJson(`${api}/uploads`, {
                method: 'POST',
                body: JSON.stringify({
                    filename: file.name,
                    mime_type: file.type,
                    size: file.size,
                }),
            });
            const uploadId = session.id;
            activeUploadSessionRef.current = session;
            currentUploadIdRef.current = uploadId;
            setUploadId(uploadId);
            await continueUpload(file, uploadId);
        } catch (uploadError) {
            setError(uploadError.message);
        } finally {
            setBusy(false);
        }
    }

    async function continueUpload(file, activeUploadId) {
        try {
            if (currentUploadIdRef.current !== activeUploadId) {
                return;
            }

            const originalSession = activeUploadSessionRef.current;
            if (!originalSession?.part_size || !originalSession?.part_count) {
                throw new Error('The upload session is unavailable. Cancel this upload and select the file again.');
            }

            const resumeState = await requestJson(`${api}/uploads/${activeUploadId}`, {
                method: 'GET',
            });
            if (currentUploadIdRef.current !== activeUploadId) {
                return;
            }

            const session = { ...originalSession, ...resumeState };
            if (
                !Number.isInteger(session.part_size)
                || session.part_size <= 0
                || !Number.isInteger(session.part_count)
                || session.part_count <= 0
                || session.part_count !== Math.ceil(file.size / session.part_size)
            ) {
                throw new Error('The upload session is missing its part details. Cancel it and start again.');
            }

            const uploadedParts = session.parts ?? [];
            if (
                uploadedParts.some((part) => !Number.isInteger(part.part_number)
                    || part.part_number < 1
                    || part.part_number > session.part_count
                    || typeof part.etag !== 'string'
                    || part.etag === '')
            ) {
                throw new Error('Storage returned invalid completed-part details. Try resuming again or cancel the upload.');
            }

            const uploadedPartNumbers = new Set(uploadedParts.map((part) => part.part_number));
            completedPartsRef.current = [...uploadedParts];
            uploadedBytesRef.current = uploadedParts.reduce((total, part) => (
                total + Math.min(session.part_size, Math.max(file.size - ((part.part_number - 1) * session.part_size), 0))
            ), 0);
            updateUploadProgress(uploadedBytesRef.current, file.size);

            for (let partNumber = 1; partNumber <= session.part_count; partNumber += 1) {
                const start = (partNumber - 1) * session.part_size;
                const end = Math.min(start + session.part_size, file.size);
                if (uploadedPartNumbers.has(partNumber)) {
                    continue;
                }

                const partStartBytes = uploadedBytesRef.current;
                const part = await requestJson(`${api}/uploads/${activeUploadId}/parts`, {
                    method: 'POST',
                    body: JSON.stringify({ part_number: partNumber }),
                });
                if (currentUploadIdRef.current !== activeUploadId) {
                    break;
                }

                activePartAbortControllerRef.current = new AbortController();
                let etag;
                try {
                    etag = await uploadPartWithProgress({
                        url: part.url,
                        body: file.slice(start, end),
                        headers: part.headers,
                        signal: activePartAbortControllerRef.current.signal,
                        onProgress: (partLoadedBytes, partTotalBytes) => {
                            const loadedPartContribution = partTotalBytes && partTotalBytes > 0
                                ? Math.round((partLoadedBytes / partTotalBytes) * (end - start))
                                : 0;
                            updateUploadProgress(partStartBytes + loadedPartContribution, file.size, true);
                        },
                    });
                } catch (partError) {
                    throw partError;
                } finally {
                    activePartAbortControllerRef.current = null;
                }

                if (!etag) {
                    throw new Error('The storage service did not return an ETag. Check bucket CORS settings.');
                }

                uploadedBytesRef.current = end;
                updateUploadProgress(end, file.size);
                completedPartsRef.current.push({ part_number: partNumber, etag });
            }

            if (currentUploadIdRef.current !== activeUploadId) {
                return;
            }

            if (completedPartsRef.current.length !== session.part_count) {
                throw new Error('Some video parts are still missing. Resume the upload to retry them.');
            }

            const completed = await requestJson(`${api}/uploads/${activeUploadId}/complete`, {
                method: 'POST',
                body: JSON.stringify({ parts: completedPartsRef.current }),
            });

            setVideos((current) => [completed, ...current]);
            setSearch('');
            setStatusFilter('all');
            setSortOrder('newest');
            setPage(1);
            uploadFormRef.current?.reset();
            uploadedBytesRef.current = file.size;
            updateUploadProgress(file.size, file.size, true);
            setMessage('Video uploaded.');
            currentUploadIdRef.current = null;
            activeUploadSessionRef.current = null;
            setUploadId(null);
        } catch (uploadError) {
            if (currentUploadIdRef.current === activeUploadId) {
                setError(uploadError.message);
            }
            throw uploadError;
        } finally {
            setBusy(false);
        }
    }

    function updateUploadProgress(uploadedBytes, totalBytes, shouldUpdateTime = false) {
        const startedAt = uploadStartedAtRef.current;
        if (!startedAt) {
            return;
        }

        const elapsedSeconds = Math.max((Date.now() - startedAt) / 1000, 0.001);
        const bytesPerSecond = uploadedBytes / elapsedSeconds;
        const remainingBytes = Math.max(totalBytes - uploadedBytes, 0);
        let currentSpeed = bytesPerSecond;
        if (shouldUpdateTime) {
            const now = Date.now();
            const sampleDuration = Math.max((now - previousSpeedSampleRef.current.at) / 1000, 0.001);
            currentSpeed = Math.max(
                (uploadedBytes - previousSpeedSampleRef.current.uploaded) / sampleDuration,
                0,
            );
            previousSpeedSampleRef.current = { at: now, uploaded: uploadedBytes };
        }

        setProgress((current) => ({
            uploaded: uploadedBytes,
            total: totalBytes,
            percent: totalBytes === 0 ? 0 : Math.min(100, Math.round((uploadedBytes / totalBytes) * 100)),
            elapsedSeconds: shouldUpdateTime ? elapsedSeconds : current?.elapsedSeconds ?? elapsedSeconds,
            remainingSeconds: shouldUpdateTime
                ? (currentSpeed > 0 ? remainingBytes / currentSpeed : null)
                : current?.remainingSeconds ?? null,
            bytesPerSecond: shouldUpdateTime ? currentSpeed : current?.bytesPerSecond ?? 0,
        }));
    }

    function dismissUploadSummary() {
        setProgress(null);
        uploadStartedAtRef.current = null;
        uploadedBytesRef.current = 0;
        if (uploadProgressTimerRef.current !== null) {
            window.clearInterval(uploadProgressTimerRef.current);
            uploadProgressTimerRef.current = null;
        }
    }

    function startEditing(video) {
        setEditingVideo(video);
        setEditTitle(video.title ?? '');
        setEditDescription(video.description ?? '');
        setError('');
        setMessage('');
    }

    async function saveVideo(event) {
        event.preventDefault();
        if (!editingVideo) {
            return;
        }

        setSavingVideo(true);
        setError('');
        try {
            const updated = await requestJson(`${api}/${editingVideo.id}`, {
                method: 'PATCH',
                body: JSON.stringify({
                    title: editTitle.trim() || null,
                    description: editDescription.trim() || null,
                }),
            });
            setVideos((current) => current.map((video) => (
                video.id === updated.id ? updated : video
            )));
            setEditingVideo(null);
            setMessage('Video details saved.');
        } catch (saveError) {
            setError(saveError.message);
        } finally {
            setSavingVideo(false);
        }
    }

    async function deleteVideo(video) {
        setDeletingVideoId(video.id);
        setError('');
        setMessage('');
        try {
            await requestJson(`${api}/${video.id}`, { method: 'DELETE' });
            setVideos((current) => current.filter((item) => item.id !== video.id));
            setVideoToDelete(null);
            setMessage('Video deleted.');
        } catch (deleteError) {
            setError(deleteError.message);
            setVideoToDelete(null);
        } finally {
            setDeletingVideoId(null);
        }
    }

    async function cancelUpload() {
        const activeUploadId = currentUploadIdRef.current;
        if (!activeUploadId) {
            return;
        }

        activePartAbortControllerRef.current?.abort();
        currentUploadIdRef.current = null;
        activeUploadSessionRef.current = null;
        try {
            await requestJson(`${api}/uploads/${activeUploadId}`, { method: 'DELETE' });
        } catch (cancelError) {
            setError(cancelError.message);
        } finally {
            setUploadId(null);
            setBusy(false);
            dismissUploadSummary();
            if (fileInput.current) {
                fileInput.current.value = '';
            }
        }
    }

    async function reloadVideos() {
        setLoading(true);
        setLoadError('');
        try {
            const items = await requestJson(api, { method: 'GET' });
            setVideos(items ?? []);
        } catch {
            setLoadError('Unable to load videos. Refresh the page to try again.');
        } finally {
            setLoading(false);
        }
    }

    const normalizedSearch = search.trim().toLocaleLowerCase();
    const filteredVideos = videos
        .filter((video) => {
            const matchesSearch = normalizedSearch === ''
                || [video.title, video.original_filename, video.description]
                    .some((value) => value?.toLocaleLowerCase().includes(normalizedSearch));
            const matchesStatus = statusFilter === 'all' || video.status === statusFilter;

            return matchesSearch && matchesStatus;
        })
        .sort((first, second) => {
            const firstDate = new Date(first.created_at ?? 0).getTime();
            const secondDate = new Date(second.created_at ?? 0).getTime();

            return sortOrder === 'newest' ? secondDate - firstDate : firstDate - secondDate;
        });
    const pageCount = Math.max(1, Math.ceil(filteredVideos.length / pageSize));
    const visibleVideos = filteredVideos.slice((page - 1) * pageSize, page * pageSize);

    function updateSearch(value) {
        setSearch(value);
        setPage(1);
    }

    function updateStatusFilter(value) {
        setStatusFilter(value);
        setPage(1);
    }

    return (
        <>
            <Head title="Video library" />
            <main className="min-h-screen bg-[#0a0a0a] text-[#EDEDEC]">
                <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-5 py-6 sm:px-8 lg:px-12">
                    <header className="flex min-h-12 items-center justify-between border-b border-[#302f2b] pb-4">
                        <a className="text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FF4433]" href="/">VOD</a>
                        <form onSubmit={signOut}>
                            <button className="inline-flex min-h-11 cursor-pointer items-center text-sm text-[#B7B4AC] underline decoration-[#625e57] underline-offset-4 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FF4433] disabled:cursor-not-allowed" disabled={processing} type="submit">Sign out</button>
                        </form>
                    </header>
                    <section className="py-10 sm:py-14">
                        <p className="text-sm font-medium text-[#FF7769]">Admin access</p>
                        <h1 className="mt-3 text-3xl font-medium tracking-tight text-white sm:text-4xl">Video library</h1>
                        <p className="mt-3 max-w-xl text-sm leading-6 text-[#A1A09A]">
                            Upload source videos and manage their library details. Playback is not available here.
                        </p>
                        <dl className="mt-8 grid gap-5 border-y border-[#302f2b] py-5 sm:grid-cols-2">
                            <div><dt className="text-sm text-[#A1A09A]">Name</dt><dd className="mt-1 font-medium text-white">{account.name}</dd></div>
                            <div><dt className="text-sm text-[#A1A09A]">Email</dt><dd className="mt-1 break-all font-medium text-white">{account.email}</dd></div>
                        </dl>
                    </section>

                    <section aria-labelledby="upload-heading" className="border-b border-[#302f2b] pb-10">
                        <h2 className="text-xl font-medium text-white" id="upload-heading">Upload a video</h2>
                        <form className="mt-5 flex flex-col items-start gap-4" onSubmit={uploadVideo} ref={uploadFormRef}>
                            <label className="flex min-h-12 w-full cursor-pointer flex-wrap items-center gap-3 border border-[#514e47] px-4 py-3 text-sm text-[#EDEDEC] hover:border-[#8b8579] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#FF4433]">
                                <span className="font-medium">Choose a video file</span>
                                <input
                                    accept="video/mp4,video/quicktime,video/x-matroska,video/webm"
                                    className="min-w-0 flex-1 text-sm text-[#B7B4AC] file:mr-3 file:min-h-10 file:cursor-pointer file:border-0 file:bg-[#302f2b] file:px-3 file:text-sm file:text-white"
                                    disabled={busy}
                                    ref={fileInput}
                                    required
                                    type="file"
                                />
                            </label>
                            <button className="inline-flex min-h-11 cursor-pointer items-center justify-center bg-[#FF4433] px-5 text-sm font-semibold text-[#111110] hover:bg-[#ff6b5e] active:bg-[#e83e2f] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-60" disabled={busy} type="submit">
                                {busy ? 'Uploading video…' : 'Upload video'}
                            </button>
                            {progress !== null && (
                                <div className="w-full max-w-xl space-y-3">
                                    <div className="flex items-center justify-between gap-3 text-sm text-[#EDEDEC]">
                                        <p aria-live="polite" role="status">
                                            {progress.percent >= 100
                                                ? 'Upload complete'
                                                : `Uploading ${formatBytes(progress.uploaded)} of ${formatBytes(progress.total)}`}
                                        </p>
                                        <span className="tabular-nums">{progress.percent}%</span>
                                    </div>
                                    <progress
                                        aria-label="Video upload progress"
                                        className="h-2 w-full accent-[#FF4433]"
                                        max="100"
                                        value={progress.percent}
                                    />
                                    <dl aria-label="Upload transfer details" className="grid grid-cols-2 gap-x-5 gap-y-3 text-sm sm:grid-cols-4">
                                        <div>
                                            <dt className="text-[#B7B4AC]">Elapsed</dt>
                                            <dd className="mt-1 tabular-nums text-white">{formatDuration(progress.elapsedSeconds)}</dd>
                                        </div>
                                        <div>
                                            <dt className="text-[#B7B4AC]">Remaining</dt>
                                            <dd className="mt-1 tabular-nums text-white">{formatDuration(progress.remainingSeconds)}</dd>
                                        </div>
                                        <div>
                                            <dt className="text-[#B7B4AC]">Speed</dt>
                                            <dd className="mt-1 tabular-nums text-white">{formatBytes(progress.bytesPerSecond)}/s</dd>
                                        </div>
                                        <div>
                                            <dt className="text-[#B7B4AC]">Transferred</dt>
                                            <dd className="mt-1 tabular-nums text-white">{progress.percent}%</dd>
                                        </div>
                                    </dl>
                                    {busy && (
                                        <button
                                            className="inline-flex min-h-11 cursor-pointer items-center text-sm text-[#B7B4AC] underline underline-offset-4 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FF4433] disabled:cursor-not-allowed"
                                            onClick={cancelUpload}
                                            type="button"
                                        >
                                            Cancel upload
                                        </button>
                                    )}
                                    {!busy && (
                                        <button
                                            className="inline-flex min-h-11 cursor-pointer items-center text-sm text-[#B7B4AC] underline underline-offset-4 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FF4433]"
                                            onClick={dismissUploadSummary}
                                            type="button"
                                        >
                                            Dismiss upload details
                                        </button>
                                    )}
                                </div>
                            )}
                        </form>
                        {message && <p aria-live="polite" className="mt-4 text-sm text-[#EDEDEC]" role="status">{message}</p>}
                        {error && <p className="mt-4 text-sm text-[#FF9388]" role="alert">{error}</p>}
                    </section>

                    <section aria-labelledby="library-heading" className="flex-1 py-10">
                        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
                            <div>
                                <h2 className="text-xl font-medium text-white" id="library-heading">Videos</h2>
                                <p className="mt-2 text-sm text-[#A1A09A]">
                                    {loading ? 'Loading your library…' : `${filteredVideos.length} ${filteredVideos.length === 1 ? 'video' : 'videos'}`}
                                </p>
                            </div>
                            <button
                                className="inline-flex min-h-11 cursor-pointer items-center text-sm text-[#B7B4AC] underline underline-offset-4 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FF4433] disabled:cursor-not-allowed"
                                disabled={loading}
                                onClick={reloadVideos}
                                type="button"
                            >
                                Refresh list
                            </button>
                        </div>

                        {!loading && !loadError && videos.length > 0 && (
                            <div className="mt-5 grid gap-3 border-y border-[#302f2b] py-4 sm:grid-cols-[minmax(12rem,1fr)_auto_auto] sm:items-end">
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-[#EDEDEC]" htmlFor="video-search">Search videos</label>
                                    <input
                                        autoComplete="off"
                                        className="min-h-11 w-full border border-[#625e57] bg-[#121212] px-3 text-base text-white placeholder:text-[#A1A09A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF4433]"
                                        id="video-search"
                                        onChange={(event) => updateSearch(event.target.value)}
                                        placeholder="Title, filename, or description"
                                        type="search"
                                        value={search}
                                    />
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-[#EDEDEC]" htmlFor="video-status">Status</label>
                                    <select
                                        className="min-h-11 w-full cursor-pointer border border-[#625e57] bg-[#121212] px-3 text-base text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF4433] sm:w-auto"
                                        id="video-status"
                                        onChange={(event) => updateStatusFilter(event.target.value)}
                                        value={statusFilter}
                                    >
                                        <option value="all">All statuses</option>
                                        {[...new Set(videos.map((video) => video.status))].sort().map((status) => (
                                            <option key={status} value={status}>{statusLabel(status)}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-[#EDEDEC]" htmlFor="video-sort">Sort by</label>
                                    <select
                                        className="min-h-11 w-full cursor-pointer border border-[#625e57] bg-[#121212] px-3 text-base text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF4433] sm:w-auto"
                                        id="video-sort"
                                        onChange={(event) => setSortOrder(event.target.value)}
                                        value={sortOrder}
                                    >
                                        <option value="newest">Newest first</option>
                                        <option value="oldest">Oldest first</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        {loading && <p aria-live="polite" className="py-8 text-sm text-[#B7B4AC]" role="status">Loading videos…</p>}
                        {!loading && loadError && <p className="py-8 text-sm text-[#FF9388]" role="alert">{loadError}</p>}
                        {!loading && loadError && (
                            <button className="min-h-11 cursor-pointer text-sm text-white underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FF4433]" onClick={reloadVideos} type="button">
                                Retry loading videos
                            </button>
                        )}
                        {!loading && !loadError && videos.length === 0 && (
                            <p className="mt-6 border-y border-[#302f2b] py-7 text-sm text-[#B7B4AC]">
                                No videos uploaded yet. Choose a source video above to add it to this library.
                            </p>
                        )}
                        {!loading && !loadError && videos.length > 0 && filteredVideos.length === 0 && (
                            <div className="mt-6 border-y border-[#302f2b] py-7">
                                <p className="text-sm text-white">No videos match these filters.</p>
                                <button
                                    className="mt-3 inline-flex min-h-11 cursor-pointer items-center text-sm text-[#FF9388] underline underline-offset-4 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FF4433]"
                                    onClick={() => {
                                        setSearch('');
                                        setStatusFilter('all');
                                        setPage(1);
                                    }}
                                    type="button"
                                >
                                    Clear search and filters
                                </button>
                            </div>
                        )}
                        {!loading && !loadError && visibleVideos.length > 0 && (
                            <>
                                <ul aria-label="Video library results" className="mt-2 divide-y divide-[#302f2b]">
                                    {visibleVideos.map((video) => (
                                        <li className="grid gap-x-5 gap-y-3 py-5 sm:grid-cols-[minmax(0,1fr)_10rem_auto] sm:items-center" key={video.id}>
                                            <div className="min-w-0">
                                                <h3 className="break-words font-medium text-white">{video.title || video.original_filename}</h3>
                                                {video.title && <p className="mt-1 break-all text-xs text-[#B7B4AC]">{video.original_filename}</p>}
                                                {video.description && (
                                                    <p className="mt-2 line-clamp-2 break-words text-sm leading-5 text-[#B7B4AC]">{video.description}</p>
                                                )}
                                            </div>
                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[#D0CEC8] sm:block">
                                                <span className="capitalize">{statusLabel(video.status)}</span>
                                                <span className="text-[#B7B4AC]">{formatBytes(video.size)}</span>
                                                <time className="text-[#B7B4AC]" dateTime={video.created_at}>
                                                    {formatDate(video.created_at)}
                                                </time>
                                            </div>
                                            <div className="flex flex-wrap gap-2 sm:justify-end">
                                                <button
                                                    className="inline-flex min-h-11 cursor-pointer items-center border border-[#625e57] px-3 text-sm text-white hover:border-[#A1A09A] hover:bg-[#1b1b1a] active:bg-[#302f2b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF4433] disabled:cursor-not-allowed"
                                                    onClick={() => startEditing(video)}
                                                    type="button"
                                                >
                                                    Edit details
                                                </button>
                                                <button
                                                    className="inline-flex min-h-11 cursor-pointer items-center px-3 text-sm text-[#FF9388] underline underline-offset-4 hover:text-white active:text-[#FFB2AA] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF4433] disabled:cursor-not-allowed disabled:opacity-60"
                                                    disabled={deletingVideoId !== null}
                                                    onClick={(event) => {
                                                        dialogTriggerRef.current = event.currentTarget;
                                                        setVideoToDelete(video);
                                                    }}
                                                    type="button"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                                {pageCount > 1 && (
                                    <nav aria-label="Video library pages" className="flex flex-wrap items-center justify-between gap-3 border-t border-[#302f2b] pt-4">
                                        <p aria-live="polite" className="text-sm text-[#D0CEC8]" role="status">
                                            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filteredVideos.length)} of {filteredVideos.length}
                                        </p>
                                        <div className="flex gap-2">
                                            <button
                                                className="inline-flex min-h-11 cursor-pointer items-center border border-[#625e57] px-3 text-sm text-white hover:bg-[#1b1b1a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF4433] disabled:cursor-not-allowed disabled:opacity-50"
                                                disabled={page <= 1}
                                                onClick={() => setPage((current) => Math.max(1, current - 1))}
                                                type="button"
                                            >
                                                Previous
                                            </button>
                                            <button
                                                className="inline-flex min-h-11 cursor-pointer items-center border border-[#625e57] px-3 text-sm text-white hover:bg-[#1b1b1a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF4433] disabled:cursor-not-allowed disabled:opacity-50"
                                                disabled={page >= pageCount}
                                                onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
                                                type="button"
                                            >
                                                Next
                                            </button>
                                        </div>
                                    </nav>
                                )}
                            </>
                        )}
                    </section>
                    <footer className="border-t border-[#302f2b] py-5 text-xs text-[#77746D]">Admin account</footer>
                </div>
            </main>
            {(editingVideo || videoToDelete) && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-0 sm:items-center sm:p-5">
                    <section
                        aria-labelledby={editingVideo ? 'edit-video-heading' : 'delete-video-heading'}
                        aria-modal="true"
                        className="w-full max-w-xl border border-[#514e47] bg-[#111110] p-5 sm:p-7"
                        ref={dialogRef}
                        role="dialog"
                    >
                        {editingVideo ? (
                            <>
                                <h2 className="text-xl font-medium text-white" id="edit-video-heading">Edit video details</h2>
                                <form className="mt-5 space-y-5" onSubmit={saveVideo}>
                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-white" htmlFor="video-title">Title</label>
                                        <input
                                            className="min-h-12 w-full border border-[#625e57] bg-[#0a0a0a] px-3 text-base text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF4433]"
                                            id="video-title"
                                            maxLength={255}
                                            onChange={(event) => setEditTitle(event.target.value)}
                                            value={editTitle}
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-white" htmlFor="video-description">Description</label>
                                        <textarea
                                            className="min-h-32 w-full resize-y border border-[#625e57] bg-[#0a0a0a] px-3 py-2 text-base text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF4433]"
                                            id="video-description"
                                            maxLength={10000}
                                            onChange={(event) => setEditDescription(event.target.value)}
                                            value={editDescription}
                                        />
                                    </div>
                                    <div className="flex flex-wrap justify-end gap-3 pt-1">
                                        <button
                                            className="inline-flex min-h-11 cursor-pointer items-center px-4 text-sm text-[#D0CEC8] underline underline-offset-4 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF4433] disabled:cursor-not-allowed"
                                            disabled={savingVideo}
                                            onClick={() => setEditingVideo(null)}
                                            type="button"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            className="inline-flex min-h-11 cursor-pointer items-center bg-[#FF4433] px-5 text-sm font-semibold text-[#111110] hover:bg-[#ff6b5e] active:bg-[#e83e2f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-60"
                                            disabled={savingVideo}
                                            type="submit"
                                        >
                                            {savingVideo ? 'Saving…' : 'Save details'}
                                        </button>
                                    </div>
                                </form>
                            </>
                        ) : (
                            <>
                                <h2 className="text-xl font-medium text-white" id="delete-video-heading">Delete this video?</h2>
                                <p className="mt-3 break-words text-sm leading-6 text-[#D0CEC8]">
                                    “{videoToDelete.title || videoToDelete.original_filename}” and its stored source file will be permanently removed.
                                </p>
                                <div className="mt-6 flex flex-wrap justify-end gap-3">
                                    <button
                                        className="inline-flex min-h-11 cursor-pointer items-center px-4 text-sm text-[#D0CEC8] underline underline-offset-4 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF4433] disabled:cursor-not-allowed"
                                        disabled={deletingVideoId !== null}
                                        onClick={() => setVideoToDelete(null)}
                                        type="button"
                                    >
                                        Keep video
                                    </button>
                                    <button
                                        className="inline-flex min-h-11 cursor-pointer items-center bg-[#a92f26] px-5 text-sm font-semibold text-white hover:bg-[#c3382e] active:bg-[#90271f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-60"
                                        disabled={deletingVideoId !== null}
                                        onClick={() => deleteVideo(videoToDelete)}
                                        type="button"
                                    >
                                        {deletingVideoId !== null ? 'Deleting…' : 'Delete video'}
                                    </button>
                                </div>
                            </>
                        )}
                    </section>
                </div>
            )}
        </>
    );
}
