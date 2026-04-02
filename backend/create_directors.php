<?php
use App\Models\User;
use Spatie\Permission\Models\Role;

$role = Role::firstOrCreate(['name' => 'director', 'guard_name' => 'web']);
$u2 = User::updateOrCreate(['email' => 'test-director-2@fmis.com'], [
    'name' => 'Director Two',
    'password' => bcrypt('password'),
    'tenant_id' => 1,
    'is_active' => true,
    'is_verified' => true
]);
$u2->assignRole($role);

$u3 = User::updateOrCreate(['email' => 'test-director-3@fmis.com'], [
    'name' => 'Director Three',
    'password' => bcrypt('password'),
    'tenant_id' => 1,
    'is_active' => true,
    'is_verified' => true
]);
$u3->assignRole($role);

echo "Directors created successfully.\n";
