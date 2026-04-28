<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Baseline data fix: Update EXISTING USD records to TZS
        DB::table('transactions')->where('currency', 'USD')->update(['currency' => 'TZS']);
        DB::table('accounts')->where('currency', 'USD')->update(['currency' => 'TZS']);
        DB::table('recurring_bills')->where('currency', 'USD')->update(['currency' => 'TZS']);
        DB::table('invoices')->where('currency', 'USD')->update(['currency' => 'TZS']);

        // Schema fix: Change DEFAULT from USD to TZS for FUTURE records
        Schema::table('transactions', function (Blueprint $table) {
            $table->string('currency', 10)->default('TZS')->change();
        });
        
        Schema::table('accounts', function (Blueprint $table) {
            $table->string('currency', 10)->default('TZS')->change();
        });

        Schema::table('invoices', function (Blueprint $table) {
            $table->string('currency', 10)->default('TZS')->change();
        });

        // Recurring bills already defaults to TZS in create migration, but good to be explicit
        Schema::table('recurring_bills', function (Blueprint $table) {
            $table->string('currency', 10)->default('TZS')->change();
        });

        // Debts table does not have a currency column yet, we skip it
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No reverse needed for data fix
    }
};
