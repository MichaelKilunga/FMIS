<?php

namespace Database\Factories;

use App\Models\FraudAlert;
use Illuminate\Database\Eloquent\Factories\Factory;

class FraudAlertFactory extends Factory
{
    protected $model = FraudAlert::class;

    public function definition(): array
    {
        return [
            'tenant_id'      => \App\Models\Tenant::factory(),
            'transaction_id' => \App\Models\Transaction::factory(),
            'rule_id'        => \App\Models\FraudRule::factory(),
            'severity'       => $this->faker->randomElement(['low', 'medium', 'high', 'critical']),
            'status'         => 'open',
            'details'        => $this->faker->sentence(),
        ];
    }
}
