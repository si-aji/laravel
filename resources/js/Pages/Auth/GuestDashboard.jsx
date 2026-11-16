import { Head } from '@inertiajs/react';
import AccountDetails from '../../Components/AccountDetails';
import AvailabilityNotice from '../../Components/AvailabilityNotice';
import Button from '../../Components/Button';

export default function GuestDashboard({ account }) {
    return (
        <>
            <Head title="My guest account" />
            <div className="dashboard-heading guest-greeting">
                <h1>Welcome, {account.name}.</h1>
                <p>Browse the videos shared with guest accounts.</p>
            </div>
            <section className="panel guest-library-entry" aria-labelledby="guest-library-heading">
                <div>
                    <h2 id="guest-library-heading">Video library</h2>
                    <p className="section-description">Published videos are available while you are signed in.</p>
                </div>
                <Button href="/guest/videos">Open video library</Button>
            </section>
            <AccountDetails account={account} kind="Guest" />
        </>
    );
}
