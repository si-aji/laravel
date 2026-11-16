import { useCallback, useEffect, useMemo, useState } from 'react';
import { Hls } from '@videojs/hlsjs-video';
import { HlsJsVideo } from '@videojs/react/media/hlsjs-video';
import { NeutralVideoSkin, VideoPlayer } from '@videojs/react/video';
import '@videojs/react/video/neutral-skin.css';

export default function VideoJsStreamPlayer({ manifestUrl, playbackGrantRef, title, onPlaybackError }) {
    const [mediaAdapter, setMediaAdapter] = useState(null);

    const setupPlaybackRequest = useCallback((xhr) => {
        if (playbackGrantRef.current) {
            xhr.setRequestHeader('X-Playback-Grant', playbackGrantRef.current);
        }
    }, [playbackGrantRef]);
    const source = useMemo(() => ({
        src: manifestUrl,
        type: 'application/vnd.apple.mpegurl',
        preferPlayback: 'mse',
        engine: {
            hlsJs: {
                xhrSetup: setupPlaybackRequest,
            },
        },
    }), [manifestUrl, setupPlaybackRequest]);

    useEffect(() => {
        const engine = mediaAdapter?.engine;
        if (!engine) return undefined;

        function handleHlsError(_event, data) {
            if (data.fatal) {
                onPlaybackError(data.response?.code);
            }
        }

        engine.on(Hls.Events.ERROR, handleHlsError);

        return () => {
            engine.off(Hls.Events.ERROR, handleHlsError);
        };
    }, [mediaAdapter, onPlaybackError]);

    return (
        <VideoPlayer>
            <NeutralVideoSkin
                style={{
                    width: '100%',
                    aspectRatio: '16 / 9',
                    '--media-accent-color': 'var(--accent)',
                    '--media-accent-text-color': 'var(--surface)',
                    '--media-border-color': 'transparent',
                    '--media-border-radius': 'var(--radius-panel)',
                    '--media-controls-before-start': 'visible',
                    '--media-font-family': 'var(--font-sans)',
                    '--media-scale-unit': '1rem',
                }}
            >
                <HlsJsVideo
                    mediaRef={setMediaAdapter}
                    source={source}
                    streamType="on-demand"
                    playsInline
                    preload="metadata"
                    width={1280}
                    height={720}
                    aria-label={`Stream preview: ${title}`}
                    onError={() => onPlaybackError()}
                />
            </NeutralVideoSkin>
        </VideoPlayer>
    );
}
