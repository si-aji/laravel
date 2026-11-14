import { Head, useForm } from '@inertiajs/react';

export default function GuestDashboard({ account }) {
    const { post, processing } = useForm();

    function signOut(event) {
        event.preventDefault();
        post('/guest/sign-out');
    }

    return (
        <>
            <Head title="Guest account" />
            <main className="min-h-screen bg-[#0a0a0a] text-[#EDEDEC]">
                <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-5 py-6 sm:px-8 lg:px-12">
                    <header className="flex min-h-12 items-center justify-between border-b border-[#302f2b] pb-4">
                        <a className="text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FF4433]" href="/">VOD</a>
                        <form onSubmit={signOut}>
                            <button className="inline-flex min-h-11 items-center text-sm text-[#B7B4AC] underline decoration-[#625e57] underline-offset-4 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FF4433] disabled:cursor-not-allowed" disabled={processing} type="submit">Sign out</button>
                        </form>
                    </header>
                    <section className="flex flex-1 flex-col justify-center py-14">
                        <p className="text-sm font-medium text-[#FF7769]">Guest access</p>
                        <h1 className="mt-4 text-4xl font-medium tracking-tight text-white sm:text-5xl">Welcome, {account.name}.</h1>
                        <dl className="mt-10 grid gap-5 border-y border-[#302f2b] py-6 sm:grid-cols-2">
                            <div><dt className="text-sm text-[#A1A09A]">Name</dt><dd className="mt-1 font-medium text-white">{account.name}</dd></div>
                            <div><dt className="text-sm text-[#A1A09A]">Email</dt><dd className="mt-1 break-all font-medium text-white">{account.email}</dd></div>
                        </dl>
                        <p className="mt-8 max-w-xl text-sm leading-6 text-[#A1A09A]">Your guest account is ready. VOD viewing features can be added here.</p>
                    </section>
                    <footer className="border-t border-[#302f2b] py-5 text-xs text-[#77746D]">Guest account</footer>
                </div>
            </main>
        </>
    );
}
