<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Approval extends Model
{
    protected $fillable = [
        'tenant_id', 'approvable_type', 'approvable_id',
        'workflow_id', 'current_step', 'status',
    ];

    public function scopeForTenant($query, $tenantId)
    {
        return $query->where('tenant_id', $tenantId);
    }

    public function approvable()
    {
        return $this->morphTo();
    }

    public function workflow()
    {
        return $this->belongsTo(ApprovalWorkflow::class, 'workflow_id');
    }

    public function logs()
    {
        return $this->hasMany(ApprovalLog::class);
    }

    public function currentStep()
    {
        return $this->workflow->steps()->where('step_order', $this->current_step)->first();
    }
}
