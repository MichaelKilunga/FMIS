<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->index('status');
            $table->index('client_name');
            $table->index(['tenant_id', 'status', 'client_name'], 'idx_invoice_analytics');
        });
    }

    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropIndex(['status']);
            $table->dropIndex(['client_name']);
            $table->dropIndex('idx_invoice_analytics');
        });
    }
};
