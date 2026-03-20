<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ApprovalWorkflow extends Model
{
    protected $fillable = [
        'tenant_id', 'name', 'module', 'conditions', 'is_active', 'description',
    ];

    protected $casts = [
        'conditions' => 'array',
        'is_active'  => 'boolean',
    ];

    public function scopeForTenant($query, $tenantId)
    {
        return $query->where('tenant_id', $tenantId);
    }

    public function steps()
    {
        return $this->hasMany(ApprovalStep::class, 'workflow_id')->orderBy('step_order');
    }

    public function approvals()
    {
        return $this->hasMany(Approval::class, 'workflow_id');
    }
}
