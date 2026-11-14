<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Requests\Api\Auth\LoginRequest;
use App\Http\Requests\Api\Auth\RegisterGuestRequest;
use App\Http\Resources\AuthenticatedAccountResource;
use App\Models\Guest;
use App\Services\Auth\IssueAccessToken;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class GuestAuthController
{
    public function store(RegisterGuestRequest $request, IssueAccessToken $issueAccessToken): JsonResponse
    {
        $guest = Guest::query()->create($request->safe()->only(['name', 'email', 'password']));
        $accessToken = $issueAccessToken->handle($guest, $request->validated('device_name'));

        return response()->json([
            'token' => $accessToken->plainTextToken,
            'account' => new AuthenticatedAccountResource($guest),
        ], 201);
    }

    public function login(LoginRequest $request, IssueAccessToken $issueAccessToken): JsonResponse
    {
        $guest = Guest::query()->where('email', $request->validated('email'))->first();

        if (! $guest || ! Hash::check($request->validated('password'), $guest->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        $accessToken = $issueAccessToken->handle($guest, $request->validated('device_name'));

        return response()->json([
            'token' => $accessToken->plainTextToken,
            'account' => new AuthenticatedAccountResource($guest),
        ]);
    }
}
