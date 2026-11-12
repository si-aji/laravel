import { Head, usePage } from '@inertiajs/react';

const resources = [
    {
        title: 'Laravel documentation',
        description: 'Browse guides for routing, requests, queues, and the rest of the framework.',
        href: 'https://laravel.com/docs',
        label: 'Read the documentation',
    },
    {
        title: 'Laracasts',
        description: 'Learn through video lessons covering Laravel, PHP, testing, and frontend tools.',
        href: 'https://laracasts.com',
        label: 'Browse Laracasts lessons',
    },
];

const workflow = [
    {
        title: 'Build your first route',
        description: 'Start in routes/web.php and return a response from your application.',
        href: 'https://laravel.com/docs/routing',
    },
    {
        title: 'Prepare the frontend',
        description: 'Use Vite to compile the CSS and JavaScript entry points.',
        href: 'https://laravel.com/docs/vite',
    },
    {
        title: 'Run the test suite',
        description: 'Keep changes reliable with Laravel’s HTTP testing tools.',
        href: 'https://laravel.com/docs/testing',
    },
];

function ResourceLink({ href, children, className = '' }) {
    return (
        <a
            className={`inline-flex min-h-11 items-center rounded-sm underline decoration-[#625e57] underline-offset-4 transition-colors hover:text-white hover:decoration-[#FF4433] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FF4433] ${className}`}
            href={href}
            target="_blank"
            rel="noreferrer"
        >
            {children}
        </a>
    );
}

export default function Welcome() {
    const { appName } = usePage().props;

    return (
        <>
            <Head title="Welcome" />
            <main className="min-h-screen bg-[#0a0a0a] text-[#EDEDEC]">
                <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-6 sm:px-8 lg:px-12">
                    <header className="flex items-center justify-between border-b border-[#302f2b] pb-5">
                        <a className="text-sm font-semibold tracking-tight text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FF4433]" href="/">
                            {appName}
                        </a>
                        <nav aria-label="Main navigation" className="flex items-center gap-5 text-sm text-[#A1A09A]">
                            <a className="min-h-11 inline-flex items-center hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF4433]" href="#resources">
                                Resources
                            </a>
                            <a className="min-h-11 inline-flex items-center hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF4433]" href="#workflow">
                                First steps
                            </a>
                        </nav>
                    </header>

                    <section className="grid flex-1 content-center gap-12 py-14 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)] lg:gap-20 lg:py-20">
                        <div className="max-w-2xl self-center">
                            <p className="mb-5 text-sm font-medium text-[#FF7769]">Laravel · PHP framework</p>
                            <h1 className="max-w-xl text-4xl font-medium leading-tight tracking-tight text-white text-balance sm:text-5xl">
                                Your next application starts here.
                            </h1>
                            <p className="mt-6 max-w-xl text-base leading-7 text-[#B7B4AC]">
                                The Laravel app is running. Start with a route, shape the page, and let the framework handle the request lifecycle.
                            </p>
                            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2">
                                <ResourceLink
                                    className="rounded-sm bg-[#eeeeec] px-5 text-[#1C1C1A] no-underline hover:bg-white hover:text-[#1C1C1A]"
                                    href="https://laravel.com/docs"
                                >
                                    Read Laravel docs
                                </ResourceLink>
                                <ResourceLink href="https://cloud.laravel.com">Deploy with Laravel Cloud</ResourceLink>
                            </div>
                        </div>

                        <aside aria-labelledby="runtime-heading" className="self-center border-y border-[#302f2b] py-7 lg:border-y-0 lg:border-l lg:py-3 lg:pl-9">
                            <h2 id="runtime-heading" className="text-sm font-medium text-[#A1A09A]">Application runtime</h2>
                            <dl className="mt-5 divide-y divide-[#302f2b]">
                                <div className="flex items-baseline justify-between gap-4 py-3">
                                    <dt className="text-sm text-[#A1A09A]">Framework</dt>
                                    <dd className="text-sm font-medium text-white">Laravel</dd>
                                </div>
                                <div className="flex items-baseline justify-between gap-4 py-3">
                                    <dt className="text-sm text-[#A1A09A]">PHP</dt>
                                    <dd className="text-sm font-medium text-white">8.4+</dd>
                                </div>
                                <div className="flex items-baseline justify-between gap-4 py-3">
                                    <dt className="text-sm text-[#A1A09A]">Frontend</dt>
                                    <dd className="text-sm font-medium text-white">Inertia + React</dd>
                                </div>
                                <div className="flex items-baseline justify-between gap-4 py-3">
                                    <dt className="text-sm text-[#A1A09A]">Theme</dt>
                                    <dd className="text-sm font-medium text-white">Dark</dd>
                                </div>
                            </dl>
                        </aside>
                    </section>

                    <section id="workflow" aria-labelledby="workflow-heading" className="border-t border-[#302f2b] py-10 sm:py-12">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                            <div>
                                <h2 id="workflow-heading" className="text-xl font-medium tracking-tight text-white">A practical starting point</h2>
                                <p className="mt-2 max-w-xl text-sm leading-6 text-[#A1A09A]">A few useful steps for turning the fresh install into an application.</p>
                            </div>
                            <span className="text-xs text-[#77746D]">Getting started</span>
                        </div>
                        <ol className="mt-7 grid gap-4 md:grid-cols-3">
                            {workflow.map((item, index) => (
                                <li key={item.title} className="border-t border-[#514d46] pt-4">
                                    <span className="text-xs tabular-nums text-[#FF7769]">0{index + 1}</span>
                                    <h3 className="mt-3 font-medium text-white">{item.title}</h3>
                                    <p className="mt-2 min-h-12 text-sm leading-6 text-[#A1A09A]">{item.description}</p>
                                    <ResourceLink className="mt-3 text-sm" href={item.href}>Open guide</ResourceLink>
                                </li>
                            ))}
                        </ol>
                    </section>

                    <section id="resources" aria-labelledby="resources-heading" className="grid gap-6 border-t border-[#302f2b] py-10 sm:grid-cols-[0.7fr_1.3fr] sm:py-12">
                        <div>
                            <h2 id="resources-heading" className="text-xl font-medium tracking-tight text-white">Keep learning</h2>
                            <p className="mt-2 max-w-sm text-sm leading-6 text-[#A1A09A]">Official references for exploring the framework and its tools.</p>
                        </div>
                        <ul className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
                            {resources.map((resource) => (
                                <li key={resource.title}>
                                    <h3 className="font-medium text-white">{resource.title}</h3>
                                    <p className="mt-1 text-sm leading-6 text-[#A1A09A]">{resource.description}</p>
                                    <ResourceLink className="mt-2 text-sm" href={resource.href}>{resource.label}</ResourceLink>
                                </li>
                            ))}
                        </ul>
                    </section>

                    <footer className="flex flex-col gap-2 border-t border-[#302f2b] py-5 text-xs text-[#77746D] sm:flex-row sm:items-center sm:justify-between">
                        <span>{appName} application starter</span>
                        <span>Laravel · PHP 8.4+</span>
                    </footer>
                </div>
            </main>
        </>
    );
}
