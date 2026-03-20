<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Account;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AccountController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $accounts = Account::where('tenant_id', $tenantId)->where('is_active', true)->get();
        return response()->json($accounts);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'            => 'required|string|max:255',
            'type'            => 'required|in:bank,cash,mobile_money,credit',
            'balance'         => 'required|numeric',
            'currency'        => 'required|string|max:10',
            'bank_name'       => 'nullable|string|max:255',
            'account_number'  => 'nullable|string|max:50',
            'color'           => 'nullable|string|max:20',
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
            'name'            => 'sometimes|required|string|max:255',
            'type'            => 'sometimes|required|in:bank,cash,mobile_money,credit',
            'balance'         => 'sometimes|required|numeric',
            'currency'        => 'sometimes|required|string|max:10',
            'bank_name'       => 'nullable|string|max:255',
            'account_number'  => 'nullable|string|max:50',
            'color'           => 'nullable|string|max:20',
            'is_active'       => 'sometimes|boolean',
        ]);

        $account->update($data);

        return response()->json($account);
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
