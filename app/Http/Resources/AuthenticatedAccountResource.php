<?php

namespace App\Http\Resources;

use App\Models\Guest;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AuthenticatedAccountResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->resource->getAuthIdentifier(),
            'name' => $this->resource->name,
            'email' => $this->resource->email,
            'type' => $this->resource instanceof Guest ? 'guest' : 'admin',
        ];
    }
}
