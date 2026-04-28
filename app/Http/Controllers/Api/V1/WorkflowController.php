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

        foreach ($data['steps'] as $index => $step) {
            $roleName = $step['role_name'] ?? '';
            
            // Validate role existence
            if (!\Spatie\Permission\Models\Role::where('name', $roleName)->exists()) {
                return response()->json([
                    'message' => "Invalid role: '{$roleName}' at step ".($index + 1),
                    'errors' => ['role_name' => ["The role '{$roleName}' does not exist in the system."]]
                ], 422);
            }
            
            ApprovalStep::create([
                'workflow_id' => $workflow->id,
                'role_name'   => $roleName,
                'step_order'  => $step['step_order'],
                'threshold_min' => $step['threshold_min'] ?? null,
                'threshold_max' => $step['threshold_max'] ?? null,
                'require_all'   => $step['require_all'] ?? false,
                'sla_hours'     => $step['sla_hours'] ?? 48,
                'conditions'    => $step['conditions'] ?? null,
            ]);
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
            $stepIds = [];
            foreach ($data['steps'] as $index => $stepData) {
                $roleName = $stepData['role_name'] ?? '';

                // Validate role existence
                if (!\Spatie\Permission\Models\Role::where('name', $roleName)->exists()) {
                    return response()->json([
                        'message' => "Invalid role: '{$roleName}' at step ".($index + 1),
                        'errors' => ['role_name' => ["The role '{$roleName}' does not exist in the system."]]
                    ], 422);
                }

                $step = ApprovalStep::updateOrCreate(
                    [
                        'workflow_id' => $workflow->id,
                        'step_order'  => $stepData['step_order']
                    ],
                    [
                        'role_name'     => $roleName,
                        'threshold_min' => $stepData['threshold_min'] ?? null,
                        'threshold_max' => $stepData['threshold_max'] ?? null,
                        'require_all'   => $stepData['require_all'] ?? false,
                        'sla_hours'     => $stepData['sla_hours'] ?? 48,
                        'conditions'    => $stepData['conditions'] ?? null,
                    ]
                );
                $stepIds[] = $step->id;
            }
            // Delete steps that were not included in the update
            $workflow->steps()->whereNotIn('id', $stepIds)->delete();
        }

        $this->audit->logModelChange('workflow_updated', $workflow);
        return response()->json($workflow->fresh('steps'));
    }

    public function destroy(Request $request, ApprovalWorkflow $workflow): JsonResponse
    {
        abort_if($workflow->tenant_id !== $request->user()->tenant_id, 403);
        $workflow->delete();
        return response()->json(['message' => 'Workflow deleted.']);
    }
}
