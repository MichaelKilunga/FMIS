<?php

namespace Database\Factories;

use App\Models\Budget;
use Illuminate\Database\Eloquent\Factories\Factory;

class BudgetFactory extends Factory
{
    protected $model = Budget::class;

    public function definition(): array
    {
        return [
            'tenant_id'       => \App\Models\Tenant::factory(),
            'name'            => $this->faker->word() . ' Budget',
            'amount'          => $this->faker->randomFloat(2, 1000, 50000),
            'spent'           => $this->faker->randomFloat(2, 0, 1000),
            'alert_threshold' => 80,
            'period'          => 'monthly',
            'start_date'      => now()->startOfMonth(),
            'status'          => 'active',
            'created_by'      => \App\Models\User::factory(),
            'end_date'        => now()->addMonths(1),
        ];
    }
}
