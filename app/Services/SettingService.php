<?php

namespace App\Services;

use App\Models\Setting;
use Illuminate\Support\Facades\Cache;

class SettingService
{
    protected int $cacheTtl = 3600; // 1 hour

    public function get(string $key, mixed $default = null, ?int $tenantId = null): mixed
    {
        $cacheKey = "settings:{$tenantId}:{$key}";

        return Cache::remember($cacheKey, $this->cacheTtl, function () use ($key, $tenantId, $default) {
            $setting = Setting::where('key', $key)
                ->where('tenant_id', $tenantId)
                ->first();

            if ($setting) {
                return $setting->typed_value;
            }

            // Fall back to system-wide setting
            $system = Setting::where('key', $key)->whereNull('tenant_id')->first();
            return $system ? $system->typed_value : $default;
        });
    }

    public function set(string $key, mixed $value, ?int $tenantId = null, string $group = 'general', string $type = 'string'): Setting
    {
        $setting = Setting::updateOrCreate(
            ['key' => $key, 'tenant_id' => $tenantId],
            ['value' => is_array($value) ? json_encode($value) : (string) $value, 'group' => $group, 'type' => $type]
        );

        Cache::forget("settings:{$tenantId}:{$key}");
        Cache::forget("settings:{$tenantId}");
        // Also clear the "all" cache so refreshing the page reads fresh data
        Cache::forget("settings:all:{$tenantId}:");
        Cache::forget("settings:all:{$tenantId}:{$group}");

        return $setting;
    }

    public function all(?int $tenantId = null, ?string $group = null): array
    {
        $cacheKey = "settings:all:{$tenantId}:{$group}";

        return Cache::remember($cacheKey, $this->cacheTtl, function () use ($tenantId, $group) {
            $query = Setting::where('tenant_id', $tenantId);
            if ($group) {
                $query->where('group', $group);
            }
            return $query->get()->keyBy('key')->map(fn($s) => $s->typed_value)->toArray();
        });
    }

    public function isEnabled(string $module, ?int $tenantId = null): bool
    {
        return (bool) $this->get("modules.{$module}.enabled", true, $tenantId);
    }

    public function getThreshold(string $key, float $default = 0, ?int $tenantId = null): float
    {
        return (float) $this->get($key, $default, $tenantId);
    }
}
