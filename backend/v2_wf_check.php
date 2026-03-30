<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$wf = DB::table('approval_workflows')->where('name', 'Test Work Flow')->first();
if ($wf) {
    echo "Workflow ID: {$wf->id}\n";
    $steps = DB::table('approval_steps')->where('workflow_id', $wf->id)->get();
    foreach ($steps as $s) {
        echo "Order: {$s->step_order}, Role: {$s->role_name}\n";
    }
} else {
    echo "Workflow 'Test Work Flow' not found.\n";
}

echo "--- ALL DISCREPANCIES ---\n";
$steps = DB::table('approval_steps')->where('role_name', 'tenant-admin')->get();
foreach ($steps as $s) {
    $wf_name = DB::table('approval_workflows')->where('id', $s->workflow_id)->value('name');
    echo "WF: {$wf_name}, Order: {$s->step_order}, Role: {$s->role_name}\n";
}
