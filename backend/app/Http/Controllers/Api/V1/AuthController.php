<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function __construct(protected AuditService $audit) {}

    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        if (!$user->is_active) {
            return response()->json(['message' => 'Your account has been deactivated.'], 403);
        }

        $token = $user->createToken('fmis-token')->plainTextToken;

        $this->audit->log('user_login', $user, [], [], [], $user->tenant_id, $user->id);

        return response()->json([
            'token' => $token,
            'user'  => $this->userResource($user),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();
        $this->audit->log('user_logout', $user, [], [], [], $user->tenant_id, $user->id);
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Logged out successfully.']);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user()->load('roles', 'permissions');
        return response()->json($this->userResource($user));
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();
        $data = $request->validate([
            'name'       => 'sometimes|string|max:255',
            'phone'      => 'sometimes|nullable|string',
            'department' => 'sometimes|nullable|string',
        ]);

        if ($request->hasFile('avatar')) {
            $request->validate(['avatar' => 'image|max:2048']);
            $path = $request->file('avatar')->store("avatars/{$user->tenant_id}", 'public');
            $data['avatar'] = $path;
        }

        $user->update($data);
        return response()->json(['user' => $this->userResource($user->fresh())]);
    }

    protected function userResource(User $user): array
    {
        return [
            'id'         => $user->id,
            'name'       => $user->name,
            'email'      => $user->email,
            'phone'      => $user->phone,
            'department' => $user->department,
            'avatar_url' => $user->avatar_url,
            'is_active'  => $user->is_active,
            'tenant_id'  => $user->tenant_id,
            'tenant'     => $user->tenant ? $user->tenant->branding : null,
            'roles'      => $user->roles->pluck('name'),
            'permissions'=> $user->getAllPermissions()->pluck('name'),
        ];
    }
}
