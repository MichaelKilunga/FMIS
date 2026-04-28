<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SyncLog extends Model
{
    const UPDATED_AT = null; // append-only

    protected $fillable = [
        'tenant_id', 'user_id', 'entity_type', 'entity_id',
        'action', 'payload', 'status', 'error_message', 'attempts', 'synced_at',
    ];

    protected $casts = [
        'payload'   => 'array',
        'synced_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
