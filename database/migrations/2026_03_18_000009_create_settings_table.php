<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('settings', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id')->nullable()->index(); // null = system-wide
            $table->string('group')->default('general'); // general, modules, security, branding, approvals, fraud
            $table->string('key');
            $table->longText('value')->nullable(); // JSON-encoded values
            $table->string('type')->default('string'); // string, boolean, integer, json, color
            $table->boolean('is_system')->default(false); // system settings cannot be deleted
            $table->text('description')->nullable();
            $table->timestamps();

            $table->unique(['tenant_id', 'key']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('settings');
    }
};
