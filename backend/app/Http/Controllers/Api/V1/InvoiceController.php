<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Services\InvoiceService;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InvoiceController extends Controller
{
    public function __construct(
        protected InvoiceService $invoiceService,
        protected AuditService $audit
    ) {}

    public function index(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $query = Invoice::forTenant($tenantId)->with(['createdBy', 'items'])->latest();

        if ($request->filled('status'))   $query->where('status', $request->status);
        if ($request->filled('from'))     $query->where('issue_date', '>=', $request->from);
        if ($request->filled('to'))       $query->where('issue_date', '<=', $request->to);
        if ($request->filled('search'))   $query->where('client_name', 'like', "%{$request->search}%");

        return response()->json($query->paginate($request->get('per_page', 20)));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'client_name'    => 'required|string|max:255',
            'client_email'   => 'nullable|email',
            'client_phone'   => 'nullable|string',
            'client_address' => 'nullable|string',
            'issue_date'     => 'required|date',
            'due_date'       => 'nullable|date|after_or_equal:issue_date',
            'tax_rate'       => 'nullable|numeric|min:0|max:100',
            'discount'       => 'nullable|numeric|min:0',
            'notes'          => 'nullable|string',
            'terms'          => 'nullable|string',
            'template'       => 'nullable|string',
            'transaction_id' => 'nullable|exists:transactions,id',
            'items'          => 'required|array|min:1',
            'items.*.description' => 'required|string',
            'items.*.quantity'    => 'required|numeric|min:0.01',
            'items.*.unit_price'  => 'required|numeric|min:0',
        ]);

        $tenantId = $request->user()->tenant_id;

        // Auto-register or find client
        $client = null;
        if ($request->filled('client_id')) {
            $client = \App\Models\Client::where('tenant_id', $tenantId)->find($request->client_id);
        }

        if (!$client && $request->filled('client_name')) {
            $client = \App\Models\Client::firstOrCreate(
                ['tenant_id' => $tenantId, 'name' => $request->client_name],
                [
                    'email'   => $request->client_email,
                    'phone'   => $request->client_phone,
                    'address' => $request->client_address,
                ]
            );
        }

        $invoice = Invoice::create([
            'tenant_id'  => $tenantId,
            'client_id'  => $client?->id,
            'created_by' => $request->user()->id,
            'number'     => $this->invoiceService->generateNumber($tenantId),
            ...$data,
        ]);

        foreach ($data['items'] as $i => $item) {
            $subtotal = $item['quantity'] * $item['unit_price'];
            InvoiceItem::create([
                'invoice_id'  => $invoice->id,
                'description' => $item['description'],
                'quantity'    => $item['quantity'],
                'unit'        => $item['unit'] ?? null,
                'unit_price'  => $item['unit_price'],
                'subtotal'    => $subtotal,
                'sort_order'  => $i,
            ]);
        }

        $invoice = $this->invoiceService->calculateTotals($invoice->load('items'));
        $this->audit->logModelChange('invoice_created', $invoice);

        return response()->json($invoice->load('items', 'createdBy'), 201);
    }

    public function show(Request $request, Invoice $invoice): JsonResponse
    {
        abort_if($invoice->tenant_id !== $request->user()->tenant_id, 403);
        return response()->json($invoice->load(['items', 'createdBy', 'transaction']));
    }

    public function update(Request $request, Invoice $invoice): JsonResponse
    {
        abort_if($invoice->tenant_id !== $request->user()->tenant_id, 403);
        abort_if($invoice->status === 'paid', 422, 'Paid invoices cannot be edited.');

        $data = $request->validate([
            'client_name'  => 'sometimes|string|max:255',
            'client_email' => 'nullable|email',
            'due_date'     => 'nullable|date',
            'tax_rate'     => 'nullable|numeric|min:0|max:100',
            'discount'     => 'nullable|numeric|min:0',
            'notes'        => 'nullable|string',
            'status'       => 'sometimes|in:draft,sent,paid,overdue,cancelled',
        ]);

        $before = $invoice->toArray();
        
        if (isset($data['client_id'])) {
            $invoice->client_id = $data['client_id'];
        }
        
        $invoice->update($data);

        // If status changed to paid, record the payment transaction
        if (isset($data['status']) && $data['status'] === 'paid' && $invoice->status !== 'paid') {
            $this->invoiceService->recordPayment($invoice, $request->user()->id);
        }

        $this->invoiceService->calculateTotals($invoice->load('items'));
        $this->audit->logModelChange('invoice_updated', $invoice, $before);

        return response()->json($invoice->fresh(['items', 'createdBy', 'transaction']));
    }

    public function markAsPaid(Request $request, Invoice $invoice): JsonResponse
    {
        abort_if($invoice->tenant_id !== $request->user()->tenant_id, 403);
        
        $this->invoiceService->recordPayment($invoice, $request->user()->id);
        
        return response()->json([
            'message' => 'Invoice marked as paid and transaction created.',
            'invoice' => $invoice->fresh(['items', 'createdBy', 'transaction'])
        ]);
    }

    public function destroy(Request $request, Invoice $invoice): JsonResponse
    {
        abort_if($invoice->tenant_id !== $request->user()->tenant_id, 403);
        $this->audit->log('invoice_deleted', $invoice);
        $invoice->delete();
        return response()->json(['message' => 'Invoice deleted.']);
    }

    public function download(Request $request, Invoice $invoice): mixed
    {
        abort_if($invoice->tenant_id !== $request->user()->tenant_id, 403);
        return $this->invoiceService->downloadPdf($invoice);
    }

    public function send(Request $request, Invoice $invoice): JsonResponse
    {
        abort_if($invoice->tenant_id !== $request->user()->tenant_id, 403);
        
        $invoice->update(['status' => 'sent', 'sent_at' => now()]);
        
        // Send notification to client if email exists
        if ($invoice->client_email || ($invoice->client && $invoice->client->email)) {
            $email = $invoice->client_email ?: $invoice->client->email;
            
            $notificationService = app(\App\Services\NotificationService::class);
            $notificationService->notifyClient(
                $email,
                "New Invoice: #{$invoice->number}",
                "You have received a new invoice from " . $request->user()->tenant->name . ". Total: " . $invoice->total . " " . $invoice->currency,
                $invoice->tenant_id,
                ['url' => config('app.frontend_url') . "/invoices/{$invoice->id}/view", 'label' => 'View Invoice'],
                'info',
                ['invoice_id' => $invoice->id]
            );
        }

        $this->audit->log('invoice_sent', $invoice);
        
        return response()->json(['message' => 'Invoice marked as sent and notification dispatched.']);
    }
}
