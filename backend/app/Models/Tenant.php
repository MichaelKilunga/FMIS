<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;

class Tenant extends Model
{
    use HasFactory;
    use SoftDeletes;

    protected $fillable = [
        'name', 'slug', 'email', 'phone', 'address',
        'logo', 'favicon',
        'primary_color', 'secondary_color', 'accent_color',
        'plan', 'currency', 'timezone', 'is_active', 'settings', 'trial_ends_at',
    ];

    protected $casts = [
        'is_active'     => 'boolean',
        'settings'      => 'array',
        'trial_ends_at' => 'datetime',
    ];

    public function users()
    {
        return $this->hasMany(User::class);
    }

    public function transactions()
    {
        return $this->hasMany(Transaction::class);
    }

    public function accounts()
    {
        return $this->hasMany(Account::class);
    }

    public function settings()
    {
        return $this->hasMany(Setting::class);
    }

    public function tasks()
    {
        return $this->hasMany(Task::class);
    }

    public function getBrandingAttribute(): array
    {
        // Fetch settings from the related table instead of only the JSON column
        $sets = $this->settings->keyBy('key')->map(fn($s) => $s->typed_value);
        
        return [
            'primary_color'   => $this->primary_color ?? '#3B82F6',
            'secondary_color' => $this->secondary_color ?? '#0F172A',
            'accent_color'    => $this->accent_color ?? '#10B981',
            'logo'            => $this->logo ? asset('storage/' . $this->logo) : null,
            'favicon'         => $this->favicon ? asset('storage/' . $this->favicon) : null,
            'name'            => $this->name,
            'email'           => $this->email,
            'phone'           => $this->phone,
            'address'         => $this->address,
            // Invoice-specific fields stored in settings table
            'tin'             => $sets['invoice_tin'] ?? $sets['tin'] ?? null,
            'reg_no'          => $sets['invoice_reg_no'] ?? $sets['reg_no'] ?? null,
            'dealers'         => $sets['invoice_dealers'] ?? $sets['dealers'] ?? null,
            'lipa_name'       => $sets['invoice_lipa_name'] ?? $sets['lipa_name'] ?? null,
            'lipa_number'     => $sets['invoice_lipa_number'] ?? $sets['lipa_number'] ?? null,
            'sales_director'  => $sets['invoice_sales_director'] ?? $sets['sales_director'] ?? null,
            'website'         => $sets['website'] ?? parse_url(config('app.url'), PHP_URL_HOST),
            'city'            => $sets['city'] ?? 'Dar es Salaam',
            'country'         => $sets['country'] ?? 'Tanzania',
        ];
    }
}
