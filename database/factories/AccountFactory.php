<?php

namespace Database\Factories;

use App\Models\Account;
use Illuminate\Database\Eloquent\Factories\Factory;

class AccountFactory extends Factory
{
    protected $model = Account::class;

    public function definition(): array
    {
        return [
            'tenant_id' => \App\Models\Tenant::factory(),
            'name' => $this->faker->word() . ' Account',
            'type' => $this->faker->randomElement(['bank', 'cash', 'mobile_money']),
            'balance' => $this->faker->randomFloat(2, 0, 10000),
            'currency' => 'USD',
        ];
    }
}
