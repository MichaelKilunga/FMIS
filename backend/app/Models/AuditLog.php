<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AuditLog extends Model
{
    const UPDATED_AT = null; // Immutable — no updated_at

    protected $fillable = [
        'tenant_id', 'user_id', 'action', 'model_type', 'model_id',
        'before', 'after', 'ip_address', 'user_agent', 'metadata',
    ];

    protected $casts = [
        'before'   => 'array',
        'after'    => 'array',
        'metadata' => 'array',
    ];

    // Prevent updates and deletes — append-only
    public static function boot()
    {
        parent::boot();
        static::updating(fn () => false);
        static::deleting(fn () => false);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function auditable()
    {
        return $this->morphTo('model');
    }
}
