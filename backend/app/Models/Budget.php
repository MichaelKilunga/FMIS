<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Budget extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'tenant_id', 'category_id', 'created_by', 'department', 'name',
        'amount', 'spent', 'alert_threshold', 'period', 'start_date', 'end_date', 'status', 'notes',
    ];

    protected $appends = ['variance', 'usage_percentage'];

    protected $casts = [
        'amount'          => 'decimal:2',
        'spent'           => 'decimal:2',
        'alert_threshold' => 'decimal:2',
        'start_date'      => 'date',
        'end_date'        => 'date',
    ];

    public function scopeForTenant($query, $tenantId)
    {
        return $query->where('tenant_id', $tenantId);
    }

    public function category()
    {
        return $this->belongsTo(TransactionCategory::class, 'category_id');
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function transactions()
    {
        return $this->hasMany(Transaction::class);
    }

    public function getVarianceAttribute(): float
    {
        return (float) ($this->amount - $this->spent);
    }

    public function getUsagePercentageAttribute(): float
    {
        if ($this->amount <= 0) return 0;
        return round(($this->spent / $this->amount) * 100, 2);
    }

    public function isAlertThresholdExceeded(): bool
    {
        return $this->usage_percentage >= $this->alert_threshold;
    }
}
