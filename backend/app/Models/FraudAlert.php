<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FraudAlert extends Model
{
    use HasFactory;
    protected $fillable = [
        'tenant_id', 'transaction_id', 'rule_id', 'severity', 'status',
        'details', 'resolved_by', 'resolved_at', 'resolution_notes',
    ];

    protected $casts = ['resolved_at' => 'datetime'];

    public function scopeForTenant($query, $tenantId)
    {
        return $query->where('tenant_id', $tenantId);
    }

    public function transaction()
    {
        return $this->belongsTo(Transaction::class);
    }

    public function rule()
    {
        return $this->belongsTo(FraudRule::class, 'rule_id');
    }

    public function resolvedBy()
    {
        return $this->belongsTo(User::class, 'resolved_by');
    }
}
