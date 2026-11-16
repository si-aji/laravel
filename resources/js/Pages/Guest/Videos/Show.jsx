import { Head, Link } from '@inertiajs/react';
import VideoStreamPlayer from '../../../Components/VideoStreamPlayer';

export default function GuestVideoShow({ video }) {
    return (
        <>
            <Head title={video.title} />
            <Link className="text-link" href={video.library_url}>Back to video library</Link>
            <article className="guest-watch">
                <header className="guest-watch-heading">
                    <h1>{video.title}</h1>
                    {video.description && <p>{video.description}</p>}
                    <p className="video-secondary">{video.filename}</p>
                </header>
                <VideoStreamPlayer manifestUrl={video.playback_url} grantUrl={video.playback_grant_url} title={video.title} />
            </article>
        </>
    );
}
