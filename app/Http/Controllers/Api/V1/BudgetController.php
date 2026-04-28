<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Budget;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BudgetController extends Controller
{
    public function __construct(protected AuditService $audit) {}

    public function index(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $query = Budget::forTenant($tenantId)->with(['category', 'createdBy'])->latest();

        if ($request->filled('status'))      $query->where('status', $request->status);
        if ($request->filled('department'))  $query->where('department', $request->department);
        if ($request->filled('period'))      $query->where('period', $request->period);

        return response()->json($query->paginate(20));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'            => 'required|string|max:255',
            'amount'          => 'required|numeric|min:0.01',
            'category_id'     => 'nullable|exists:transaction_categories,id',
            'department'      => 'nullable|string|max:255',
            'period'          => 'required|in:monthly,quarterly,yearly,custom',
            'start_date'      => 'required|date',
            'end_date'        => 'required|date|after:start_date',
            'alert_threshold' => 'nullable|numeric|min:0|max:100',
            'notes'           => 'nullable|string',
        ]);

        $data['tenant_id']  = $request->user()->tenant_id;
        $data['created_by'] = $request->user()->id;
        $data['initial_amount'] = $data['amount'];

        $budget = Budget::create($data);
        $this->audit->logModelChange('budget_created', $budget);

        return response()->json($budget->load(['category']), 201);
    }

    public function show(Request $request, Budget $budget): JsonResponse
    {
        abort_if($budget->tenant_id !== $request->user()->tenant_id, 403);
        return response()->json($budget->append(['variance', 'usage_percentage'])->load('category'));
    }

    public function update(Request $request, Budget $budget): JsonResponse
    {
        abort_if($budget->tenant_id !== $request->user()->tenant_id, 403);
        $data = $request->validate([
            'name'            => 'sometimes|string|max:255',
            'amount'          => 'sometimes|numeric|min:0.01',
            'category_id'     => 'nullable|exists:transaction_categories,id',
            'department'      => 'nullable|string|max:255',
            'period'          => 'sometimes|in:monthly,quarterly,yearly,custom',
            'start_date'      => 'sometimes|date',
            'end_date'        => 'sometimes|date|after:start_date',
            'alert_threshold' => 'nullable|numeric|min:0|max:100',
            'notes'           => 'nullable|string',
        ]);

        $before = $budget->toArray();
        if (isset($data['amount'])) {
            $data['initial_amount'] = $data['amount'];
        }
        $budget->update($data);
        $this->audit->logModelChange('budget_updated', $budget, $before);

        return response()->json($budget->fresh()->append(['variance', 'usage_percentage']));
    }

    public function destroy(Request $request, Budget $budget): JsonResponse
    {
        abort_if($budget->tenant_id !== $request->user()->tenant_id, 403);
        $this->audit->log('budget_deleted', $budget);
        $budget->delete();
        return response()->json(['message' => 'Budget deleted.']);
    }

    /**
     * Recalculate 'spent' totals for all budgets of the tenant.
     * Fixes historical data after logic changes.
     */
    public function sync(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $budgets = Budget::forTenant($tenantId)->where('status', 'active')->get();
        $syncedCount = 0;

        foreach ($budgets as $budget) {
            // Reset to initial
            $initial = (float) $budget->initial_amount;
            
            // Sum income linked to this budget
            $income = \App\Models\Transaction::where('budget_id', $budget->id)
                ->where('type', 'income')
                ->where('status', '!=', \App\Models\Transaction::STATUS_REJECTED)
                ->sum('amount');

            // Set final limit
            $newAmount = $initial + (float) $income;

            // Sum expenses linked to this budget
            $newSpent = \App\Models\Transaction::where('budget_id', $budget->id)
                ->where('type', 'expense')
                ->where('status', '!=', \App\Models\Transaction::STATUS_REJECTED)
                ->sum('amount');

            if ((float)$budget->spent !== (float)$newSpent || (float)$budget->amount !== $newAmount) {
                $budget->update([
                    'spent'  => $newSpent,
                    'amount' => $newAmount,
                ]);
                $syncedCount++;
            }
        }

        return response()->json([
            'message' => "Successfully synced {$syncedCount} budgets based on historical transactions.",
            'total_budgets' => count($budgets)
        ]);
    }
}
