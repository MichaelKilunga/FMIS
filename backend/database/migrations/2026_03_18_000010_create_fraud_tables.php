<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Configurable fraud detection rules
        Schema::create('fraud_rules', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id')->index();
            $table->string('name');
            $table->string('type'); // duplicate, abnormal_amount, suspicious_timing, velocity
            $table->json('conditions'); // {"threshold": 5000, "window_minutes": 60 }
            $table->string('severity')->default('medium'); // low, medium, high, critical
            $table->boolean('is_active')->default(true);
            $table->text('description')->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
        });

        // Detected fraud alerts
        Schema::create('fraud_alerts', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id')->index();
            $table->unsignedBigInteger('transaction_id');
            $table->unsignedBigInteger('rule_id');
            $table->string('severity'); // low, medium, high, critical
            $table->string('status')->default('open'); // open, investigating, resolved, false_positive
            $table->text('details')->nullable();
            $table->unsignedBigInteger('resolved_by')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->text('resolution_notes')->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('transaction_id')->references('id')->on('transactions')->onDelete('cascade');
            $table->foreign('rule_id')->references('id')->on('fraud_rules')->onDelete('cascade');
            $table->foreign('resolved_by')->references('id')->on('users')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fraud_alerts');
        Schema::dropIfExists('fraud_rules');
    }
};
