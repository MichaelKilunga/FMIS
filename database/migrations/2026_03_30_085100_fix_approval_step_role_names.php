<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        \Illuminate\Support\Facades\DB::table('approval_steps')
            ->whereIn('role_name', ['admin', 'Admin', 'ADMIN', 'ADMINISTRATOR', 'administrator'])
            ->update(['role_name' => 'tenant-admin']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No reversal needed for data fix
    }
};
