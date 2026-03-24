<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Transaction;
use App\Models\Budget;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use App\Models\Task;
use App\Models\TaskHistory;
use App\Models\RecurringBill;
use App\Models\Debt;
use App\Models\FraudAlert;
use App\Models\Election;

class AnalyticsController extends Controller
{
    public function summary(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $refresh  = $request->boolean('refresh');
        $cacheKey = "analytics:summary:{$tenantId}:" . date('Y-m-d');

        if ($refresh) {
            Cache::forget($cacheKey);
        }

        $data = Cache::remember($cacheKey, 60, function () use ($tenantId, $request) {
            $baseQuery = Transaction::query();
            if ($tenantId) $baseQuery->forTenant($tenantId);

            $totalIncome = (clone $baseQuery)
                ->where('type', 'income')->where('status', 'posted')
                ->sum('amount');

            $totalExpense = (clone $baseQuery)
                ->where('type', 'expense')->where('status', 'posted')
                ->sum('amount');
                
            $pendingIncome = (clone $baseQuery)
                ->where('type', 'income')->whereIn('status', ['draft', 'submitted', 'approved'])
                ->sum('amount');
                
            $pendingExpense = (clone $baseQuery)
                ->where('type', 'expense')->whereIn('status', ['draft', 'submitted', 'approved'])
                ->sum('amount');

            $pendingApprovals = \App\Models\Approval::forTenant($tenantId)
                ->where('status', 'pending')->count();

            $openFraudAlerts = \App\Models\FraudAlert::forTenant($tenantId)
                ->where('status', 'open')->count();

            $highSeverityFraudAlerts = \App\Models\FraudAlert::forTenant($tenantId)
                ->where('status', 'open')
                ->whereIn('severity', ['high', 'critical'])
                ->count();

            $activeBudgets = Budget::forTenant($tenantId)->where('status', 'active')->count();
            $exceededBudgets = Budget::forTenant($tenantId)
                ->whereRaw('spent >= amount')->count();

            $budgetAtRisk = Budget::forTenant($tenantId)
                ->where('status', 'active')
                ->whereRaw('spent >= (amount * 0.8)')
                ->count();

            $totalPendingValue = Transaction::forTenant($tenantId)
                ->whereIn('status', ['pending', 'submitted'])
                ->sum('amount');

            $activeElection = \App\Models\Election::forTenant($tenantId)
                ->where('status', 'ongoing')
                ->exists();

            $canViewDebts = $request->user()->can('view-debts');
            $canViewBills = $request->user()->can('view-bills') || $request->user()->can('manage-bills');

            $totalPayable = $canViewDebts ? \App\Models\Debt::forTenant($tenantId)
                ->where('type', 'payable')
                ->where('status', '!=', 'paid')
                ->sum('remaining_amount') : 0;

            $totalReceivable = $canViewDebts ? \App\Models\Debt::forTenant($tenantId)
                ->where('type', 'receivable')
                ->where('status', '!=', 'paid')
                ->sum('remaining_amount') : 0;

            $overdueDebtsCount = $canViewDebts ? \App\Models\Debt::forTenant($tenantId)
                ->where('status', 'overdue')
                ->count() : 0;

            $activeBillsCount = $canViewBills ? \App\Models\RecurringBill::forTenant($tenantId)
                ->where('status', 'active')
                ->count() : 0;

            $upcomingBillsCount = $canViewBills ? \App\Models\RecurringBill::forTenant($tenantId)
                ->where('status', 'active')
                ->where('next_due_date', '<=', now()->addDays(7))
                ->count() : 0;

            $monthlyRecurringIncome = 0;
            $monthlyRecurringExpense = 0;

            if ($canViewBills) {
                $recurringBills = \App\Models\RecurringBill::forTenant($tenantId)
                    ->where('status', 'active')
                    ->get();
                
                foreach ($recurringBills as $bill) {
                    $multiplier = match ($bill->frequency) {
                        'daily'     => 30.42, // Average days in month
                        'weekly'    => 4.345, // Average weeks in month
                        'monthly'   => 1,
                        'quarterly' => 0.333,
                        'yearly'    => 0.0833,
                        default     => 1
                    };
                    $monthlyAmount = $bill->amount * $multiplier;
                    if ($bill->type === 'income') $monthlyRecurringIncome += $monthlyAmount;
                    else $monthlyRecurringExpense += $monthlyAmount;
                }
            }

            $tasksCount = \App\Models\Task::forTenant($tenantId)->whereIn('status', ['pending', 'in_progress'])->count();
            $overdueTasksCount = \App\Models\Task::forTenant($tenantId)
                ->where('status', '!=', 'completed')
                ->where('due_date', '<', now())
                ->count();

            return compact(
                'totalIncome', 'totalExpense', 'pendingIncome', 'pendingExpense', 
                'pendingApprovals', 'openFraudAlerts', 'highSeverityFraudAlerts',
                'activeBudgets', 'exceededBudgets', 'budgetAtRisk',
                'totalPendingValue', 'activeElection',
                'totalPayable', 'totalReceivable', 'overdueDebtsCount',
                'activeBillsCount', 'upcomingBillsCount', 
                'monthlyRecurringIncome', 'monthlyRecurringExpense',
                'tasksCount', 'overdueTasksCount'
            );
        });

        return response()->json($data);
    }

