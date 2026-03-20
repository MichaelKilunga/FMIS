<?php

namespace App\Services;

use App\Models\AuditLog;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Request;

class AuditService
{
    public function log(
        string $action,
        ?object $model = null,
        array $before = [],
        array $after = [],
        array $metadata = [],
        ?int $tenantId = null,
        ?int $userId = null
    ): AuditLog {
        return AuditLog::create([
            'tenant_id'  => $tenantId ?? Auth::user()?->tenant_id,
            'user_id'    => $userId ?? Auth::id(),
            'action'     => $action,
            'model_type' => $model ? get_class($model) : null,
            'model_id'   => $model?->id,
            'before'     => $before ?: null,
            'after'      => $after ?: null,
            'ip_address' => Request::ip(),
            'user_agent' => Request::userAgent(),
            'metadata'   => $metadata ?: null,
        ]);
    }

    public function logModelChange(string $action, object $model, array $before = []): AuditLog
    {
        return $this->log(
            action:  $action,
            model:   $model,
            before:  $before,
            after:   $model->toArray(),
        );
    }
}
