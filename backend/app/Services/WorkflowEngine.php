<?php

namespace App\Services;

use App\Models\Approval;
use App\Models\ApprovalLog;
use App\Models\ApprovalWorkflow;
use App\Models\Transaction;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use App\Models\User;

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

        $approval = Approval::create([
            'tenant_id'       => $tenantId,
            'approvable_type' => get_class($model),
            'approvable_id'   => $model->id,
            'workflow_id'     => $workflow->id,
            'current_step'    => 1,
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
        if (!$user->hasRole($step->role_name)) {
            throw new \Illuminate\Auth\Access\AuthorizationException("You do not have the required role ({$step->role_name}) for this step.");
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
                // Check if there are more steps
                $nextStep = $approval->workflow->steps()->where('step_order', '>', $step->step_order)->first();
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

        $usersToNotify = User::forTenant($approval->tenant_id)->role($step->role_name)->get();
        if ($usersToNotify->isEmpty()) return;

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
            str_ends_with($rule, '_eq')  => $model->{str_replace('_eq', '', $rule)} == $value,
            default                      => true,
        };
    }
}
