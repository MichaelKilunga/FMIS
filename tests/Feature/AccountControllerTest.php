<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AccountControllerTest extends TestCase
{
    use RefreshDatabase;

    protected $tenant;
    protected $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = Tenant::create(['name' => 'Test Tenant', 'slug' => 'test-tenant']);
        $this->user = User::factory()->create(['tenant_id' => $this->tenant->id]);
    }

    public function test_can_list_accounts()
    {
        Account::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Test Account',
            'type' => 'bank',
            'balance' => 1000,
            'currency' => 'USD',
            'initial_balance' => 1000
        ]);

        $response = $this->actingAs($this->user)->getJson('/api/v1/accounts');

        $response->assertStatus(200)
            ->assertJsonCount(1);
    }

    public function test_can_create_account()
    {
        $data = [
            'name' => 'New Account',
            'type' => 'cash',
            'balance' => 500,
            'currency' => 'USD'
        ];

        $response = $this->actingAs($this->user)->postJson('/api/v1/accounts', $data);

        $response->assertStatus(201)
            ->assertJsonPath('name', 'New Account');
        
        $this->assertDatabaseHas('accounts', ['name' => 'New Account', 'tenant_id' => $this->tenant->id]);
    }

    public function test_can_show_account()
    {
        $account = Account::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Test Account',
            'type' => 'bank',
            'balance' => 1000,
            'currency' => 'USD',
            'initial_balance' => 1000
        ]);

        $response = $this->actingAs($this->user)->getJson("/api/v1/accounts/{$account->id}");

        $response->assertStatus(200)
            ->assertJsonPath('name', 'Test Account');
    }

    public function test_can_update_account()
    {
        $account = Account::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Old Name',
            'type' => 'bank',
            'balance' => 1000,
            'currency' => 'USD',
            'initial_balance' => 1000
        ]);

        $response = $this->actingAs($this->user)->putJson("/api/v1/accounts/{$account->id}", [
            'name' => 'New Name'
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('name', 'New Name');
    }

    public function test_cannot_access_other_tenant_account()
    {
        $otherTenant = Tenant::create(['name' => 'Other', 'slug' => 'other']);
        $account = Account::create([
            'tenant_id' => $otherTenant->id,
            'name' => 'Secret Account',
            'type' => 'bank',
            'balance' => 1000,
            'currency' => 'USD',
            'initial_balance' => 1000
        ]);

        $response = $this->actingAs($this->user)->getJson("/api/v1/accounts/{$account->id}");

        $response->assertStatus(404);
    }
}
