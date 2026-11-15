import { Head } from '@inertiajs/react';
import AccountDetails from '../../Components/AccountDetails';
import Button from '../../Components/Button';

export default function AdminDashboard({ account }) {
    return (
        <>
            <Head title="Admin account overview" />
            <div className="dashboard-heading">
                <h1>Account overview</h1>
                <p>Your administrator account and workspace.</p>
            </div>
            <AccountDetails account={account} kind="Administrator" />
            <section className="availability">
                <h2>Video library</h2>
                <p>Upload videos, update their details, and manage the shared library.</p>
                <div className="actions"><Button href="/adm/videos">Open video library</Button></div>
            </section>
        </>
    );
}
