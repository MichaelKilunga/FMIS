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
        $settings = $this->settings ?? [];
        return [
            'primary_color'   => $this->primary_color,
            'secondary_color' => $this->secondary_color,
            'accent_color'    => $this->accent_color,
            'logo'            => $this->logo ? asset('storage/' . $this->logo) : null,
            'favicon'         => $this->favicon ? asset('storage/' . $this->favicon) : null,
            'name'            => $this->name,
            // Invoice-specific fields stored in tenant settings
            'tin'             => $settings['tin'] ?? null,
            'reg_no'          => $settings['reg_no'] ?? null,
            'dealers'         => $settings['dealers'] ?? null,
            'lipa_name'       => $settings['lipa_name'] ?? null,
            'lipa_number'     => $settings['lipa_number'] ?? null,
            'sales_director'  => $settings['sales_director'] ?? null,
        ];
    }
}
