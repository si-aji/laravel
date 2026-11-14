<?php

use App\Http\Controllers\Web\Auth\BrowserAuthController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    if (auth('web')->check()) {
        return to_route('admin.dashboard');
    }

    if (auth('guests')->check()) {
        return to_route('guest.dashboard');
    }

    return Inertia::render('Welcome');
});

Route::get('/sign-in', fn () => Inertia::render('Auth/SignInOptions'))->name('sign-in.options');

Route::middleware('guest:web')->group(function () {
    Route::get('/adm/sign-in', [BrowserAuthController::class, 'showAdminSignIn'])->name('admin.sign-in');
    Route::post('/adm/sign-in', [BrowserAuthController::class, 'signInAdmin'])->name('admin.sign-in.store');
});

Route::middleware('guest:guests')->group(function () {
    Route::get('/guest/sign-in', [BrowserAuthController::class, 'showGuestSignIn'])->name('guest.sign-in');
    Route::post('/guest/sign-in', [BrowserAuthController::class, 'signInGuest'])->name('guest.sign-in.store');
    Route::get('/guest/register', [BrowserAuthController::class, 'showGuestRegistration'])->name('guest.register');
    Route::post('/guest/register', [BrowserAuthController::class, 'registerGuest'])->name('guest.register.store');
});

Route::middleware('auth:web')->group(function () {
    Route::get('/adm', [BrowserAuthController::class, 'adminDashboard'])->name('admin.dashboard');
    Route::post('/adm/sign-out', [BrowserAuthController::class, 'signOutAdmin'])->name('admin.sign-out');
});

Route::middleware('auth:guests')->group(function () {
    Route::get('/guest', [BrowserAuthController::class, 'guestDashboard'])->name('guest.dashboard');
    Route::post('/guest/sign-out', [BrowserAuthController::class, 'signOutGuest'])->name('guest.sign-out');
});
