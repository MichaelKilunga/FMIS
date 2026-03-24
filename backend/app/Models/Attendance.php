<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Attendance extends Model
{
    protected $fillable = [
        'user_id',
        'tenant_id',
        'date',
        'check_in_time',
        'check_out_time',
        'check_in_location',
        'check_out_location',
        'status',
        'time_in_zone_minutes',
        'last_ping_time',
        'notes',
    ];

    protected $casts = [
        'check_in_time' => 'datetime',
        'check_out_time' => 'datetime',
        'check_in_location' => 'array',
        'check_out_location' => 'array',
        'date' => 'date',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }
}
