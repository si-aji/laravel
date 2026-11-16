import { Head, Link } from '@inertiajs/react';
import SignInForm from './SignInForm';

export default function AdminSignIn() {
    return (
        <>
            <Head title="Admin sign-in" />
            <div className="page-heading">
                <h1>Admin sign-in</h1>
                <p>Use your administrator account to enter the workspace.</p>
            </div>
            <SignInForm action="/adm/sign-in" submitLabel="Sign in as admin" />
            <p className="form-footer">Looking for your guest account? <Link className="text-link" href="/guest/sign-in">Guest sign-in</Link></p>
        </>
    );
}
