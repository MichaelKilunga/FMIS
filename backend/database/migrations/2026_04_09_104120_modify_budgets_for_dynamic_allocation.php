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
        Schema::table('budgets', function (Blueprint $table) {
            // Add initial_amount to store the base budget configuration
            $table->decimal('initial_amount', 15, 2)->after('name')->default(0);
        });

        // Copy current amount to initial_amount for existing records
        DB::statement('UPDATE budgets SET initial_amount = amount');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('budgets', function (Blueprint $table) {
            $table->dropColumn('initial_amount');
        });
    }
};
