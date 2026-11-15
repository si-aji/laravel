import { Head, Link } from '@inertiajs/react';
import SignInForm from './SignInForm';

export default function GuestSignIn() {
    return (
        <>
            <Head title="Guest sign-in" />
            <div className="page-heading">
                <h1>Guest sign-in</h1>
                <p>Welcome back. Continue to your personal account.</p>
            </div>
            <SignInForm action="/guest/sign-in" submitLabel="Sign in as guest" />
            <p className="form-footer">New here? <Link className="text-link" href="/guest/register">Create a guest account</Link></p>
        </>
    );
}
