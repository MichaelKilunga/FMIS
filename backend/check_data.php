<?php

use App\Models\Transaction;
use App\Models\User;
use App\Models\Tenant;

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';

$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

echo "--- TRANSACTIONS ---\n";
$transactions = Transaction::withTrashed()->get();
foreach ($transactions as $t) {
    $dateStr = ($t->transaction_date instanceof \Carbon\Carbon) ? $t->transaction_date->toDateString() : $t->transaction_date;
    echo "ID: {$t->id} | Tenant: " . ($t->tenant_id ?? 'NULL') . " | Date: {$dateStr} | Status: {$t->status} | Deleted: " . ($t->deleted_at ? 'YES' : 'NO') . "\n";
}

echo "\n--- USERS ---\n";
$users = User::all();
foreach ($users as $u) {
    echo "ID: {$u->id} | Name: {$u->name} | Tenant: " . ($u->tenant_id ?? 'NULL') . " | Email: {$u->email}\n";
}
