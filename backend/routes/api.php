<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\TransactionController;
use App\Http\Controllers\Api\V1\ApprovalController;
use App\Http\Controllers\Api\V1\InvoiceController;
use App\Http\Controllers\Api\V1\BudgetController;
use App\Http\Controllers\Api\V1\SettingController;
use App\Http\Controllers\Api\V1\AnalyticsController;
use App\Http\Controllers\Api\V1\AuditLogController;
use App\Http\Controllers\Api\V1\FraudController;
use App\Http\Controllers\Api\V1\SyncController;
use App\Http\Controllers\Api\V1\WorkflowController;
use App\Http\Controllers\Api\V1\UserController;
use App\Http\Controllers\Api\V1\AccountController;
use App\Http\Controllers\Api\V1\TenantController;
use App\Http\Controllers\Api\V1\NotificationController;
use App\Http\Controllers\Api\V1\AttendanceController;
use App\Http\Controllers\Api\V1\ReportController;
use App\Http\Controllers\Api\V1\TransactionCategoryController;
use App\Http\Controllers\Api\V1\DebtController;
use App\Http\Controllers\Api\ElectionController;
use App\Http\Controllers\Api\V1\RecurringBillController;
use App\Http\Controllers\Api\V1\TaskController;

use App\Http\Controllers\Api\V1\RegisterController;
use App\Http\Controllers\Api\V1\SystemAdminController;
use App\Http\Controllers\Api\V1\ForgotPasswordController;
use App\Http\Controllers\Api\V1\ResetPasswordController;

/*
|--------------------------------------------------------------------------
| FMIS API v1 Routes
|--------------------------------------------------------------------------
*/

