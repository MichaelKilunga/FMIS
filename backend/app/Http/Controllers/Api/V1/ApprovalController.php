<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Approval;
use App\Services\WorkflowEngine;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ApprovalController extends Controller
{
    public function __construct(protected WorkflowEngine $workflowEngine) {}

    public function index(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $query = Approval::forTenant($tenantId)
            ->with([
                'approvable.createdBy',   // load requester details (works for Transaction)
                'workflow.steps',          // load steps so frontend can show step progress
                'logs.user',
            ])
            ->latest();

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        return response()->json($query->paginate($request->get('per_page', 20)));
    }

    public function show(Request $request, Approval $approval): JsonResponse
    {
        abort_if($approval->tenant_id !== $request->user()->tenant_id, 403);

        return response()->json($approval->load([
            'approvable', 'workflow.steps', 'logs.user', 'logs.step',
        ]));
    }

    public function approve(Request $request, Approval $approval): JsonResponse
    {
        abort_if($approval->tenant_id !== $request->user()->tenant_id, 403);
        $data = $request->validate(['comment' => 'nullable|string|max:1000']);

        $updated = $this->workflowEngine->process($approval, 'approved', $data['comment'] ?? '');

        return response()->json($updated->load(['approvable', 'logs.user']));
    }

    public function reject(Request $request, Approval $approval): JsonResponse
    {
        abort_if($approval->tenant_id !== $request->user()->tenant_id, 403);
        $data = $request->validate(['comment' => 'required|string|max:1000']);

        $updated = $this->workflowEngine->process($approval, 'rejected', $data['comment']);

        return response()->json($updated->load(['approvable', 'logs.user']));
    }
}
