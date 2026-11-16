import { Head } from '@inertiajs/react';
import AccountDetails from '../../Components/AccountDetails';
import AvailabilityNotice from '../../Components/AvailabilityNotice';

export default function GuestDashboard({ account }) {
    return (
        <>
            <Head title="My guest account" />
            <div className="dashboard-heading guest-greeting">
                <h1>Welcome, {account.name}.</h1>
                <p>This is your space. You’re signed in to your guest account.</p>
            </div>
            <AccountDetails account={account} kind="Guest" />
            <AvailabilityNotice />
        </>
    );
}
