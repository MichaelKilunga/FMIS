<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(\App\Services\SettingService $settings): void
    {
        // Safety check for migrations/tests
        if (!\Illuminate\Support\Facades\Schema::hasTable('settings')) {
            return;
        }

        \App\Models\Task::observe(\App\Observers\TaskObserver::class);
        \App\Models\Transaction::observe(\App\Observers\TransactionObserver::class);
        
        \Illuminate\Auth\Notifications\VerifyEmail::createUrlUsing(function ($notifiable) {
            $frontendUrl = config('app.frontend_url');
            return "{$frontendUrl}/verify-email/{$notifiable->getKey()}/" . sha1($notifiable->getEmailForVerification());
        });

        \Illuminate\Auth\Notifications\ResetPassword::createUrlUsing(function ($notifiable, $token) {
            $frontendUrl = config('app.frontend_url');
            return "{$frontendUrl}/reset-password?token={$token}&email=" . urlencode($notifiable->getEmailForVerification());
        });

        // Load session lifetime from settings (system-wide)
        $lifetime = $settings->get('auth.session_lifetime');
        if ($lifetime) {
            config(['sanctum.expiration' => (int) $lifetime]);
        }
    }
}
