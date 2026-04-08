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
        /** @var \App\Models\User $user */
        $user = $request->user();
        $tenantId = $user->tenant_id;

        $query = Approval::forTenant($tenantId)
            ->with([
                'approvable.createdBy',
                'workflow.steps',
                'logs.user',
            ])
            ->latest();

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('step')) {
            $query->where('current_step', $request->step);
        }

        if ($request->filled('from')) {
            $query->whereDate('created_at', '>=', $request->from);
        }

        if ($request->filled('to')) {
            $query->whereDate('created_at', '<=', $request->to);
        }

        // Filter by whether the current user has acted on this approval
        // 'pending_my_action'  → user has NOT yet acted (and approval is still pending)
        // 'i_acted'            → user HAS acted on at least one step
        if ($request->filled('my_action')) {
            if ($request->my_action === 'pending_my_action') {
                $query->where('status', 'pending')
                    ->whereDoesntHave('logs', fn($q) => $q->where('user_id', $user->id)->whereIn('action', ['approved', 'rejected']));
            } elseif ($request->my_action === 'i_acted') {
                $query->whereHas('logs', fn($q) => $q->where('user_id', $user->id)->whereIn('action', ['approved', 'rejected']));
            }
        }

        $paginated = $query->paginate($request->get('per_page', 20));

        // Annotate each approval with whether the current user has already acted
        $paginated->getCollection()->transform(function (Approval $approval) use ($user) {
            $actedLog = $approval->logs
                ->where('user_id', $user->id)
                ->whereIn('action', ['approved', 'rejected'])
                ->first();

            $approval->has_user_acted = !is_null($actedLog);
            $approval->user_action    = $actedLog?->action; // 'approved', 'rejected', or null
            $approval->user_acted_at  = $actedLog?->created_at?->toIso8601String();

            return $approval;
        });

        return response()->json($paginated);
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

        try {
            $updated = $this->workflowEngine->process($approval, 'approved', $data['comment'] ?? '');
            return response()->json($updated->load(['approvable', 'logs.user']));
        } catch (\Illuminate\Auth\Access\AuthorizationException $e) {
            return response()->json(['message' => $e->getMessage()], 403);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function reject(Request $request, Approval $approval): JsonResponse
    {
        abort_if($approval->tenant_id !== $request->user()->tenant_id, 403);
        $data = $request->validate(['comment' => 'required|string|max:1000']);

        try {
            $updated = $this->workflowEngine->process($approval, 'rejected', $data['comment']);
            return response()->json($updated->load(['approvable', 'logs.user']));
        } catch (\Illuminate\Auth\Access\AuthorizationException $e) {
            return response()->json(['message' => $e->getMessage()], 403);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }
    public function bulkAction(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $data = $request->validate([
            'ids'     => 'required|array|min:1|max:50',
            'ids.*'   => 'required|integer|exists:approvals,id',
            'action'  => 'required|in:approve,reject',
            'comment' => 'nullable|string|max:1000',
        ]);

        // Reject requires a comment
        if ($data['action'] === 'reject' && empty(trim($data['comment'] ?? ''))) {
            return response()->json(['message' => 'A comment is required when rejecting.'], 422);
        }

        $results = ['succeeded' => [], 'skipped' => [], 'failed' => []];

        foreach ($data['ids'] as $id) {
            $approval = Approval::forTenant($user->tenant_id)
                ->with(['workflow.steps', 'logs', 'approvable'])
                ->find($id);

            if (!$approval) {
                $results['skipped'][] = ['id' => $id, 'reason' => 'Not found or access denied'];
                continue;
            }

            if ($approval->status !== 'pending') {
                $results['skipped'][] = ['id' => $id, 'reason' => 'Already ' . $approval->status];
                continue;
            }

            // Check if user already acted
            $alreadyActed = $approval->logs
                ->where('user_id', $user->id)
                ->whereIn('action', ['approved', 'rejected'])
                ->isNotEmpty();

            if ($alreadyActed) {
                $results['skipped'][] = ['id' => $id, 'reason' => 'You have already acted on this'];
                continue;
            }

            try {
                $this->workflowEngine->process(
                    $approval,
                    $data['action'] === 'approve' ? 'approved' : 'rejected',
                    $data['comment'] ?? ''
                );
                $results['succeeded'][] = $id;
            } catch (\Illuminate\Auth\Access\AuthorizationException $e) {
                $results['skipped'][] = ['id' => $id, 'reason' => $e->getMessage()];
            } catch (\RuntimeException $e) {
                $results['failed'][] = ['id' => $id, 'reason' => $e->getMessage()];
            }
        }

        $successCount = count($results['succeeded']);
        $skipCount    = count($results['skipped']);
        $failCount    = count($results['failed']);

        $message = "{$successCount} " . ($data['action'] === 'approve' ? 'approved' : 'rejected') . " successfully.";
        if ($skipCount) $message .= " {$skipCount} skipped.";
        if ($failCount) $message .= " {$failCount} failed.";

        return response()->json([
            'message'   => $message,
            'results'   => $results,
            'succeeded' => $results['succeeded'],
        ], $failCount > 0 && $successCount === 0 ? 422 : 200);
    }
}
