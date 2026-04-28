<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Transaction;
use App\Models\Budget;
use Illuminate\Http\Request;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;

class ReportController extends Controller
{
    public function preview(Request $request): JsonResponse
    {
        $transactions = $this->getFilteredTransactions($request);
        return response()->json($transactions);
    }

    public function export(Request $request)
    {
        $user = $request->user();
        $format = $request->get('format', 'pdf');
        $fromDate = $request->get('from_date', now()->startOfMonth()->toDateString());
        $toDate = $request->get('to_date', now()->endOfMonth()->toDateString());
        $type = $request->get('type', 'all');

        // Handle Budget vs Actual Report
        if ($type === 'budget_vs_actual') {
            $query = Budget::query()->with('category');
            if ($user->tenant_id) {
                $query->where('tenant_id', $user->tenant_id);
            }

            if ($request->filled('category_id')) {
                $query->where('category_id', $request->category_id);
            }

            if ($request->filled('account_id')) {
                $query->where('account_id', $request->account_id);
            }
            
            $budgets = $query->where(function($q) use ($fromDate, $toDate) {
                    $q->whereBetween('start_date', [$fromDate, $toDate])
                      ->orWhereBetween('end_date', [$fromDate, $toDate])
                      ->orWhere(function($sq) use ($fromDate, $toDate) {
                          $sq->where('start_date', '<=', $fromDate)
                             ->where('end_date', '>=', $toDate);
                      });
                })
                ->get();

            if ($format === 'pdf') {
                $data = [
                    'budgets' => $budgets,
                    'fromDate' => $fromDate,
                    'toDate' => $toDate,
                    'tenant' => $user->tenant ?? (object)['name' => 'System Wide']
                ];
                $pdf = Pdf::loadView('reports.budgets', $data);
                return $pdf->download("budget_report_{$fromDate}_{$toDate}.pdf");
            }

            if ($format === 'excel' || $format === 'csv') {
                return $this->streamCsv("budget_report_{$fromDate}_{$toDate}.csv", function($file) use ($budgets) {
                    fputcsv($file, ['ID', 'Name', 'Category', 'Department', 'Budgeted', 'Spent', 'Variance', 'Usage %']);
                    foreach ($budgets as $b) {
                        fputcsv($file, [$b->id, $b->name, $b->category?->name ?? 'N/A', $b->department ?? 'N/A', $b->amount, $b->spent, $b->variance, $b->usage_percentage . '%']);
                    }
                });
            }
        }

        // Default: Transaction Report
        $transactions = $this->getFilteredTransactions($request);
        $status = $request->get('status');
        $categoryId = $request->get('category_id');
        $accountId = $request->get('account_id');

        if ($format === 'pdf') {
            $data = [
                'transactions' => $transactions,
                'fromDate' => $fromDate,
                'toDate' => $toDate,
                'type' => $type,
                'status' => $status,
                'category' => $categoryId ? \App\Models\TransactionCategory::find($categoryId) : null,
                'account' => $accountId ? \App\Models\Account::find($accountId) : null,
                'tenant' => $user->tenant ?? (object)['name' => 'System Wide']
            ];
            $pdf = Pdf::loadView('reports.transactions', $data);
            return $pdf->download("report_{$fromDate}_{$toDate}.pdf");
        }

        if ($format === 'excel' || $format === 'csv') {
            return $this->streamCsv("report_{$fromDate}_{$toDate}.csv", function($file) use ($transactions) {
                fputcsv($file, ['ID', 'Date', 'Reference', 'Description', 'Type', 'Category', 'Account', 'Amount', 'Status']);
                foreach ($transactions as $t) {
                    fputcsv($file, [
                        $t->id, 
                        $t->transaction_date->format('Y-m-d'), 
                        $t->reference, 
                        $t->description,
                        ucfirst($t->type), 
                        $t->category?->name ?? 'N/A', 
                        $t->account?->name ?? 'N/A',
                        $t->amount, 
                        ucfirst($t->status)
                    ]);
                }
            });
        }

        return response()->json(['error' => 'Invalid format'], 400);
    }

    private function getFilteredTransactions(Request $request)
    {
        $user = $request->user();
        $fromDate = $request->get('from_date', now()->startOfMonth()->toDateString());
        $toDate = $request->get('to_date', now()->endOfMonth()->toDateString());
        $type = $request->get('type', 'all');
        $status = $request->get('status');
        $categoryId = $request->get('category_id');
        $accountId = $request->get('account_id');

        $query = Transaction::query()->with(['category', 'account']);

        if ($user->tenant_id) {
            $query->where('tenant_id', $user->tenant_id);
        }

        $query->whereBetween('transaction_date', [$fromDate, $toDate]);

        if ($type !== 'all' && $type !== 'budget_vs_actual') {
            $query->where('type', $type);
        }

        if ($status) {
            $query->where('status', $status);
        }

        if ($categoryId) {
            $query->where('category_id', $categoryId);
        }

        if ($accountId) {
            $query->where(function($q) use ($accountId) {
                $q->where('account_id', $accountId)
                  ->orWhere('to_account_id', $accountId);
            });
        }

        return $query->orderBy('transaction_date', 'desc')->get();
    }

    private function streamCsv($filename, $callback)
    {
        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ];

        return response()->stream(function() use ($callback) {
            $file = fopen('php://output', 'w');
            $callback($file);
            fclose($file);
        }, 200, $headers);
    }
}
