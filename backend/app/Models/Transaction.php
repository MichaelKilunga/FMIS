<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Transaction extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'tenant_id', 'reference', 'amount', 'type', 'category_id', 'account_id',
        'to_account_id', 'created_by', 'description', 'notes', 'attachments',
        'status', 'transaction_date', 'currency', 'exchange_rate', 'metadata',
        'budget_id', 'department',
    ];

    protected $casts = [
        'amount'          => 'decimal:2',
        'exchange_rate'   => 'decimal:6',
        'attachments'     => 'array',
        'metadata'        => 'array',
        'transaction_date'=> 'date',
    ];

    // Status constants
    const STATUS_DRAFT        = 'draft';
    const STATUS_SUBMITTED    = 'submitted';
    const STATUS_UNDER_REVIEW = 'under_review';
    const STATUS_APPROVED     = 'approved';
    const STATUS_REJECTED     = 'rejected';
    const STATUS_POSTED       = 'posted';

    const STATUSES = [
        self::STATUS_DRAFT,
        self::STATUS_SUBMITTED,
        self::STATUS_UNDER_REVIEW,
        self::STATUS_APPROVED,
        self::STATUS_REJECTED,
        self::STATUS_POSTED,
    ];

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

    public function budget()
    {
        return $this->belongsTo(Budget::class);
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function approval()
    {
        return $this->morphOne(Approval::class, 'approvable');
    }

    public function invoice()
    {
        return $this->hasOne(Invoice::class);
    }

    public function fraudAlerts()
    {
        return $this->hasMany(FraudAlert::class);
    }

    protected static function boot()
    {
        parent::boot();
        static::creating(function ($model) {
            if (empty($model->reference)) {
                $model->reference = 'TXN-' . strtoupper(substr(uniqid(), -8));
            }
        });
    }
}
