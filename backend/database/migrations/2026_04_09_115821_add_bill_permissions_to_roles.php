<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $permissions = ['view-bills', 'manage-bills'];
        
        foreach ($permissions as $name) {
            DB::table('permissions')->insertOrIgnore([
                'name'       => $name,
                'guard_name' => 'web',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
        
        // Get roles that should have both permissions
        $roleNames = ['super-admin', 'tenant-admin', 'director', 'manager'];
        $roles = DB::table('roles')->whereIn('name', $roleNames)->get();
        $permissionRecords = DB::table('permissions')->whereIn('name', $permissions)->get();
        
        foreach ($roles as $role) {
            foreach ($permissionRecords as $perm) {
                DB::table('role_has_permissions')->insertOrIgnore([
                    'role_id'       => $role->id,
                    'permission_id' => $perm->id,
                ]);
            }
        }
        
        // Staff role: view-bills only
        $staffRole = DB::table('roles')->where('name', 'staff')->first();
        $viewPerm = DB::table('permissions')->where('name', 'view-bills')->first();
        
        if ($staffRole && $viewPerm) {
            DB::table('role_has_permissions')->insertOrIgnore([
                'role_id'       => $staffRole->id,
                'permission_id' => $viewPerm->id,
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $permissions = ['view-bills', 'manage-bills'];
        $permissionIds = DB::table('permissions')->whereIn('name', $permissions)->pluck('id');
        
        DB::table('role_has_permissions')->whereIn('permission_id', $permissionIds)->delete();
        DB::table('permissions')->whereIn('id', $permissionIds)->delete();
    }
};
