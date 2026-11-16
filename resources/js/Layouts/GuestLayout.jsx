import { Link, usePage } from '@inertiajs/react';
import Brand from '../Components/Brand';
import SignOutButton from '../Components/SignOutButton';

export default function GuestLayout({ children }) {
    const { url } = usePage();

    return (
        <div className="site-shell guest-shell" data-layout="guest">
            <a className="skip-link" href="#main-content">Skip to content</a>
            <header className="site-header frame guest-header">
                <Brand href="/guest" />
                <nav aria-label="Guest navigation">
                    <Link className="nav-link" href="/guest" aria-current={url.split('?')[0] === '/guest' ? 'page' : undefined}>My account</Link>
                    <Link className="nav-link" href="/guest/videos" aria-current={url.split('?')[0].startsWith('/guest/videos') ? 'page' : undefined}>Video library</Link>
                </nav>
                <SignOutButton action="/guest/sign-out" />
            </header>
            <main className="guest-main frame" id="main-content" tabIndex="-1">{children}</main>
            <footer className="site-footer frame"><span>Your VOD guest account</span><span>Guest workspace</span></footer>
        </div>
    );
}
