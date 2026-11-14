<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Requests\Api\Auth\LoginRequest;
use App\Http\Resources\AuthenticatedAccountResource;
use App\Models\User;
use App\Services\Auth\IssueAccessToken;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AdminAuthController
{
    public function store(LoginRequest $request, IssueAccessToken $issueAccessToken): JsonResponse
    {
        $admin = User::query()->where('email', $request->validated('email'))->first();

        if (! $admin || ! Hash::check($request->validated('password'), $admin->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        $accessToken = $issueAccessToken->handle($admin, $request->validated('device_name'));

        return response()->json([
            'token' => $accessToken->plainTextToken,
            'account' => new AuthenticatedAccountResource($admin),
        ]);
    }
}
