<?php

namespace Database\Factories;

use App\Models\Election;
use Illuminate\Database\Eloquent\Factories\Factory;

class ElectionFactory extends Factory
{
    protected $model = Election::class;

    public function definition(): array
    {
        return [
            'tenant_id'  => \App\Models\Tenant::factory(),
            'status'     => 'ongoing',
            'started_at' => now(),
        ];
    }
}
