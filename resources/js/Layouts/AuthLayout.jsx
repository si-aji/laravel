import { Link } from '@inertiajs/react';
import Brand from '../Components/Brand';

export default function AuthLayout({ children }) {
    return (
        <div className="site-shell" data-layout="auth">
            <a className="skip-link" href="#main-content">Skip to content</a>
            <header className="site-header frame">
                <Brand />
                <nav aria-label="Account navigation"><Link className="text-link" href="/">Back to home</Link></nav>
            </header>
            <main className="auth-main frame" id="main-content" tabIndex="-1">
                <aside className="auth-intro" aria-label="About account access">
                    <p className="auth-statement">Your account.<br />Your own space.</p>
                    <p>One place to access your VOD account. Separate spaces for guests and administrators.</p>
                    <div className="auth-context">
                        <span>Here to manage the service?</span>
                        <Link className="text-link" href="/adm/sign-in">Use admin sign-in</Link>
                    </div>
                </aside>
                <div className="auth-panel">{children}</div>
            </main>
            <footer className="site-footer frame">
                <span>VOD account access</span>
                <Link className="text-link" href="/sign-in">Choose account type</Link>
            </footer>
        </div>
    );
}
