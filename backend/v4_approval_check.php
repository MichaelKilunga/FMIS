<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$approvals = DB::table('approvals')->where('status', 'pending')->get();
foreach ($approvals as $a) {
    $step = DB::table('approval_steps')
        ->where('workflow_id', $a->workflow_id)
        ->where('step_order', $a->current_step)
        ->first();
    
    $roleName = $step->role_name ?? 'MISSING';
    echo "Approval ID: {$a->id}, Workflow: {$a->workflow_id}, Step: {$a->current_step}, Role in DB: {$roleName}\n";
    
    // If it's tenant-admin, we should fix it to director if the user says it's only for director
    if ($roleName === 'tenant-admin') {
        echo "Found a pending approval with tenant-admin. Fixing it now...\n";
        DB::table('approval_steps')
            ->where('workflow_id', $a->workflow_id)
            ->where('step_order', $a->current_step)
            ->update(['role_name' => 'director']);
    }
}

// Final check on all workflow steps
$steps = DB::table('approval_steps')->get();
foreach ($steps as $s) {
    echo "Step ID: {$s->id}, Workflow: {$s->workflow_id}, Role: {$s->role_name}\n";
}
