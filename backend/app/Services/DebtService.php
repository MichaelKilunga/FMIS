<?php

namespace App\Services;

use App\Models\Debt;
use App\Models\DebtPayment;
use App\Models\Transaction;
use App\Models\TransactionCategory;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class DebtService
{
    public function __construct(
        protected TransactionService $transactionService,
        protected NotificationService $notifications
    ) {}

    public function recordPayment(Debt $debt, array $data): DebtPayment
    {
        return DB::transaction(function () use ($debt, $data) {
            $amount = $data['amount'];
            $paymentDate = $data['payment_date'] ?? now();
            $notes = $data['notes'] ?? "Payment towards debt: {$debt->name}";

            // Create a transaction for this payment
            $transactionData = [
                'tenant_id' => $debt->tenant_id,
                'account_id' => $data['account_id'] ?? $debt->account_id,
                'amount' => $amount,
                'type' => $debt->type === 'payable' ? 'expense' : 'income',
                'description' => $notes,
                'transaction_date' => $paymentDate,
                'status' => Transaction::STATUS_POSTED, // Auto-post for debt payments
            ];

            $transaction = $this->transactionService->create($transactionData);

            // Record the debt payment
            $payment = DebtPayment::create([
                'debt_id' => $debt->id,
                'transaction_id' => $transaction->id,
                'amount' => $amount,
                'payment_date' => $paymentDate,
                'notes' => $notes,
            ]);

            // Update debt balance
            $debt->remaining_amount -= $amount;
            
            if ($debt->remaining_amount <= 0) {
                $debt->remaining_amount = 0;
                $debt->status = 'paid';
            }
            
            $debt->save();

            // Notify about payment
            $this->notifications->send(
                users: User::forTenant($debt->tenant_id)->role(['manager', 'director'])->get(),
                title: 'Debt Payment Recorded',
                content: "A payment of " . number_format($amount, 2) . " has been recorded for '{$debt->name}'. Remaining: " . number_format($debt->remaining_amount, 2),
                featureKey: 'debts',
                action: ['label' => 'View Debt', 'url' => "/debts/{$debt->id}"],
                type: 'success'
            );

            return $payment;
        });
    }

    public function updateStatus(Debt $debt): void
    {
        if ($debt->remaining_amount <= 0) {
            $debt->status = 'paid';
        } elseif ($debt->due_date && $debt->due_date->isPast() && $debt->status !== 'paid') {
            $debt->status = 'overdue';
        }
        $debt->save();
    }
}
