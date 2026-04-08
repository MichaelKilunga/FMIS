<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Transaction;
use App\Services\TransactionService;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TransactionController extends Controller
{
    public function __construct(
        protected TransactionService $transactionService,
        protected AuditService $audit
    ) {}

    public function index(Request $request): JsonResponse
    {
        $tenant = $request->user()->tenant_id;
        $query  = Transaction::forTenant($tenant)
            ->with(['category', 'account', 'createdBy'])
            ->latest('transaction_date');

        // Filters
        if ($request->filled('type'))       $query->where('type', $request->type);
        if ($request->filled('status'))     $query->where('status', $request->status);
        if ($request->filled('category_id'))$query->where('category_id', $request->category_id);
        if ($request->filled('account_id')) $query->where('account_id', $request->account_id);
        if ($request->filled('from'))       $query->where('transaction_date', '>=', $request->from);
        if ($request->filled('to'))         $query->where('transaction_date', '<=', $request->to);
        if ($request->filled('search'))     $query->where('description', 'like', "%{$request->search}%");

        $transactions = $query->paginate($request->get('per_page', 20));

        return response()->json($transactions);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'amount'           => 'required|numeric|min:0.01',
            'type'             => 'required|in:income,expense,transfer',
            'category_id'      => 'nullable|exists:transaction_categories,id',
            'account_id'       => 'nullable|exists:accounts,id',
            'budget_id'        => 'nullable|exists:budgets,id',
            'department'       => 'nullable|string|max:100',
            'description'      => 'required|string|max:500',
            'notes'            => 'nullable|string',
            'transaction_date' => 'required|date',
            'currency'         => 'nullable|string|max:10',
        ]);

        $data['tenant_id']  = $request->user()->tenant_id;
        $data['created_by'] = $request->user()->id;
        $data['status']     = Transaction::STATUS_DRAFT;

        // Normalize date to avoid timezone shift issues
        if (!empty($data['transaction_date'])) {
            $data['transaction_date'] = \Illuminate\Support\Carbon::parse($data['transaction_date'])->toDateString();
        }

        // Restriction Check
        if (!empty($data['account_id'])) {
            $account = \App\Models\Account::where('id', $data['account_id'])
                ->where('tenant_id', $data['tenant_id'])
                ->first();
            
            if ($account && !empty($account->allowed_transaction_types)) {
                if (!in_array($data['type'], $account->allowed_transaction_types)) {
                    return response()->json([
                        'message' => "The selected account does not allow '{$data['type']}' transactions.",
                        'errors' => ['account_id' => ["This account is restricted for " . $data['type']]]
                    ], 422);
                }
            }
        }

        try {
            $transaction = $this->transactionService->create($data);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Transaction create failed', ['error' => $e->getMessage(), 'data' => $data]);
            return response()->json(['message' => 'Failed to create transaction: ' . $e->getMessage()], 500);
        }

        return response()->json($transaction->load(['category', 'account', 'createdBy']), 201);
    }

    public function show(Request $request, Transaction $transaction): JsonResponse
    {
        $this->authorizeForTenant($request, $transaction);
        return response()->json($transaction->load(['category', 'account', 'createdBy', 'approval.logs.user', 'fraudAlerts.rule']));
    }

    public function update(Request $request, Transaction $transaction): JsonResponse
    {
        $this->authorizeForTenant($request, $transaction);
        if (!in_array($transaction->status, [Transaction::STATUS_DRAFT, Transaction::STATUS_REJECTED])) {
            return response()->json(['message' => 'Only draft or rejected transactions can be edited.'], 422);
        }

        $data = $request->validate([
            'amount'           => 'required|numeric|min:0.01',
            'type'             => 'required|in:income,expense,transfer',
            'category_id'      => 'nullable|exists:transaction_categories,id',
            'account_id'       => 'nullable|exists:accounts,id',
            'budget_id'        => 'nullable|exists:budgets,id',
            'department'       => 'nullable|string|max:100',
            'description'      => 'required|string|max:500',
            'notes'            => 'nullable|string',
            'transaction_date' => 'required|date',
            'currency'         => 'nullable|string|max:10',
        ]);

        $before = $transaction->toArray();

        // Normalize date to avoid timezone shift issues
        if (!empty($data['transaction_date'])) {
            $data['transaction_date'] = \Illuminate\Support\Carbon::parse($data['transaction_date'])->toDateString();
        }

        // Restriction Check
        if (!empty($data['account_id'])) {
            $account = \App\Models\Account::where('id', $data['account_id'])
                ->where('tenant_id', $request->user()->tenant_id)
                ->first();
            
            if ($account && !empty($account->allowed_transaction_types)) {
                if (!in_array($data['type'], $account->allowed_transaction_types)) {
                    return response()->json([
                        'message' => "The selected account does not allow '{$data['type']}' transactions.",
                        'errors' => ['account_id' => ["This account is restricted for " . $data['type']]]
                    ], 422);
                }
            }
        }

        $transaction->update($data);
        $this->audit->logModelChange('transaction_updated', $transaction, $before);

        return response()->json($transaction->fresh(['category', 'account', 'createdBy']));
    }

    public function destroy(Request $request, Transaction $transaction): JsonResponse
    {
        $this->authorizeForTenant($request, $transaction);
        if ($transaction->status !== Transaction::STATUS_DRAFT) {
            return response()->json(['message' => 'Only draft transactions can be deleted.'], 422);
        }

        $this->audit->log('transaction_deleted', $transaction);
        $transaction->delete();

        return response()->json(['message' => 'Transaction deleted successfully.']);
    }

    public function submit(Request $request, Transaction $transaction): JsonResponse
    {
        $this->authorizeForTenant($request, $transaction);
        try {
            $transaction = $this->transactionService->submit($transaction);
            return response()->json($transaction->load(['category', 'account', 'approval']));
        } catch (\Illuminate\Auth\Access\AuthorizationException $e) {
            return response()->json(['message' => $e->getMessage()], 403);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function post(Request $request, Transaction $transaction): JsonResponse
    {
        $this->authorizeForTenant($request, $transaction);
        if (!$request->user()->can('post-transactions')) {
            abort(403, 'You do not have permission to post transactions.');
        }
        $transaction = $this->transactionService->post($transaction);
        return response()->json($transaction);
    }

    protected function authorizeForTenant(Request $request, Transaction $transaction): void
    {
        if ($transaction->tenant_id !== $request->user()->tenant_id) {
            abort(403, 'Unauthorized access to this transaction.');
        }
    }
}
