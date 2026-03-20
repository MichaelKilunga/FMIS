<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Models\User;
use App\Models\Transaction;
use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SystemAdminController extends Controller
{
    public function stats(): JsonResponse
    {
        $stats = [
            'total_tenants' => Tenant::count(),
            'active_tenants' => Tenant::where('is_active', true)->count(),
            'total_users' => User::count(),
            'active_users' => User::where('is_active', true)->count(),
            'total_transactions' => Transaction::count(),
            'total_revenue' => Transaction::where('type', 'income')->where('status', 'posted')->sum('amount'),
            'tenants_by_plan' => Tenant::select('plan', DB::raw('count(*) as count'))->groupBy('plan')->get(),
        ];

        return response()->json($stats);
    }

    public function health(): JsonResponse
    {
        $health = [
            'database' => $this->checkDatabase(),
            'storage' => $this->getStorageInfo(),
            'laravel_version' => app()->version(),
            'php_version' => PHP_VERSION,
            'os' => PHP_OS,
            'server' => $_SERVER['SERVER_SOFTWARE'] ?? 'Unknown',
        ];

        return response()->json($health);
    }

    public function activity(): JsonResponse
    {
        $logs = AuditLog::with('user', 'tenant')
            ->orderBy('created_at', 'desc')
            ->paginate(50);

        return response()->json($logs);
    }

    private function checkDatabase(): array
    {
        try {
            DB::connection()->getPdo();
            return ['status' => 'healthy', 'connection' => config('database.default')];
        } catch (\Exception $e) {
            return ['status' => 'unhealthy', 'error' => $e->getMessage()];
        }
    }

    private function getStorageInfo(): array
    {
        $free = disk_free_space(base_path());
        $total = disk_total_space(base_path());
        $used = $total - $free;

        return [
            'total' => $this->formatBytes($total),
            'free' => $this->formatBytes($free),
            'used' => $this->formatBytes($used),
            'usage_percentage' => round(($used / $total) * 100, 2),
        ];
    }

    private function formatBytes($bytes, $precision = 2): string
    {
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        $bytes = max($bytes, 0);
        $pow = floor(($bytes ? log($bytes) : 0) / log(1024));
        $pow = min($pow, count($units) - 1);
        $bytes /= (1 << (10 * $pow));

        return round($bytes, $precision) . ' ' . $units[$pow];
    }
}
