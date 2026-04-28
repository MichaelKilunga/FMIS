<?php

namespace Database\Seeders;

use App\Models\Setting;
use Illuminate\Database\Seeder;

class SystemSettingsSeeder extends Seeder
{
    public function run(): void
    {
        $settings = [
            [
                'key'         => 'system.privacy_policy',
                'value'       => "# Privacy Policy\n\nYour privacy is important to us. It is FMIS's policy to respect your privacy regarding any information we may collect from you across our website, and other sites we own and operate.\n\nWe only ask for personal information when we truly need it to provide a service to you. We collect it by fair and lawful means, with your knowledge and consent. We also let you know why we’re collecting it and how it will be used.\n\nWe only retain collected information for as long as necessary to provide you with your requested service.",
                'type'        => 'string',
                'group'       => 'system',
                'description' => 'Global Privacy Policy content (Markdown supported)',
                'is_system'   => true,
            ],
            [
                'key'         => 'system.terms_of_service',
                'value'       => "# Terms of Service\n\n1. Terms\nBy accessing the website at FMIS, you are agreeing to be bound by these terms of service, all applicable laws and regulations, and agree that you are responsible for compliance with any applicable local laws.\n\n2. Use License\nPermission is granted to temporarily download one copy of the materials on FMIS's website for personal, non-commercial transitory viewing only.",
                'type'        => 'string',
                'group'       => 'system',
                'description' => 'Global Terms of Service content (Markdown supported)',
                'is_system'   => true,
            ],
            [
                'key'         => 'system.support_email',
                'value'       => 'support@skylinksolutions.co',
                'type'        => 'string',
                'group'       => 'system',
                'description' => 'Global support contact email',
                'is_system'   => true,
            ],
        ];

        foreach ($settings as $s) {
            Setting::updateOrCreate(
                ['key' => $s['key'], 'tenant_id' => null],
                $s
            );
        }
    }
}
