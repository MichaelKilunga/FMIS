<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TenantController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()->can('manage-tenants'), 403);
        $tenants = Tenant::paginate(20);
        return response()->json($tenants);
    }

    public function store(Request $request): JsonResponse
    {
        abort_unless($request->user()->can('manage-tenants'), 403);
        $data = $request->validate([
            'slug'            => 'required|string|unique:tenants',
            'name'            => 'required|string|max:255',
            'email'           => 'required|email',
            'phone'           => 'nullable|string',
            'address'         => 'nullable|string',
            'plan'            => 'required|string',
            'is_active'       => 'boolean',
        ]);

        $tenant = Tenant::create($data);

        // Auto-create an admin user for the new tenant
        $user = \App\Models\User::create([
            'tenant_id' => $tenant->id,
            'name'      => 'Tenant Admin',
            'email'     => $data['email'],
            'password'  => 'password', // Default password
            'is_active' => true,
        ]);
        
        $role = \Spatie\Permission\Models\Role::firstOrCreate(['name' => 'director', 'guard_name' => 'web']);
        $user->assignRole($role);

        return response()->json($tenant, 201);
    }

    public function show(Request $request, Tenant $tenant): JsonResponse
    {
        abort_unless($request->user()->can('manage-tenants'), 403);
        return response()->json($tenant);
    }

    public function update(Request $request, Tenant $tenant): JsonResponse
    {
        abort_unless($request->user()->can('manage-tenants'), 403);
        $data = $request->validate([
            'name'            => 'sometimes|string|max:255',
            'email'           => 'sometimes|email',
            'phone'           => 'nullable|string',
            'address'         => 'nullable|string',
            'plan'            => 'sometimes|string',
            'is_active'       => 'sometimes|boolean',
        ]);

        $tenant->update($data);
        return response()->json($tenant->fresh());
    }

    public function destroy(Request $request, Tenant $tenant): JsonResponse
    {
        abort_unless($request->user()->can('manage-tenants'), 403);
        $tenant->delete();
        return response()->json(['message' => 'Tenant deleted.']);
    }
}
