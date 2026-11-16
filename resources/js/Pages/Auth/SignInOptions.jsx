import { Head, Link } from '@inertiajs/react';
import Button from '../../Components/Button';

export default function SignInOptions() {
    return (
        <>
            <Head title="Choose your account" />
            <div className="page-heading">
                <h1>Choose your account</h1>
                <p>Use the sign-in that matches your account.</p>
            </div>
            <div className="account-options">
                <section className="account-option">
                    <h2>Guest</h2>
                    <p>Continue to your personal account.</p>
                    <Button href="/guest/sign-in">Guest sign-in</Button>
                </section>
                <section className="account-option">
                    <h2>Administrator</h2>
                    <p>Access the service’s admin workspace.</p>
                    <Button href="/adm/sign-in" variant="secondary">Admin sign-in</Button>
                </section>
            </div>
            <p className="form-footer">Need a guest account? <Link className="text-link" href="/guest/register">Create an account</Link></p>
        </>
    );
}
