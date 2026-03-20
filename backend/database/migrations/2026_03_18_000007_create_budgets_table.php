<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('budgets', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id')->index();
            $table->unsignedBigInteger('category_id')->nullable();
            $table->unsignedBigInteger('created_by');
            $table->string('department')->nullable();
            $table->string('name');
            $table->decimal('amount', 15, 2); // planned budget
            $table->decimal('spent', 15, 2)->default(0); // actual spent
            $table->decimal('alert_threshold', 5, 2)->default(80); // alert at 80%
            $table->string('period'); // monthly, quarterly, yearly, custom
            $table->date('start_date');
            $table->date('end_date');
            $table->string('status')->default('active'); // active, exceeded, completed
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('category_id')->references('id')->on('transaction_categories')->onDelete('set null');
            $table->foreign('created_by')->references('id')->on('users')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('budgets');
    }
};
