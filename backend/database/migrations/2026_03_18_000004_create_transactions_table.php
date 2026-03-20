<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('transactions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id')->index();
            $table->string('reference')->unique();
            $table->decimal('amount', 15, 2);
            $table->string('type'); // income, expense, transfer
            $table->unsignedBigInteger('category_id')->nullable();
            $table->unsignedBigInteger('account_id')->nullable();
            $table->unsignedBigInteger('to_account_id')->nullable(); // for transfers
            $table->unsignedBigInteger('created_by');
            $table->string('description')->nullable();
            $table->text('notes')->nullable();
            $table->json('attachments')->nullable();
            $table->string('status')->default('draft'); // draft, submitted, under_review, approved, rejected, posted
            $table->date('transaction_date');
            $table->string('currency', 10)->default('USD');
            $table->decimal('exchange_rate', 10, 6)->default(1);
            $table->json('metadata')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('category_id')->references('id')->on('transaction_categories')->onDelete('set null');
            $table->foreign('account_id')->references('id')->on('accounts')->onDelete('set null');
            $table->foreign('created_by')->references('id')->on('users')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transactions');
    }
};
