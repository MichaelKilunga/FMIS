<?php

namespace App\Services;

use App\Models\Budget;
use App\Models\Transaction;
use App\Models\TransactionCategory;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class TransactionService
{
    public function __construct(
        protected WorkflowEngine $workflow,
        protected FraudDetectionService $fraudDetection,
        protected AuditService $audit,
        protected NotificationService $notifications
    ) {}

    public function create(array $data): Transaction
    {
        return DB::transaction(function () use ($data) {
            $transaction = Transaction::create($data);

            // Update account balance
            $this->updateAccountBalance($transaction, 'credit');

            // Audit
            $this->audit->logModelChange('transaction_created', $transaction);

            return $transaction;
        });
    }

    public function update(Transaction $transaction, array $data): Transaction
    {
        $transaction->update($data);
        return $transaction->fresh();
    }

    public function delete(Transaction $transaction): void
    {
        $transaction->delete();
    }

    public function submit(Transaction $transaction, bool $notify = true): Transaction
    {
        if ($transaction->status !== Transaction::STATUS_DRAFT) {
            throw new \RuntimeException('Only draft transactions can be submitted.');
        }

        return \Illuminate\Support\Facades\DB::transaction(function () use ($transaction, $notify) {
            $transaction->update(['status' => Transaction::STATUS_SUBMITTED]);

            // Run fraud detection before initiating workflow
            $this->fraudDetection->analyze($transaction);

            // Initiate approval workflow (may auto-approve if no workflow configured)
            $this->workflow->initiate($transaction, 'transaction', $notify);

            $this->audit->log('transaction_submitted', $transaction);

            return $transaction->fresh();
        });
    }

    public function post(Transaction $transaction): Transaction
    {
        if ($transaction->status !== Transaction::STATUS_APPROVED) {
            throw new \RuntimeException('Only approved transactions can be posted.');
        }

        $transaction->update(['status' => Transaction::STATUS_POSTED]);
        $this->audit->log('transaction_posted', $transaction);

        return $transaction;
    }

    protected function updateAccountBalance(Transaction $transaction, string $direction): void
    {
        if (!$transaction->account_id) return;

        $amount = (float) $transaction->amount;
        if ($transaction->type === 'expense') {
            $transaction->account()->decrement('balance', $amount);
        } elseif ($transaction->type === 'income') {
            $transaction->account()->increment('balance', $amount);
        } elseif ($transaction->type === 'transfer' && $transaction->to_account_id) {
            // Decrement from source
            $transaction->account()->decrement('balance', $amount);
            
            // Increment to destination
            $destinationAccount = \App\Models\Account::find($transaction->to_account_id);
            if ($destinationAccount) {
                $destinationAccount->increment('balance', $amount);
            }
        }
    }

    protected function notifyBudgetThreshold(Budget $budget, float $usage): void
    {
        Log::info("Budget Threshold Alert: Budget '{$budget->name}' is at {$usage}% usage.");

        $usersToNotify = User::forTenant($budget->tenant_id)
            ->role(['manager', 'director'])
            ->get();

        // Also notify the person who created it if they aren't in the list
        if ($budget->created_by) {
            $creator = User::find($budget->created_by);
            if ($creator && !$usersToNotify->contains($creator)) {
                $usersToNotify->push($creator);
            }
        }

        if ($usersToNotify->isNotEmpty()) {
            $this->notifications->send(
                users: $usersToNotify,
                title: 'Budget Threshold Exceeded',
                content: "Budget '{$budget->name}' has reached " . round($usage, 1) . "% of its limit.",
                featureKey: 'budgets',
                action: ['label' => 'View Budget', 'url' => "/budgets/{$budget->id}"],
                type: 'warning'
            );
        }
    }
}
