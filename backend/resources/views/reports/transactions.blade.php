<!DOCTYPE html>
<html>
<head>
    <title>Transaction Report - {{ $tenant->name ?? 'FMIS' }}</title>
    <style>
        body { font-family: sans-serif; font-size: 13px; color: #333; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #eee; padding-bottom: 15px; }
        .footer { position: fixed; bottom: 0; width: 100%; text-align: right; font-size: 10px; border-top: 1px solid #eee; padding-top: 5px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
        th { background: #f8f9fa; color: #444; }
        .income { color: #2ecc71; }
        .expense { color: #e74c3c; }
        .total-box { margin-top: 30px; text-align: right; border-top: 2px solid #ddd; padding-top: 10px; }
        .brand { font-size: 24px; font-weight: bold; color: #2c3e50; }
    </style>
</head>
<body>
    <div class="header">
        <div class="brand">{{ $tenant->name ?? 'FMIS' }}</div>
        <h2>Transaction Report</h2>
        <div>Period: {{ $fromDate }} to {{ $toDate }}</div>
        <div>Type: {{ ucfirst($type) }}</div>
        @if(isset($status) && $status) <div>Status: {{ ucfirst($status) }}</div> @endif
        @if(isset($category) && $category) <div>Category: {{ $category->name }}</div> @endif
    </div>

    <table>
        <thead>
            <tr>
                <th>Date</th>
                <th>Reference</th>
                <th>Category</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Status</th>
            </tr>
        </thead>
        <tbody>
            @php $totalIncome = 0; $totalExpense = 0; @endphp
            @foreach($transactions as $t)
                @php 
                    if($t->type === 'income') $totalIncome += (float)$t->amount;
                    else $totalExpense += (float)$t->amount;
                @endphp
                <tr>
                    <td>{{ $t->transaction_date->format('Y-m-d') }}</td>
                    <td>{{ $t->reference }}</td>
                    <td>{{ $t->category?->name ?? 'N/A' }}</td>
                    <td class="{{ $t->type }}">{{ ucfirst($t->type) }}</td>
                    <td>{{ number_format($t->amount, 2) }}</td>
                    <td>{{ ucfirst($t->status) }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <div class="total-box">
        <p><strong>Total Income:</strong> {{ number_format($totalIncome, 2) }}</p>
        <p><strong>Total Expense:</strong> {{ number_format($totalExpense, 2) }}</p>
        <p><strong>Net Balance:</strong> {{ number_format($totalIncome - $totalExpense, 2) }}</p>
    </div>

    <div class="footer">
        Generated on {{ date('Y-m-d H:i') }} - Page 1
    </div>
</body>
</html>
