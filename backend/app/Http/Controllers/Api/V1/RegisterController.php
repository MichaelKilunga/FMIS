<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Models\User;
use App\Models\TransactionCategory;
use App\Models\Setting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Role;

class RegisterController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        $request->validate([
            // Director Details
            'director_name'     => 'required|string|max:255',
            'email'             => 'required|email|unique:users,email',
            'password'          => 'required|string|min:8|confirmed',
            
            // Organization Details
            'organization_name' => 'required|string|max:255',
            'phone'             => 'nullable|string',
            'address'           => 'nullable|string',
        ]);

        return DB::transaction(function () use ($request) {
            // 1. Create Tenant
            $slug = Str::slug($request->organization_name);
            // Check if slug exists, if so append random string
            if (Tenant::where('slug', $slug)->exists()) {
                $slug .= '-' . Str::random(4);
            }

            $tenant = Tenant::create([
                'name'      => $request->organization_name,
                'slug'      => $slug,
                'email'     => $request->email,
                'phone'     => $request->phone,
                'address'   => $request->address,
                'plan'      => 'trial',
                'currency'  => 'TZS',
                'timezone'  => 'Africa/Dar_es_Salaam',
                'is_active' => true,
            ]);

            // 2. Create Director User
            $user = User::create([
                'tenant_id' => $tenant->id,
                'name'      => $request->director_name,
                'email'     => $request->email,
                'password'  => $request->password,
            ]);
            
            $user->sendEmailVerificationNotification();

            // 3. Assign Director and Tenant Admin Roles
            $directorRole = Role::firstOrCreate(['name' => 'director', 'guard_name' => 'web']);
            $adminRole = Role::firstOrCreate(['name' => 'tenant-admin', 'guard_name' => 'web']);
            $user->assignRole([$directorRole, $adminRole]);

            // 4. Initialize Default Categories
            $this->initCategories($tenant->id);

            // 5. Initialize Default Settings
            $this->initSettings($tenant->id);

            // 6. Generate Token
            $token = $user->createToken('fmis-token')->plainTextToken;

            return response()->json([
                'message' => 'Registration successful.',
                'token'   => $token,
                'user'    => [
                    'id'         => $user->id,
                    'name'       => $user->name,
                    'email'      => $user->email,
                    'is_verified'=> $user->hasVerifiedEmail(),
                    'tenant_id'  => $user->tenant_id,
                    'roles'      => [$directorRole->name, $adminRole->name],
                ],
                'tenant' => $tenant,
            ], 201);
        });
    }

    protected function initCategories($tenantId)
    {
        $incomeCategories = ['Sales', 'Services', 'Investments', 'Other Income'];
        foreach ($incomeCategories as $cat) {
            TransactionCategory::create([
                'name'      => $cat,
                'tenant_id' => $tenantId,
                'type'      => 'income',
                'color'     => '#10B981'
            ]);
        }

        $expenseCategories = ['Rent', 'Salaries', 'Utilities', 'Marketing', 'Equipment', 'Miscellaneous'];
        foreach ($expenseCategories as $cat) {
            TransactionCategory::create([
                'name'      => $cat,
                'tenant_id' => $tenantId,
                'type'      => 'expense',
                'color'     => '#EF4444'
            ]);
        }
    }

    protected function initSettings($tenantId)
    {
        $defaultSettings = [
            ['key' => 'modules.analytics.enabled',       'value' => 'true',   'type' => 'boolean', 'group' => 'modules',   'description' => 'Enable Analytics module'],
            ['key' => 'modules.approvals.enabled',        'value' => 'true',   'type' => 'boolean', 'group' => 'modules',   'description' => 'Enable Approval Workflows'],
            ['key' => 'modules.budgeting.enabled',        'value' => 'true',   'type' => 'boolean', 'group' => 'modules',   'description' => 'Enable Budgeting module'],
            ['key' => 'modules.fraud_detection.enabled',  'value' => 'true',   'type' => 'boolean', 'group' => 'modules',   'description' => 'Enable Fraud Detection'],
            ['key' => 'modules.reporting.enabled',        'value' => 'true',   'type' => 'boolean', 'group' => 'modules',   'description' => 'Enable Reporting module'],
            ['key' => 'approval.auto_approve_below',  'value' => '0',      'type' => 'integer', 'group' => 'approvals', 'description' => 'Auto-approve transactions below this amount'],
            ['key' => 'invoice.default_tax_rate',  'value' => '18',   'type' => 'integer', 'group' => 'invoice', 'description' => 'Default VAT rate (%)'],
        ];

        foreach ($defaultSettings as $s) {
            Setting::create(array_merge($s, ['tenant_id' => $tenantId, 'is_system' => true]));
        }
    }
}
