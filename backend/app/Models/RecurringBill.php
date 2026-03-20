<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class RecurringBill extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'tenant_id', 'description', 'amount', 'currency', 'type',
        'frequency', 'start_date', 'next_due_date', 'end_date',
        'status', 'category_id', 'account_id', 'created_by',
        'metadata', 'last_processed_at',
    ];

    protected $casts = [
        'amount'            => 'decimal:2',
        'start_date'        => 'date',
        'next_due_date'     => 'date',
        'end_date'          => 'date',
        'metadata'          => 'array',
        'last_processed_at' => 'datetime',
    ];

    // Status constants
    const STATUS_ACTIVE    = 'active';
    const STATUS_PAUSED    = 'paused';
    const STATUS_COMPLETED = 'completed';

    // Type constants
    const TYPE_INCOME  = 'income';
    const TYPE_EXPENSE = 'expense';

    // Frequency constants
    const FREQ_DAILY     = 'daily';
    const FREQ_WEEKLY    = 'weekly';
    const FREQ_MONTHLY   = 'monthly';
    const FREQ_QUARTERLY = 'quarterly';
    const FREQ_YEARLY    = 'yearly';

    public function scopeForTenant($query, $tenantId)
    {
        return $query->where('tenant_id', $tenantId);
    }

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }

    public function category()
    {
        return $this->belongsTo(TransactionCategory::class, 'category_id');
    }

    public function account()
    {
        return $this->belongsTo(Account::class);
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
