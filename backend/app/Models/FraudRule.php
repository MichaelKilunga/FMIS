<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FraudRule extends Model
{
    use HasFactory;
    protected $fillable = [
        'tenant_id', 'name', 'type', 'conditions', 'severity', 'is_active', 'description',
    ];

    protected $casts = [
        'conditions' => 'array',
        'is_active'  => 'boolean',
    ];

    public function scopeForTenant($query, $tenantId)
    {
        return $query->where('tenant_id', $tenantId)->where('is_active', true);
    }

    public function alerts()
    {
        return $this->hasMany(FraudAlert::class, 'rule_id');
    }
}
