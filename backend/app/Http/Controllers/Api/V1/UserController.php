<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class UserController extends Controller
{
    public function __construct(protected AuditService $audit) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = User::with('roles', 'permissions');

        // If not super-admin, restrict to tenant
        if ($user->tenant_id !== null) {
            $query->forTenant($user->tenant_id);
        } elseif ($request->has('tenant_id')) {
            // Super-admin can filter by tenant
            $query->forTenant($request->tenant_id);
        }

        $users = $query->paginate(20);

        $users->getCollection()->transform(function ($u) {
            return [
                'id'         => $u->id,
                'name'       => $u->name,
                'email'      => $u->email,
                'phone'      => $u->phone,
                'department' => $u->department,
                'avatar_url' => $u->avatar_url,
                'is_active'  => $u->is_active,
                'tenant_id'  => $u->tenant_id,
                'tenant_name'=> $u->tenant?->name,
                'roles'      => $u->roles->pluck('name'),
                'permissions'=> $u->getAllPermissions()->pluck('name'),
            ];
        });

        return response()->json($users);
    }

    public function store(Request $request): JsonResponse
    {
        $isSuperAdmin = $request->user()->tenant_id === null;

        $data = $request->validate([
            'name'       => 'required|string|max:255',
            'email'      => 'required|email|unique:users',
            'password'   => 'required|string|min:8',
            'role'       => 'required|string|exists:roles,name',
            'department' => 'nullable|string',
            'phone'      => 'nullable|string',
            'tenant_id'  => $isSuperAdmin ? 'nullable|exists:tenants,id' : 'prohibited',
        ]);

        $user = User::create([
            'tenant_id'  => $isSuperAdmin ? ($data['tenant_id'] ?? null) : $request->user()->tenant_id,
            'name'       => $data['name'],
            'email'      => $data['email'],
            'password'   => $data['password'],
            'department' => $data['department'] ?? null,
            'phone'      => $data['phone'] ?? null,
        ]);

        $user->assignRole($data['role']);
        $this->audit->logModelChange('user_created', $user);

        return response()->json($user->load('roles'), 201);
    }

    public function show(Request $request, User $user): JsonResponse
    {
        if ($request->user()->tenant_id !== null) {
            abort_if($user->tenant_id !== $request->user()->tenant_id, 403);
        }
        return response()->json($user->load('roles', 'permissions', 'tenant'));
    }

    public function update(Request $request, User $user): JsonResponse
    {
        if ($request->user()->tenant_id !== null) {
            abort_if($user->tenant_id !== $request->user()->tenant_id, 403);
        }

        $data = $request->validate([
            'name'       => 'sometimes|string|max:255',
            'department' => 'nullable|string',
            'phone'      => 'nullable|string',
            'is_active'  => 'sometimes|boolean',
            'role'       => 'sometimes|string|exists:roles,name',
            'tenant_id'  => $request->user()->tenant_id === null ? 'nullable|exists:tenants,id' : 'prohibited',
        ]);

        if (isset($data['role'])) {
            $user->syncRoles([$data['role']]);
            unset($data['role']);
        }

        $user->update($data);
        $this->audit->logModelChange('user_updated', $user);
        return response()->json($user->fresh()->load('roles', 'tenant'));
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        if ($request->user()->tenant_id !== null) {
            abort_if($user->tenant_id !== $request->user()->tenant_id, 403);
        }
        
        abort_if($user->id === $request->user()->id, 422, 'You cannot delete yourself.');
        $this->audit->log('user_deleted', $user);
        $user->delete();
        return response()->json(['message' => 'User deleted.']);
    }
}
