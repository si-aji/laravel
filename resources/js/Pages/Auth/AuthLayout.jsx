import { Head, Link, usePage } from '@inertiajs/react';

export default function AuthLayout({ title, eyebrow, children, footer }) {
    const { appName } = usePage().props;

    return (
        <>
            <Head title={title} />
            <main className="min-h-screen bg-[#0a0a0a] text-[#EDEDEC]">
                <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-6 sm:px-8 lg:px-12">
                    <header className="flex min-h-12 items-center justify-between border-b border-[#302f2b] pb-4">
                        <Link className="text-sm font-semibold tracking-tight text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FF4433]" href="/">
                            {appName}
                        </Link>
                        <p className="text-xs text-[#A1A09A]">Video on demand</p>
                    </header>

                    <section className="grid flex-1 content-center gap-12 py-12 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,25rem)] lg:gap-20">
                        <div className="max-w-xl self-center">
                            <p className="text-sm font-medium text-[#FF7769]">{eyebrow}</p>
                            <h1 className="mt-5 text-4xl font-medium leading-tight tracking-tight text-white text-balance sm:text-5xl">{title}</h1>
                            <p className="mt-5 max-w-lg text-base leading-7 text-[#B7B4AC]">
                                Sign in to continue to your {eyebrow === 'Admin access' ? 'admin workspace' : 'guest account'}.
                            </p>
                            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm">
                                <Link className="inline-flex min-h-11 items-center text-[#C5C1B8] underline decoration-[#625e57] underline-offset-4 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FF4433]" href="/adm/sign-in">
                                    Admin sign-in
                                </Link>
                                <Link className="inline-flex min-h-11 items-center text-[#C5C1B8] underline decoration-[#625e57] underline-offset-4 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FF4433]" href="/guest/sign-in">
                                    Guest sign-in
                                </Link>
                            </div>
                        </div>

                        <div className="w-full self-center border-y border-[#302f2b] py-7 sm:py-9 lg:border-l lg:border-y-0 lg:py-3 lg:pl-10">
                            {children}
                            {footer && <div className="mt-7 border-t border-[#302f2b] pt-5 text-sm text-[#A1A09A]">{footer}</div>}
                        </div>
                    </section>

                    <footer className="border-t border-[#302f2b] py-5 text-xs text-[#77746D]">VOD account access</footer>
                </div>
            </main>
        </>
    );
}
