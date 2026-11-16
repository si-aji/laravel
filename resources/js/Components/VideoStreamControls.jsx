import { useCallback, useEffect, useRef, useState } from 'react';
import Button from './Button';
import VideoStreamPlayer from './VideoStreamPlayer';
import { web } from './VideoUpload/MultipartUpload';

const activeStatuses = ['queued', 'processing'];
const statusLabels = {
    queued: 'Waiting to process',
    processing: 'Processing',
    completed: 'Completed',
    failed: 'Failed',
};

function streamError(failure, title, message) {
    if (failure.response?.status === 503) {
        return {
            title: 'Stream service unavailable',
            message: 'The FFmpeg service is not responding. Start the service, then check the stream status again.',
        };
    }

    return {
        title,
        message: failure.response?.data?.message || message,
    };
}

export default function VideoStreamControls({ enabled, hasJob, requestUrl, statusUrl, playbackGrantUrl, publishUrl, isPublished: initialPublished, title }) {
    const [job, setJob] = useState(null);
    const [isPublished, setIsPublished] = useState(initialPublished);
    const [starting, setStarting] = useState(false);
    const [checking, setChecking] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [error, setError] = useState('');
    const polling = useRef(false);

    const refresh = useCallback(async () => {
        if (polling.current) return;
        polling.current = true;
        setChecking(true);
        try {
            const { data } = await web.get(statusUrl);
            setJob(data.job);
            setError('');
        } catch (failure) {
            setError(streamError(failure, 'Unable to check stream status', 'Stream status could not be checked. Try again.'));
        } finally {
            polling.current = false;
            setChecking(false);
        }
    }, [statusUrl]);

    useEffect(() => {
        if (hasJob) refresh();
    }, [hasJob, refresh]);

    useEffect(() => {
        if (!activeStatuses.includes(job?.status)) return undefined;
        const interval = window.setInterval(refresh, 4000);
        return () => window.clearInterval(interval);
    }, [job?.status, refresh]);

    async function start() {
        setStarting(true);
        setError('');
        try {
            const { data } = await web.post(requestUrl);
            setJob(data.job);
        } catch (failure) {
            setError(streamError(failure, 'Unable to start stream processing', 'Stream processing could not be started. Try again.'));
        } finally {
            setStarting(false);
        }
    }

    const processing = activeStatuses.includes(job?.status);

    async function togglePublication() {
        setPublishing(true);
        setError('');
        try {
            const { data } = await web.patch(publishUrl, { is_published: !isPublished });
            setIsPublished(data.is_published);
        } catch (failure) {
            setError({
                title: 'Unable to save publication setting',
                message: failure.response?.data?.message || 'The publication setting could not be saved. Try again.',
            });
        } finally {
            setPublishing(false);
        }
    }

    return (
        <section className="panel stream-panel" aria-labelledby="stream-heading">
            <h2 id="stream-heading">Video stream</h2>
            {!job && !hasJob && <p className="section-description">Create an HLS stream to enable playback.</p>}
            {!enabled && <p className="field-hint">Stream processing is unavailable until its API endpoint, public playback endpoint, API token, and playback signing secret are configured.</p>}
            {error && (
                <div className="stream-notice" role="alert">
                    <strong>{error.title}</strong>
                    <p>{error.message}</p>
                </div>
            )}
            {job ? (
                <div className="stream-job">
                    <div className="stream-status-row">
                        <p role="status"><strong>Status:</strong> {statusLabels[job.status] || job.status}</p>
                        <Button disabled={checking} onClick={refresh} variant="secondary">{checking ? 'Checking…' : 'Check status'}</Button>
                    </div>
                    {job.status === 'failed' && job.error?.message && <p className="field-error">{job.error.message}</p>}
                    {job.status === 'completed' && job.manifestUrl && (
                        <VideoStreamPlayer manifestUrl={job.manifestUrl} grantUrl={playbackGrantUrl} title={title} />
                    )}
                    {job.status === 'completed' && (
                        <div className="publication-control">
                            <p role="status">{isPublished ? 'Published: available to signed-in guests.' : 'Private: visible to admins only.'}</p>
                            <Button disabled={publishing} onClick={togglePublication} variant="secondary">
                                {publishing ? 'Saving publication…' : isPublished ? 'Unpublish video' : 'Publish to guests'}
                            </Button>
                        </div>
                    )}
                </div>
            ) : (
                !error && hasJob && checking && <p className="field-hint" role="status">Checking the current stream job…</p>
            )}
            <div className="actions form-actions">
                {(!hasJob && !job || job?.status === 'failed') && (
                    <Button disabled={!enabled || starting || processing || job?.status === 'completed'} onClick={start}>
                        {starting ? 'Starting stream…' : job?.status === 'failed' ? 'Retry stream' : 'Create stream'}
                    </Button>
                )}
                {hasJob && !job && <Button disabled={checking} onClick={refresh} variant="secondary">{checking ? 'Checking…' : 'Check status'}</Button>}
            </div>
        </section>
    );
}
