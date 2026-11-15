import { useEffect, useId, useRef } from 'react';
import Button from './Button';

export default function ConfirmDialog({
    open,
    title,
    description,
    confirmLabel,
    cancelLabel = 'Cancel',
    destructive = false,
    busy = false,
    error = null,
    onConfirm,
    onCancel,
}) {
    const dialog = useRef(null);
    const heading = useId();
    const details = useId();

    useEffect(() => {
        const element = dialog.current;
        if (!element) {
            return;
        }

        if (open && !element.open) {
            element.showModal();
        } else if (!open && element.open) {
            element.close();
        }
    }, [open]);

    return (
        <dialog
            ref={dialog}
            className="confirmation-dialog"
            aria-labelledby={heading}
            aria-describedby={details}
            onCancel={(event) => {
                event.preventDefault();
                if (!busy) {
                    onCancel();
                }
            }}
            onClick={(event) => {
                if (event.target === event.currentTarget && !busy) {
                    onCancel();
                }
            }}
        >
            <h2 id={heading}>{title}</h2>
            <p id={details}>{description}</p>
            {error && <p className="field-error" role="alert">{error}</p>}
            <div className="actions">
                <Button variant="secondary" disabled={busy} autoFocus onClick={onCancel}>{cancelLabel}</Button>
                <Button className={destructive ? 'button-danger' : ''} disabled={busy} onClick={onConfirm}>
                    {busy ? 'Working…' : confirmLabel}
                </Button>
            </div>
        </dialog>
    );
}
