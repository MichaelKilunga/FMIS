<?php

namespace App\Services;

use App\Models\Approval;
use App\Models\ApprovalLog;
use App\Models\ApprovalWorkflow;
use App\Models\Transaction;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Models\User;
use App\Models\ApprovalStep;
use Spatie\Permission\Models\Role;

class WorkflowEngine
{
    public function __construct(
        protected AuditService $audit,
        protected SettingService $settings,
        protected NotificationService $notifications
    ) {}

    /**
     * Find applicable workflow for a model and initiate approval process
     */
    public function initiate(object $model, string $module = 'transaction'): ?Approval
    {
        $tenantId = $model->tenant_id;

        // Check if approval workflows are enabled
        if (!$this->settings->isEnabled('approvals', $tenantId)) {
            // Auto-approve if workflow disabled
            $model->update(['status' => Transaction::STATUS_APPROVED]);
            return null;
        }

        $workflow = $this->findMatchingWorkflow($model, $module);
        if (!$workflow) {
            $model->update(['status' => Transaction::STATUS_APPROVED]);
            return null;
        }

        // Find the first applicable step
        $firstStep = $workflow->steps->filter(fn($step) => $this->isStepApplicable($step, $model))->first();
        
        if (!$firstStep) {
            // No steps applicable, auto-approve
            $model->update(['status' => Transaction::STATUS_APPROVED]);
            return null;
        }

        $approval = Approval::create([
            'tenant_id'       => $tenantId,
            'approvable_type' => get_class($model),
            'approvable_id'   => $model->id,
            'workflow_id'     => $workflow->id,
            'current_step'    => $firstStep->step_order,
            'status'          => 'pending',
        ]);

        $model->update(['status' => Transaction::STATUS_UNDER_REVIEW]);

        $this->audit->log('approval_initiated', $model, [], [], [
            'workflow_id' => $workflow->id,
            'workflow'    => $workflow->name,
        ]);

        $this->notifyNextStep($approval);

        return $approval;
    }

    /**
     * Process an approval action (approve/reject)
     */
    public function process(Approval $approval, string $action, string $comment = ''): Approval
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();
        $step = $approval->currentStep();

        if (!$step) {
            throw new \RuntimeException('No current step found for approval.');
        }

        // Verify user has the required role
        $roleName = $step->role_name;

        if (!$user->hasRole($roleName)) {
            throw new \Illuminate\Auth\Access\AuthorizationException("You do not have the required role ({$roleName}) for this step.");
        }

        // --- Segregation of Duties ---

        // 1. No Self-Approval: The requester cannot approve their own submission
        $creatorId = $approval->approvable->created_by ?? null;
        $allowSelfApproval = $this->settings->get('approvals.allow_self_approval', false, $approval->tenant_id);

        if (!$allowSelfApproval && $creatorId && $user->id === (int)$creatorId) {
            throw new \Illuminate\Auth\Access\AuthorizationException("You cannot approve your own request.");
        }

        // 2. One Person per Workflow: A user can only act on one step
        $alreadyActed = ApprovalLog::where('approval_id', $approval->id)
            ->where('user_id', $user->id)
            ->whereIn('action', ['approved', 'rejected'])
            ->exists();

        if ($alreadyActed) {
            throw new \Illuminate\Auth\Access\AuthorizationException("You have already acted on a previous step of this approval workflow.");
        }

