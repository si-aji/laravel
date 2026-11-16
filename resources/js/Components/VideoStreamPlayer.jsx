import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Button from './Button';
import { web } from './VideoUpload/MultipartUpload';

const VideoJsStreamPlayer = lazy(() => import('./VideoJsStreamPlayer'));

export default function VideoStreamPlayer({ manifestUrl, grantUrl, title }) {
    const [playbackError, setPlaybackError] = useState(null);
    const [playbackGrant, setPlaybackGrant] = useState(null);
    const [attempt, setAttempt] = useState(0);
    const playbackGrantRef = useRef(null);

    const handlePlaybackError = useCallback((statusCode = 0) => {
        setPlaybackError((current) => statusCode >= 500 && statusCode <= 599
            ? {
                title: 'Playback service unavailable',
                message: 'The video service is temporarily unavailable. Try again shortly. If the problem continues, contact an administrator.',
            }
            : current || {
                title: 'Unable to load video',
                message: 'Check your connection and try again. If the problem continues, contact an administrator.',
            });
    }, []);

    playbackGrantRef.current = playbackGrant;

    useEffect(() => {
        let active = true;
        let refreshing = false;

        setPlaybackError(null);
        setPlaybackGrant(null);
        playbackGrantRef.current = null;

        async function refreshGrant(showFailure) {
            if (refreshing) return;
            refreshing = true;

            try {
                const { data } = await web.get(grantUrl);
                if (active && typeof data.grant === 'string') {
                    setPlaybackGrant(data.grant);
                    setPlaybackError(null);
                }
            } catch (failure) {
                if (active && showFailure) {
                    setPlaybackError(failure.response?.status === 401 || failure.response?.status === 403
                        ? {
                            title: 'Unable to authorize playback',
                            message: 'Your access could not be verified. Sign in again, then retry playback.',
                        }
                        : {
                            title: 'Playback authorization unavailable',
                            message: 'The video service is temporarily unavailable. Try again shortly.',
                        });
                }
            } finally {
                refreshing = false;
            }
        }

        function refreshWhenVisible() {
            if (document.visibilityState === 'visible') {
                refreshGrant(false);
            }
        }

        refreshGrant(true);
        const interval = window.setInterval(() => refreshGrant(false), 120000);
        document.addEventListener('visibilitychange', refreshWhenVisible);

        return () => {
            active = false;
            window.clearInterval(interval);
            document.removeEventListener('visibilitychange', refreshWhenVisible);
        };
    }, [attempt, grantUrl]);

    return (
        <section className="stream-preview" aria-label="Stream preview">
            <div className="stream-player-frame">
                {!playbackError && !playbackGrant && (
                    <p className="stream-player-loading" role="status">Authorizing playback…</p>
                )}
                {!playbackError && playbackGrant && (
                    <Suspense fallback={<p className="stream-player-loading" role="status">Loading player…</p>}>
                        <VideoJsStreamPlayer
                            key={`${manifestUrl}-${attempt}`}
                            manifestUrl={manifestUrl}
                            playbackGrantRef={playbackGrantRef}
                            title={title}
                            onPlaybackError={handlePlaybackError}
                        />
                    </Suspense>
                )}
                {playbackError && (
                    <div className="stream-player-message stream-player-error" role="alert">
                        <div>
                            <h4>{playbackError.title}</h4>
                            <p>{playbackError.message}</p>
                        </div>
                        <Button
                            variant="secondary"
                            onClick={() => {
                                setPlaybackError(null);
                                setAttempt((current) => current + 1);
                            }}
                        >
                            Retry playback
                        </Button>
                    </div>
                )}
            </div>
        </section>
    );
}
