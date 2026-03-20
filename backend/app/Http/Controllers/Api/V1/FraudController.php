<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\FraudAlert;
use App\Models\FraudRule;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FraudController extends Controller
{
    public function __construct(protected AuditService $audit) {}

    // --- Rules ---
    public function indexRules(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        return response()->json(FraudRule::where('tenant_id', $tenantId)->get());
    }

    public function storeRule(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'        => 'required|string|max:255',
            'type'        => 'required|in:duplicate,abnormal_amount,suspicious_timing,velocity',
            'conditions'  => 'required|array',
            'severity'    => 'required|in:low,medium,high,critical',
            'description' => 'nullable|string',
        ]);

        $data['tenant_id'] = $request->user()->tenant_id;
        $rule = FraudRule::create($data);
        $this->audit->logModelChange('fraud_rule_created', $rule);
        return response()->json($rule, 201);
    }

    public function updateRule(Request $request, FraudRule $fraudRule): JsonResponse
    {
        abort_if($fraudRule->tenant_id !== $request->user()->tenant_id, 403);
        $data = $request->validate([
            'name'       => 'sometimes|string|max:255',
            'conditions' => 'sometimes|array',
            'severity'   => 'sometimes|in:low,medium,high,critical',
            'is_active'  => 'sometimes|boolean',
        ]);

        $fraudRule->update($data);
        $this->audit->logModelChange('fraud_rule_updated', $fraudRule);
        return response()->json($fraudRule->fresh());
    }

    public function destroyRule(Request $request, FraudRule $fraudRule): JsonResponse
    {
        abort_if($fraudRule->tenant_id !== $request->user()->tenant_id, 403);
        $fraudRule->delete();
        return response()->json(['message' => 'Rule deleted.']);
    }

    // --- Alerts ---
    public function indexAlerts(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $query = FraudAlert::forTenant($tenantId)->with(['transaction', 'rule', 'resolvedBy'])->latest();

        if ($request->filled('status'))   $query->where('status', $request->status);
        if ($request->filled('severity')) $query->where('severity', $request->severity);

        return response()->json($query->paginate(20));
    }

    public function resolveAlert(Request $request, FraudAlert $fraudAlert): JsonResponse
    {
        abort_if($fraudAlert->tenant_id !== $request->user()->tenant_id, 403);
        $data = $request->validate([
            'status'           => 'required|in:resolved,false_positive,investigating',
            'resolution_notes' => 'nullable|string',
        ]);

        $fraudAlert->update([
            ...$data,
            'resolved_by' => $request->user()->id,
            'resolved_at' => now(),
        ]);

        $this->audit->log('fraud_alert_resolved', $fraudAlert, [], $data);
        return response()->json($fraudAlert->fresh());
    }
}
