<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Proforma Invoice {{ $invoice->number }}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #000; background: #fff; }

        /* ── Header ── */
        .page-header { width: 100%; padding: 18px 32px 12px; }
        .header-inner { display: flex; justify-content: space-between; align-items: flex-start; }
        .logo-block img { height: 64px; }
        .logo-block .logo-fallback { font-size: 28px; font-weight: 900; color: {{ $branding['primary_color'] ?? '#1565C0' }}; font-style: italic; }
        .company-info { text-align: right; font-size: 11px; line-height: 1.6; }
        .company-info .company-name { font-size: 13px; font-weight: 700; color: {{ $branding['primary_color'] ?? '#1565C0' }}; }
        .company-info .company-loc { color: {{ $branding['primary_color'] ?? '#1565C0' }}; font-weight: 600; }

        /* ── Invoice title bar ── */
        .invoice-title-bar { text-align: center; margin: 10px 32px 8px; padding: 6px 0; border-top: 2px solid #000; border-bottom: 2px solid #000; letter-spacing: 1px; font-size: 13px; font-weight: 700; }

        /* ── Client / meta block ── */
        .meta-block { padding: 6px 32px 10px; font-size: 11.5px; line-height: 1.8; }
        .meta-block .meta-line { display: flex; }
        .meta-block .meta-label { font-weight: 700; min-width: 80px; }
        .meta-block .ms-line { font-weight: 700; margin-top: 6px; }
        .meta-block .ms-addr { color: #444; margin-left: 4px; }

        /* ── Table ── */
        .bill-title { padding: 0 32px; margin-bottom: 4px; }
        .bill-title h3 { font-size: 12px; font-weight: 700; text-decoration: underline; text-transform: uppercase; letter-spacing: 0.5px; }
        table { width: calc(100% - 64px); margin: 0 32px 0; border-collapse: collapse; }
        thead tr { background-color: #000; color: #fff; }
        thead th { padding: 7px 8px; font-size: 11px; font-weight: 700; text-align: left; text-transform: uppercase; border: 1px solid #000; }
        tbody tr { border-bottom: 1px solid #ccc; }
        tbody td { padding: 7px 8px; font-size: 11.5px; border: 1px solid #ccc; vertical-align: top; }
        td.text-right, th.text-right { text-align: right; }
        .subtotal-row td { border: none; padding: 4px 8px; }
        .total-row td { border-top: 2px solid #000; border-bottom: 2px solid #000; font-weight: 700; padding: 5px 8px; background: #f5f5f5; }

        /* ── Terms ── */
        .terms-section { padding: 14px 32px 8px; page-break-inside: avoid; }
        .terms-section h4 { font-size: 14px; font-weight: 700; margin-bottom: 4px; }
        .terms-section p { font-size: 11px; line-height: 1.7; }
        .terms-section .payment-for { font-size: 12px; font-weight: 700; margin-bottom: 2px; }
        .lipa-namba { padding: 8px 32px; font-size: 11px; }
        .lipa-namba .lipa-title { font-weight: 700; color: {{ $branding['primary_color'] ?? '#1565C0' }}; font-size: 11.5px; text-transform: uppercase; margin-bottom: 2px; }
        .lipa-namba p { line-height: 1.7; }

        /* ── Signatures ── */
        .sig-table { width: calc(100% - 64px); margin: 14px 32px 0; border-collapse: collapse; border: 1.5px solid #000; }
        .sig-table td { border: 1.5px solid #000; padding: 10px 14px; vertical-align: top; width: 50%; }
        .sig-table .sig-role { font-size: 10.5px; font-weight: 700; text-transform: uppercase; margin-bottom: 4px; }
        .sig-table .sig-name { font-size: 12px; font-weight: 700; color: {{ $branding['primary_color'] ?? '#1565C0' }}; }
        .sig-table .sig-org  { font-size: 11px; font-weight: 700; margin-bottom: 18px; }
        .sig-table .sig-line { font-size: 11px; color: #555; }

        /* ── Footer ── */
        .page-footer { text-align: center; font-size: 9.5px; color: #777; padding: 10px 32px 6px; border-top: 1px solid #ddd; margin-top: 18px; }
    </style>
</head>
<body>

    {{-- ── TOP HEADER ── --}}
    <div class="page-header">
        <div class="header-inner">
            {{-- Logo --}}
            <div class="logo-block">
                @if(!empty($branding['logo']))
                    <img src="{{ $branding['logo'] }}" alt="{{ $branding['name'] ?? $tenant->name }}">
                @else
                    <div class="logo-fallback">{{ $branding['name'] ?? $tenant->name }}</div>
                @endif
            </div>
            {{-- Company Info --}}
            <div class="company-info">
                <div class="company-name">{{ $branding['name'] ?? $tenant->name }}</div>
                @php
                    $addr = $tenant->address ?? 'Posta Building';
                    $city = 'Morogoro-Tanzania';
                @endphp
                <div class="company-loc">{{ $addr }}</div>
                <div class="company-loc">{{ $city }}</div>
                @if($tenant->phone)
                    <div>Telephone: {{ $tenant->phone }}</div>
                @endif
                @if($tenant->email)
                    <div>Email: {{ $tenant->email }} | Website: {{ parse_url(config('app.url'), PHP_URL_HOST) ?? 'skylinksolutions.co.tz' }}</div>
                @endif
            </div>
        </div>
    </div>

    {{-- ── INVOICE TITLE ── --}}
    <div class="invoice-title-bar">
        PROFOMA INVOICE NO: {{ $invoice->number }}
    </div>

    {{-- ── META / COMPANY DETAILS ── --}}
    <div class="meta-block">
        @if(!empty($branding['tin']))
        <div class="meta-line"><span class="meta-label">TIN NO:</span>&nbsp;{{ $branding['tin'] }}</div>
        @endif
        @if(!empty($branding['reg_no']))
        <div class="meta-line"><span class="meta-label">REG NO:</span>&nbsp;{{ $branding['reg_no'] }}</div>
        @endif
        <div class="meta-line" style="margin-top:4px;">
            <span class="meta-label">DEALERS:</span>&nbsp;
            <span>{{ $branding['dealers'] ?? 'Software Development (Web portal), Security and Surveillance Systems, Graphics Design, Computer consultancy and computer facilities management, Networking &amp; wired telecommunications Activities' }}</span>
        </div>

        {{-- Client M/S Block --}}
        <div class="ms-line" style="margin-top:10px;">
            M/S &ndash; {{ strtoupper($invoice->client_name) }}
            @if($invoice->client_phone) ({{ $invoice->client_phone }}) @endif
        </div>
        @if($invoice->client_address)
        <div class="ms-addr">{{ $invoice->client_address }}</div>
        @endif
    </div>

    {{-- ── ITEMS TABLE ── --}}
    <div class="bill-title"><h3>Software Subscription Bill</h3></div>
    <table>
        <thead>
            <tr>
                <th style="width:6%">S/N</th>
                <th style="width:52%">ITEM DESCRIPTION</th>
                <th class="text-right" style="width:10%">UNITS</th>
                <th class="text-right" style="width:16%">UNIT PRICE</th>
                <th class="text-right" style="width:16%">AMOUNT</th>
            </tr>
        </thead>
        <tbody>
            @foreach($invoice->items as $i => $item)
            <tr>
                <td>{{ str_pad($i + 1, 2, '0', STR_PAD_LEFT) }}</td>
                <td>{{ $item->description }}</td>
                <td class="text-right">{{ rtrim(rtrim(number_format($item->quantity, 2), '0'), '.') }}</td>
                <td class="text-right">{{ number_format($item->unit_price, 0) }}</td>
                <td class="text-right">{{ $item->subtotal > 0 ? number_format($item->subtotal, 0).',/=' : '-' }}</td>
            </tr>
            @endforeach

            {{-- Sub Total row --}}
            <tr class="subtotal-row">
                <td colspan="3"></td>
                <td class="text-right" style="font-weight:600; padding-top:8px;">Sub Total</td>
                <td class="text-right" style="font-weight:600; border-left:1px solid #ccc; padding-top:8px;">
                    {{ number_format($invoice->subtotal, 0) }},/=
                </td>
            </tr>

            @if($invoice->discount > 0)
            <tr class="subtotal-row">
                <td colspan="3"></td>
                <td class="text-right">Discount</td>
                <td class="text-right" style="border-left:1px solid #ccc;">- {{ number_format($invoice->discount, 0) }},/=</td>
            </tr>
            @endif

            @if($invoice->tax_rate > 0)
            <tr class="subtotal-row">
                <td colspan="3"></td>
                <td class="text-right">Tax ({{ $invoice->tax_rate }}%)</td>
                <td class="text-right" style="border-left:1px solid #ccc;">{{ number_format($invoice->tax_amount, 0) }},/=</td>
            </tr>
            @endif

            {{-- Total row --}}
            <tr class="total-row">
                <td colspan="3" style="border:none; background:transparent;"></td>
                <td class="text-right" style="border:2px solid #000;">Total</td>
                <td class="text-right" style="border:2px solid #000;">
                    {{ number_format($invoice->total, 0) }},/=
                </td>
            </tr>
        </tbody>
    </table>

    {{-- ── TERMS & CONDITIONS ── --}}
    <div class="terms-section">
        <h4>Terms &amp; Conditions;</h4>
        @if($invoice->due_date)
        <div class="payment-for">Payment For: {{ $invoice->due_date->format('F j, Y') }}</div>
        @endif
        @if($invoice->terms)
            @foreach(explode("\n", $invoice->terms) as $line)
                <p>{{ trim($line) }}</p>
            @endforeach
        @else
            <p>Contact: Sales</p>
            <p>Phone: {{ $tenant->phone ?? '+255 (0) 796 725 725' }}</p>
        @endif
    </div>

    {{-- ── LIPA NAMBA ── --}}
    @if(!empty($branding['lipa_name']) || !empty($branding['lipa_number']))
    <div class="lipa-namba">
        <div class="lipa-title">Lipa Namba:</div>
        @if(!empty($branding['lipa_name']))
        <p>NAME: {{ strtoupper($branding['lipa_name']) }}</p>
        @endif
        @if(!empty($branding['lipa_number']))
        <p>NUMBER: {{ $branding['lipa_number'] }}</p>
        @endif
    </div>
    @endif

    @if($invoice->notes)
    <div style="padding:4px 32px 8px; font-size:11px; color:#555;">
        <strong>Notes:</strong> {{ $invoice->notes }}
    </div>
    @endif

    {{-- ── SIGNATURE BLOCK ── --}}
    <table class="sig-table">
        <tr>
            <td>
                <div class="sig-role">Sales Director</div>
                <div class="sig-name">{{ strtoupper($branding['sales_director'] ?? 'MISS: LAULINA') }}</div>
                <div class="sig-org">{{ strtoupper($branding['name'] ?? $tenant->name) }}</div>
                <div class="sig-line">Signature: ………………………….</div>
            </td>
            <td>
                <div class="sig-role">Managing Director</div>
                <div class="sig-name">{{ strtoupper($invoice->client_name) }}</div>
                <div class="sig-line" style="margin-top:22px;">Signature: ………………….</div>
            </td>
        </tr>
    </table>

    {{-- ── FOOTER ── --}}
    <div class="page-footer">
        Generated by FMIS &bull; {{ $branding['name'] ?? $tenant->name }} &bull; {{ now()->format('d M Y H:i') }}
    </div>

</body>
</html>
