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
        $keys = [
            'system.privacy_policy', 'system.terms_of_service', 'system.support_email', 'maps.google_api_key',
            'system.name', 'system.logo', 'system.favicon', 'system.primary_color', 'system.accent_color',
            'system.seo.title', 'system.seo.description', 'system.seo.keywords',
            'landing.hero_title', 'landing.hero_subtitle', 'landing.cta_text'
        ];
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
        $user = $request->user();
        $isSystemWide = $request->boolean('is_system_wide') && $user->can('manage-tenants');

        $data = $request->validate([
            'name'              => 'nullable|string|max:255',
            'email'             => 'nullable|email|max:255',
            'phone'             => 'nullable|string|max:100',
            'address'           => 'nullable|string|max:1000',
            'primary_color'     => 'nullable|string|max:20',
            'secondary_color'   => 'nullable|string|max:20',
            'accent_color'      => 'nullable|string|max:20',
            'invoice_template'  => 'nullable|string|in:classic,modern,minimal,corporate',
            'invoice_style'     => 'nullable|string|in:light,dark,branded',
            'invoice_accent_color' => 'nullable|string|max:20',
            'invoice_accounts'  => 'nullable|string', // JSON string of [{type,name,number}]
            'is_system_wide'    => 'nullable|boolean',
        ]);

        if ($isSystemWide) {
            // Update global settings
            if ($request->hasFile('logo')) {
                $request->validate(['logo' => 'image|max:4096']);
                $path = $request->file('logo')->store("system/logos", 'public');
                $this->settings->set('system.logo', asset('storage/' . $path), null, 'branding');
            }

            if ($request->hasFile('favicon')) {
                $request->validate(['favicon' => 'image|max:1024']);
                $path = $request->file('favicon')->store("system/favicons", 'public');
                $this->settings->set('system.favicon', asset('storage/' . $path), null, 'branding');
            }

            if (isset($data['name'])) $this->settings->set('system.name', $data['name'], null, 'branding');
            if (isset($data['primary_color'])) $this->settings->set('system.primary_color', $data['primary_color'], null, 'branding', 'color');
            if (isset($data['secondary_color'])) $this->settings->set('system.secondary_color', $data['secondary_color'], null, 'branding', 'color');
            if (isset($data['accent_color'])) $this->settings->set('system.accent_color', $data['accent_color'], null, 'branding', 'color');

            $this->audit->log('system_branding_updated', null, [], ['updated_by' => $user->id]);
            
            return response()->json(['message' => 'System branding updated successfully']);
        }

        // Default: Tenant branding
        $tenant = $user->tenant;
        if (!$tenant) {
            return response()->json(['error' => 'Tenant not found'], 404);
        }

        if ($request->hasFile('logo')) {
            $request->validate(['logo' => 'image|max:4096']);
            $data['logo'] = $request->file('logo')->store("tenants/{$tenant->id}/logos", 'public');
        }

        if ($request->hasFile('favicon')) {
            $request->validate(['favicon' => 'image|max:1024']);
            $data['favicon'] = $request->file('favicon')->store("tenants/{$tenant->id}/favicons", 'public');
        }

        // Persist tenant core fields
        $tenantFields = array_intersect_key($data, array_flip([
            'name', 'email', 'phone', 'address', 'primary_color', 'secondary_color', 'accent_color', 'logo', 'favicon'
        ]));
        $tenant->update($tenantFields);

        // Persist invoice-specific settings
        $invoiceSettingMap = [
            'invoice_template'     => ['group' => 'invoice', 'type' => 'string'],
            'invoice_style'        => ['group' => 'invoice', 'type' => 'string'],
            'invoice_accent_color' => ['group' => 'invoice', 'type' => 'color'],
            'invoice_accounts'     => ['group' => 'invoice', 'type' => 'json'],
        ];

        foreach ($invoiceSettingMap as $key => $meta) {
            if (isset($data[$key])) {
                $this->settings->set($key, $data[$key], $tenant->id, $meta['group'], $meta['type']);
            }
        }

        $this->audit->log('branding_updated', $tenant);

        return response()->json(['branding' => $tenant->fresh()->branding]);
    }
}
