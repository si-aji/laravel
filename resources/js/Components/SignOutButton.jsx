import { useForm } from '@inertiajs/react';
import Button from './Button';

export default function SignOutButton({ action }) {
    const { post, processing, errors } = useForm();

    function submit(event) {
        event.preventDefault();
        post(action);
    }

    return (
        <form onSubmit={submit} aria-busy={processing}>
            <Button disabled={processing} type="submit" variant="secondary">
                {processing ? 'Signing out…' : 'Sign out'}
            </Button>
            {Object.values(errors).map((error, index) => <p className="field-error" key={index} role="alert">{error}</p>)}
        </form>
    );
}
