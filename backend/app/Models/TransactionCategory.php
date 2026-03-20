<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class TransactionCategory extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'tenant_id', 'parent_id', 'name', 'type', 'color', 'icon', 'description', 'is_active',
    ];

    protected $casts = ['is_active' => 'boolean'];

    public function scopeForTenant($query, $tenantId)
    {
        return $query->where('tenant_id', $tenantId);
    }

    public function parent()
    {
        return $this->belongsTo(TransactionCategory::class, 'parent_id');
    }

    public function children()
    {
        return $this->hasMany(TransactionCategory::class, 'parent_id');
    }

    public function transactions()
    {
        return $this->hasMany(Transaction::class, 'category_id');
    }
}
