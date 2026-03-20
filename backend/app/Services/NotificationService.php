<?php

namespace App\Services;

use App\Models\User;
use App\Models\Tenant;
use App\Notifications\StandardNotification;
use Illuminate\Support\Facades\Notification;

class NotificationService
{
    public function __construct(
        protected SettingService $settings
    ) {}

    /**
     * Send a notification to specific users or a role within a tenant.
     * Checks both system channel availability and tenant feature preferences.
     */
    public function send(
        iterable|User $users,
        string $title,
        string $content,
        string $featureKey = 'general', // e.g., 'approvals', 'invoices'
        array $action = [],
        string $type = 'info',
        array $metadata = []
    ): void {
        if (!is_iterable($users)) {
            $users = [$users];
        }

        // Group users by tenant to respect tenant settings
        $usersByTenant = collect($users)->groupBy('tenant_id');

        foreach ($usersByTenant as $tenantId => $tenantUsers) {
            // Ensure $tenantId is null if it's an empty string (happens when grouping by null in collections)
            $actualTenantId = $tenantId === "" ? null : $tenantId;

            // Check if this feature's notifications are enabled for the tenant
            // e.g. 'notifications.features.approvals'
            $featureSettingKey = "notifications.features.{$featureKey}";
            $isFeatureEnabled = $this->settings->get($featureSettingKey, true, $actualTenantId);

            if (!$isFeatureEnabled) {
                continue; // Skip sending if the tenant disabled this feature's notifications
            }

            // Determine which channels are enabled globally (System Admin) and then by Tenant
            $channels = $this->determineChannels($actualTenantId);

            if (empty($channels)) {
                continue; // No channels available
            }

            $metadata['channels'] = $channels;
            $metadata['feature'] = $featureKey;

            $notification = new StandardNotification($title, $content, $action, $type, $metadata);

            Notification::send($tenantUsers, $notification);
        }
    }

    /**
     * Determine available channels based on system and tenant settings.
     */
    protected function determineChannels(?int $tenantId): array
    {
        $channels = ['database']; // Database is always active if the feature is enabled

        // Check system-level email toggle
        $isSystemEmailEnabled = $this->settings->get('notifications.channels.email.enabled', true, null);
        
        if ($isSystemEmailEnabled) {
            // Check tenant-level email toggle
            $isTenantEmailEnabled = $this->settings->get('notifications.channels.email.enabled', true, $tenantId);
            if ($isTenantEmailEnabled) {
                $channels[] = 'mail';
            }
        }

        // SMS or other channels can be added similarly
        return $channels;
    }
}
