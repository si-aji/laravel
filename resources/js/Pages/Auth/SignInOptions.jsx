import { Head, Link, usePage } from '@inertiajs/react';

export default function SignInOptions() {
    const { appName } = usePage().props;

    return (
        <>
            <Head title="Sign in" />
            <main className="min-h-screen bg-[#0a0a0a] text-[#EDEDEC]">
                <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-5 py-6 sm:px-8 lg:px-12">
                    <header className="flex min-h-12 items-center border-b border-[#302f2b] pb-4">
                        <Link className="text-sm font-semibold tracking-tight text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FF4433]" href="/">
                            {appName}
                        </Link>
                    </header>

                    <section aria-labelledby="sign-in-heading" className="flex flex-1 flex-col justify-center py-14">
                        <div className="max-w-2xl">
                            <p className="text-sm font-medium text-[#FF7769]">Account access</p>
                            <h1 className="mt-5 text-4xl font-medium leading-tight tracking-tight text-white text-balance sm:text-5xl" id="sign-in-heading">
                                Choose how you want to sign in.
                            </h1>
                            <p className="mt-5 max-w-xl text-base leading-7 text-[#B7B4AC]">
                                Admins manage the service. Guests use a personal viewing account.
                            </p>
                        </div>

                        <div className="mt-12 grid gap-8 border-y border-[#302f2b] py-8 sm:grid-cols-2 sm:gap-12 sm:py-10">
                            <div className="flex flex-col items-start">
                                <h2 className="text-xl font-medium tracking-tight text-white">Admin</h2>
                                <p className="mt-3 max-w-sm text-sm leading-6 text-[#A1A09A]">
                                    Sign in to manage the service.
                                </p>
                                <Link className="mt-6 inline-flex min-h-12 items-center rounded-sm bg-[#eeeeec] px-5 font-medium text-[#1C1C1A] transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FF4433]" href="/adm/sign-in">
                                    Admin sign-in
                                </Link>
                            </div>

                            <div className="flex flex-col items-start sm:border-l sm:border-[#302f2b] sm:pl-10">
                                <h2 className="text-xl font-medium tracking-tight text-white">Guest</h2>
                                <p className="mt-3 max-w-sm text-sm leading-6 text-[#A1A09A]">
                                    Sign in to your viewing account or create one.
                                </p>
                                <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
                                    <Link className="inline-flex min-h-12 items-center rounded-sm bg-[#eeeeec] px-5 font-medium text-[#1C1C1A] transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FF4433]" href="/guest/sign-in">
                                        Guest sign-in
                                    </Link>
                                    <Link className="inline-flex min-h-12 items-center text-sm text-[#C5C1B8] underline decoration-[#625e57] underline-offset-4 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FF4433]" href="/guest/register">
                                        Create account
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </section>

                    <footer className="border-t border-[#302f2b] py-5 text-xs text-[#77746D]">VOD account access</footer>
                </div>
            </main>
        </>
    );
}
