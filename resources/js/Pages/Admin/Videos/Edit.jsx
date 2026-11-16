import { Head, Link } from '@inertiajs/react';
import { useState } from 'react';
import VideoDetailsForm from '../../../Components/VideoDetailsForm';
import DeleteVideoButton from '../../../Components/DeleteVideoButton';
import { formatBytes } from '../../../Components/VideoUpload/MultipartUpload';
import { videoStatus } from './Index';

export default function EditVideo({ video: initialVideo }) {
    const [video, setVideo] = useState(initialVideo);
    return (
        <>
            <Head title={`Video details: ${video.title || video.filename}`} />
            <Link className="text-link" href="/adm/videos">Back to video library</Link>
            <div className="library-heading">
                <div className="dashboard-heading"><h1>Video details</h1><p>{video.filename}</p></div>
                <DeleteVideoButton video={video} />
            </div>
            <div className="upload-workspace">
                <section className="panel" aria-labelledby="metadata-heading">
                    <h2 id="metadata-heading">Title and description</h2>
                    <p className="section-description">These details appear in the shared video library.</p>
                    {video.status === 'delete_pending' && <p className="field-error">This video is awaiting deletion. Retry deletion to remove its file and record.</p>}
                    <VideoDetailsForm key={video.id} title={video.title || video.filename} description={video.description}
                        url={video.update_url} disabled={video.status === 'delete_pending'}
                        onSaved={(metadata) => setVideo((current) => ({ ...current, ...metadata }))} />
                </section>
                <section className="panel" aria-labelledby="file-heading">
                    <h2 id="file-heading">File information</h2>
                    <dl className="file-information">
                        <div><dt>Status</dt><dd>{videoStatus(video.status)}</dd></div>
                        <div><dt>Filename</dt><dd>{video.filename}</dd></div>
                        <div><dt>Size</dt><dd>{formatBytes(video.size)}</dd></div>
                        <div><dt>Format</dt><dd>{video.mime_type}</dd></div>
                        <div><dt>Uploaded by</dt><dd>{video.uploader || 'Unavailable'}</dd></div>
                    </dl>
                    {video.status === 'uploading' && <Link className="text-link" href="/adm/videos/upload">View your unfinished uploads</Link>}
                    {video.status === 'draft' && <p className="upload-help">If this upload expired, delete the draft and start a new upload from the library.</p>}
                    <p className="upload-help">Playback and transcoding are not available yet.</p>
                </section>
            </div>
        </>
    );
}
