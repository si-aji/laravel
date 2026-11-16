import { createInertiaApp } from '@inertiajs/react';
import { createRoot } from 'react-dom/client';
import PublicLayout from './Layouts/PublicLayout';
import AuthLayout from './Layouts/AuthLayout';
import AdminLayout from './Layouts/AdminLayout';
import GuestLayout from './Layouts/GuestLayout';

createInertiaApp({
    layout: (name) => {
        if (name === 'Auth/AdminDashboard' || name.startsWith('Admin/')) {
            return AdminLayout;
        }

        if (name === 'Auth/GuestDashboard' || name.startsWith('Guest/')) {
            return GuestLayout;
        }

        if (name.startsWith('Auth/')) {
            return AuthLayout;
        }

        if (name === 'Welcome' || name.startsWith('Public/')) {
            return PublicLayout;
        }

        throw new Error(`No layout assigned for Inertia page: ${name}`);
    },
    resolve: (name) => {
        const pages = import.meta.glob('./Pages/**/*.jsx', { eager: true });

        const page = pages[`./Pages/${name}.jsx`];

        if (!page) {
            throw new Error(`Inertia page not found: ${name}`);
        }

        return page;
    },
    setup({ el, App, props }) {
        createRoot(el).render(<App {...props} />);
    },
});
