<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ApprovalLog extends Model
{
    protected $fillable = [
        'tenant_id', 'approval_id', 'step_id', 'user_id', 'action', 'comment', 'metadata',
    ];

    protected $casts = ['metadata' => 'array'];

    public function approval()
    {
        return $this->belongsTo(Approval::class);
    }

    public function step()
    {
        return $this->belongsTo(ApprovalStep::class, 'step_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
