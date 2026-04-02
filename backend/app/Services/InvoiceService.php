<?php

namespace App\Services;

use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Tenant;
use App\Models\Transaction;
use App\Models\TransactionCategory;
use App\Models\Account;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;

class InvoiceService
{
    public function __construct(
        protected TransactionService $transactionService
    ) {}

    public function generateNumber(int $tenantId): string
    {
        $year  = date('Y');
        $count = Invoice::where('tenant_id', $tenantId)->whereYear('created_at', $year)->count() + 1;
        return sprintf('INV-%s-%05d', $year, $count);
    }

    public function calculateTotals(Invoice $invoice): Invoice
    {
        $subtotal = $invoice->items->sum('subtotal');
        $taxAmount = round($subtotal * ($invoice->tax_rate / 100), 2);
        $total = $subtotal - $invoice->discount + $taxAmount;

        $invoice->update([
            'subtotal'   => $subtotal,
            'tax_amount' => $taxAmount,
            'total'      => max(0, $total),
        ]);

        return $invoice->fresh('items');
    }

    public function generatePdf(Invoice $invoice): string
    {
        $invoice->load(['items', 'createdBy', 'tenant.tenantSettings']);
        $tenant = $invoice->tenant;

        $pdf = Pdf::loadView('pdf.invoice', [
            'invoice' => $invoice,
            'tenant'  => $tenant,
            'branding'=> $tenant->branding,
        ])->setPaper('a4', 'portrait');

        $path = "invoices/{$invoice->tenant_id}/{$invoice->number}.pdf";
        Storage::disk('public')->put($path, $pdf->output());
        $invoice->update(['pdf_path' => $path]);

        return $path;
    }

    public function downloadPdf(Invoice $invoice): \Symfony\Component\HttpFoundation\Response
    {
        $invoice->load(['items', 'createdBy', 'tenant.tenantSettings']);
        $tenant = $invoice->tenant;

        $pdf = Pdf::loadView('pdf.invoice', [
            'invoice' => $invoice,
            'tenant'  => $tenant,
            'branding'=> $tenant->branding,
        ])->setPaper('a4', 'portrait');

        return $pdf->download("{$invoice->number}.pdf");
    }

    public function recordPayment(Invoice $invoice, int $userId): Transaction
    {
        if ($invoice->status === 'paid' && $invoice->transaction_id) {
            return $invoice->transaction;
        }

        return DB::transaction(function () use ($invoice, $userId) {
            // Find a default income category
            $category = TransactionCategory::where('tenant_id', $invoice->tenant_id)
                ->where('type', 'income')
                ->where('name', 'like', '%Sales%')
                ->first() ?? TransactionCategory::where('tenant_id', $invoice->tenant_id)
                ->where('type', 'income')
                ->first();

            // Find a default bank account
            $account = Account::where('tenant_id', $invoice->tenant_id)
                ->where('type', 'bank')
                ->first() ?? Account::where('tenant_id', $invoice->tenant_id)
                ->first();

            $transaction = $this->transactionService->create([
                'tenant_id'        => $invoice->tenant_id,
                'created_by'       => $userId,
                'amount'           => $invoice->total,
                'type'             => 'income',
                'category_id'      => $category?->id,
                'account_id'       => $account?->id,
                'description'      => "Payment received for Invoice #{$invoice->number}",
                'transaction_date' => now(),
                'currency'         => $invoice->currency,
                'status'           => Transaction::STATUS_DRAFT,
            ]);

            $invoice->update([
                'status'         => 'paid',
                'paid_at'        => now(),
                'transaction_id' => $transaction->id,
            ]);

            // Submit for approval if required (WorkflowEngine handles logic)
            return $this->transactionService->submit($transaction);
        });
    }
}
