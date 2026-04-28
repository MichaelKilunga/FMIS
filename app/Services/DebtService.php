<?php

namespace App\Services;

use App\Models\Debt;
use App\Models\DebtPayment;
use App\Models\Transaction;
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
            $amount      = $data['amount'];
            $paymentDate = $data['payment_date'] ?? now();
            $notes       = $data['notes'] ?? "Payment towards debt: {$debt->name}";

            // Resolve account – fall back to the debt's own account if none provided
            $accountId = ($data['account_id'] ?? null) ?: $debt->account_id;

            // Resolve the acting user for the transaction record
            $createdBy = auth()->id()
                ?? User::forTenant($debt->tenant_id)->first()?->id;

            // Create a financial transaction for this payment
            $transactionData = [
                'tenant_id'        => $debt->tenant_id,
                'account_id'       => $accountId,
                'created_by'       => $createdBy,
                'amount'           => $amount,
                'type'             => $debt->type === 'payable' ? 'expense' : 'income',
                'description'      => $notes,
                'transaction_date' => $paymentDate,
                'status'           => Transaction::STATUS_POSTED, // Auto-post debt payments
            ];

            $transaction = $this->transactionService->create($transactionData);

            // Record the debt payment link
            $payment = DebtPayment::create([
                'debt_id'        => $debt->id,
                'transaction_id' => $transaction->id,
                'amount'         => $amount,
                'payment_date'   => $paymentDate,
                'notes'          => $notes,
            ]);

            // Update outstanding balance
            $debt->remaining_amount -= $amount;

            if ($debt->remaining_amount <= 0) {
                $debt->remaining_amount = 0;
                $debt->status = 'paid';
            }

            $debt->save();

            // Notify managers/directors
            $usersToNotify = User::forTenant($debt->tenant_id)
                ->role(['manager', 'director'])
                ->get();

            if ($usersToNotify->isNotEmpty()) {
                $this->notifications->send(
                    users: $usersToNotify,
                    title: 'Debt Payment Recorded',
                    content: "A payment of " . number_format($amount, 2)
                        . " has been recorded for '{$debt->name}'. "
                        . "Remaining: " . number_format($debt->remaining_amount, 2),
                    featureKey: 'debts',
                    action: ['label' => 'View Debt', 'url' => "/debts/{$debt->id}"],
                    type: 'success'
                );
            }

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
