<?php

namespace Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use App\Models\Setting;
use App\Notifications\StandardNotification;
use App\Services\NotificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class NotificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_does_not_send_notification_if_feature_disabled_by_tenant()
    {
        Notification::fake();

        $tenant = Tenant::create(['name' => 'Acme Corp', 'slug' => 'acme']);
        $user = User::factory()->create(['tenant_id' => $tenant->id]);

        // Disable feature for tenant
        Setting::create([
            'tenant_id' => $tenant->id,
            'key' => 'notifications.features.approvals',
            'value' => 'false',
            'type' => 'boolean'
        ]);

        $service = app(NotificationService::class);
        $service->send($user, 'Test', 'Test content', 'approvals');

        Notification::assertNothingSent();
    }

    public function test_it_sends_notification_if_feature_enabled()
    {
        Notification::fake();

        $tenant = Tenant::create(['name' => 'Acme Corp', 'slug' => 'acme']);
        $user = User::factory()->create(['tenant_id' => $tenant->id]);

        // Enable feature mapping setting
        Setting::create([
            'tenant_id' => $tenant->id,
            'key' => 'notifications.features.approvals',
            'value' => 'true',
            'type' => 'boolean'
        ]);

        $service = app(NotificationService::class);
        $service->send($user, 'Test', 'Test content', 'approvals');

        Notification::assertSentTo(
            [$user], StandardNotification::class
        );
    }
}
