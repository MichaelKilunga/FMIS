<?php

namespace Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use App\Models\Transaction;
use App\Models\Budget;
use App\Models\FraudAlert;
use App\Models\Election;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use Spatie\Permission\Models\Role;

class AnalyticsTest extends TestCase
{
    use RefreshDatabase;

    protected $tenant;
    protected $user;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->tenant = Tenant::create(['name' => 'Test Tenant', 'slug' => 'test-tenant']);
        $this->user = User::factory()->create(['tenant_id' => $this->tenant->id]);
        
        $directorRole = Role::firstOrCreate(['name' => 'director', 'guard_name' => 'web']);
        $this->user->assignRole($directorRole);
    }

    public function test_summary_returns_new_director_metrics()
    {
        // 1. Pending Transactions
        Transaction::factory()->create([
            'tenant_id' => $this->tenant->id,
            'amount' => 5000,
            'status' => 'pending',
            'type' => 'expense'
        ]);

        // 2. High Severity Fraud Alert
        FraudAlert::factory()->create([
            'tenant_id' => $this->tenant->id,
            'severity' => 'critical',
            'status' => 'open',
        ]);

        // 3. Budget at Risk (90% spent)
        Budget::factory()->create([
            'tenant_id' => $this->tenant->id,
            'amount' => 1000,
            'spent' => 900,
            'status' => 'active',
        ]);

        // 4. Active Election
        Election::factory()->create([
            'tenant_id' => $this->tenant->id,
            'status' => 'ongoing',
            'started_by' => $this->user->id,
        ]);

        $response = $this->actingAs($this->user)->getJson('/api/v1/analytics/summary');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'totalIncome', 'totalExpense', 'pendingApprovals',
                'openFraudAlerts', 'highSeverityFraudAlerts',
                'activeBudgets', 'exceededBudgets', 'budgetAtRisk',
                'totalPendingValue', 'activeElection'
            ])
            ->assertJson([
                'highSeverityFraudAlerts' => 1,
                'budgetAtRisk' => 1,
                'totalPendingValue' => 5000,
                'activeElection' => true,
            ]);
    }
}
