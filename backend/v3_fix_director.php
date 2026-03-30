<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$count = DB::table('approval_steps')
    ->where('role_name', 'tenant-admin')
    ->update(['role_name' => 'director']);

echo "Fixed {$count} steps to 'director'.\n";

$steps = DB::table('approval_steps')->get();
foreach ($steps as $s) {
    echo "ID: {$s->id}, Role: {$s->role_name}\n";
}
