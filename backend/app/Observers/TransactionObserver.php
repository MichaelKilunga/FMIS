<?php

namespace App\Observers;

use App\Models\Transaction;
use App\Models\Budget;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Support\Facades\Log;

class TransactionObserver
{
    /**
     * Handle the Transaction "created" event.
     */
    public function created(Transaction $transaction): void
    {
        $this->adjustBudget($transaction, false);
    }

    /**
     * Handle the Transaction "updated" event.
     */
    public function updated(Transaction $transaction): void
    {
        // 1. Remove OLD effect
        $oldAmount = (float) $transaction->getOriginal('amount');
        $oldBudgetId = $transaction->getOriginal('budget_id');
        $oldType = $transaction->getOriginal('type');
        $oldStatus = $transaction->getOriginal('status');

        $this->adjustBudgetUsingValues(
            $transaction->tenant_id,
            $oldBudgetId,
            $oldAmount,
            $oldType,
            $oldStatus,
            true // Reverse the old effect
        );

        // 2. Add NEW effect
        $this->adjustBudget($transaction, false);
    }

    /**
     * Handle the Transaction "deleted" event.
     */
    public function deleted(Transaction $transaction): void
    {
        $this->adjustBudget($transaction, true);
    }

    protected function adjustBudget(Transaction $transaction, bool $isReverse): void
    {
        $this->adjustBudgetUsingValues(
            $transaction->tenant_id,
            $transaction->budget_id,
            (float) $transaction->amount,
            $transaction->type,
            $transaction->status,
            $isReverse
        );
    }

    protected function adjustBudgetUsingValues(int $tenantId, ?int $budgetId, float $amount, string $type, string $status, bool $isReverse): void
    {
        // Only track draft, submitted, under_review, approved, or posted. 
        // rejected is ignored.
        if ($status === Transaction::STATUS_REJECTED || !$budgetId || $amount <= 0) {
            return;
        }

        $budget = Budget::where('tenant_id', $tenantId)->find($budgetId);
        if (!$budget) return;

        // NEW LOGIC: 
        // Expense increments 'spent'
        // Income increments 'amount' (Total Allocation)
        
        $isIncome = ($type === 'income');
        $column = $isIncome ? 'amount' : 'spent';
        
        $change = $isReverse ? -$amount : $amount;
        
        $budget->increment($column, $change);

        // Notify if over-spent (only on expense increments)
        if (!$isReverse && !$isIncome) {
            $usage = ($budget->spent / $budget->amount) * 100;
            if ($usage >= ($budget->alert_threshold ?? 80)) {
                $this->notifyBudgetThreshold($budget, $usage);
            }
        }
    }

    protected function notifyBudgetThreshold(Budget $budget, float $usage): void
    {
        try {
            $notifications = app(NotificationService::class);
            
            $usersToNotify = User::forTenant($budget->tenant_id)
                ->role(['manager', 'director'])
                ->get();

            if ($usersToNotify->isNotEmpty()) {
                $notifications->send(
                    users: $usersToNotify,
                    title: 'Budget Threshold Exceeded',
                    content: "Budget '{$budget->name}' has reached " . round($usage, 1) . "% of its limit.",
                    featureKey: 'budgets',
                    action: ['label' => 'View Budget', 'url' => "/budgets/{$budget->id}"],
                    type: 'warning'
                );
            }
        } catch (\Exception $e) {
            Log::warning("Could not send budget notification: " . $e->getMessage());
        }
    }
}
