import { useForm } from '@inertiajs/react';

export default function SignInForm({ action, submitLabel }) {
    const { data, setData, post, processing, errors } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    function submit(event) {
        event.preventDefault();
        post(action);
    }

    return (
        <form className="space-y-5" onSubmit={submit}>
            <div>
                <label className="mb-2 block text-sm font-medium text-white" htmlFor="email">Email address</label>
                <input
                    autoComplete="email"
                    className="min-h-12 w-full rounded-sm border border-[#514d46] bg-[#111110] px-3 text-base text-white outline-none transition-colors placeholder:text-[#77746D] hover:border-[#77746D] focus:border-[#FF7769] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF4433]"
                    id="email"
                    name="email"
                    onChange={(event) => setData('email', event.target.value)}
                    placeholder="you@example.com"
                    required
                    type="email"
                    value={data.email}
                />
                {errors.email && <p className="mt-2 text-sm text-[#ff9a8f]" role="alert">{errors.email}</p>}
            </div>

            <div>
                <label className="mb-2 block text-sm font-medium text-white" htmlFor="password">Password</label>
                <input
                    autoComplete="current-password"
                    className="min-h-12 w-full rounded-sm border border-[#514d46] bg-[#111110] px-3 text-base text-white outline-none transition-colors placeholder:text-[#77746D] hover:border-[#77746D] focus:border-[#FF7769] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF4433]"
                    id="password"
                    name="password"
                    onChange={(event) => setData('password', event.target.value)}
                    required
                    type="password"
                    value={data.password}
                />
                {errors.password && <p className="mt-2 text-sm text-[#ff9a8f]" role="alert">{errors.password}</p>}
            </div>

            <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-[#B7B4AC]">
                <input
                    checked={data.remember}
                    className="size-4 accent-[#FF7769] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF4433]"
                    name="remember"
                    onChange={(event) => setData('remember', event.target.checked)}
                    type="checkbox"
                />
                Keep me signed in
            </label>

            <button
                className="min-h-12 w-full rounded-sm bg-[#eeeeec] px-5 font-medium text-[#1C1C1A] transition-colors hover:bg-white active:bg-[#d7d5d0] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FF4433] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={processing}
                type="submit"
            >
                {processing ? 'Signing in…' : submitLabel}
            </button>
        </form>
    );
}
