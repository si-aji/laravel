import { Head, Link, useForm } from '@inertiajs/react';
import Button from '../../Components/Button';
import FormField from '../../Components/FormField';

export default function GuestRegister() {
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
    });

    function submit(event) {
        event.preventDefault();
        post('/guest/register', { onFinish: () => reset('password', 'password_confirmation') });
    }

    return (
        <>
            <Head title="Create a guest account" />
            <div className="page-heading">
                <h1>Create your account</h1>
                <p>A guest account gives you your own space.</p>
            </div>
            <form className="form-stack" onSubmit={submit} aria-busy={processing}>
                <FormField autoComplete="name" error={errors.name} id="name" label="Name" maxLength={255} onChange={(value) => setData('name', value)} value={data.name} />
                <FormField autoComplete="username" error={errors.email} id="email" label="Email address" maxLength={255} onChange={(value) => setData('email', value)} type="email" value={data.email} />
                <FormField autoComplete="new-password" error={errors.password} hint="Use at least 8 characters." id="password" label="Password" onChange={(value) => setData('password', value)} type="password" value={data.password} />
                <FormField autoComplete="new-password" error={errors.password_confirmation} id="password_confirmation" label="Confirm password" onChange={(value) => setData('password_confirmation', value)} type="password" value={data.password_confirmation} />
                <Button className="button-full" disabled={processing} type="submit">{processing ? 'Creating account…' : 'Create guest account'}</Button>
            </form>
            <p className="form-footer">Already have an account? <Link className="text-link" href="/guest/sign-in">Sign in</Link></p>
        </>
    );
}
