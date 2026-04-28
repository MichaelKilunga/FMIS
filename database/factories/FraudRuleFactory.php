<?php

namespace Database\Factories;

use App\Models\FraudRule;
use Illuminate\Database\Eloquent\Factories\Factory;

class FraudRuleFactory extends Factory
{
    protected $model = FraudRule::class;

    public function definition(): array
    {
        return [
            'tenant_id' => \App\Models\Tenant::factory(),
            'name'      => $this->faker->word() . ' Rule',
            'type'      => $this->faker->randomElement(['duplicate', 'abnormal_amount', 'suspicious_timing', 'velocity']),
            'conditions'=> ['threshold' => 1000],
            'severity'  => $this->faker->randomElement(['low', 'medium', 'high', 'critical']),
            'is_active' => true,
        ];
    }
}
