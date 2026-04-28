<?php

namespace Tests\Feature;

use App\Models\TransactionCategory;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CategoryControllerTest extends TestCase
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

    public function test_can_list_categories()
    {
        TransactionCategory::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Test Category',
            'type' => 'expense',
            'color' => '#FF0000'
        ]);

        $response = $this->actingAs($this->user)->getJson('/api/v1/transaction-categories');

        $response->assertStatus(200)
            ->assertJsonCount(1);
    }

    public function test_can_create_category()
    {
        $data = [
            'name' => 'New Category',
            'type' => 'income',
            'color' => '#00FF00'
        ];

        $response = $this->actingAs($this->user)->postJson('/api/v1/transaction-categories', $data);

        $response->assertStatus(201)
            ->assertJsonPath('name', 'New Category');
    }

    public function test_can_update_category()
    {
        $category = TransactionCategory::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Old Category',
            'type' => 'expense',
            'color' => '#FF0000'
        ]);

        $response = $this->actingAs($this->user)->putJson("/api/v1/transaction-categories/{$category->id}", [
            'name' => 'Updated Category'
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('name', 'Updated Category');
    }

    public function test_cannot_access_other_tenant_category()
    {
        $otherTenant = Tenant::create(['name' => 'Other', 'slug' => 'other']);
        $category = TransactionCategory::create([
            'tenant_id' => $otherTenant->id,
            'name' => 'Secret Category',
            'type' => 'expense',
            'color' => '#FF0000'
        ]);

        $response = $this->actingAs($this->user)->getJson("/api/v1/transaction-categories/{$category->id}");

        $response->assertStatus(404);
    }
}
