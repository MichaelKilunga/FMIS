<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class Setting extends Model
{
    protected $fillable = [
        'tenant_id', 'group', 'key', 'value', 'type', 'is_system', 'description',
    ];

    protected $casts = ['is_system' => 'boolean'];

    public function scopeForTenant($query, $tenantId)
    {
        return $query->where('tenant_id', $tenantId);
    }

    /**
     * Get a setting value with type-casting
     */
    public function getTypedValueAttribute(): mixed
    {
        return match($this->type) {
            'boolean' => filter_var($this->value, FILTER_VALIDATE_BOOLEAN),
            'integer' => (int) $this->value,
            'json'    => json_decode($this->value, true),
            default   => $this->value,
        };
    }

    protected static function boot()
    {
        parent::boot();
        // Bust cache whenever a setting changes
        static::saved(fn ($s) => Cache::forget("settings:{$s->tenant_id}"));
        static::deleted(fn ($s) => Cache::forget("settings:{$s->tenant_id}"));
    }
}
