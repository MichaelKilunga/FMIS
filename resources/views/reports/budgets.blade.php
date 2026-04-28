<!DOCTYPE html>
<html>
<head>
    <title>Budget vs Actual Report - {{ $tenant->name ?? 'FMIS' }}</title>
    <style>
        body { font-family: sans-serif; font-size: 13px; color: #333; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #eee; padding-bottom: 15px; }
        .footer { position: fixed; bottom: 0; width: 100%; text-align: right; font-size: 10px; border-top: 1px solid #eee; padding-top: 5px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
        th { background: #f8f9fa; color: #444; }
        .exceeded { color: #e74c3c; font-weight: bold; }
        .on-track { color: #2ecc71; }
        .progress-bg { background-color: #eee; height: 10px; border-radius: 5px; margin-top: 5px; }
        .progress-fill { background-color: #3498db; height: 10px; border-radius: 5px; }
        .progress-fill.red { background-color: #e74c3c; }
        .progress-fill.yellow { background-color: #f1c40f; }
    </style>
</head>
<body>
    <div class="header">
        <div class="brand">{{ $tenant->name ?? 'FMIS' }}</div>
        <h2>Budget vs Actual Performance Report</h2>
        <div>Period: {{ $fromDate }} to {{ $toDate }}</div>
    </div>

    <table>
        <thead>
            <tr>
                <th>Budget Name</th>
                <th>Category / Dept</th>
                <th>Budgeted</th>
                <th>Actual Spent</th>
                <th>Variance</th>
                <th>Usage %</th>
            </tr>
        </thead>
        <tbody>
            @foreach($budgets as $b)
                @php 
                    $usage = $b->usage_percentage;
                    $color = $usage >= 100 ? 'red' : ($usage >= ($b->alert_threshold ?? 80) ? 'yellow' : 'green');
                @endphp
                <tr>
                    <td><strong>{{ $b->name }}</strong><br><small>{{ $b->period }}</small></td>
                    <td>{{ $b->category?->name ?? 'General' }}<br><small>{{ $b->department ?? 'N/A' }}</small></td>
                    <td>{{ number_format($b->amount, 2) }}</td>
                    <td>{{ number_format($b->spent, 2) }}</td>
                    <td class="{{ $b->variance < 0 ? 'exceeded' : 'on-track' }}">
                        {{ number_format($b->variance, 2) }}
                    </td>
                    <td>
                        {{ number_format($usage, 1) }}%
                        <div class="progress-bg">
                            <div class="progress-fill {{ $color }}" style="width: {{ min($usage, 100) }}%"></div>
                        </div>
                    </td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <div class="footer">
        Generated on {{ date('Y-m-d H:i') }} - Budget & Planning Module
    </div>
</body>
</html>