    public function cashFlow(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $months   = (int) $request->get('months', 6);
        $refresh  = $request->boolean('refresh');
        $cacheKey = "analytics:cashflow:{$tenantId}:{$months}";

        if ($refresh) Cache::forget($cacheKey);

        $data = Cache::remember($cacheKey, 300, function () use ($tenantId, $months) {
            $driver = DB::getDriverName();
            $periodFormat = $driver === 'sqlite' 
                ? "strftime('%Y-%m', transaction_date)" 
                : "DATE_FORMAT(transaction_date, '%Y-%m')";

            $query = Transaction::query()->where('status', 'posted');
            if ($tenantId) $query->forTenant($tenantId);

            return $query
                ->where('transaction_date', '>=', now()->subMonths($months)->startOfMonth())
                ->selectRaw("{$periodFormat} as period,
                             SUM(CASE WHEN type='income' THEN amount ELSE 0 END) as income,
                             SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as expense")
                ->groupBy('period')
                ->orderBy('period')
                ->get()
                ->toArray();
        });

        return response()->json($data);
    }

    public function incomeVsExpenses(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $from = $request->get('from', now()->startOfMonth()->toDateString());
        $to   = $request->get('to', now()->endOfMonth()->toDateString());
        $refresh = $request->boolean('refresh');
        $cacheKey = "analytics:income_expense:{$tenantId}:{$from}:{$to}";

        if ($refresh) Cache::forget($cacheKey);

        $data = Cache::remember($cacheKey, 300, function () use ($tenantId, $from, $to) {
            $query = Transaction::query()
                ->where('status', 'posted')
                ->whereBetween('transaction_date', [$from, $to]);
            
            if ($tenantId) $query->where('t.tenant_id', $tenantId);

            return $query
                ->selectRaw("tc.name as category,
                             SUM(CASE WHEN t.type='income' THEN t.amount ELSE 0 END) as income,
                             SUM(CASE WHEN t.type='expense' THEN t.amount ELSE 0 END) as expense")
                ->from('transactions as t')
                ->leftJoin('transaction_categories as tc', 't.category_id', '=', 'tc.id')
                ->groupBy('tc.name')
                ->get()
                ->toArray();
        });

        return response()->json($data);
    }

    public function trends(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $weeks    = (int) $request->get('weeks', 12);
        $refresh  = $request->boolean('refresh');
        $cacheKey = "analytics:trends:{$tenantId}:{$weeks}";

        if ($refresh) Cache::forget($cacheKey);

        $data = Cache::remember($cacheKey, 600, function () use ($tenantId, $weeks) {
            $driver = DB::getDriverName();
            $weekFormat = $driver === 'sqlite' 
                ? "strftime('%Y%W', transaction_date)" 
                : "YEARWEEK(transaction_date)";

            $query = Transaction::query()->where('status', 'posted');
            if ($tenantId) $query->forTenant($tenantId);

            return $query
                ->where('transaction_date', '>=', now()->subWeeks($weeks))
                ->selectRaw("{$weekFormat} as week,
                             SUM(amount) as total, type")
                ->groupBy('week', 'type')
                ->orderBy('week')
                ->get()
                ->toArray();
        });

        return response()->json($data);
    }

    public function budgetOverview(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $query = Budget::query()->where('status', 'active')->with('category');
        if ($tenantId) $query->forTenant($tenantId);
        
        $budgets = $query->get();
        $budgets->each->append(['variance', 'usage_percentage']);

        return response()->json($budgets);
    }

    public function productivity(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $refresh  = $request->boolean('refresh');
        $cacheKey = "analytics:productivity:{$tenantId}:" . date('Y-m-d-H');

        if ($refresh) Cache::forget($cacheKey);

        $data = Cache::remember($cacheKey, 600, function () use ($tenantId) {
            $query = Task::query();
            if ($tenantId) $query->forTenant($tenantId);
            
            $totalTasks = $query->count();
            if ($totalTasks === 0) return ['velocity' => 0, 'completion_rate' => 0, 'overdue_rate' => 0, 'by_priority' => []];

            $completedTasks = (clone $query)->where('status', 'completed')->count();
            $overdueTasks   = (clone $query)
                ->where('status', '!=', 'completed')
                ->where('due_date', '<', now())
                ->count();

            $completedTasksMonthly = (clone $query)
                ->where('status', 'completed')
                ->where('completed_at', '>=', now()->subDays(30))
                ->with('assignee')
                ->get();

            $velocity = $completedTasksMonthly->count();
            $weightedImpact = $completedTasksMonthly->sum(function($task) {
                return $task->assignee ? $task->assignee->seniority_level : 1;
            });

            $byPriority = Task::forTenant($tenantId)
                ->select('priority', DB::raw('count(*) as count'))
                ->groupBy('priority')
                ->get();

            $today = now()->toDateString();
            $expectedStaff = \App\Models\User::forTenant($tenantId)->count();
            $attendancesToday = \App\Models\Attendance::forTenant($tenantId)->where('date', $today)->get();
            $presentCount = $attendancesToday->count();
            $onTimeCount = $attendancesToday->where('status', 'present')->count();
            
            $attendanceRate = $expectedStaff > 0 ? round(($presentCount / $expectedStaff) * 100, 2) : 0;
            $onTimeRate = $presentCount > 0 ? round(($onTimeCount / $presentCount) * 100, 2) : 0;

            return [
                'total'           => $totalTasks,
                'completed'       => $completedTasks,
                'overdue'         => $overdueTasks,
                'completion_rate' => round(($completedTasks / max($totalTasks, 1)) * 100, 2),
                'overdue_rate'    => round(($overdueTasks / max($totalTasks, 1)) * 100, 2),
                'velocity'        => $velocity,
                'weighted_impact' => $weightedImpact,
                'by_priority'     => $byPriority->toArray(),
                'attendance_rate' => $attendanceRate,
                'on_time_rate'    => $onTimeRate,
                'staff_present'   => $presentCount,
                'staff_expected'  => $expectedStaff
            ];
        });

        return response()->json($data);
    }

    public function forecasting(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $refresh  = $request->boolean('refresh');
        $cacheKey = "analytics:forecasting:{$tenantId}";

        if ($refresh) Cache::forget($cacheKey);

        $data = Cache::remember($cacheKey, 600, function () use ($tenantId) {
            $baseTx = Transaction::query();
            if ($tenantId) $baseTx->forTenant($tenantId);

            $baseBill = \App\Models\RecurringBill::query();
            if ($tenantId) $baseBill->forTenant($tenantId);

            // Get last 6 months revenue average
            $avgIncome = (clone $baseTx)
                ->where('type', 'income')->where('status', 'posted')
                ->where('transaction_date', '>=', now()->subMonths(6))
                ->sum('amount') / 6;

            $avgExpense = (clone $baseTx)
                ->where('type', 'expense')->where('status', 'posted')
                ->where('transaction_date', '>=', now()->subMonths(6))
                ->sum('amount') / 6;

            // Add recurring bills to forecast
            $recurringIncome = (clone $baseBill)
                ->where('status', 'active')->where('type', 'income')->sum('amount');
            $recurringExpense = (clone $baseBill)
                ->where('status', 'active')->where('type', 'expense')->sum('amount');

            $forecasts = [];
            $currentBalance = (clone $baseTx)->where('status', 'posted')
                ->selectRaw("SUM(CASE WHEN type='income' THEN amount ELSE -amount END) as balance")
                ->value('balance') ?? 0;

            for ($i = 1; $i <= 3; $i++) {
                $month = now()->addMonths($i)->format('Y-m');
                $predictedIncome = $avgIncome + $recurringIncome;
                $predictedExpense = $avgExpense + $recurringExpense;
                $currentBalance += ($predictedIncome - $predictedExpense);

                $forecasts[] = [
                    'period'  => $month,
                    'income'  => round($predictedIncome, 2),
                    'expense' => round($predictedExpense, 2),
                    'balance' => round($currentBalance, 2),
                ];
            }

            return $forecasts;
        });

        return response()->json($data);
    }

    public function financialHealth(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        
        // Calculate health score indices
        $budgetScore = 100;
        $activeBudgets = Budget::forTenant($tenantId)->where('status', 'active')->count();
        if ($activeBudgets > 0) {
            $exceeded = Budget::forTenant($tenantId)->whereRaw('spent > amount')->count();
            $budgetScore = 100 - (($exceeded / $activeBudgets) * 100);
        }

        $debtScore = 100;
        $payables = \App\Models\Debt::forTenant($tenantId)->where('type', 'payable')->sum('remaining_amount');
        $receivables = \App\Models\Debt::forTenant($tenantId)->where('type', 'receivable')->sum('remaining_amount');
        if ($payables > 0) {
            $ratio = $receivables / $payables;
            $debtScore = min(100, $ratio * 50); // Ratio of 2.0 gives 100 score
        }

        $cashFlowScore = 100;
        $lastMonthIncome = Transaction::forTenant($tenantId)->where('type', 'income')
            ->where('status', 'posted')->where('transaction_date', '>=', now()->subMonth())->sum('amount');
        $lastMonthExpense = Transaction::forTenant($tenantId)->where('type', 'expense')
            ->where('status', 'posted')->where('transaction_date', '>=', now()->subMonth())->sum('amount');
        
        if ($lastMonthIncome > 0) {
            $margin = ($lastMonthIncome - $lastMonthExpense) / $lastMonthIncome;
            $cashFlowScore = max(0, min(100, ($margin + 0.2) * 200)); // 30% margin gives ~100
        } else if ($lastMonthExpense > 0) {
            $cashFlowScore = 0;
        }

        $overallScore = ($budgetScore * 0.3) + ($debtScore * 0.3) + ($cashFlowScore * 0.4);

        $insights = [];
        if ($overallScore > 80) $insights[] = "Financial health is excellent. Consider scaling operations or increasing investment.";
        else if ($overallScore > 50) $insights[] = "Financial health is stable. Monitor budget variances closely.";
        else $insights[] = "Financial health is at risk. Reduce expenses and prioritize debt collection.";

        if ($debtScore < 50) $insights[] = "High payables detected. Negotiate payment terms or accelerate receivables.";
        if ($budgetScore < 70) $insights[] = "Multiple budgets exceeded. Review departmental spending.";

        return response()->json([
            'score' => round($overallScore, 1),
            'indices' => [
                'budget'    => round($budgetScore, 1),
                'debt'      => round($debtScore, 1),
                'cash_flow' => round($cashFlowScore, 1)
            ],
            'insights' => $insights
        ]);
    }

    public function customerInsights(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $refresh  = $request->boolean('refresh');
        
        // Use different cache key for systems admin vs tenant
        $scope    = $tenantId ?: 'system_admin';
        $cacheKey = "analytics:insights:{$scope}";

        if ($refresh) Cache::forget($cacheKey);

        $data = Cache::remember($cacheKey, 600, function () use ($tenantId) {
            if (!$tenantId) {
                // System Admin: Top Tenants and At-Risk Tenants
                $topTenants = DB::table('transactions as t')
                    ->join('tenants as tn', 't.tenant_id', '=', 'tn.id')
                    ->where('t.type', 'income')
                    ->where('t.status', 'posted')
                    ->select('tn.name as client_name', DB::raw('count(*) as paid_count'), DB::raw('sum(t.amount) as total_paid'))
                    ->groupBy('tn.name')
                    ->orderByDesc('total_paid')
                    ->limit(5)
                    ->get();

                // At-Risk Tenants (e.g., no activity in 7 days or negative balance)
                $atRiskTenants = DB::table('tenants as tn')
                    ->leftJoin('transactions as t', function($join) {
                        $join->on('tn.id', '=', 't.tenant_id')
                             ->where('t.created_at', '>=', now()->subDays(7));
                    })
                    ->select('tn.name as client_name', DB::raw('count(t.id) as overdue_count'))
                    ->groupBy('tn.id', 'tn.name')
                    ->having('overdue_count', '=', 0)
                    ->orderBy('tn.created_at', 'desc')
                    ->limit(5)
                    ->get();
                
                // Add a dummy total_overdue to match frontend expected structure if needed
                $atRiskTenants->each(function($item) {
                    $item->total_overdue = 0;
                });

                return [
                    'at_risk' => $atRiskTenants->toArray(),
                    'top_clients' => $topTenants->toArray(),
                    'is_system_admin' => true
                ];
            }

            // Regular Tenant: Top Expense Categories and Large Expenses
            $topCategories = DB::table('transactions as t')
                ->join('transaction_categories as tc', 't.category_id', '=', 'tc.id')
                ->where('t.tenant_id', $tenantId)
                ->where('t.type', 'expense')
                ->where('t.status', 'posted')
                ->select('tc.name as client_name', DB::raw('count(*) as paid_count'), DB::raw('sum(t.amount) as total_paid'))
                ->groupBy('tc.name')
                ->orderByDesc('total_paid')
                ->limit(5)
                ->get();

            $largeExpenses = Transaction::forTenant($tenantId)
                ->where('type', 'expense')
                ->where('status', 'posted')
                ->orderByDesc('amount')
                ->limit(5)
                ->get()
                ->map(function($tx) {
                    return [
                        'client_name' => $tx->reference . ' (' . $tx->transaction_date . ')',
                        'overdue_count' => 0,
                        'total_overdue' => $tx->amount
                    ];
                });

            return [
                'at_risk' => $largeExpenses->toArray(),
                'top_clients' => $topCategories->toArray(),
                'is_system_admin' => false
            ];
        });

        return response()->json($data);
    }
}
