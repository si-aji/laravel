import { Link, usePage } from '@inertiajs/react';

export default function Brand({ href = '/' }) {
    const { appName } = usePage().props;

    return <Link className="brand" href={href}>{appName}<span className="brand-description">Video on demand</span></Link>;
}
