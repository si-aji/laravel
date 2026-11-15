export default function AccountDetails({ account, kind }) {
    return (
        <section className="panel" aria-labelledby="account-heading">
            <div className="section-heading">
                <h2 id="account-heading">Account details</h2>
                <span className="account-kind">{kind}</span>
            </div>
            <dl className="account-details">
                <div><dt>Name</dt><dd>{account.name}</dd></div>
                <div><dt>Email address</dt><dd>{account.email}</dd></div>
            </dl>
        </section>
    );
}
