<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->unsignedBigInteger('budget_id')->nullable()->after('category_id')->index();
            $table->string('department')->nullable()->after('budget_id')->index();
            
            $table->foreign('budget_id')->references('id')->on('budgets')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropForeign(['budget_id']);
            $table->dropColumn(['budget_id', 'department']);
        });
    }
};
