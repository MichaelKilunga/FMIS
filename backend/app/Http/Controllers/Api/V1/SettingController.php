<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Services\SettingService;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettingController extends Controller
{
    public function __construct(
        protected SettingService $settings,
        protected AuditService $audit
    ) {}

    public function index(Request $request): JsonResponse
    {
        $tenantId = $request->get('system') === 'true' && $request->user()->can('manage-tenants') ? null : $request->user()->tenant_id;
        $tenantId = ($tenantId === "" || $tenantId === null) ? null : (int) $tenantId;
        $group = $request->get('group');
        $settings = $this->settings->all($tenantId, $group);
        return response()->json($settings);
    }

    public function get(Request $request, string $key): JsonResponse
    {
        $tenantId = $request->get('system') === 'true' && $request->user()->can('manage-tenants') ? null : $request->user()->tenant_id;
        $tenantId = ($tenantId === "" || $tenantId === null) ? null : (int) $tenantId;
        $value = $this->settings->get($key, null, $tenantId);
        return response()->json(['key' => $key, 'value' => $value]);
    }

    public function getSystemSettings(): JsonResponse
    {
        $keys = ['system.privacy_policy', 'system.terms_of_service', 'system.support_email'];
        $results = [];
        foreach ($keys as $key) {
            $results[$key] = $this->settings->get($key, null, null);
        }
        return response()->json($results);
    }

    public function set(Request $request): JsonResponse
    {
        $data = $request->validate([
            'key'         => 'required|string',
            'value'       => 'nullable',
            'group'       => 'nullable|string',
            'type'        => 'nullable|in:string,boolean,integer,json,color',
            'description' => 'nullable|string',
            'is_system_wide' => 'nullable|boolean',
        ]);

        $tenantId = ($data['is_system_wide'] ?? false) && $request->user()->can('manage-tenants') ? null : $request->user()->tenant_id;
        
        $setting  = $this->settings->set(
            $data['key'],
            $data['value'],
            $tenantId,
            $data['group'] ?? 'general',
            $data['type'] ?? 'string'
        );

        $this->audit->log('setting_updated', null, [], ['key' => $data['key'], 'value' => $data['value'], 'tenant_id' => $tenantId]);

        return response()->json($setting);
    }

    public function setBulk(Request $request): JsonResponse
    {
        $data = $request->validate([
            'settings'        => 'required|array',
            'settings.*.key'  => 'required|string',
            'settings.*.value'=> 'nullable',
            'settings.*.group'=> 'nullable|string',
            'settings.*.type' => 'nullable|string',
            'is_system_wide'  => 'nullable|boolean',
        ]);

        $tenantId = ($data['is_system_wide'] ?? false) && $request->user()->can('manage-tenants') ? null : $request->user()->tenant_id;
        
        foreach ($data['settings'] as $item) {
            $this->settings->set($item['key'], $item['value'], $tenantId, $item['group'] ?? 'general', $item['type'] ?? 'string');
        }

        $this->audit->log('settings_bulk_updated', null, [], ['count' => count($data['settings']), 'tenant_id' => $tenantId]);

        return response()->json(['message' => count($data['settings']) . ' settings updated.']);
    }

    public function updateBranding(Request $request): JsonResponse
    {
        $user   = $request->user();
        $tenant = $user->tenant;

        $data = $request->validate([
            'primary_color'   => 'nullable|string|max:20',
            'secondary_color' => 'nullable|string|max:20',
            'accent_color'    => 'nullable|string|max:20',
        ]);

        if ($request->hasFile('logo')) {
            $request->validate(['logo' => 'image|max:4096']);
            $data['logo'] = $request->file('logo')->store("tenants/{$tenant->id}/logos", 'public');
        }

        if ($request->hasFile('favicon')) {
            $request->validate(['favicon' => 'image|max:1024']);
            $data['favicon'] = $request->file('favicon')->store("tenants/{$tenant->id}/favicons", 'public');
        }

        $tenant->update($data);
        $this->audit->log('branding_updated', $tenant);

        return response()->json(['branding' => $tenant->fresh()->branding]);
    }
}
