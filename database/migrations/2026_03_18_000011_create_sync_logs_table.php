<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sync_logs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id')->index();
            $table->unsignedBigInteger('user_id');
            $table->string('entity_type'); // transaction, approval, invoice
            $table->string('entity_id'); // local UUID from IndexedDB
            $table->string('action'); // created, updated, deleted
            $table->json('payload');
            $table->string('status')->default('pending'); // pending, synced, failed, conflict
            $table->text('error_message')->nullable();
            $table->integer('attempts')->default(0);
            $table->timestamp('synced_at')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sync_logs');
    }
};
