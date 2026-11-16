import { Link } from '@inertiajs/react';
import Button from '../Button';
import { useUpload } from './UploadProvider';
import { useConfirmDialog } from '../ConfirmDialogProvider';
import { formatBytes, formatDuration } from './MultipartUpload';

const labels = {
    starting: 'Preparing upload', uploading: 'Uploading video', paused: 'Upload paused', resuming: 'Resuming upload',
    interrupted: 'Reselect your file to resume', error: 'Upload needs attention', verifying: 'Verifying stored video',
    complete: 'Video uploaded', cancelling: 'Cancelling upload', cancelled: 'Upload cancelled',
};

export default function UploadProgress({ compact = false, onDismiss }) {
    const { engine, state } = useUpload();
    const { confirm } = useConfirmDialog();
    if (state.phase === 'idle') return null;
    const percent = state.size ? Math.min(100, Math.floor(state.transferred * 100 / state.size)) : 0;
    const canRetry = ['paused', 'error'].includes(state.phase) && !state.unavailable;
    const canCancel = state.session && ['paused', 'error', 'interrupted', 'uploading'].includes(state.phase);

    async function cancel() {
        const confirmed = await confirm({
            title: 'Cancel this upload?',
            description: `The uploaded parts and draft for "${state.filename}" will be removed.`,
            confirmLabel: 'Cancel upload',
            cancelLabel: 'Keep uploading',
            destructive: true,
        });
        if (confirmed) {
            await engine.cancel();
        }
    }

    return (
        <section className={`upload-progress ${compact ? 'upload-progress-compact' : ''}`} aria-label="Video upload progress">
            <div className="section-heading">
                <h2 aria-live="polite">{labels[state.phase]}</h2>
                {['complete', 'cancelled'].includes(state.phase) && <Button onClick={onDismiss || (() => engine.clear())} variant="text">Dismiss</Button>}
            </div>
            <p className="upload-filename">{state.filename}</p>
            {!['cancelled', 'complete'].includes(state.phase) && (
                <>
                    <div className="progress-label"><span>{percent}% transferred</span><span>{formatBytes(state.transferred)} / {formatBytes(state.size)}</span></div>
                    <progress aria-label="Video bytes transferred" max={state.size || 1} value={state.transferred || 0} />
                </>
            )}
            {!compact && !['complete', 'cancelled'].includes(state.phase) && (
                <dl className="transfer-metrics">
                    <div><dt>Elapsed</dt><dd>{formatDuration(state.elapsed)}</dd></div>
                    <div><dt>Upload speed</dt><dd>{state.speed > 0 ? `${formatBytes(state.speed)}/s` : 'Waiting for data'}</dd></div>
                    <div><dt>Time left (estimate)</dt><dd>{formatDuration(state.remaining)}</dd></div>
                </dl>
            )}
            {state.phase === 'verifying' && <p className="field-hint">All bytes transferred. The server is checking the stored file; the upload is not finished yet.</p>}
            {state.phase === 'complete' && (
                <p role="status">
                    {state.stream_status === 'completed'
                        ? 'Video uploaded and playback preparation is complete.'
                        : state.stream_status === 'failed'
                            ? 'Video uploaded, but playback processing failed. Open video details to retry.'
                            : state.stream_status
                                ? 'Video uploaded. It is being prepared for playback.'
                                : 'Video uploaded, but playback processing could not be started automatically. Open video details to retry.'}
                </p>
            )}
            {state.phase === 'interrupted' && <p className="field-hint">Choose the same original file on the upload page. Completed parts will not be uploaded again.</p>}
            {state.error && <p className="field-error" role="alert">{state.error}</p>}
            <div className="upload-actions">
                {state.phase === 'uploading' && <Button onClick={() => engine.pause()} variant="secondary">Pause upload</Button>}
                {canRetry && <Button onClick={() => engine.retry()} variant="secondary">{state.phase === 'paused' ? 'Resume upload' : 'Retry upload'}</Button>}
                {canCancel && <Button onClick={cancel} variant="text">Cancel upload</Button>}
                {compact && state.phase !== 'cancelled' && <Link className="text-link" href="/adm/videos/upload">Open upload details</Link>}
                {state.phase === 'complete' && <Link className="text-link" href={state.edit_url}>Edit video details</Link>}
                {state.phase === 'error' && !state.session && <Button onClick={() => engine.clear()} variant="text">Dismiss</Button>}
            </div>
        </section>
    );
}
