import { Link } from '@inertiajs/react';
import AuthLayout from './AuthLayout';
import SignInForm from './SignInForm';

export default function GuestSignIn() {
    return (
        <AuthLayout
            eyebrow="Guest access"
            footer={<>New here? <Link className="ml-1 text-white underline decoration-[#625e57] underline-offset-4 hover:decoration-[#FF7769] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF4433]" href="/guest/register">Create a guest account</Link></>}
            title="Sign in to your account"
        >
            <SignInForm action="/guest/sign-in" submitLabel="Sign in as guest" />
        </AuthLayout>
    );
}
