import { useForm } from '@inertiajs/react';
import Button from '../../Components/Button';
import FormField from '../../Components/FormField';

export default function SignInForm({ action, submitLabel }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    function submit(event) {
        event.preventDefault();
        post(action, { onFinish: () => reset('password') });
    }

    return (
        <form className="form-stack" onSubmit={submit} aria-busy={processing}>
            <FormField
                autoComplete="username"
                error={errors.email}
                id="email"
                label="Email address"
                onChange={(value) => setData('email', value)}
                type="email"
                value={data.email}
            />
            <FormField
                autoComplete="current-password"
                error={errors.password}
                id="password"
                label="Password"
                onChange={(value) => setData('password', value)}
                type="password"
                value={data.password}
            />
            <label className="checkbox-field">
                <input
                    checked={data.remember}
                    name="remember"
                    onChange={(event) => setData('remember', event.target.checked)}
                    type="checkbox"
                />
                Keep me signed in
            </label>
            <Button className="button-full" disabled={processing} type="submit">
                {processing ? 'Signing in…' : submitLabel}
            </Button>
        </form>
    );
}
