<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Configurable workflow definitions
        Schema::create('approval_workflows', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id')->index();
            $table->string('name');
            $table->string('module')->default('transaction'); // transaction, invoice, budget
            $table->json('conditions')->nullable(); // e.g. {"amount_gt": 1000}
            $table->boolean('is_active')->default(true);
            $table->text('description')->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
        });

        // Steps within each workflow
        Schema::create('approval_steps', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('workflow_id');
            $table->integer('step_order')->default(1);
            $table->string('role_name'); // role required to approve this step
            $table->decimal('threshold_min', 15, 2)->nullable();
            $table->decimal('threshold_max', 15, 2)->nullable();
            $table->boolean('require_all')->default(false); // all users with role must approve
            $table->json('conditions')->nullable();
            $table->integer('sla_hours')->default(48); // time to respond
            $table->timestamps();

            $table->foreign('workflow_id')->references('id')->on('approval_workflows')->onDelete('cascade');
        });

        // Approval instances (one per transaction)
        Schema::create('approvals', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id')->index();
            $table->morphs('approvable'); // polymorphic: transaction, invoice etc.
            $table->unsignedBigInteger('workflow_id');
            $table->integer('current_step')->default(1);
            $table->string('status')->default('pending'); // pending, approved, rejected, escalated
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('workflow_id')->references('id')->on('approval_workflows')->onDelete('cascade');
        });

        // Per-step approval history
        Schema::create('approval_logs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id')->index();
            $table->unsignedBigInteger('approval_id');
            $table->unsignedBigInteger('step_id');
            $table->unsignedBigInteger('user_id');
            $table->string('action'); // approved, rejected, escalated, commented
            $table->text('comment')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('approval_id')->references('id')->on('approvals')->onDelete('cascade');
            $table->foreign('step_id')->references('id')->on('approval_steps')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('approval_logs');
        Schema::dropIfExists('approvals');
        Schema::dropIfExists('approval_steps');
        Schema::dropIfExists('approval_workflows');
    }
};
