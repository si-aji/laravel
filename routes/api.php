<?php

use App\Http\Controllers\Api\Auth\AdminAuthController;
use App\Http\Controllers\Api\Auth\GuestAuthController;
use App\Http\Resources\AuthenticatedAccountResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->name('auth.')->group(function () {
    Route::post('/admin/login', [AdminAuthController::class, 'store'])->name('admin.login');

    Route::post('/guest/register', [GuestAuthController::class, 'store'])->name('guest.register');
    Route::post('/guest/login', [GuestAuthController::class, 'login'])->name('guest.login');

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/me', function (Request $request): JsonResponse {
            return response()->json([
                'account' => (new AuthenticatedAccountResource($request->user()))->resolve(),
            ]);
        })->name('me');
        Route::delete('/logout', function (Request $request): JsonResponse {
            $currentAccessToken = $request->user()->currentAccessToken();

            if ($currentAccessToken !== null) {
                $currentAccessToken->delete();
            }

            return response()->json(['message' => 'Signed out.']);
        })->name('logout');
    });
});
