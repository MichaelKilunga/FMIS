<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Immutable audit trail — no update/delete allowed at DB level via app
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id')->nullable()->index();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->string('action'); // created, updated, deleted, approved, rejected, login, etc.
            $table->string('model_type')->nullable(); // App\Models\Transaction
            $table->unsignedBigInteger('model_id')->nullable();
            $table->json('before')->nullable();
            $table->json('after')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamp('created_at')->useCurrent();
            // NO updated_at — immutable
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};
