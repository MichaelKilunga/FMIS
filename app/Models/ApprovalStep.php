<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ApprovalStep extends Model
{
    protected $fillable = [
        'workflow_id', 'step_order', 'role_name',
        'threshold_min', 'threshold_max', 'require_all', 'conditions', 'sla_hours',
    ];

    protected $casts = [
        'conditions'    => 'array',
        'require_all'   => 'boolean',
        'threshold_min' => 'decimal:2',
        'threshold_max' => 'decimal:2',
    ];

    public function workflow()
    {
        return $this->belongsTo(ApprovalWorkflow::class, 'workflow_id');
    }

    public function logs()
    {
        return $this->hasMany(ApprovalLog::class, 'step_id');
    }
}
