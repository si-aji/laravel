import { useEffect, useState } from 'react';

export default function FormField({ id, label, error, hint, onChange, type = 'text', ...props }) {
    const [passwordVisible, setPasswordVisible] = useState(false);
    const isPassword = type === 'password';
    const description = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined;

    useEffect(() => {
        if (props.value === '') {
            setPasswordVisible(false);
        }
    }, [props.value]);

    return (
        <div className="form-field">
            <label htmlFor={id}>{label}</label>
            <div className={isPassword ? 'password-control' : undefined}>
                <input
                    aria-describedby={description}
                    aria-invalid={error ? true : undefined}
                    className={isPassword ? 'password-input' : undefined}
                    id={id}
                    name={id}
                    onChange={(event) => onChange(event.target.value)}
                    required
                    type={isPassword && passwordVisible ? 'text' : type}
                    {...props}
                />
                {isPassword && (
                    <button
                        aria-controls={id}
                        aria-label={`${passwordVisible ? 'Hide' : 'Show'} ${label.toLowerCase()}`}
                        className="password-toggle"
                        onClick={() => setPasswordVisible((visible) => !visible)}
                        type="button"
                    >
                        {passwordVisible ? 'Hide' : 'Show'}
                    </button>
                )}
            </div>
            {hint && <p className="field-hint" id={`${id}-hint`}>{hint}</p>}
            {error && <p className="field-error" id={`${id}-error`} role="alert">{error}</p>}
        </div>
    );
}
