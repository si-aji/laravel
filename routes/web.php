<?php

use App\Http\Controllers\Web\Admin\VideoController;
use App\Http\Controllers\Web\Admin\VideoStreamController;
use App\Http\Controllers\Web\Admin\VideoUploadController;
use App\Http\Controllers\Web\Auth\BrowserAuthController;
use App\Http\Controllers\Web\Guest\GuestVideoController;
use App\Http\Controllers\Web\VideoPlaybackController;
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
    Route::get('/adm/videos', [VideoController::class, 'index'])->name('admin.videos.index');
    Route::get('/adm/videos/upload', [VideoController::class, 'create'])->name('admin.videos.create');
    Route::get('/adm/videos/{video}/edit', [VideoController::class, 'edit'])->name('admin.videos.edit');
    Route::patch('/adm/videos/{video}', [VideoController::class, 'update'])->name('admin.videos.update');
    Route::patch('/adm/videos/{video}/publication', [VideoController::class, 'updatePublication'])->name('admin.videos.publication.update');
    Route::delete('/adm/videos/{video}', [VideoController::class, 'destroy'])->name('admin.videos.destroy');
    Route::post('/adm/videos/{video}/stream', [VideoStreamController::class, 'store'])->middleware('throttle:10,1')->name('admin.videos.stream.store');
    Route::get('/adm/videos/{video}/stream', [VideoStreamController::class, 'show'])->name('admin.videos.stream.show');
    Route::get('/adm/videos/{video}/playback/manifest', [VideoPlaybackController::class, 'manifest'])->name('admin.videos.playback.manifest');
    Route::get('/adm/videos/{video}/playback/grant', [VideoPlaybackController::class, 'grant'])
        ->middleware('throttle:60,1')->name('admin.videos.playback.grant');
    Route::post('/adm/video-uploads', [VideoUploadController::class, 'store'])->middleware('throttle:20,1')->name('admin.video-uploads.store');
    Route::get('/adm/video-uploads/{upload}', [VideoUploadController::class, 'show'])->name('admin.video-uploads.show');
    Route::post('/adm/video-uploads/{upload}/parts/{part}', [VideoUploadController::class, 'sign'])->whereNumber('part')->middleware('throttle:600,1')->name('admin.video-uploads.sign');
    Route::post('/adm/videos/{video}/complete-upload', [VideoUploadController::class, 'complete'])->name('admin.video-uploads.complete');
    Route::delete('/adm/video-uploads/{upload}', [VideoUploadController::class, 'destroy'])->name('admin.video-uploads.destroy');
});

Route::middleware('auth:guests')->group(function () {
    Route::get('/guest', [BrowserAuthController::class, 'guestDashboard'])->name('guest.dashboard');
    Route::post('/guest/sign-out', [BrowserAuthController::class, 'signOutGuest'])->name('guest.sign-out');
    Route::get('/guest/videos', [GuestVideoController::class, 'index'])->name('guest.videos.index');
    Route::get('/guest/videos/{video}', [GuestVideoController::class, 'show'])->name('guest.videos.show');
    Route::get('/guest/videos/{video}/playback/manifest', [VideoPlaybackController::class, 'manifest'])->name('guest.videos.playback.manifest');
    Route::get('/guest/videos/{video}/playback/grant', [VideoPlaybackController::class, 'grant'])
        ->middleware('throttle:60,1')->name('guest.videos.playback.grant');
});
