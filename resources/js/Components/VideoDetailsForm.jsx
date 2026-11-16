import { useEffect, useId, useState } from 'react';
import Button from './Button';
import { useConfirmDialog } from './ConfirmDialogProvider';
import FormField from './FormField';
import { web } from './VideoUpload/MultipartUpload';

export default function VideoDetailsForm({ title = '', description = '', url, disabled = false, onSaved, onDirtyChange }) {
    const [data, setData] = useState({ title, description: description || '' });
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [savedData, setSavedData] = useState(data);
    const dirty = data.title !== savedData.title || data.description !== savedData.description;
    const formId = useId();
    const { registerUnsavedChanges } = useConfirmDialog();

    useEffect(() => {
        registerUnsavedChanges(formId, dirty);
        onDirtyChange?.(dirty);
        return () => registerUnsavedChanges(formId, false);
    }, [dirty, formId, onDirtyChange, registerUnsavedChanges]);

    useEffect(() => {
        const unload = (event) => { if (dirty) event.preventDefault(); };
        window.addEventListener('beforeunload', unload);
        return () => window.removeEventListener('beforeunload', unload);
    }, [dirty]);

    async function submit(event) {
        event.preventDefault();
        setSaving(true);
        setErrors({});
        setSaved(false);
        try {
            await web.patch(url, data);
            setSaved(true);
            setSavedData(data);
            onSaved?.(data);
        } catch (error) {
            const fields = error.response?.data?.errors;
            setErrors(fields ? Object.fromEntries(Object.entries(fields).map(([key, values]) => [key, values[0]]))
                : { video: error.response?.data?.message || 'Details could not be saved. Check your connection and try again.' });
        } finally {
            setSaving(false);
        }
    }

    function change(key, value) {
        setSaved(false);
        setData((current) => ({ ...current, [key]: value }));
    }

    return (
        <form className="form-stack" onSubmit={submit} aria-busy={saving}>
            <FormField id="video-title" label="Title" value={data.title} maxLength={255} error={errors.title} onChange={(value) => change('title', value)} disabled={disabled || saving} />
            <div className="form-field">
                <label htmlFor="video-description">Description</label>
                <textarea id="video-description" name="description" rows={7} maxLength={10000} value={data.description}
                    onChange={(event) => change('description', event.target.value)} disabled={disabled || saving}
                    aria-invalid={errors.description ? true : undefined}
                    aria-describedby={errors.description ? 'video-description-error' : undefined} />
                {errors.description && <p id="video-description-error" className="field-error" role="alert">{errors.description}</p>}
            </div>
            {errors.video && <p className="field-error" role="alert">{errors.video}</p>}
            <div className="actions form-actions">
                <Button disabled={disabled || saving || !url} type="submit">{saving ? 'Saving details…' : 'Save details'}</Button>
                <span className="field-hint" role="status">{saved ? 'Details saved.' : 'Save changes before leaving this page.'}</span>
            </div>
        </form>
    );
}
