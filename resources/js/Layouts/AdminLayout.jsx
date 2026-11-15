import { Link, usePage } from '@inertiajs/react';
import Brand from '../Components/Brand';
import SignOutButton from '../Components/SignOutButton';
import ConfirmDialogProvider from '../Components/ConfirmDialogProvider';
import UploadProvider from '../Components/VideoUpload/UploadProvider';
import UploadProgress from '../Components/VideoUpload/UploadProgress';

export default function AdminLayout({ children }) {
    const { account, adminId } = usePage().props;
    const { url } = usePage();

    return (
        <ConfirmDialogProvider>
        <UploadProvider key={adminId} adminId={adminId}>
        <div className="admin-shell" data-layout="admin">
            <a className="skip-link" href="#main-content">Skip to content</a>
            <header className="admin-sidebar">
                <Brand href="/adm" />
                <div className="workspace-label">Admin workspace</div>
                <nav aria-label="Admin navigation">
                    <Link className="nav-link" href="/adm" aria-current={url.split('?')[0] === '/adm' ? 'page' : undefined}>Account overview</Link>
                    <Link className="nav-link" href="/adm/videos" aria-current={url.split('?')[0].startsWith('/adm/videos') ? 'page' : undefined}>Video library</Link>
                </nav>
                <div className="sidebar-account">
                    <p className="account-name">{account?.name}</p>
                    <p className="sidebar-email">{account?.email}</p>
                    <SignOutButton action="/adm/sign-out" />
                </div>
            </header>
            <div className="admin-content">
                <main id="main-content" tabIndex="-1">
                    {url.split('?')[0] !== '/adm/videos/upload' && <UploadProgress compact />}
                    {children}
                </main>
                <footer className="dashboard-footer">VOD admin workspace</footer>
            </div>
        </div>
        </UploadProvider>
        </ConfirmDialogProvider>
    );
}
