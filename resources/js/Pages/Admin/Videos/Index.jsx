import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import Button from '../../../Components/Button';
import DeleteVideoButton from '../../../Components/DeleteVideoButton';
import { formatBytes } from '../../../Components/VideoUpload/MultipartUpload';

export const videoStatus = (status) => ({
    ready: 'Ready', uploading: 'Upload incomplete', draft: 'Draft', delete_pending: 'Deletion incomplete',
}[status] || status);

export default function VideoIndex({ videos, search, notice, errors }) {
    const [query, setQuery] = useState(search);
    const [loading, setLoading] = useState(false);

    function submit(event) {
        event.preventDefault();
        router.get('/adm/videos', query ? { search: query } : {}, {
            preserveState: true, replace: true,
            onStart: () => setLoading(true), onFinish: () => setLoading(false),
        });
    }

    return (
        <>
            <Head title="Video library" />
            <div className="library-heading">
                <div className="dashboard-heading"><h1>Video library</h1><p>Upload and manage videos in the shared admin library.</p></div>
                <Button href="/adm/videos/upload">Upload video</Button>
            </div>
            {notice && <p className="notice" role="status">{notice}</p>}
            {errors?.video && <p className="field-error" role="alert">{errors.video}</p>}
            <section className="panel library-panel" aria-labelledby="videos-heading" aria-busy={loading}>
                <div className="library-toolbar">
                    <h2 id="videos-heading">{videos.total} {videos.total === 1 ? 'video' : 'videos'}</h2>
                    <form className="library-search" onSubmit={submit}>
                        <label className="sr-only" htmlFor="video-search">Search by title or filename</label>
                        <input id="video-search" type="search" maxLength={255} placeholder="Search videos" value={query} onChange={(event) => setQuery(event.target.value)} />
                        <Button variant="secondary" disabled={loading} type="submit">{loading ? 'Searching…' : 'Search'}</Button>
                        {search && <Button href="/adm/videos" variant="text">Clear</Button>}
                    </form>
                </div>
                {videos.data.length === 0 ? (
                    <div className="library-empty">
                        <h3>{search ? 'No matching videos' : 'Your library starts here'}</h3>
                        <p>{search ? 'Try another title or filename, or clear the search.' : 'Upload your first video. You can edit its title and description while it uploads.'}</p>
                        {!search && <Button href="/adm/videos/upload" variant="secondary">Upload a video</Button>}
                    </div>
                ) : (
                    <div className="video-table-wrap">
                        <table className="video-table">
                            <thead><tr><th scope="col">Video</th><th scope="col">Status</th><th scope="col">Size</th><th scope="col">Uploaded</th><th scope="col">Actions</th></tr></thead>
                            <tbody>{videos.data.map((video) => (
                                <tr key={video.id}>
                                    <td data-label="Video">
                                        <Link className="video-title text-link" href={video.edit_url}>{video.title || video.filename}</Link>
                                        <span className="video-secondary">{video.filename}</span>
                                        <span className="video-secondary">{video.uploader ? `Uploaded by ${video.uploader}` : 'Uploader unavailable'}</span>
                                    </td>
                                    <td data-label="Status"><span className={`video-status ${video.status === 'delete_pending' ? 'status-error' : ''}`}>{videoStatus(video.status)}</span></td>
                                    <td data-label="Size" className="video-size">{formatBytes(video.size)}</td>
                                    <td data-label="Uploaded"><time dateTime={video.created_at}>{new Date(video.created_at).toLocaleDateString()}</time></td>
                                    <td data-label="Actions"><div className="video-row-actions"><Link className="text-link" href={video.edit_url}>Edit details</Link><DeleteVideoButton video={video} /></div></td>
                                </tr>
                            ))}</tbody>
                        </table>
                    </div>
                )}
                {videos.last_page > 1 && (
                    <nav className="pagination" aria-label="Video library pages">
                        {videos.prev_page_url && <Button href={videos.prev_page_url} variant="secondary">Previous</Button>}
                        <span>Page {videos.current_page} of {videos.last_page}</span>
                        {videos.next_page_url && <Button href={videos.next_page_url} variant="secondary">Next</Button>}
                    </nav>
                )}
            </section>
        </>
    );
}
