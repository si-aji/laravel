<?php

namespace App\Services\Auth;

use App\Models\Guest;
use App\Models\User;
use Laravel\Sanctum\NewAccessToken;

class IssueAccessToken
{
    public function handle(User|Guest $account, string $deviceName): NewAccessToken
    {
        return $account->createToken($deviceName);
    }
}
