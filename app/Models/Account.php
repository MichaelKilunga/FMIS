<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Account extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'tenant_id', 'name', 'type', 'balance', 'initial_balance',
        'currency', 'account_number', 'bank_name', 'color', 'is_active', 'description',
        'allowed_transaction_types',
    ];

    protected $casts = [
        'balance'                   => 'decimal:2',
        'initial_balance'           => 'decimal:2',
        'is_active'                 => 'boolean',
        'allowed_transaction_types' => 'array',
    ];

    public function scopeForTenant($query, $tenantId)
    {
        return $query->where('tenant_id', $tenantId);
    }

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }

    public function transactions()
    {
        return $this->hasMany(Transaction::class);
    }
}
