import { useState } from 'react';
import { router } from '@inertiajs/react';
import Button from './Button';
import ConfirmDialog from './ConfirmDialog';
import { useUpload } from './VideoUpload/UploadProvider';
import { web } from './VideoUpload/MultipartUpload';

export default function DeleteVideoButton({ video }) {
    const [busy, setBusy] = useState(false);
    const [open, setOpen] = useState(false);
    const [error, setError] = useState(null);
    const { engine, state } = useUpload();
    const current = state.session?.video_id === video.id;
    const locked = current && ['starting', 'verifying', 'resuming', 'cancelling'].includes(state.phase);

    async function remove() {
        if (current) engine.pause();
        setBusy(true);
        setError(null);
        try {
            await web.delete(video.delete_url);
            if (current) engine.publish({ phase: 'cancelled', session: null, error: null });
            router.visit('/adm/videos');
        } catch (failure) {
            setError(failure.response?.data?.message || 'Deletion did not finish. The record has been kept; retry when your connection is available.');
        } finally {
            setBusy(false);
        }
    }

    return (
        <>
            <Button disabled={locked} variant="text" onClick={() => setOpen(true)} aria-label={`Delete ${video.title || video.filename}`}>
                {video.status === 'delete_pending' ? 'Retry deletion' : 'Delete'}
            </Button>
            <ConfirmDialog
                open={open}
                title={`Delete ${video.title || video.filename}?`}
                description="This permanently deletes the video record and stored file. Any active upload will also be cancelled."
                confirmLabel={video.status === 'delete_pending' ? 'Retry deletion' : 'Delete permanently'}
                cancelLabel="Keep video"
                destructive
                busy={busy}
                error={error}
                onCancel={() => setOpen(false)}
                onConfirm={remove}
            />
        </>
    );
}
