<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\TransactionCategory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TransactionCategoryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $query = TransactionCategory::where('tenant_id', $tenantId)->where('is_active', true);

        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        return response()->json($query->orderBy('name')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'        => 'required|string|max:255',
            'type'        => 'required|in:income,expense',
            'color'       => 'nullable|string|max:20',
            'icon'        => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'parent_id'   => 'nullable|exists:transaction_categories,id',
        ]);

        $data['tenant_id'] = $request->user()->tenant_id;

        $category = TransactionCategory::create($data);

        return response()->json($category, 201);
    }

    public function show(Request $request, $id): JsonResponse
    {
        $category = TransactionCategory::where('tenant_id', $request->user()->tenant_id)->findOrFail($id);
        return response()->json($category);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $category = TransactionCategory::where('tenant_id', $request->user()->tenant_id)->findOrFail($id);

        $data = $request->validate([
            'name'        => 'sometimes|required|string|max:255',
            'type'        => 'sometimes|required|in:income,expense',
            'color'       => 'nullable|string|max:20',
            'icon'        => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'parent_id'   => 'nullable|exists:transaction_categories,id',
            'is_active'   => 'sometimes|boolean',
        ]);

        $category->update($data);

        return response()->json($category);
    }

    public function destroy(Request $request, $id): JsonResponse
    {
        $category = TransactionCategory::where('tenant_id', $request->user()->tenant_id)->findOrFail($id);

        if ($category->transactions()->exists()) {
            return response()->json(['message' => 'Cannot delete category with existing transactions. Deactivate it instead.'], 422);
        }

        $category->delete();

        return response()->json(null, 204);
    }
}
