<?php

namespace App\Http\Controllers\Web\Auth;

use App\Http\Requests\Web\Auth\BrowserGuestRegistrationRequest;
use App\Http\Requests\Web\Auth\BrowserLoginRequest;
use App\Models\Guest;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class BrowserAuthController
{
    public function showAdminSignIn(): Response
    {
        return Inertia::render('Auth/AdminSignIn');
    }

    public function showGuestSignIn(): Response
    {
        return Inertia::render('Auth/GuestSignIn');
    }

    public function showGuestRegistration(): Response
    {
        return Inertia::render('Auth/GuestRegister');
    }

    public function signInAdmin(BrowserLoginRequest $request): RedirectResponse
    {
        return $this->signIn($request, 'web', User::class, 'admin.dashboard');
    }

    public function signInGuest(BrowserLoginRequest $request): RedirectResponse
    {
        return $this->signIn($request, 'guests', Guest::class, 'guest.dashboard');
    }

    public function registerGuest(BrowserGuestRegistrationRequest $request): RedirectResponse
    {
        $guest = Guest::query()->create($request->safe()->only(['name', 'email', 'password']));

        Auth::guard('guests')->login($guest);
        $request->session()->regenerate();

        return to_route('guest.dashboard');
    }

    public function adminDashboard(): Response
    {
        return Inertia::render('Auth/AdminDashboard', [
            'account' => Auth::guard('web')->user()->only(['name', 'email']),
        ]);
    }

    public function guestDashboard(): Response
    {
        return Inertia::render('Auth/GuestDashboard', [
            'account' => Auth::guard('guests')->user()->only(['name', 'email']),
        ]);
    }

    public function signOutAdmin(): RedirectResponse
    {
        return $this->signOut(request(), 'web', 'admin.sign-in');
    }

    public function signOutGuest(): RedirectResponse
    {
        return $this->signOut(request(), 'guests', 'guest.sign-in');
    }

    private function signIn(
        BrowserLoginRequest $request,
        string $guard,
        string $model,
        string $destination,
    ): RedirectResponse {
        $throttleKey = Str::transliterate(Str::lower($request->validated('email')).'|'.$request->ip());
        $credentials = $request->safe()->only(['email', 'password']);
        $account = $model::query()->where('email', $credentials['email'])->first();

        if (! $account || ! Hash::check($credentials['password'], $account->password)) {
            RateLimiter::hit($throttleKey, 60);

            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        RateLimiter::clear($throttleKey);
        Auth::guard($guard)->login($account, $request->boolean('remember'));
        $request->session()->regenerate();

        return to_route($destination);
    }

    private function signOut(Request $request, string $guard, string $destination): RedirectResponse
    {
        Auth::guard($guard)->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return to_route($destination);
    }
}
