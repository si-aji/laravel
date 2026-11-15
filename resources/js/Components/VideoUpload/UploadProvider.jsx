import { createContext, useContext, useEffect, useState, useSyncExternalStore } from 'react';
import { router } from '@inertiajs/react';
import { useConfirmDialog } from '../ConfirmDialogProvider';
import { MultipartUpload } from './MultipartUpload';

const UploadContext = createContext(null);

export default function UploadProvider({ adminId, children }) {
    const [engine] = useState(() => {
        let storage = null;
        try { storage = window.sessionStorage; } catch { /* Uploading does not require browser storage. */ }
        return new MultipartUpload({ storage, key: `vod-upload:${adminId}` });
    });
    const state = useSyncExternalStore(engine.subscribe, engine.snapshot);
    const { confirm, hasUnsavedChanges } = useConfirmDialog();

    useEffect(() => {
        if (['complete', 'cancelled'].includes(state.phase) && window.location.pathname === '/adm/videos') {
            router.reload({ only: ['videos'] });
        }
    }, [state.phase]);

    useEffect(() => {
        const timer = setInterval(() => {
            if (!['idle', 'complete', 'cancelled'].includes(engine.state.phase)) engine.tick();
        }, 500);
        const unload = (event) => {
            if (!['idle', 'complete', 'cancelled'].includes(engine.state.phase)) event.preventDefault();
        };
        window.addEventListener('beforeunload', unload);
        let allowNextLeavingVisit = false;
        const remove = router.on('before', (event) => {
            const visit = event.detail.visit;
            const path = visit.url.pathname;
            const leavesAdmin = !path.startsWith('/adm') || ['/adm/sign-out', '/adm/sign-in'].includes(path);
            const stopsUpload = leavesAdmin && !['idle', 'complete', 'cancelled'].includes(engine.state.phase);
            const leavesUnsavedDetails = hasUnsavedChanges() && visit.url.pathname !== window.location.pathname;
            if (allowNextLeavingVisit) {
                allowNextLeavingVisit = false;
                return;
            }
            if (stopsUpload || leavesUnsavedDetails) {
                event.preventDefault();
                const consequences = [];
                if (stopsUpload) {
                    consequences.push('The upload will stop. Reselect the original file to resume it later.');
                }
                if (leavesUnsavedDetails) {
                    consequences.push('Your video details have unsaved changes.');
                }
                confirm({
                    title: leavesAdmin ? 'Leave admin workspace?' : 'Leave this page?',
                    description: consequences.join(' '),
                    confirmLabel: leavesAdmin ? 'Leave workspace' : 'Leave page',
                    cancelLabel: 'Stay here',
                }).then((confirmed) => {
                    if (confirmed) {
                        allowNextLeavingVisit = true;
                        router.visit(visit.url, visit);
                    }
                });
            }
        });
        return () => {
            clearInterval(timer);
            engine.dispose();
            window.removeEventListener('beforeunload', unload);
            remove();
        };
    }, [confirm, engine, hasUnsavedChanges]);

    return <UploadContext.Provider value={{ engine, state }}>{children}</UploadContext.Provider>;
}

export function useUpload() {
    return useContext(UploadContext);
}
