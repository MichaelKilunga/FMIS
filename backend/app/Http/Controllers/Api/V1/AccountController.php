<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Account;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

use App\Services\TransactionService;

class AccountController extends Controller
{
    public function __construct(
        protected TransactionService $transactionService
    ) {}
    public function index(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $accounts = Account::where('tenant_id', $tenantId)->where('is_active', true)->get();
        return response()->json($accounts);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'                      => 'required|string|max:255',
            'type'                      => 'required|in:bank,cash,mobile_money,credit',
            'balance'                   => 'required|numeric',
            'currency'                  => 'required|string|max:10',
            'bank_name'                 => 'nullable|string|max:255',
            'account_number'            => 'nullable|string|max:50',
            'color'                     => 'nullable|string|max:20',
            'allowed_transaction_types' => 'nullable|array',
            'allowed_transaction_types.*' => 'string|in:income,expense,transfer',
        ]);

        $data['tenant_id'] = $request->user()->tenant_id;
        $data['initial_balance'] = $data['balance'];

        $account = Account::create($data);

        return response()->json($account, 201);
    }

    public function show(Request $request, $id): JsonResponse
    {
        $account = Account::where('tenant_id', $request->user()->tenant_id)->findOrFail($id);
        return response()->json($account);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $account = Account::where('tenant_id', $request->user()->tenant_id)->findOrFail($id);

        $data = $request->validate([
            'name'                      => 'sometimes|required|string|max:255',
            'type'                      => 'sometimes|required|in:bank,cash,mobile_money,credit',
            'balance'                   => 'sometimes|required|numeric',
            'currency'                  => 'sometimes|required|string|max:10',
            'bank_name'                 => 'nullable|string|max:255',
            'account_number'            => 'nullable|string|max:50',
            'color'                     => 'nullable|string|max:20',
            'is_active'                 => 'sometimes|boolean',
            'allowed_transaction_types' => 'nullable|array',
            'allowed_transaction_types.*' => 'string|in:income,expense,transfer',
        ]);

        $account->update($data);

        return response()->json($account);
    }

    public function transfer(Request $request): JsonResponse
    {
        $data = $request->validate([
            'from_account_id' => 'required|exists:accounts,id',
            'to_account_id'   => 'required|exists:accounts,id|different:from_account_id',
            'amount'          => 'required|numeric|min:0.01',
            'description'     => 'nullable|string|max:500',
            'transaction_date'=> 'required|date',
        ]);

        $user = $request->user();
        $tenantId = $user->tenant_id;
        
        // Verify both accounts belong to the tenant
        $fromAccount = Account::where('tenant_id', $tenantId)->findOrFail($data['from_account_id']);
        $toAccount = Account::where('tenant_id', $tenantId)->findOrFail($data['to_account_id']);

        // Check if fromAccount has enough balance (optional check, better for UX)
        if ($fromAccount->balance < $data['amount']) {
            return response()->json([
                'message' => 'Insufficient funds in the source account.',
                'errors' => ['amount' => ['Insufficient balance']]
            ], 422);
        }

        // Use a shared reference to link the two transactions
        $sharedRef = 'TRF-' . strtoupper(substr(uniqid(), -8));
        $date = \Illuminate\Support\Carbon::parse($data['transaction_date'])->toDateString();
        $description = $data['description'] ?? "Fund Transfer: {$fromAccount->name} to {$toAccount->name}";

        try {
            return \Illuminate\Support\Facades\DB::transaction(function () use ($tenantId, $user, $data, $fromAccount, $toAccount, $sharedRef, $date, $description) {
                // 1. Create OUT transaction (Expense from source)
                $outTxn = $this->transactionService->create([
                    'tenant_id'        => $tenantId,
                    'amount'           => $data['amount'],
                    'type'             => 'expense',
                    'account_id'       => $fromAccount->id,
                    'created_by'       => $user->id,
                    'description'      => $description . " (Transfer Out)",
                    'transaction_date' => $date,
                    'status'           => \App\Models\Transaction::STATUS_DRAFT,
                    'reference'        => $sharedRef . '-OUT',
                    'metadata'         => ['is_transfer' => true, 'transfer_pair' => $sharedRef, 'peer_account' => $toAccount->id]
                ]);

                // 2. Create IN transaction (Income to destination)
                $inTxn = $this->transactionService->create([
                    'tenant_id'        => $tenantId,
                    'amount'           => $data['amount'],
                    'type'             => 'income',
                    'account_id'       => $toAccount->id,
                    'created_by'       => $user->id,
                    'description'      => $description . " (Transfer In)",
                    'transaction_date' => $date,
                    'status'           => \App\Models\Transaction::STATUS_DRAFT,
                    'reference'        => $sharedRef . '-IN',
                    'metadata'         => ['is_transfer' => true, 'transfer_pair' => $sharedRef, 'peer_account' => $fromAccount->id]
                ]);

                // 3. Submit both for approval
                $this->transactionService->submit($outTxn);
                $this->transactionService->submit($inTxn);

                return response()->json([
                    'message' => 'Fund transfer initiated. Two transactions have been submitted for approval.',
                    'transactions' => [
                        'out' => $outTxn->load('account'),
                        'in' => $inTxn->load('account')
                    ]
                ], 201);
            });
        } catch (\Exception $e) {
            return response()->json(['message' => 'Transfer failed: ' . $e->getMessage()], 500);
        }
    }

    public function destroy(Request $request, $id): JsonResponse
    {
        $account = Account::where('tenant_id', $request->user()->tenant_id)->findOrFail($id);
        
        // Check if account has transactions before deleting, or just deactivate
        if ($account->transactions()->exists()) {
            return response()->json(['message' => 'Cannot delete account with existing transactions. Deactivate it instead.'], 422);
        }

        $account->delete();

        return response()->json(null, 204);
    }
}
