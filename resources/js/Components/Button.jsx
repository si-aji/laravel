import { Link } from '@inertiajs/react';

export default function Button({ href, variant = 'primary', className = '', children, ...props }) {
    const classes = `button button-${variant} ${className}`;

    if (href) {
        return <Link className={classes} href={href} {...props}>{children}</Link>;
    }

    return <button className={classes} type="button" {...props}>{children}</button>;
}
