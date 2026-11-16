export default function AvailabilityNotice({ admin = false }) {
    return (
        <section className="availability" aria-labelledby="availability-heading">
            <h2 id="availability-heading">{admin ? 'Video management is not available yet' : 'Video viewing is not available yet'}</h2>
            <p>{admin
                ? 'You can access your admin account. Upload and library management tools have not been added to this workspace.'
                : 'Your guest account is ready. There are no viewing features available in this account yet.'}</p>
        </section>
    );
}
