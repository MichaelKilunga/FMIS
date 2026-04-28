<?php

namespace Database\Factories;

use App\Models\Transaction;
use Illuminate\Database\Eloquent\Factories\Factory;

class TransactionFactory extends Factory
{
    protected $model = Transaction::class;

    public function definition(): array
    {
        return [
            'tenant_id'        => \App\Models\Tenant::factory(),
            'reference'        => 'TXN-' . strtoupper($this->faker->bothify('??####')),
            'amount'           => $this->faker->randomFloat(2, 10, 10000),
            'type'             => $this->faker->randomElement(['income', 'expense']),
            'status'           => 'posted',
            'transaction_date' => $this->faker->date(),
            'currency'         => 'USD',
            'department'       => $this->faker->word(),
            'created_by'       => \App\Models\User::factory(),
            'account_id'       => \App\Models\Account::factory(),
        ];
    }
}
