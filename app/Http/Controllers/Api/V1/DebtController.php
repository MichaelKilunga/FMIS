<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Debt;
use App\Models\DebtPayment;
use App\Services\DebtService;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DebtController extends Controller
{
    public function __construct(
        protected DebtService $debtService,
        protected AuditService $audit
    ) {}

    public function index(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $query = Debt::forTenant($tenantId)->with('account')->latest();

        if ($request->filled('type'))   $query->where('type', $request->type);
        if ($request->filled('status')) $query->where('status', $request->status);
        if ($request->filled('search')) $query->where('name', 'like', "%{$request->search}%");

        return response()->json($query->paginate($request->get('per_page', 20)));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'             => 'required|string|max:255',
            'type'             => 'required|in:payable,receivable',
            'total_amount'     => 'required|numeric|min:0',
            'interest_rate'    => 'nullable|numeric|min:0',
            'issue_date'       => 'required|date',
            'due_date'         => 'nullable|date|after_or_equal:issue_date',
            'account_id'       => 'nullable|exists:accounts,id',
            'client_id'        => 'nullable|exists:clients,id',
            'description'      => 'nullable|string',
        ]);

        $tenantId = $request->user()->tenant_id;
        
        $debt = Debt::create([
            'tenant_id'        => $tenantId,
            'remaining_amount' => $data['total_amount'],
            ...$data,
        ]);

        $this->audit->logModelChange('debt_created', $debt);

        return response()->json($debt, 201);
    }

    public function show(Request $request, Debt $debt): JsonResponse
    {
        abort_if($debt->tenant_id !== $request->user()->tenant_id, 403);
        return response()->json($debt->load(['account', 'payments.transaction']));
    }

    public function update(Request $request, Debt $debt): JsonResponse
    {
        abort_if($debt->tenant_id !== $request->user()->tenant_id, 403);

        $data = $request->validate([
            'name'          => 'sometimes|string|max:255',
            'total_amount'  => 'sometimes|numeric|min:0',
            'interest_rate' => 'nullable|numeric|min:0',
            'issue_date'    => 'sometimes|date',
            'due_date'      => 'nullable|date',
            'status'        => 'sometimes|in:active,paid,overdue,defaulted',
            'client_id'     => 'nullable|exists:clients,id',
            'description'   => 'nullable|string',
        ]);

        $before = $debt->toArray();
        $debt->update($data);
        
        $this->audit->logModelChange('debt_updated', $debt, $before);

        return response()->json($debt->fresh('account'));
    }

    public function recordPayment(Request $request, Debt $debt): JsonResponse
    {
        abort_if($debt->tenant_id !== $request->user()->tenant_id, 403);

        $maxAmount = round((float) $debt->remaining_amount, 2);
        $data = $request->validate([
            'amount'       => "required|numeric|min:0.01|max:{$maxAmount}",
            'account_id'   => 'nullable|integer|exists:accounts,id',
            'payment_date' => 'nullable|date',
            'notes'        => 'nullable|string',
        ]);

        $payment = $this->debtService->recordPayment($debt, $data);
        $this->audit->logModelChange('debt_payment_recorded', $payment);

        return response()->json([
            'message' => 'Payment recorded successfully.',
            'payment' => $payment->load('transaction'),
            'debt'    => $debt->fresh(),
        ]);
    }

    public function remind(Request $request, Debt $debt): JsonResponse
    {
        abort_if($debt->tenant_id !== $request->user()->tenant_id, 403);
        
        $clientEmail = $debt->client?->email;
        if (!$clientEmail) {
            return response()->json(['message' => 'Client has no email address configured.'], 422);
        }

        $notificationService = app(\App\Services\NotificationService::class);
        $notificationService->notifyClient(
            $clientEmail,
            "Debt Reminder: {$debt->name}",
            "This is a reminder regarding your outstanding balance of " . number_format($debt->remaining_amount, 2) . ". Please settle your due payments.",
            $debt->tenant_id,
            ['url' => config('app.frontend_url') . "/debts/{$debt->id}", 'label' => 'View Details'],
            'warning',
            ['debt_id' => $debt->id]
        );

        $this->audit->log('debt_reminder_sent', $debt);

        return response()->json(['message' => 'Reminder sent successfully.']);
    }

    public function destroy(Request $request, Debt $debt): JsonResponse
    {
        abort_if($debt->tenant_id !== $request->user()->tenant_id, 403);
        $this->audit->log('debt_deleted', $debt);
        $debt->delete();
        return response()->json(['message' => 'Debt record deleted.']);
    }
}
