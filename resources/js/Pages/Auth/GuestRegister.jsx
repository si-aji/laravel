import { Link, useForm } from '@inertiajs/react';
import AuthLayout from './AuthLayout';

export default function GuestRegister() {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
    });

    function submit(event) {
        event.preventDefault();
        post('/guest/register');
    }

    return (
        <AuthLayout
            eyebrow="Guest access"
            footer={<>Already have an account? <Link className="ml-1 text-white underline decoration-[#625e57] underline-offset-4 hover:decoration-[#FF7769] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF4433]" href="/guest/sign-in">Sign in</Link></>}
            title="Create your guest account"
        >
            <form className="max-h-[70vh] space-y-4 overflow-y-auto px-1 py-1" onSubmit={submit}>
                <Field errors={errors} id="name" label="Name" onChange={(value) => setData('name', value)} value={data.name} autoComplete="name" />
                <Field errors={errors} id="email" label="Email address" onChange={(value) => setData('email', value)} value={data.email} autoComplete="email" type="email" />
                <Field errors={errors} id="password" label="Password" onChange={(value) => setData('password', value)} value={data.password} autoComplete="new-password" type="password" />
                <Field errors={errors} id="password_confirmation" label="Confirm password" onChange={(value) => setData('password_confirmation', value)} value={data.password_confirmation} autoComplete="new-password" type="password" />
                <button
                    className="mt-2 min-h-12 w-full rounded-sm bg-[#eeeeec] px-5 font-medium text-[#1C1C1A] transition-colors hover:bg-white active:bg-[#d7d5d0] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FF4433] disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={processing}
                    type="submit"
                >
                    {processing ? 'Creating account…' : 'Create guest account'}
                </button>
            </form>
        </AuthLayout>
    );
}

function Field({ errors, id, label, onChange, value, type = 'text', autoComplete }) {
    return (
        <div>
            <label className="mb-2 block text-sm font-medium text-white" htmlFor={id}>{label}</label>
            <input
                autoComplete={autoComplete}
                className="min-h-12 w-full rounded-sm border border-[#514d46] bg-[#111110] px-3 text-base text-white outline-none transition-colors placeholder:text-[#77746D] hover:border-[#77746D] focus:border-[#FF7769] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF4433]"
                id={id}
                name={id}
                onChange={(event) => onChange(event.target.value)}
                required
                type={type}
                value={value}
            />
            {errors[id] && <p className="mt-2 text-sm text-[#ff9a8f]" role="alert">{errors[id]}</p>}
        </div>
    );
}
