<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\ApprovalWorkflow;
use App\Models\ApprovalStep;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WorkflowController extends Controller
{
    public function __construct(protected AuditService $audit) {}

    public function index(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        return response()->json(
            ApprovalWorkflow::forTenant($tenantId)->with('steps')->get()
        );
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'        => 'required|string|max:255',
            'module'      => 'required|in:transaction,invoice,budget',
            'conditions'  => 'nullable|array',
            'is_active'   => 'nullable|boolean',
            'description' => 'nullable|string',
            'steps'       => 'required|array|min:1',
            'steps.*.step_order'   => 'required|integer|min:1',
            'steps.*.role_name'    => 'required|string',
            'steps.*.threshold_min'=> 'nullable|numeric',
            'steps.*.threshold_max'=> 'nullable|numeric',
            'steps.*.require_all'  => 'nullable|boolean',
            'steps.*.sla_hours'    => 'nullable|integer',
        ]);

        $tenantId = $request->user()->tenant_id;
        $workflow = ApprovalWorkflow::create([
            'tenant_id'   => $tenantId,
            'name'        => $data['name'],
            'module'      => $data['module'],
            'conditions'  => $data['conditions'] ?? null,
            'is_active'   => $data['is_active'] ?? true,
            'description' => $data['description'] ?? null,
        ]);

        foreach ($data['steps'] as $step) {
            ApprovalStep::create(['workflow_id' => $workflow->id, ...$step]);
        }

        $this->audit->logModelChange('workflow_created', $workflow);

        return response()->json($workflow->load('steps'), 201);
    }

    public function show(Request $request, ApprovalWorkflow $workflow): JsonResponse
    {
        abort_if($workflow->tenant_id !== $request->user()->tenant_id, 403);
        return response()->json($workflow->load('steps'));
    }

    public function update(Request $request, ApprovalWorkflow $workflow): JsonResponse
    {
        abort_if($workflow->tenant_id !== $request->user()->tenant_id, 403);
        
        $data = $request->validate([
            'name'       => 'sometimes|string|max:255',
            'module'     => 'sometimes|in:transaction,invoice,budget',
            'conditions' => 'sometimes|array',
            'is_active'  => 'sometimes|boolean',
            'steps'      => 'sometimes|array|min:1',
            'steps.*.step_order'   => 'required_with:steps|integer|min:1',
            'steps.*.role_name'    => 'required_with:steps|string',
            'steps.*.threshold_min'=> 'nullable|numeric',
            'steps.*.threshold_max'=> 'nullable|numeric',
            'steps.*.require_all'  => 'nullable|boolean',
            'steps.*.sla_hours'    => 'nullable|integer',
        ]);

        $workflow->update($data);

        if (isset($data['steps'])) {
            $workflow->steps()->delete();
            foreach ($data['steps'] as $step) {
                ApprovalStep::create(['workflow_id' => $workflow->id, ...$step]);
            }
        }

        $this->audit->logModelChange('workflow_updated', $workflow);
        return response()->json($workflow->fresh('steps'));
    }

    public function destroy(Request $request, ApprovalWorkflow $approvalWorkflow): JsonResponse
    {
        abort_if($approvalWorkflow->tenant_id !== $request->user()->tenant_id, 403);
        $approvalWorkflow->delete();
        return response()->json(['message' => 'Workflow deleted.']);
    }
}
