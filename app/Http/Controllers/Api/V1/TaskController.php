<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Task;
use App\Models\TaskHistory;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TaskController extends Controller
{
    public function __construct(protected NotificationService $notifications) {}
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = Task::query();

        // If user is system admin (no tenant_id + manage-tenants), show all tasks
        // Otherwise, scope by tenant
        if ($user->tenant_id) {
            $query->where(function($q) use ($user) {
                $q->forTenant($user->tenant_id)
                  ->orWhere('assigned_to', $user->id);
            });
        } elseif (!$user->can('manage-tenants')) {
            $query->forTenant(null);
        }

        $query->with(['assignee:id,name,avatar', 'creator:id,name']);

        // Staff can only see their own tasks
        if (!$user->hasAnyRole(['director', 'manager', 'tenant-admin'])) {
            $query->where('assigned_to', $user->id);
        } elseif ($request->filled('assigned_to')) {
            $query->where('assigned_to', $request->assigned_to);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('priority')) {
            $query->where('priority', $request->priority);
        }

        $tasks = $query->orderBy('due_date', 'asc')->paginate($request->get('per_page', 20));

        return response()->json($tasks);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title'       => 'required|string|max:255',
            'description' => 'nullable|string',
            'assigned_to' => 'nullable|exists:users,id',
            'priority'    => 'required|in:low,medium,high,urgent',
            'due_date'    => 'nullable|date',
            'recurrence'  => 'required|in:none,daily,weekly,monthly',
        ]);

        if (empty($validated['assigned_to'])) {
            $validated['assigned_to'] = null;
        }

        $assignee = $validated['assigned_to'] ? User::find($validated['assigned_to']) : null;
        $creator = $request->user();

        // Seniority Check
        if ($assignee && $creator->seniority_level < $assignee->seniority_level) {
            return response()->json(['message' => 'You cannot assign tasks to someone with higher seniority.'], 403);
        }

        // Visibility/Ownership Fix for System Admins
        $taskTenantId = $creator->tenant_id;
        if (!$taskTenantId && $assignee) {
            $taskTenantId = $assignee->tenant_id;
        }

        $task = Task::create(array_merge($validated, [
            'tenant_id'   => $taskTenantId,
            'assigned_by' => $creator->id,
            'status'      => 'pending',
            'progress'    => 0,
        ]));

        // Log creation
        TaskHistory::create([
            'task_id' => $task->id,
            'user_id' => $request->user()->id,
            'action'  => 'created',
        ]);

        if ($task->assigned_to && $task->assigned_to !== $request->user()->id) {
            $this->notifications->send(
                users: User::find($task->assigned_to),
                title: 'New Task Assigned',
                content: "You have been assigned a new task: {$task->title}",
                featureKey: 'tasks',
                action: ['label' => 'View Task', 'url' => "/app/tasks"],
                type: 'info'
            );
        }

        return response()->json($task, 201);
    }

    public function show(Request $request, Task $task): JsonResponse
    {
        $this->authorizeForTenant($request, $task);
        
        $task->load(['assignee', 'creator', 'histories.user']);
        
        return response()->json($task);
    }

    public function update(Request $request, Task $task): JsonResponse
    {
        $this->authorizeForTenant($request, $task);

        $validated = $request->validate([
            'title'       => 'sometimes|string|max:255',
            'description' => 'sometimes|string',
            'assigned_to' => 'sometimes|nullable|exists:users,id',
            'priority'    => 'sometimes|in:low,medium,high,urgent',
            'status'      => 'sometimes|in:pending,in_progress,completed,overdue,cancelled',
            'due_date'    => 'sometimes|nullable|date',
            'progress'    => 'sometimes|integer|min:0|max:100',
        ]);

        $oldStatus = $task->status;
        
        if ($request->has('assigned_to')) {
            $assignee = User::find($request->assigned_to);
            if ($assignee && $request->user()->seniority_level < $assignee->seniority_level) {
                return response()->json(['message' => 'You cannot assign tasks to someone with higher seniority.'], 403);
            }
        }

        $task->update($validated);

        if ($request->has('status') && $request->status !== $oldStatus) {
            TaskHistory::create([
                'task_id'   => $task->id,
                'user_id'   => $request->user()->id,
                'action'    => 'status_change',
                'old_value' => $oldStatus,
                'new_value' => $request->status,
                'comment'   => $request->input('comment', "Status changed to {$request->status}"),
            ]);

            if ($request->status === 'completed') {
                $task->update(['completed_at' => now(), 'progress' => 100]);
                
                // Notify creator
                if ($task->assigned_by !== $request->user()->id) {
                    $this->notifications->send(
                        users: User::find($task->assigned_by),
                        title: 'Task Completed',
                        content: "Task '{$task->title}' has been marked as completed.",
                        featureKey: 'tasks',
                        action: ['label' => 'View Task', 'url' => "/app/tasks"],
                        type: 'success'
                    );
                }
            } elseif ($request->status === 'in_progress' && !$task->started_at) {
                $task->update(['started_at' => now()]);
            }
        }

        return response()->json($task);
    }

    public function reportProgress(Request $request, Task $task): JsonResponse
    {
        $this->authorizeForTenant($request, $task);

        // Only assignee or manager/admin can report progress
        if ($task->assigned_to !== $request->user()->id && !$request->user()->hasAnyRole(['director', 'manager', 'tenant-admin'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'progress' => 'required|integer|min:0|max:100',
            'comment'  => 'nullable|string',
            'status'   => 'sometimes|in:in_progress,completed',
        ]);

        $oldProgress = $task->progress;
        $task->progress = $validated['progress'];
        
        if (isset($validated['status'])) {
            $task->status = $validated['status'];
            if ($validated['status'] === 'completed') {
                $task->completed_at = now();
                $task->progress = 100;
            }
        } elseif ($task->progress > 0 && $task->status === 'pending') {
            $task->status = 'in_progress';
            if (!$task->started_at) $task->started_at = now();
        }

        $task->save();

        if ($task->status === 'completed' && $task->assigned_by !== $request->user()->id) {
            $this->notifications->send(
                users: User::find($task->assigned_by),
                title: 'Task Completed',
                content: "Task '{$task->title}' has been completed by the assignee.",
                featureKey: 'tasks',
                action: ['label' => 'View Task', 'url' => "/app/tasks"],
                type: 'success'
            );
        }

        TaskHistory::create([
            'task_id'   => $task->id,
            'user_id'   => $request->user()->id,
            'action'    => 'progress_update',
            'old_value' => $oldProgress,
            'new_value' => $task->progress,
            'comment'   => $validated['comment'] ?? "Progress updated to {$task->progress}%",
        ]);

        return response()->json($task);
    }

    public function stats(Request $request): JsonResponse
    {
        $userId = $request->get('user_id');
        $query = Task::query();
        if ($request->user()->tenant_id) {
            $query->forTenant($request->user()->tenant_id);
        } elseif (!$request->user()->can('manage-tenants')) {
            $query->forTenant(null);
        }

        if ($userId) {
            $query->where('assigned_to', $userId);
        }

        $stats = [
            'total'       => (clone $query)->count(),
            'completed'   => (clone $query)->where('status', 'completed')->count(),
            'pending'     => (clone $query)->where('status', 'pending')->count(),
            'in_progress' => (clone $query)->where('status', 'in_progress')->count(),
            'overdue'     => (clone $query)->where('status', '!=', 'completed')
                                           ->where('due_date', '<', now())->count(),
        ];

        // Productivity calculation (simplified: % of tasks completed)
        $stats['productivity_score'] = $stats['total'] > 0 
            ? round(($stats['completed'] / $stats['total']) * 100) 
            : 0;

        // Individual comparisons for trends (last 30 days)
        $trendQuery = Task::query();
        if ($request->user()->tenant_id) {
            $trendQuery->forTenant($request->user()->tenant_id);
        } elseif (!$request->user()->can('manage-tenants')) {
            $trendQuery->forTenant(null);
        }

        $stats['trends'] = $trendQuery
            ->where('created_at', '>=', now()->subDays(30))
            ->selectRaw("DATE(created_at) as date, 
                         COUNT(*) as total,
                         SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) as completed")
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        return response()->json($stats);
    }

    public function destroy(Request $request, Task $task): JsonResponse
    {
        if ($request->user()->tenant_id && $task->tenant_id !== $request->user()->tenant_id) {
            abort(403, 'Unauthorized');
        }
        if (!$request->user()->hasAnyRole(['director', 'manager', 'tenant-admin'])) {
            return response()->json(['message' => 'Only administrators or managers can delete tasks.'], 403);
        }
        $task->delete();
        return response()->json(null, 204);
    }

    protected function authorizeForTenant(Request $request, Task $task): void
    {
        if ($request->user()->tenant_id && $task->tenant_id !== $request->user()->tenant_id) {
            abort(403, 'Unauthorized access to this task.');
        }
    }
}
