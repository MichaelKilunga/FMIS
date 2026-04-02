<?php

namespace Database\Seeders;

use App\Models\Setting;
use App\Models\Tenant;
use App\Models\User;
use App\Models\TransactionCategory;
use App\Models\Account;
use App\Models\FraudRule;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Roles and Permissions
        $permissions = [
            'manage-tenants',
            'view-transactions', 'create-transactions', 'edit-transactions', 'delete-transactions',
            'submit-transactions', 'post-transactions',
            'view-approvals', 'approve-transactions', 'reject-transactions',
            'view-invoices', 'create-invoices', 'manage-invoices',
            'view-reports', 'export-reports',
            'view-budgets', 'manage-budgets',
            'view-analytics',
            'view-fraud-alerts', 'manage-fraud-rules',
            'view-audit-logs',
            'manage-settings', 'manage-users',
            'manage-workflows',
            'view-debts', 'manage-debts',
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'web']);
        }

        $superAdmin = Role::firstOrCreate(['name' => 'super-admin', 'guard_name' => 'web']);
        $tenantAdmin = Role::firstOrCreate(['name' => 'tenant-admin', 'guard_name' => 'web']);
        $director = Role::firstOrCreate(['name' => 'director', 'guard_name' => 'web']);
        $manager  = Role::firstOrCreate(['name' => 'manager',  'guard_name' => 'web']);
        $staff    = Role::firstOrCreate(['name' => 'staff',    'guard_name' => 'web']);

        // Super Admin: all permissions
        $superAdmin->syncPermissions(Permission::all());

        // Tenant Admin: all permissions except manage-tenants
        $tenantAdmin->syncPermissions(Permission::where('name', '!=', 'manage-tenants')->get());

        // Director: restricted to operational permissions
        $director->syncPermissions([
            'view-transactions', 'create-transactions', 'edit-transactions', 'submit-transactions',
            'view-approvals', 'approve-transactions', 'reject-transactions',
            'view-invoices', 'create-invoices',
            'view-reports', 'export-reports',
            'view-budgets',
            'view-analytics', 'view-debts', 'manage-debts',
            'view-fraud-alerts',
            'view-audit-logs',
            'manage-users',
        ]);

        // Manager: same as director but without approval authority (usually)
        // Adjusting based on standard flow
        $manager->syncPermissions([
            'view-transactions', 'create-transactions', 'edit-transactions', 'submit-transactions',
            'view-invoices', 'create-invoices',
            'view-reports', 'view-analytics', 'view-budgets', 'view-debts', 'manage-debts',
        ]);

        // Staff: limited permissions
        $staff->syncPermissions([
            'view-transactions', 'create-transactions', 'submit-transactions',
            'view-invoices', 'view-reports', 'view-budgets',
        ]);

        // 2. Demo Tenant
        $tenant = Tenant::firstOrCreate(
            ['slug' => 'skylink-solutions'],
            [
                'name'            => 'Skylink Solutions Ltd',
                'email'           => 'admin@skylinksolutions.co',
                'phone'           => '+255 000 000 000',
                'address'         => '123 Innovation Street, Dar es Salaam, Tanzania',
                'primary_color'   => '#3B82F6',
                'secondary_color' => '#0F172A',
                'accent_color'    => '#10B981',
                'plan'            => 'enterprise',
                'currency'        => 'TZS',
                'timezone'        => 'Africa/Dar_es_Salaam',
                'is_active'       => true,
            ]
        );

        // 3. Users
        $adminUser = User::firstOrCreate(
            ['email' => 'admin@skylinksolutions.co'],
            ['name' => 'System Admin', 'password' => 'password', 'tenant_id' => null, 'department' => 'System']
        );
        $adminUser->assignRole($superAdmin);

        $directorUser = User::firstOrCreate(
            ['email' => 'director@skylinksolutions.co'],
            ['name' => 'John Director', 'password' => 'password', 'tenant_id' => $tenant->id, 'department' => 'Executive']
        );
        $directorUser->assignRole($director);

        $managerUser = User::firstOrCreate(
            ['email' => 'manager@skylinksolutions.co'],
            ['name' => 'Jane Manager', 'password' => 'password', 'tenant_id' => $tenant->id, 'department' => 'Finance']
        );
        $managerUser->assignRole($manager);

        $staffUser = User::firstOrCreate(
            ['email' => 'staff@skylinksolutions.co'],
            ['name' => 'Bob Staff', 'password' => 'password', 'tenant_id' => $tenant->id, 'department' => 'Operations']
        );
        $staffUser->assignRole($staff);

        // 4. Transaction Categories
        $incomeCategories = ['Software Sales', 'Consulting Services', 'Maintenance Contracts', 'Training Revenue', 'Other Income'];
        foreach ($incomeCategories as $cat) {
            TransactionCategory::firstOrCreate(['name' => $cat, 'tenant_id' => $tenant->id], ['type' => 'income', 'color' => '#10B981']);
        }

        $expenseCategories = ['Salaries', 'Office Rent', 'Software Licenses', 'Travel & Transport', 'Marketing', 'Utilities', 'Equipment', 'Miscellaneous'];
        foreach ($expenseCategories as $cat) {
            TransactionCategory::firstOrCreate(['name' => $cat, 'tenant_id' => $tenant->id], ['type' => 'expense', 'color' => '#EF4444']);
        }

        // 5. Accounts
        Account::firstOrCreate(['name' => 'Main Bank Account', 'tenant_id' => $tenant->id], ['type' => 'bank', 'balance' => 5000000, 'initial_balance' => 5000000, 'currency' => 'TZS', 'bank_name' => 'CRDB Bank']);
        Account::firstOrCreate(['name' => 'Petty Cash', 'tenant_id' => $tenant->id], ['type' => 'cash', 'balance' => 200000, 'initial_balance' => 200000, 'currency' => 'TZS']);
        Account::firstOrCreate(['name' => 'M-Pesa Business', 'tenant_id' => $tenant->id], ['type' => 'mobile_money', 'balance' => 1500000, 'initial_balance' => 0, 'currency' => 'TZS']);

        // 6. Default Settings
        $defaultSettings = [
            // Modules
            ['key' => 'modules.analytics.enabled',       'value' => 'true',   'type' => 'boolean', 'group' => 'modules',   'description' => 'Enable Analytics module'],
            ['key' => 'modules.approvals.enabled',        'value' => 'true',   'type' => 'boolean', 'group' => 'modules',   'description' => 'Enable Approval Workflows'],
            ['key' => 'modules.budgeting.enabled',        'value' => 'true',   'type' => 'boolean', 'group' => 'modules',   'description' => 'Enable Budgeting module'],
            ['key' => 'modules.fraud_detection.enabled',  'value' => 'true',   'type' => 'boolean', 'group' => 'modules',   'description' => 'Enable Fraud Detection'],
            ['key' => 'modules.reporting.enabled',        'value' => 'true',   'type' => 'boolean', 'group' => 'modules',   'description' => 'Enable Reporting module'],
            // Approval
            ['key' => 'approval.auto_approve_below',  'value' => '100000', 'type' => 'integer', 'group' => 'approvals', 'description' => 'Auto-approve transactions below this amount (TZS)'],
            // Fraud
            ['key' => 'fraud.sensitivity', 'value' => 'medium', 'type' => 'string', 'group' => 'fraud', 'description' => 'Fraud detection sensitivity (low/medium/high)'],
            // Invoice
            ['key' => 'invoice.default_tax_rate',  'value' => '18',   'type' => 'integer', 'group' => 'invoice', 'description' => 'Default VAT rate (%)'],
            ['key' => 'invoice.default_terms',     'value' => 'Payment is due within 30 days of the invoice date.', 'type' => 'string', 'group' => 'invoice'],
        ];

        foreach ($defaultSettings as $s) {
            Setting::firstOrCreate(
                ['key' => $s['key'], 'tenant_id' => $tenant->id],
                ['value' => $s['value'], 'type' => $s['type'], 'group' => $s['group'], 'is_system' => true, 'description' => $s['description'] ?? null]
            );
        }

        // 7. Fraud Rules
        FraudRule::firstOrCreate(['name' => 'Duplicate Transaction', 'tenant_id' => $tenant->id], [
            'type'        => 'duplicate',
            'conditions'  => ['window_minutes' => 60],
            'severity'    => 'high',
            'description' => 'Flags a transaction if an identical transaction occurred in the last 60 minutes.',
        ]);

        FraudRule::firstOrCreate(['name' => 'Abnormal High Amount', 'tenant_id' => $tenant->id], [
            'type'        => 'abnormal_amount',
            'conditions'  => ['threshold' => 10000000],
            'severity'    => 'critical',
            'description' => 'Flags any single transaction above TZS 10,000,000.',
        ]);

        FraudRule::firstOrCreate(['name' => 'Late Night Transaction', 'tenant_id' => $tenant->id], [
            'type'        => 'suspicious_timing',
            'conditions'  => ['start_hour' => 22, 'end_hour' => 5],
            'severity'    => 'medium',
            'description' => 'Flags transactions created between 10 PM and 5 AM.',
        ]);

        FraudRule::firstOrCreate(['name' => 'High Velocity Transactions', 'tenant_id' => $tenant->id], [
            'type'        => 'velocity',
            'conditions'  => ['max_count' => 10, 'window_minutes' => 30],
            'severity'    => 'high',
            'description' => 'Flags if a user creates more than 10 transactions in 30 minutes.',
        ]);

        $this->command->info('✅ FMIS seeding complete! Login credentials:');
        $this->command->info("  Super Admin: admin@skylinksolutions.co / password");
        $this->command->info("  Director: director@skylinksolutions.co / password");
        $this->command->info("  Manager:  manager@skylinksolutions.co / password");
        $this->command->info("  Staff:    staff@skylinksolutions.co / password");
    }
}
