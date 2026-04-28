<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->index('status');
            $table->index('type');
            $table->index('transaction_date');
            
            // Composite index for common analytics queries
            $table->index(['tenant_id', 'status', 'type', 'transaction_date'], 'idx_analytics_lookup');
        });
    }

    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropIndex(['status']);
            $table->dropIndex(['type']);
            $table->dropIndex(['transaction_date']);
            $table->dropIndex('idx_analytics_lookup');
        });
    }
};
