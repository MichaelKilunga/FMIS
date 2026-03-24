<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice {{ $invoice->number }}</title>
    <style>
        @page { margin: 0; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Helvetica', 'Arial', sans-serif; 
            font-size: 11px; 
            color: #333; 
            line-height: 1.4;
            background: #fff;
            padding: 40px;
        }

        .header {
            display: table;
            width: 100%;
            margin-bottom: 30px;
            border-bottom: 2px solid {{ $branding['primary_color'] ?? '#3B82F6' }};
            padding-bottom: 20px;
        }
        .header-left { display: table-cell; vertical-align: top; width: 50%; }
        .header-right { display: table-cell; vertical-align: top; width: 50%; text-align: right; }

        .logo { max-height: 70px; margin-bottom: 10px; }
        .company-name { 
            font-size: 18px; 
            font-weight: bold; 
            color: {{ $branding['primary_color'] ?? '#3B82F6' }}; 
            margin-bottom: 5px;
            text-transform: uppercase;
        }
        .company-details { font-size: 10px; color: #666; line-height: 1.5; }

        .invoice-title {
            font-size: 24px;
            font-weight: bold;
            color: #000;
            margin-bottom: 5px;
            text-transform: uppercase;
        }
        .invoice-meta { font-size: 11px; color: #333; }
        .invoice-meta strong { color: {{ $branding['primary_color'] ?? '#3B82F6' }}; }

        .info-section {
            display: table;
            width: 100%;
            margin-bottom: 30px;
        }
        .info-box { display: table-cell; vertical-align: top; width: 50%; }
        .info-title { 
            font-size: 10px; 
            font-weight: bold; 
            color: #999; 
            text-transform: uppercase; 
            margin-bottom: 8px;
            border-bottom: 1px solid #eee;
            width: 80%;
        }
        .info-content { font-size: 12px; font-weight: bold; color: #333; }
        .info-address { font-size: 10px; color: #666; font-weight: normal; margin-top: 4px; }

        table.items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
        }
        table.items-table thead th {
            background: {{ $branding['primary_color'] ?? '#3B82F6' }};
            color: #fff;
            text-align: left;
            padding: 10px;
            font-size: 10px;
            text-transform: uppercase;
            border: none;
        }
        table.items-table tbody td {
            padding: 12px 10px;
            border-bottom: 1px solid #eee;
            vertical-align: top;
        }
        .text-right { text-align: right !important; }
        .text-center { text-align: center !important; }

        .totals-section {
            width: 100%;
            display: table;
        }
        .totals-left { display: table-cell; vertical-align: top; width: 60%; }
        .totals-right { display: table-cell; vertical-align: top; width: 40%; }

        .totals-table { width: 100%; border-collapse: collapse; }
        .totals-table td { padding: 8px 10px; font-size: 11px; }
        .totals-table .label { font-weight: bold; color: #666; }
        .totals-table .value { font-weight: bold; text-align: right; }
        .totals-table .grand-total { 
            background: {{ $branding['primary_color'] ?? '#3B82F6' }}; 
            color: #fff; 
            font-size: 14px;
        }
        .totals-table .grand-total td { padding: 12px 10px; }

        .payment-info {
            background: #fcfcfc;
            border: 1px solid #eee;
            padding: 15px;
            border-radius: 4px;
            margin-bottom: 20px;
        }
        .payment-title { font-size: 10px; font-weight: bold; margin-bottom: 8px; color: {{ $branding['primary_color'] ?? '#3B82F6' }}; text-transform: uppercase; }
        .payment-detail { font-size: 10px; margin-bottom: 3px; }

        .notes-section { margin-bottom: 30px; }
        .notes-title { font-size: 10px; font-weight: bold; margin-bottom: 5px; color: #999; text-transform: uppercase; }
        .notes-content { font-size: 10px; color: #666; font-style: italic; }

        .footer {
            margin-top: 50px;
            text-align: center;
            font-size: 9px;
            color: #999;
            border-top: 1px solid #eee;
            padding-top: 20px;
        }

        .signatures {
            margin-top: 40px;
            display: table;
            width: 100%;
        }
        .sig-box {
            display: table-cell;
            width: 45%;
            vertical-align: top;
            text-align: center;
        }
        .sig-line {
            border-top: 1px solid #333;
            margin: 40px 20px 5px;
        }
        .sig-label { font-size: 9px; text-transform: uppercase; font-weight: bold; }
        .sig-name { font-size: 11px; font-weight: bold; color: {{ $branding['primary_color'] ?? '#3B82F6' }}; }

        .badge {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 3px;
            font-size: 9px;
            font-weight: bold;
            text-transform: uppercase;
            color: #fff;
        }
        .badge-paid { background: #10B981; }
        .badge-draft { background: #94A3B8; }
        .badge-sent { background: #3B82F6; }
        .badge-overdue { background: #EF4444; }
        .text-nowrap { white-space: nowrap; }
    </style>
</head>
<body>

    <div class="header">
        <div class="header-left">
            @if(!empty($branding['logo']))
                <img src="{{ $branding['logo'] }}" class="logo" alt="{{ $branding['name'] }}">
            @else
                <div class="company-name">{{ $branding['name'] ?? $tenant->name }}</div>
            @endif
            <div class="company-details">
                {{ $branding['address'] ?? $tenant->address }}<br>
                {{ $branding['city'] ?? '' }}{{ !empty($branding['city']) && !empty($branding['country']) ? ', ' : '' }}{{ $branding['country'] ?? '' }}<br>
                Phone: {{ $branding['phone'] ?? $tenant->phone }}<br>
                Email: {{ $branding['email'] ?? $tenant->email }}<br>
                @if(!empty($branding['website']))
                    Website: {{ $branding['website'] }}<br>
                @endif
                @if(!empty($branding['tin']))
                    <strong>TIN:</strong> {{ $branding['tin'] }}
                @endif
                @if(!empty($branding['reg_no']))
                    | <strong>REG:</strong> {{ $branding['reg_no'] }}
                @endif
            </div>
        </div>
        <div class="header-right">
            <div class="invoice-title">INVOICE</div>
            <div class="invoice-meta">
                <strong>NO:</strong> {{ $invoice->number }}<br>
                <strong>Date:</strong> {{ $invoice->issue_date->format('d M Y') }}<br>
                @if($invoice->due_date)
                    <strong>Due Date:</strong> {{ $invoice->due_date->format('d M Y') }}<br>
                @endif
                <div style="margin-top:5px;">
                    @if($invoice->status === 'paid')
                        <span class="badge badge-paid">PAID</span>
                    @elseif($invoice->status === 'draft')
                        <span class="badge badge-draft">DRAFT</span>
                    @elseif($invoice->status === 'sent')
                        <span class="badge badge-sent">SENT</span>
                    @endif
                </div>
            </div>
        </div>
    </div>

    <div class="info-section">
        <div class="info-box">
            <div class="info-title">Bill To:</div>
            <div class="info-content">{{ strtoupper($invoice->client_name) }}</div>
            <div class="info-address">
                @if($invoice->client_address) {{ $invoice->client_address }}<br> @endif
                @if($invoice->client_phone) Phone: {{ $invoice->client_phone }}<br> @endif
                @if($invoice->client_email) Email: {{ $invoice->client_email }} @endif
            </div>
        </div>
        <div class="info-box">
            <div class="info-title">Business Focus:</div>
            <div style="font-size: 9px; color: #666; line-height: 1.3;">
                {{ $branding['dealers'] ?? 'Commercial and Professional Activities, Software Development, Networking and Computer Consultancy Services.' }}
            </div>
        </div>
    </div>

    <table class="items-table">
        <thead>
            <tr>
                <th style="width: 5%">#</th>
                <th style="width: 50%">Description</th>
                <th class="text-right" style="width: 10%">Qty</th>
                <th class="text-right" style="width: 15%">Unit Price</th>
                <th class="text-right" style="width: 20%">Amount</th>
            </tr>
        </thead>
        <tbody>
            @foreach($invoice->items as $i => $item)
            <tr>
                <td class="text-center">{{ $i + 1 }}</td>
                <td>
                    <div style="font-weight: bold; color: #333;">{{ $item->description }}</div>
                </td>
                <td class="text-right">{{ rtrim(rtrim(number_format($item->quantity, 2), '0'), '.') }}</td>
                <td class="text-right text-nowrap">{{ $invoice->currency }} {{ number_format($item->unit_price, 2) }}</td>
                <td class="text-right text-nowrap">{{ $invoice->currency }} {{ number_format($item->subtotal, 2) }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>

    <div class="totals-section">
        <div class="totals-left">
            @if(!empty($branding['lipa_name']) || !empty($branding['lipa_number']))
            <div class="payment-info">
                <div class="payment-title">Payment Options:</div>
                @if(!empty($branding['lipa_name']))
                    <div class="payment-detail"><strong>Name:</strong> {{ strtoupper($branding['lipa_name']) }}</div>
                @endif
                @if(!empty($branding['lipa_number']))
                    <div class="payment-detail"><strong>Lipa Namba:</strong> {{ $branding['lipa_number'] }}</div>
                @endif
            </div>
            @endif

            @if($invoice->notes)
            <div class="notes-section">
                <div class="notes-title">Notes:</div>
                <div class="notes-content">{{ $invoice->notes }}</div>
            </div>
            @endif

            @if($invoice->terms)
            <div class="notes-section">
                <div class="notes-title">Terms & Conditions:</div>
                <div class="notes-content">
                    @foreach(explode("\n", $invoice->terms) as $line)
                        &bull; {{ trim($line) }}<br>
                    @endforeach
                </div>
            </div>
            @endif
        </div>
        <div class="totals-right">
            <table class="totals-table">
                <tr>
                    <td class="label">Subtotal</td>
                    <td class="value text-nowrap">{{ $invoice->currency }} {{ number_format($invoice->subtotal, 2) }}</td>
                </tr>
                @if($invoice->discount > 0)
                <tr>
                    <td class="label">Discount</td>
                    <td class="value text-nowrap">- {{ $invoice->currency }} {{ number_format($invoice->discount, 2) }}</td>
                </tr>
                @endif
                @if($invoice->tax_rate > 0)
                <tr>
                    <td class="label">Tax ({{ $invoice->tax_rate }}%)</td>
                    <td class="value text-nowrap">{{ $invoice->currency }} {{ number_format($invoice->tax_amount, 2) }}</td>
                </tr>
                @endif
                <tr class="grand-total">
                    <td class="label" style="color:#fff">Total</td>
                    <td class="value text-nowrap" style="color:#fff">{{ $invoice->currency }} {{ number_format($invoice->total, 2) }}</td>
                </tr>
            </table>
        </div>
    </div>

    <div class="signatures">
        <div class="sig-box">
            <div class="sig-name">{{ strtoupper($branding['sales_director'] ?? 'Sales Department') }}</div>
            <div class="sig-line"></div>
            <div class="sig-label">Authorized Signature</div>
            <div style="font-size: 8px; color: #999;">{{ $branding['name'] ?? $tenant->name }}</div>
        </div>
        <div style="display: table-cell; width: 10%;"></div>
        <div class="sig-box">
            <div class="sig-name">{{ strtoupper($invoice->client_name) }}</div>
            <div class="sig-line"></div>
            <div class="sig-label">Customer Signature</div>
        </div>
    </div>

    <div class="footer">
        Thank you for your business. This is a computer-generated document.<br>
        {{ $branding['name'] ?? $tenant->name }} &bull; {{ $branding['website'] ?? '' }} &bull; {{ now()->format('d M Y H:i') }}
    </div>

</body>
</html>