        return DB::transaction(function () use ($approval, $action, $comment, $step, $user) {
            ApprovalLog::create([
                'tenant_id'   => $approval->tenant_id,
                'approval_id' => $approval->id,
                'step_id'     => $step->id,
                'user_id'     => $user->id,
                'action'      => $action,
                'comment'     => $comment,
            ]);

            if ($action === 'rejected') {
                $approval->update(['status' => 'rejected']);
                $approval->approvable->update(['status' => Transaction::STATUS_REJECTED]);
                $this->audit->log('approval_rejected', $approval->approvable, [], [], ['step' => $step->step_order]);
                $this->notifyRequester($approval, 'rejected', $comment);
            } else {
                // Find the next applicable step
                $nextStep = $approval->workflow->steps()
                    ->where('step_order', '>', $step->step_order)
                    ->get()
                    ->filter(fn($s) => $this->isStepApplicable($s, $approval->approvable))
                    ->first();

                if ($nextStep) {
                    $approval->update(['current_step' => $nextStep->step_order]);
                    $this->audit->log('approval_step_approved', $approval->approvable, [], [], ['step' => $step->step_order]);
                    $this->notifyNextStep($approval);
                } else {
                    // All steps approved
                    $approval->update(['status' => 'approved']);
                    $approval->approvable->update(['status' => Transaction::STATUS_APPROVED]);
                    $this->audit->log('approval_completed', $approval->approvable, [], [], []);
                    $this->notifyRequester($approval, 'approved');
                }
            }

            return $approval->fresh();
        });
    }

    protected function notifyNextStep(Approval $approval): void
    {
        $step = $approval->currentStep();
        if (!$step) return;

        $roleName = $step->role_name;

        // Try getting role, with some robustness
        try {
            $usersToNotify = User::forTenant($approval->tenant_id)->role($roleName)->get();
        } catch (\Spatie\Permission\Exceptions\RoleDoesNotExist $e) {
            Log::warning("Workflow step required role '{$roleName}' which does not exist.");
            return;
        }

        if ($usersToNotify->isEmpty()) {
            Log::info("No users found with role '{$roleName}' for tenant {$approval->tenant_id} to notify.");
            return;
        }

        $type = class_basename($approval->approvable_type);

        $this->notifications->send(
            users: $usersToNotify,
            title: "Action Required: {$type} Approval",
            content: "A new {$type} requires your approval in step {$step->step_order}.",
            featureKey: 'approvals',
            action: ['label' => 'View Details', 'url' => "/transactions/{$approval->approvable_id}"],
            type: 'warning'
        );
    }

    protected function notifyRequester(Approval $approval, string $status, string $comment = ''): void
    {
        // For transactions, created_by usually stores the user ID. We need to fetch the requester somehow.
        // Assuming approvable has a 'created_by' relation or attribute
        $requesterId = $approval->approvable->created_by ?? null;
        if (!$requesterId) return;

        $requester = User::find($requesterId);
        if (!$requester) return;

        $type = class_basename($approval->approvable_type);
        $content = "Your {$type} request has been {$status}.";
        if ($comment) {
            $content .= "\nReason: {$comment}";
        }

        $this->notifications->send(
            users: $requester,
            title: "{$type} Request {$status}",
            content: $content,
            featureKey: 'approvals',
            action: ['label' => 'View Details', 'url' => "/transactions/{$approval->approvable_id}"],
            type: $status === 'approved' ? 'success' : 'error'
        );
    }

    protected function findMatchingWorkflow(object $model, string $module): ?ApprovalWorkflow
    {
        /** @var \Illuminate\Database\Eloquent\Collection<int, \App\Models\ApprovalWorkflow> $workflows */
        $workflows = ApprovalWorkflow::forTenant($model->tenant_id)
            ->where('module', $module)
            ->where('is_active', true)
            ->with('steps')
            ->get();

        /** @var \App\Models\ApprovalWorkflow $workflow */
        foreach ($workflows as $workflow) {
            if ($this->matchesConditions($model, $workflow->conditions ?? [])) {
                return $workflow;
            }
        }

        return null;
    }

    /**
     * Check if a specific step should be executed for the given model
     */
    protected function isStepApplicable(ApprovalStep $step, object $model): bool
    {
        // 1. Check Thresholds (if applicable)
        $amount = $model->amount ?? $model->total ?? $model->subtotal ?? null;

        if ($amount !== null) {
            if ($step->threshold_min !== null && $amount < $step->threshold_min) {
                return false;
            }
            if ($step->threshold_max !== null && $amount > $step->threshold_max) {
                return false;
            }
        }

        // 2. Check Step-specific conditions
        if (!empty($step->conditions)) {
            if (!$this->matchesConditions($model, $step->conditions)) {
                return false;
            }
        }

        return true;
    }

    protected function matchesConditions(object $model, array $conditions): bool
    {
        if (empty($conditions)) {
            return true;
        }

        foreach ($conditions as $field => $condition) {
            if (!$this->evaluateCondition($model, $field, $condition)) {
                return false;
            }
        }

        return true;
    }

    protected function evaluateCondition(object $model, string $rule, mixed $value): bool
    {
        return match(true) {
            str_ends_with($rule, '_gt')  => $model->{str_replace('_gt', '', $rule)} > $value,
            str_ends_with($rule, '_gte') => $model->{str_replace('_gte', '', $rule)} >= $value,
            str_ends_with($rule, '_lt')  => $model->{str_replace('_lt', '', $rule)} < $value,
            str_ends_with($rule, '_lte') => $model->{str_replace('_lte', '', $rule)} <= $value,
            str_ends_with($rule, '_eq')  => $model->{str_replace('_eq', '', $rule)} == $value,
            str_ends_with($rule, '_neq') => $model->{str_replace('_neq', '', $rule)} != $value,
            // Default equality match if no operator is specified
            default                      => $model->{$rule} == $value,
        };
    }
}
