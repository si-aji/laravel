import { Head, Link, router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import Button from '../../../Components/Button';
import VideoDetailsForm from '../../../Components/VideoDetailsForm';
import { useConfirmDialog } from '../../../Components/ConfirmDialogProvider';
import UploadProgress from '../../../Components/VideoUpload/UploadProgress';
import { useUpload } from '../../../Components/VideoUpload/UploadProvider';
import { formatBytes } from '../../../Components/VideoUpload/MultipartUpload';

const mimeByExtension = { mp4: 'video/mp4', mov: 'video/quicktime', mkv: 'video/x-matroska', webm: 'video/webm' };
const mimeLabels = { 'video/mp4': 'MP4', 'video/quicktime': 'MOV', 'video/x-matroska': 'MKV', 'video/webm': 'WebM' };

export default function UploadVideo({ uploadPolicy, resumableUploads }) {
    const { engine, state } = useUpload();
    const { confirm } = useConfirmDialog();
    const fileInput = useRef(null);
    const resumeTarget = useRef(null);
    const [error, setError] = useState(null);
    const [dragging, setDragging] = useState(false);
    const [detailsDirty, setDetailsDirty] = useState(false);
    const inactive = ['idle', 'cancelled'].includes(state.phase);
    const needsFile = state.phase === 'interrupted' || state.needsFile;

    useEffect(() => {
        if (['complete', 'cancelled'].includes(state.phase)) router.reload({ only: ['resumableUploads'] });
    }, [state.phase]);

    function choose(existing = null) {
        resumeTarget.current = existing;
        fileInput.current.value = '';
        fileInput.current.click();
    }

    async function dismiss() {
        if (detailsDirty && !await confirm({
            title: 'Dismiss unsaved details?',
            description: 'Your video details have unsaved changes.',
            confirmLabel: 'Dismiss details',
            cancelLabel: 'Keep editing',
        })) {
            return;
        }
        engine.clear();
        setDetailsDirty(false);
    }

    async function select(original) {
        setError(null);
        if (!original) return;
        const type = original.type || mimeByExtension[original.name.split('.').pop().toLowerCase()] || '';
        if (!uploadPolicy.mime_types.includes(type)) return setError('Choose a supported video format.');
        if (original.size <= 0 || original.size > uploadPolicy.max_bytes) return setError(`The file must be non-empty and no larger than ${formatBytes(uploadPolicy.max_bytes)}.`);
        const file = original.type ? original : new File([original], original.name, { type, lastModified: original.lastModified });
        try {
            if (resumeTarget.current || needsFile) {
                await engine.resumeWithFile(file, resumeTarget.current);
            } else {
                await engine.start(file, { title: file.name.replace(/\.[^.]+$/, '').slice(0, 255) || file.name, description: '' });
            }
        } catch (failure) {
            setError(failure.message);
        }
    }

    return (
        <>
            <Head title="Upload video" />
            <Link className="text-link" href="/adm/videos">Back to video library</Link>
            <div className="dashboard-heading upload-page-heading"><h1>Upload video</h1><p>Select a file, then add its details while the upload runs.</p></div>
            <input ref={fileInput} type="file" accept={uploadPolicy.mime_types.join(',')} hidden onChange={(event) => select(event.target.files[0])} />
            {error && <p className="field-error" role="alert">{error}</p>}
            {inactive && (
                <section className={`upload-dropzone ${dragging ? 'is-dragging' : ''}`} aria-labelledby="select-video-heading"
                    onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(event) => {
                        event.preventDefault(); setDragging(false);
                        if (event.dataTransfer.files.length !== 1) return setError('Choose one video at a time.');
                        resumeTarget.current = null;
                        select(event.dataTransfer.files[0]);
                    }}>
                    <h2 id="select-video-heading">Drop a video to upload</h2>
                    <p>Or choose a file from your device. Upload one video at a time.</p>
                    <Button onClick={() => choose()}>Select video</Button>
                    <p className="field-hint">Maximum {formatBytes(uploadPolicy.max_bytes)}. Supported formats: {uploadPolicy.mime_types.map((mime) => mimeLabels[mime] || mime).join(', ')}.</p>
                    <p className="field-hint">Files are stored privately. Uploading does not publish a video or make it playable.</p>
                </section>
            )}
            {!inactive && (
                <div className="upload-workspace upload-workspace-upload">
                    <div>
                        <UploadProgress onDismiss={dismiss} />
                        {needsFile && <Button className="reselect-file" onClick={() => choose()} variant="secondary">Select original file</Button>}
                        <p className="upload-help">Keep this tab open. You can navigate inside the admin workspace while uploading. After a refresh, reselect the original file to resume.</p>
                    </div>
                    <section className="panel" aria-labelledby="video-details-heading">
                        <h2 id="video-details-heading">Video details</h2>
                        <p className="section-description">You can save these details while your video uploads.</p>
                        {state.session?.metadata_url ? (
                            <VideoDetailsForm key={state.session.video_id} title={state.metadata?.title} description={state.metadata?.description}
                                url={state.session.metadata_url} onSaved={(metadata) => engine.publish({ metadata })} onDirtyChange={setDetailsDirty} />
                        ) : <p className="field-hint">{state.phase === 'starting'
                            ? 'Preparing your draft. Details will appear after the server confirms it.'
                            : 'No draft is available here. Check the library or retry the upload before starting another.'}</p>}
                    </section>
                </div>
            )}
            {state.phase === 'cancelled' && <p className="notice" role="status">Upload cancelled. Its draft and uploaded parts were removed.</p>}
            {inactive && resumableUploads.length > 0 && (
                <section className="panel resumable-uploads" aria-labelledby="resume-heading">
                    <h2 id="resume-heading">Unfinished uploads</h2>
                    <p className="section-description">Select the original, unchanged file to continue an upload from this account.</p>
                    <ul>{resumableUploads.map((upload) => (
                        <li key={upload.id}>
                            <div><strong>{upload.title || upload.filename}</strong><p>{upload.filename} · {formatBytes(upload.size)}</p></div>
                            <Button variant="secondary" onClick={() => choose(upload)}>Select original file</Button>
                            <Link className="text-link" href={`/adm/videos/${upload.video_id}/edit`}>Manage draft</Link>
                        </li>
                    ))}</ul>
                </section>
            )}
        </>
    );
}
