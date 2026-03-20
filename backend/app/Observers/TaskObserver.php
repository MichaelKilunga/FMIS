<?php

namespace App\Observers;

use App\Models\Task;
use App\Notifications\StandardNotification;
use Illuminate\Support\Facades\Notification;

class TaskObserver
{
    /**
     * Handle the Task "created" event.
     */
    public function created(Task $task): void
    {
        if ($task->assigned_to && $task->assignee) {
            $task->assignee->notify(new StandardNotification(
                title: 'New Task Assigned',
                content: "You have been assigned a new task: {$task->title}",
                action: ['label' => 'View Task', 'url' => "/tasks/{$task->id}"],
                type: 'info'
            ));
        }
    }

    /**
     * Handle the Task "updated" event.
     */
    public function updated(Task $task): void
    {
        // Notify assignee if status or due_date changes
        if ($task->isDirty('status') || $task->isDirty('due_date')) {
            if ($task->assigned_to && $task->assignee) {
                $task->assignee->notify(new StandardNotification(
                    title: 'Task Updated',
                    content: "Task '{$task->title}' status changed to {$task->status}",
                    action: ['label' => 'View Task', 'url' => "/tasks/{$task->id}"],
                    type: 'info'
                ));
            }

            // Notify creator if task is completed
            if ($task->status === 'completed' && $task->assigned_by && $task->creator) {
                $task->creator->notify(new StandardNotification(
                    title: 'Task Completed',
                    content: "The task '{$task->title}' has been marked as completed by {$task->assignee?->name}",
                    action: ['label' => 'View Task', 'url' => "/tasks/{$task->id}"],
                    type: 'success'
                ));
            }
        }
    }
}
