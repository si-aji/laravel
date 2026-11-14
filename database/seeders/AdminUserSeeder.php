<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        $email = config('admin.email', 'hi@siaji.com');
        $password = config('admin.password', 'hi.siaji');

        if (! is_string($email) || ! is_string($password) || $email === '' || $password === '') {
            return;
        }

        User::query()->updateOrCreate(
            ['email' => $email],
            [
                'name' => config('admin.name'),
                'password' => Hash::make($password),
                'email_verified_at' => now(),
                'remember_token' => Str::random(10),
            ],
        );
    }
}
