<p align="center"><a href="https://laravel.com" target="_blank"><img src="https://raw.githubusercontent.com/laravel/art/master/logo-lockup/5%20SVG/2%20CMYK/1%20Full%20Color/laravel-logolockup-cmyk-red.svg" width="400" alt="Laravel Logo"></a></p>

<p align="center">
<a href="https://github.com/laravel/framework/actions"><img src="https://github.com/laravel/framework/workflows/tests/badge.svg" alt="Build Status"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/dt/laravel/framework" alt="Total Downloads"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/v/laravel/framework" alt="Latest Stable Version"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/l/laravel/framework" alt="License"></a>
</p>

## Admin video library

The shared library is available at `/adm/videos` after admin sign-in. It supports
one multipart video upload at a time per tab, title/description editing, and
permanent deletion of both the stored object and database record. Only the
uploader can sign, resume, complete, or cancel their upload session.

Configure the `spaces` disk using the `DIGITALOCEAN_SPACES_*` values in
`.env.example`. `VIDEO_ON_DEMAND_STORAGE_DISK` selects that disk; the upload policy
defaults to 500 MiB, 64 MiB parts, and a 24-hour session lifetime. The browser
uploads directly to the bucket using short-lived signed URLs. Laravel handles
authenticated session control through `routes/web.php`, with CSRF protection.

The bucket must be private. Configure CORS to allow the application's exact
origin, `PUT` requests, required signed headers, and an exposed `ETag` response
header. Allow preflight requests at the provider. Grant server credentials the
multipart, list-parts, head-object, abort, and delete permissions the package
requires. Some S3-compatible providers require
`DIGITALOCEAN_SPACES_USE_PATH_STYLE_ENDPOINT=true`; use the provider's guidance.
Do not log signed URLs or place storage credentials in the frontend.

Keep the tab open during transfer. Admin navigation keeps uploading; closing or
refreshing the page stops it. Reselect the original unchanged file to resume
confirmed parts. Save metadata edits before leaving. Expired sessions must be
cancelled/deleted and restarted. Playback and transcoding are not included.

Run Laravel's scheduler in deployment: the hourly package cleanup aborts expired
upload sessions. Also configure a bucket lifecycle rule for incomplete multipart
uploads. Use a shared, lock-capable cache store across application instances.

Package lifecycle changes belong in `../vod-package/`. Commit/push them to
`main`, update `pasukanamal/pasukan-vod` through Composer, and publish only required
new assets/migrations; never patch `vendor/` manually.

Verification:

```bash
php artisan test --compact tests/Feature/AdminVideoLibraryTest.php
npm run test:uploads
npm run build
```

Cloud interactions in automated tests are mocked; perform a small real upload,
resume, and delete check against the configured provider after setting its CORS
and permissions.

## About Laravel

Laravel is a web application framework with expressive, elegant syntax. We believe development must be an enjoyable and creative experience to be truly fulfilling. Laravel takes the pain out of development by easing common tasks used in many web projects, such as:

- [Simple, fast routing engine](https://laravel.com/docs/routing).
- [Powerful dependency injection container](https://laravel.com/docs/container).
- Multiple back-ends for [session](https://laravel.com/docs/session) and [cache](https://laravel.com/docs/cache) storage.
- Expressive, intuitive [database ORM](https://laravel.com/docs/eloquent).
- Database agnostic [schema migrations](https://laravel.com/docs/migrations).
- [Robust background job processing](https://laravel.com/docs/queues).
- [Real-time event broadcasting](https://laravel.com/docs/broadcasting).

Laravel is accessible, powerful, and provides tools required for large, robust applications.

## Learning Laravel

Laravel has the most extensive and thorough [documentation](https://laravel.com/docs) and video tutorial library of all modern web application frameworks, making it a breeze to get started with the framework.

In addition, [Laracasts](https://laracasts.com) contains thousands of video tutorials on a range of topics including Laravel, modern PHP, unit testing, and JavaScript. Boost your skills by digging into our comprehensive video library.

You can also watch bite-sized lessons with real-world projects on [Laravel Learn](https://laravel.com/learn), where you will be guided through building a Laravel application from scratch while learning PHP fundamentals.

## Agentic Development

Laravel's predictable structure and conventions make it ideal for AI coding agents like Claude Code, Cursor, and GitHub Copilot. Install [Laravel Boost](https://laravel.com/docs/ai) to supercharge your AI workflow:

```bash
composer require laravel/boost --dev

php artisan boost:install
```

Boost provides your agent 15+ tools and skills that help agents build Laravel applications while following best practices.

## Contributing

Thank you for considering contributing to the Laravel framework! The contribution guide can be found in the [Laravel documentation](https://laravel.com/docs/contributions).

## Code of Conduct

In order to ensure that the Laravel community is welcoming to all, please review and abide by the [Code of Conduct](https://laravel.com/docs/contributions#code-of-conduct).

## Security Vulnerabilities

If you discover a security vulnerability within Laravel, please send an e-mail to Taylor Otwell via [taylor@laravel.com](mailto:taylor@laravel.com). All security vulnerabilities will be promptly addressed.

## License

The Laravel framework is open-sourced software licensed under the [MIT license](https://opensource.org/licenses/MIT).
