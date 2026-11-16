import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import ConfirmDialog from './ConfirmDialog';

const ConfirmDialogContext = createContext(null);

export default function ConfirmDialogProvider({ children }) {
    const [request, setRequest] = useState(null);
    const resolveRequest = useRef(null);
    const unsavedForms = useRef(new Set());

    const confirm = useCallback((options) => new Promise((resolve) => {
        resolveRequest.current?.(false);
        resolveRequest.current = resolve;
        setRequest(options);
    }), []);

    const finish = useCallback((confirmed) => {
        const resolve = resolveRequest.current;
        resolveRequest.current = null;
        setRequest(null);
        resolve?.(confirmed);
    }, []);

    const registerUnsavedChanges = useCallback((key, isDirty) => {
        if (isDirty) {
            unsavedForms.current.add(key);
        } else {
            unsavedForms.current.delete(key);
        }
    }, []);

    const hasUnsavedChanges = useCallback(() => unsavedForms.current.size > 0, []);
    const context = useMemo(() => ({ confirm, registerUnsavedChanges, hasUnsavedChanges }), [
        confirm,
        hasUnsavedChanges,
        registerUnsavedChanges,
    ]);

    return (
        <ConfirmDialogContext.Provider value={context}>
            {children}
            <ConfirmDialog
                open={request !== null}
                title={request?.title}
                description={request?.description}
                confirmLabel={request?.confirmLabel}
                cancelLabel={request?.cancelLabel}
                destructive={request?.destructive}
                onCancel={() => finish(false)}
                onConfirm={() => finish(true)}
            />
        </ConfirmDialogContext.Provider>
    );
}

export function useConfirmDialog() {
    const context = useContext(ConfirmDialogContext);
    if (context === null) {
        throw new Error('useConfirmDialog must be used inside ConfirmDialogProvider.');
    }

    return context;
}
