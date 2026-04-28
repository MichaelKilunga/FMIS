<?php

namespace App\Services;

use App\Models\RecurringBill;
use App\Models\Transaction;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class RecurringBillService
{
    public function __construct(
        protected TransactionService $transactionService,
        protected AuditService $audit
    ) {}

    /**
     * Process all due recurring bills.
     */
    public function processDueBills(): int
    {
        $dueBills = RecurringBill::where('status', RecurringBill::STATUS_ACTIVE)
            ->where('next_due_date', '<=', Carbon::today())
            ->get();

        $processedCount = 0;

        foreach ($dueBills as $bill) {
            try {
                $this->processBill($bill);
                $processedCount++;
            } catch (\Exception $e) {
                Log::error("Failed to process recurring bill ID {$bill->id}: " . $e->getMessage());
            }
        }

        return $processedCount;
    }

    /**
     * Process a single recurring bill.
     */
    public function processBill(RecurringBill $bill): void
    {
        DB::transaction(function () use ($bill) {
            // 1. Create Transaction
            $transactionData = [
                'tenant_id'        => $bill->tenant_id,
                'amount'           => $bill->amount,
                'currency'         => $bill->currency,
                'type'             => $bill->type,
                'category_id'      => $bill->category_id,
                'account_id'       => $bill->account_id,
                'description'      => "Recurring: " . $bill->description,
                'transaction_date' => $bill->next_due_date,
                'created_by'       => $bill->created_by,
                'notes'            => "Generated automatically from recurring bill #{$bill->id}",
                'metadata'         => array_merge($bill->metadata ?? [], ['recurring_bill_id' => $bill->id]),
            ];

            $transaction = $this->transactionService->create($transactionData);
            
            // 2. Submit for Approval
            $this->transactionService->submit($transaction);

            // 3. Update Bill
            $bill->last_processed_at = now();
            $bill->next_due_date = $this->calculateNextDueDate($bill->next_due_date, $bill->frequency);

            // 4. Check if completed
            if ($bill->end_date && $bill->next_due_date->gt($bill->end_date)) {
                $bill->status = RecurringBill::STATUS_COMPLETED;
            }

            $bill->save();

            $this->audit->log('bill_processed', $bill, ['transaction_id' => $transaction->id]);
        });
    }

    /**
     * Calculate the next due date based on frequency.
     */
    protected function calculateNextDueDate(Carbon $currentDate, string $frequency): Carbon
    {
        return match ($frequency) {
            RecurringBill::FREQ_DAILY     => $currentDate->addDay(),
            RecurringBill::FREQ_WEEKLY    => $currentDate->addWeek(),
            RecurringBill::FREQ_MONTHLY   => $currentDate->addMonth(),
            RecurringBill::FREQ_QUARTERLY => $currentDate->addMonths(3),
            RecurringBill::FREQ_YEARLY    => $currentDate->addYear(),
            default                       => $currentDate->addMonth(),
        };
    }

    public function create(array $data): RecurringBill
    {
        return DB::transaction(function () use ($data) {
            $bill = RecurringBill::create($data);
            $this->audit->logModelChange('bill_created', $bill);
            return $bill;
        });
    }

    public function update(RecurringBill $bill, array $data): RecurringBill
    {
        return DB::transaction(function () use ($bill, $data) {
            $before = $bill->toArray();
            $bill->update($data);
            $this->audit->logModelChange('bill_updated', $bill, $before);
            return $bill;
        });
    }

    public function pause(RecurringBill $bill): RecurringBill
    {
        $bill->update(['status' => RecurringBill::STATUS_PAUSED]);
        $this->audit->log('bill_paused', $bill);
        return $bill;
    }

    public function resume(RecurringBill $bill): RecurringBill
    {
        $bill->update(['status' => RecurringBill::STATUS_ACTIVE]);
        $this->audit->log('bill_resumed', $bill);
        return $bill;
    }
}
