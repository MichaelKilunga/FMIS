<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Task extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'tenant_id',
        'assigned_to',
        'assigned_by',
        'title',
        'description',
        'priority',
        'status',
        'due_date',
        'started_at',
        'completed_at',
        'progress',
        'recurrence',
        'parent_id',
        'metadata',
    ];

    protected $casts = [
        'due_date'     => 'datetime',
        'started_at'   => 'datetime',
        'completed_at' => 'datetime',
        'progress'     => 'integer',
        'metadata'     => 'array',
    ];

    public function scopeForTenant($query, $tenantId)
    {
        return $query->where('tenant_id', $tenantId);
    }

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }

    public function assignee()
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'assigned_by');
    }

    public function parent()
    {
        return $this->belongsTo(Task::class, 'parent_id');
    }

    public function children()
    {
        return $this->hasMany(Task::class, 'parent_id');
    }

    public function histories()
    {
        return $this->hasMany(TaskHistory::class);
    }

    public function isOverdue()
    {
        if ($this->status === 'completed' || $this->status === 'cancelled') {
            return false;
        }
        return $this->due_date && $this->due_date->isPast();
    }
}
