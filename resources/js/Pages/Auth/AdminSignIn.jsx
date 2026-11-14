import AuthLayout from './AuthLayout';
import SignInForm from './SignInForm';

export default function AdminSignIn() {
    return (
        <AuthLayout eyebrow="Admin access" title="Sign in to manage the service">
            <SignInForm action="/adm/sign-in" submitLabel="Sign in as admin" />
        </AuthLayout>
    );
}
