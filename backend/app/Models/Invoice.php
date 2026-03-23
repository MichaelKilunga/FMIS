<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Invoice extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'tenant_id', 'client_id', 'transaction_id', 'created_by', 'number',
        'client_name', 'client_email', 'client_phone', 'client_address',
        'status', 'issue_date', 'due_date', 'subtotal', 'tax_rate',
        'tax_amount', 'discount', 'total', 'currency', 'notes', 'terms',
        'template', 'pdf_path', 'sent_at', 'paid_at', 'metadata',
    ];

    protected $casts = [
        'issue_date' => 'date',
        'due_date'   => 'date',
        'sent_at'    => 'datetime',
        'paid_at'    => 'datetime',
        'subtotal'   => 'decimal:2',
        'tax_rate'   => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'discount'   => 'decimal:2',
        'total'      => 'decimal:2',
        'metadata'   => 'array',
    ];

    public function scopeForTenant($query, $tenantId)
    {
        return $query->where('tenant_id', $tenantId);
    }

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }

    public function transaction()
    {
        return $this->belongsTo(Transaction::class);
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function items()
    {
        return $this->hasMany(InvoiceItem::class)->orderBy('sort_order');
    }

    public function client()
    {
        return $this->belongsTo(Client::class);
    }

    public function getPdfUrlAttribute(): ?string
    {
        return $this->pdf_path ? asset('storage/' . $this->pdf_path) : null;
    }
}
