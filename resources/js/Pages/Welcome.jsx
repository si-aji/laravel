import { Head } from '@inertiajs/react';
import Button from '../Components/Button';

export default function Welcome() {
    return (
        <>
            <Head title="Your VOD account" />
            <section className="welcome-hero" aria-labelledby="welcome-heading">
                <div className="welcome-copy">
                    <h1 id="welcome-heading">Your VOD.<br />Your space.</h1>
                    <p>Sign in to your guest account, or create one to get started. Your account is the starting point for video on demand.</p>
                    <div className="actions">
                        <Button href="/guest/sign-in">Guest sign-in</Button>
                        <Button href="/guest/register" variant="text">Create an account</Button>
                    </div>
                </div>
                <section className="access-sheet" aria-labelledby="access-heading">
                    <h2 id="access-heading">Find your place</h2>
                    <div className="access-row">
                        <h3>For guests</h3>
                        <p>A personal account, with a space of your own.</p>
                        <Button href="/guest/sign-in" variant="text">Go to guest sign-in</Button>
                    </div>
                    <div className="access-row">
                        <h3>For administrators</h3>
                        <p>A separate workspace for the people managing the service.</p>
                        <Button href="/adm/sign-in" variant="text">Go to admin sign-in</Button>
                    </div>
                </section>
            </section>
            <section className="public-notice" aria-labelledby="service-heading">
                <h2 id="service-heading">Account access is ready.</h2>
                <p>Video viewing and management tools are still being built. For now, you can create an account and sign in.</p>
            </section>
        </>
    );
}