Route::group(['prefix' => 'v1'], function () {

    // --- Public Auth Routes ---
    Route::prefix('auth')->group(function () {
        Route::post('login', [AuthController::class, 'login']);
        Route::post('register', [RegisterController::class, 'register']);
        Route::post('forgot-password', [ForgotPasswordController::class, 'sendResetLinkEmail'])->name('password.email');
        Route::post('reset-password', [ResetPasswordController::class, 'reset'])->name('password.update');
        Route::get('verify-email/{id}/{hash}', [AuthController::class, 'verifyEmail'])->name('verification.verify');
    });

    Route::get('system-settings', [SettingController::class, 'getSystemSettings']);

    // --- Protected Routes ---
    Route::middleware(['auth:sanctum'])->group(function () {

        // Auth
        Route::prefix('auth')->group(function () {
            Route::post('logout', [AuthController::class, 'logout']);
            Route::get('me', [AuthController::class, 'me']);
            Route::post('profile', [AuthController::class, 'updateProfile']);
            Route::post('change-password', [AuthController::class, 'changePassword']);
            Route::post('resend-verification', [AuthController::class, 'resendVerification']);
        });

        // Users
        Route::apiResource('users', UserController::class)->middleware('can:manage-users');

        // Accounts
        Route::apiResource('accounts', AccountController::class);

        // Transaction Categories
        Route::apiResource('transaction-categories', TransactionCategoryController::class);

        // Notifications
        Route::get('notifications', [NotificationController::class, 'index']);
        Route::post('notifications/read-all', [NotificationController::class, 'markAllAsRead']);
        Route::post('notifications/{id}/read', [NotificationController::class, 'markAsRead']);

        // Tenants (System Admin)
        Route::apiResource('tenants', TenantController::class)->middleware('can:manage-tenants');
        
        Route::prefix('system-admin')->middleware('can:manage-tenants')->group(function () {
            Route::get('stats', [SystemAdminController::class, 'stats']);
            Route::get('health', [SystemAdminController::class, 'health']);
            Route::get('activity', [SystemAdminController::class, 'activity']);
        });

        // Transactions
        Route::apiResource('transactions', TransactionController::class);
        Route::post('transactions/{transaction}/submit', [TransactionController::class, 'submit']);
        Route::post('transactions/{transaction}/post', [TransactionController::class, 'post']);

        // Attendances
        Route::prefix('attendances')->group(function () {
            Route::get('/', [AttendanceController::class, 'index']);
            Route::post('/ping', [AttendanceController::class, 'ping']);
            Route::post('/check-in', [AttendanceController::class, 'checkIn']);
            Route::post('/check-out', [AttendanceController::class, 'checkOut']);
        });

        // Approvals
        Route::get('approvals', [ApprovalController::class, 'index']);
        Route::get('approvals/{approval}', [ApprovalController::class, 'show']);
        Route::post('approvals/{approval}/approve', [ApprovalController::class, 'approve']);
        Route::post('approvals/{approval}/reject', [ApprovalController::class, 'reject']);

        // Approval Workflows Config
        Route::apiResource('workflows', WorkflowController::class)->middleware('can:manage-workflows');

        // Invoices
        Route::get('invoices', [InvoiceController::class, 'index']);
        Route::get('invoices/{invoice}', [InvoiceController::class, 'show']);
        Route::get('invoices/{invoice}/download', [InvoiceController::class, 'download']);
        Route::post('invoices/{invoice}/send', [InvoiceController::class, 'send']);
        Route::post('invoices/{invoice}/pay', [InvoiceController::class, 'markAsPaid']);
        // Administrative invoice actions
        Route::post('invoices', [InvoiceController::class, 'store'])->middleware('can:manage-invoices');
        Route::put('invoices/{invoice}', [InvoiceController::class, 'update'])->middleware('can:manage-invoices');
        Route::delete('invoices/{invoice}', [InvoiceController::class, 'destroy'])->middleware('can:manage-invoices');

        // Budgets
        Route::get('budgets', [BudgetController::class, 'index']);
        Route::get('budgets/{budget}', [BudgetController::class, 'show']);
        Route::post('budgets', [BudgetController::class, 'store'])->middleware('can:manage-budgets');
        Route::put('budgets/{budget}', [BudgetController::class, 'update'])->middleware('can:manage-budgets');
        Route::delete('budgets/{budget}', [BudgetController::class, 'destroy'])->middleware('can:manage-budgets');

        // Settings
        Route::get('settings', [SettingController::class, 'index']);
        Route::get('settings/{key}', [SettingController::class, 'get']);
        Route::post('settings', [SettingController::class, 'set'])->middleware('can:manage-settings');
        Route::post('settings/bulk', [SettingController::class, 'setBulk'])->middleware('can:manage-settings');
        Route::post('settings/branding', [SettingController::class, 'updateBranding'])->middleware('can:manage-settings');

        // Analytics
        Route::prefix('analytics')->group(function () {
            Route::get('summary', [AnalyticsController::class, 'summary']);
            Route::get('cash-flow', [AnalyticsController::class, 'cashFlow']);
            Route::get('income-vs-expenses', [AnalyticsController::class, 'incomeVsExpenses']);
            Route::get('trends', [AnalyticsController::class, 'trends']);
            Route::get('budget-overview', [AnalyticsController::class, 'budgetOverview']);
            
            // Advanced Analytics (Director only)
            Route::middleware(['can:view-analytics'])->group(function () {
                Route::get('productivity', [AnalyticsController::class, 'productivity']);
                Route::get('forecasting', [AnalyticsController::class, 'forecasting']);
                Route::get('financial-health', [AnalyticsController::class, 'financialHealth']);
                Route::get('customer-insights', [AnalyticsController::class, 'customerInsights']);
            });
        });

        // Fraud Detection
        Route::prefix('fraud')->group(function () {
            Route::get('rules', [FraudController::class, 'indexRules']);
            Route::post('rules', [FraudController::class, 'storeRule'])->middleware('can:manage-fraud-rules');
            Route::put('rules/{fraudRule}', [FraudController::class, 'updateRule'])->middleware('can:manage-fraud-rules');
            Route::delete('rules/{fraudRule}', [FraudController::class, 'destroyRule'])->middleware('can:manage-fraud-rules');
            Route::get('alerts', [FraudController::class, 'indexAlerts']);
            Route::post('alerts/{fraudAlert}/resolve', [FraudController::class, 'resolveAlert']);
        });

        // Debts
        Route::get('debts', [DebtController::class, 'index'])->middleware('can:view-debts');
        Route::get('debts/{debt}', [DebtController::class, 'show'])->middleware('can:view-debts');
        Route::post('debts', [DebtController::class, 'store'])->middleware('can:manage-debts');
        Route::put('debts/{debt}', [DebtController::class, 'update'])->middleware('can:manage-debts');
        Route::delete('debts/{debt}', [DebtController::class, 'destroy'])->middleware('can:manage-debts');
        Route::post('debts/{debt}/pay', [DebtController::class, 'recordPayment'])->middleware('can:manage-debts');

        // Clients
        Route::apiResource('clients', \App\Http\Controllers\Api\V1\ClientController::class)->middleware('can:manage-invoices');

        // Recurring Bills
        Route::apiResource('recurring-bills', RecurringBillController::class);
        Route::post('recurring-bills/{recurring_bill}/pause', [RecurringBillController::class, 'pause']);
        Route::post('recurring-bills/{recurring_bill}/resume', [RecurringBillController::class, 'resume']);

        // Tasks
        Route::apiResource('tasks', TaskController::class);
        Route::post('tasks/{task}/progress', [TaskController::class, 'reportProgress']);
        Route::get('tasks-stats', [TaskController::class, 'stats']);

        // Audit Logs (read-only)
        Route::get('audit-logs', [AuditLogController::class, 'index']);
        Route::get('audit-logs/{auditLog}', [AuditLogController::class, 'show']);

        // Reports
        Route::get('reports/preview', [ReportController::class, 'preview']);
        Route::get('reports/export', [ReportController::class, 'export']);

        // Offline Sync
        Route::post('sync/push-changes', [SyncController::class, 'pushChanges']);

        // Elections
        Route::prefix('elections')->group(function () {
            Route::get('current', [ElectionController::class, 'current']);
            Route::post('initiate', [ElectionController::class, 'initiate']);
            Route::post('vote', [ElectionController::class, 'vote']);
            Route::get('history', [ElectionController::class, 'history']);
        });
    });
});
