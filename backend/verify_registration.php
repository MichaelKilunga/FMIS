<?php

use App\Models\User;
use App\Models\Tenant;
use Illuminate\Support\Facades\Hash;

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "Testing Registration...\n";

$data = [
    'director_name'     => 'Test Director',
    'email'             => 'test-director-' . time() . '@example.com',
    'password'          => 'password123',
    'password_confirmation' => 'password123',
    'organization_name' => 'Test Org ' . time(),
    'phone'             => '123456789',
    'address'           => 'Test Address',
];

$response = $app->make(App\Http\Controllers\Api\V1\RegisterController::class)->register(new \Illuminate\Http\Request($data));

if ($response->getStatusCode() === 201) {
    echo "✅ Registration Success!\n";
    $content = json_decode($response->getContent(), true);
    echo "User: " . $content['user']['email'] . "\n";
    echo "Tenant: " . $content['tenant']['name'] . "\n";
    
    // Verify categories
    $catCount = \App\Models\TransactionCategory::where('tenant_id', $content['tenant']['id'])->count();
    echo "Categories created: $catCount\n";
    
    // Verify roles
    $user = User::find($content['user']['id']);
    echo "Roles: " . implode(', ', $user->getRoleNames()->toArray()) . "\n";
} else {
    echo "❌ Registration Failed: " . $response->getContent() . "\n";
}
