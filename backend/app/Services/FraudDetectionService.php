<?php

namespace App\Services;

use App\Models\FraudAlert;
use App\Models\FraudRule;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class FraudDetectionService
{
    public function __construct(
        protected SettingService $settings,
        protected NotificationService $notifications
    ) {}

    /**
     * Run all active fraud rules against a transaction
     */
    public function analyze(Transaction $transaction): array
    {
        if (!$this->settings->isEnabled('fraud_detection', $transaction->tenant_id)) {
            return [];
        }

        $rules = FraudRule::forTenant($transaction->tenant_id)->get();
        $alerts = [];

        foreach ($rules as $rule) {
            if ($this->matches($transaction, $rule)) {
                $alert = FraudAlert::create([
                    'tenant_id'      => $transaction->tenant_id,
                    'transaction_id' => $transaction->id,
                    'rule_id'        => $rule->id,
                    'severity'       => $rule->severity,
                    'status'         => 'open',
                ]);
                $alerts[] = $alert;

                // Notify managers/directors
                $managers = User::forTenant($transaction->tenant_id)
                    ->role(['manager', 'director'])
                    ->get();

                if ($managers->isNotEmpty()) {
                    $this->notifications->send(
                        users: $managers,
                        title: 'Fraud Alert Triggered',
                        content: "A fraud alert '{$rule->name}' was triggered for transaction #{$transaction->id}.",
                        featureKey: 'fraud_alerts',
                        action: ['label' => 'View Alert', 'url' => "/fraud/alerts"],
                        type: 'error'
                    );
                }
            }
        }

        return $alerts;
    }

    protected function matches(Transaction $transaction, FraudRule $rule): bool
    {
        return match($rule->type) {
            'duplicate'         => $this->isDuplicate($transaction, $rule->conditions),
            'abnormal_amount'   => $this->isAbnormalAmount($transaction, $rule->conditions),
            'suspicious_timing' => $this->isSuspiciousTiming($transaction, $rule->conditions),
            'velocity'          => $this->isVelocityBreached($transaction, $rule->conditions),
            default             => false,
        };
    }

    protected function isDuplicate(Transaction $transaction, array $conditions): bool
    {
        $windowMinutes = $conditions['window_minutes'] ?? 60;
        return Transaction::where('tenant_id', $transaction->tenant_id)
            ->where('id', '!=', $transaction->id)
            ->where('amount', $transaction->amount)
            ->where('account_id', $transaction->account_id)
            ->where('type', $transaction->type)
            ->where('created_at', '>=', Carbon::now()->subMinutes($windowMinutes))
            ->exists();
    }

    protected function isAbnormalAmount(Transaction $transaction, array $conditions): bool
    {
        $threshold = $conditions['threshold'] ?? 10000;
        return $transaction->amount > $threshold;
    }

    protected function isSuspiciousTiming(Transaction $transaction, array $conditions): bool
    {
        $startHour = $conditions['start_hour'] ?? 22; // 10 PM
        $endHour   = $conditions['end_hour'] ?? 5;   // 5 AM
        $hour = Carbon::parse($transaction->created_at)->hour;
        return $hour >= $startHour || $hour <= $endHour;
    }

    protected function isVelocityBreached(Transaction $transaction, array $conditions): bool
    {
        $maxCount      = $conditions['max_count'] ?? 10;
        $windowMinutes = $conditions['window_minutes'] ?? 60;

        $count = Transaction::where('tenant_id', $transaction->tenant_id)
            ->where('created_by', $transaction->created_by)
            ->where('created_at', '>=', Carbon::now()->subMinutes($windowMinutes))
            ->count();

        return $count > $maxCount;
    }
}
