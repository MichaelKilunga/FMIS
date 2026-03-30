<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use App\Models\Transaction;
use App\Models\Approval;
use App\Models\ApprovalWorkflow;
use App\Models\ApprovalStep;
use App\Services\WorkflowEngine;
use App\Services\SettingService;
use Illuminate\Support\Facades\Auth;

$workflowEngine = app(WorkflowEngine::class);
$settings = app(SettingService::class);

$u1 = User::whereNotNull('tenant_id')->first();
$tenantId = $u1->tenant_id;

echo "Testing for Tenant: {$tenantId}, User: {$u1->id} ({$u1->name})\n";

// Ensure a simple workflow exists
$workflow = ApprovalWorkflow::updateOrCreate(
    ['name' => 'Self-Approval Toggle Test', 'tenant_id' => $tenantId],
    ['module' => 'transaction', 'is_active' => true]
);
$workflow->steps()->delete();
ApprovalStep::create(['workflow_id' => $workflow->id, 'step_order' => 1, 'role_name' => 'director']);

if (!$u1->hasRole('director')) $u1->assignRole('director');

// Case 1: Self-Approval ALLOWED = FALSE
echo "\n--- Case 1: Allow Self-Approval = FALSE ---\n";
$settings->set('approvals.allow_self_approval', false, $tenantId, 'approvals', 'boolean');

Auth::login($u1);
$txn = Transaction::create([
    'tenant_id' => $tenantId,
    'amount' => 50,
    'type' => 'expense',
    'created_by' => $u1->id,
    'description' => 'Policy Test',
    'transaction_date' => now()
]);
$approval = $workflowEngine->initiate($txn);

try {
    $workflowEngine->process($approval, 'approved', 'Testing block');
    echo "FAILED: Self-approval should be BLOCKED\n";
} catch (\Illuminate\Auth\Access\AuthorizationException $e) {
    echo "PASSED: Blocked correctly: " . $e->getMessage() . "\n";
}

// Case 2: Self-Approval ALLOWED = TRUE
echo "\n--- Case 2: Allow Self-Approval = TRUE ---\n";
$settings->set('approvals.allow_self_approval', true, $tenantId, 'approvals', 'boolean');

try {
    $workflowEngine->process($approval, 'approved', 'Testing allow');
    echo "PASSED: Self-approval allowed successfully.\n";
} catch (\Exception $e) {
    echo "FAILED: Should have allowed self-approval. Error: " . $e->getMessage() . "\n";
}

// Cleanup
$workflow->delete();
$txn->delete();
echo "\n--- Cleanup done ---\n";
