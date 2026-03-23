<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Client;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ClientController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $query = Client::forTenant($tenantId)->latest();

        if ($request->filled('search')) {
            $query->where(function($q) use ($request) {
                $q->where('name', 'like', "%{$request->search}%")
                  ->orWhere('email', 'like', "%{$request->search}%")
                  ->orWhere('phone', 'like', "%{$request->search}%");
            });
        }

        return response()->json($query->paginate($request->get('per_page', 20)));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'    => 'required|string|max:255',
            'email'   => 'nullable|email|max:255',
            'phone'   => 'nullable|string|max:255',
            'address' => 'nullable|string',
            'metadata' => 'nullable|array',
        ]);

        $data['tenant_id'] = $request->user()->tenant_id;

        $client = Client::create($data);

        return response()->json($client, 201);
    }

    public function show(Request $request, Client $client): JsonResponse
    {
        abort_if($client->tenant_id !== $request->user()->tenant_id, 403);
        return response()->json($client->loadCount(['invoices', 'debts']));
    }

    public function update(Request $request, Client $client): JsonResponse
    {
        abort_if($client->tenant_id !== $request->user()->tenant_id, 403);

        $data = $request->validate([
            'name'    => 'sometimes|required|string|max:255',
            'email'   => 'nullable|email|max:255',
            'phone'   => 'nullable|string|max:255',
            'address' => 'nullable|string',
            'metadata' => 'nullable|array',
        ]);

        $client->update($data);

        return response()->json($client);
    }

    public function destroy(Request $request, Client $client): JsonResponse
    {
        abort_if($client->tenant_id !== $request->user()->tenant_id, 403);

        if ($client->invoices()->exists() || $client->debts()->exists()) {
            return response()->json([
                'message' => 'Cannot delete client with associated invoices or debts. Archive them instead.'
            ], 422);
        }

        $client->delete();

        return response()->json(['message' => 'Client deleted successfully.']);
    }
}
