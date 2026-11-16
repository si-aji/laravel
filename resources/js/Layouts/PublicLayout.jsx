import Brand from '../Components/Brand';
import Button from '../Components/Button';

export default function PublicLayout({ children }) {
    return (
        <div className="site-shell" data-layout="public">
            <a className="skip-link" href="#main-content">Skip to content</a>
            <header className="site-header frame">
                <Brand />
                <nav aria-label="Public navigation">
                    <Button href="/sign-in" variant="secondary">Sign in</Button>
                </nav>
            </header>
            <main className="public-main frame" id="main-content" tabIndex="-1">{children}</main>
            <footer className="site-footer frame">
                <span>Video on demand</span>
                <a className="text-link" href="/adm/sign-in">Admin sign-in</a>
            </footer>
        </div>
    );
}
