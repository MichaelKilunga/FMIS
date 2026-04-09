<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\RecurringBill;
use App\Services\RecurringBillService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RecurringBillController extends Controller
{
    public function __construct(protected RecurringBillService $billService) {}

    public function index(Request $request): JsonResponse
    {
        if (!$request->user()->can('view-bills') && !$request->user()->can('manage-bills')) {
            abort(403, 'You do not have permission to view bills.');
        }

        $tenantId = $request->user()->tenant_id;
        $query = RecurringBill::forTenant($tenantId)
            ->with(['category', 'account', 'createdBy'])
            ->latest();

        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('search')) {
            $query->where('description', 'like', "%{$request->search}%");
        }

        return response()->json($query->paginate($request->get('per_page', 20)));
    }

    public function store(Request $request): JsonResponse
    {
        if (!$request->user()->can('manage-bills')) {
            abort(403, 'You do not have permission to manage bills.');
        }

        $data = $request->validate([
            'description'   => 'required|string|max:500',
            'amount'        => 'required|numeric|min:0.01',
            'currency'      => 'nullable|string|max:10',
            'type'          => 'required|in:income,expense',
            'frequency'     => 'required|in:daily,weekly,monthly,quarterly,yearly',
            'start_date'    => 'required|date',
            'next_due_date' => 'required|date|after_or_equal:start_date',
            'end_date'      => 'nullable|date|after_or_equal:next_due_date',
            'category_id'   => 'nullable|exists:transaction_categories,id',
            'account_id'    => 'nullable|exists:accounts,id',
            'metadata'      => 'nullable|array',
        ]);

        $data['tenant_id'] = $request->user()->tenant_id;
        $data['created_by'] = $request->user()->id;
        $data['status'] = RecurringBill::STATUS_ACTIVE;

        $bill = $this->billService->create($data);

        return response()->json($bill->load(['category', 'account', 'createdBy']), 201);
    }

    public function show(Request $request, RecurringBill $recurringBill): JsonResponse
    {
        if (!$request->user()->can('view-bills') && !$request->user()->can('manage-bills')) {
            abort(403, 'You do not have permission to view bills.');
        }

        $this->authorizeForTenant($request, $recurringBill);
        return response()->json($recurringBill->load(['category', 'account', 'createdBy']));
    }

    public function update(Request $request, RecurringBill $recurringBill): JsonResponse
    {
        if (!$request->user()->can('manage-bills')) {
            abort(403, 'You do not have permission to manage bills.');
        }
        $this->authorizeForTenant($request, $recurringBill);

        $data = $request->validate([
            'description'   => 'required|string|max:500',
            'amount'        => 'required|numeric|min:0.01',
            'currency'      => 'nullable|string|max:10',
            'type'          => 'required|in:income,expense',
            'frequency'     => 'required|in:daily,weekly,monthly,quarterly,yearly',
            'next_due_date' => 'required|date',
            'end_date'      => 'nullable|date|after_or_equal:next_due_date',
            'status'        => 'required|in:active,paused,completed',
            'category_id'   => 'nullable|exists:transaction_categories,id',
            'account_id'    => 'nullable|exists:accounts,id',
            'metadata'      => 'nullable|array',
        ]);

        $bill = $this->billService->update($recurringBill, $data);

        return response()->json($bill->load(['category', 'account', 'createdBy']));
    }

    public function destroy(Request $request, RecurringBill $recurringBill): JsonResponse
    {
        if (!$request->user()->can('manage-bills')) {
            abort(403, 'You do not have permission to manage bills.');
        }
        $this->authorizeForTenant($request, $recurringBill);

        $recurringBill->delete();

        return response()->json(['message' => 'Recurring bill deleted successfully.']);
    }

    public function pause(Request $request, RecurringBill $recurringBill): JsonResponse
    {
        if (!$request->user()->can('manage-bills')) {
            abort(403, 'You do not have permission to manage bills.');
        }
        $this->authorizeForTenant($request, $recurringBill);

        $bill = $this->billService->pause($recurringBill);

        return response()->json($bill);
    }

    public function resume(Request $request, RecurringBill $recurringBill): JsonResponse
    {
        if (!$request->user()->can('manage-bills')) {
            abort(403, 'You do not have permission to manage bills.');
        }
        $this->authorizeForTenant($request, $recurringBill);

        $bill = $this->billService->resume($recurringBill);

        return response()->json($bill);
    }

    protected function authorizeForTenant(Request $request, RecurringBill $bill): void
    {
        if ($bill->tenant_id !== $request->user()->tenant_id) {
            abort(403, 'Unauthorized access to this bill.');
        }
    }
}
