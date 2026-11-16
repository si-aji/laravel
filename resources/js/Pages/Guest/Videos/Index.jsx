import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import Button from '../../../Components/Button';

export default function GuestVideoIndex({ videos, search }) {
    const [query, setQuery] = useState(search);
    const [loading, setLoading] = useState(false);

    function submit(event) {
        event.preventDefault();
        router.get('/guest/videos', query ? { search: query } : {}, {
            preserveState: true,
            replace: true,
            onStart: () => setLoading(true),
            onFinish: () => setLoading(false),
        });
    }

    return (
        <>
            <Head title="Video library" />
            <div className="library-heading">
                <div className="dashboard-heading">
                    <h1>Video library</h1>
                    <p>Videos published for signed-in guests.</p>
                </div>
            </div>
            <section className="panel library-panel" aria-labelledby="guest-videos-heading" aria-busy={loading}>
                <div className="library-toolbar">
                    <h2 id="guest-videos-heading">Available videos</h2>
                    <form className="library-search" onSubmit={submit}>
                        <label className="sr-only" htmlFor="guest-video-search">Search by title or filename</label>
                        <input
                            id="guest-video-search"
                            type="search"
                            maxLength={255}
                            placeholder="Search videos"
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                        />
                        <Button variant="secondary" disabled={loading} type="submit">{loading ? 'Searching…' : 'Search'}</Button>
                        {search && <Button href="/guest/videos" variant="text">Clear</Button>}
                    </form>
                </div>
                {videos.data.length === 0 ? (
                    <div className="library-empty">
                        <h3>{search ? 'No matching videos' : 'No videos are available yet'}</h3>
                        <p>{search ? 'Try a different title or filename, or clear the search.' : 'Published videos will appear here when they are ready to watch.'}</p>
                    </div>
                ) : (
                    <ul className="guest-video-list">
                        {videos.data.map((video) => (
                            <li key={video.id}>
                                <div>
                                    <h3><Link className="text-link" href={video.watch_url}>{video.title}</Link></h3>
                                    {video.description && <p>{video.description}</p>}
                                    <time dateTime={video.created_at}>{new Date(video.created_at).toLocaleDateString()}</time>
                                </div>
                                <Link className="button button-secondary" href={video.watch_url}>Watch video</Link>
                            </li>
                        ))}
                    </ul>
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
