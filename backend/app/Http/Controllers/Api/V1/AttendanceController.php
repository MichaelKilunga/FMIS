<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Services\SettingService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class AttendanceController extends Controller
{
    public function __construct(protected SettingService $settings)
    {}

    public function index(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        
        $query = Attendance::with('user:id,first_name,last_name,email')
            ->where('tenant_id', $tenantId);

        // Standard users can only view their own attendance
        if (!$request->user()->can('manage-users')) {
            $query->where('user_id', $request->user()->id);
        } else {
            // Admins can filter by user_id
            if ($request->has('user_id')) {
                $query->where('user_id', $request->input('user_id'));
            }
        }

        if ($request->has('date')) {
            $query->whereDate('date', $request->input('date'));
        }

        $attendances = $query->orderBy('date', 'desc')
            ->orderBy('created_at', 'desc')
            ->paginate(15);
            
        return response()->json($attendances);
    }

    public function checkIn(Request $request): JsonResponse
    {
        $request->validate([
            'latitude' => 'required|numeric',
            'longitude' => 'required|numeric',
            'notes' => 'nullable|string'
        ]);

        $user = $request->user();
        $tenantId = $user->tenant_id;

        // Check if already checked in today
        $today = now()->toDateString();
        $existing = Attendance::where('user_id', $user->id)
            ->where('tenant_id', $tenantId)
            ->whereDate('date', $today)
            ->first();

        if ($existing && $existing->check_in_time) {
            return response()->json(['message' => 'Already checked in today.'], 400);
        }

        // Validate Perimeter
        $this->verifyLocation($tenantId, $request->input('latitude'), $request->input('longitude'));

        $attendance = Attendance::create([
            'user_id' => $user->id,
            'tenant_id' => $tenantId,
            'date' => $today,
            'check_in_time' => now(),
            'check_in_location' => [
                'lat' => $request->input('latitude'),
                'lng' => $request->input('longitude')
            ],
            'status' => 'present',
            'notes' => $request->input('notes'),
        ]);

        return response()->json([
            'message' => 'Checked in successfully.',
            'data' => $attendance
        ]);
    }

    public function checkOut(Request $request): JsonResponse
    {
        $request->validate([
            'latitude' => 'required|numeric',
            'longitude' => 'required|numeric',
            'notes' => 'nullable|string'
        ]);

        $user = $request->user();
        $tenantId = $user->tenant_id;
        $today = now()->toDateString();

        $attendance = Attendance::where('user_id', $user->id)
            ->where('tenant_id', $tenantId)
            ->whereDate('date', $today)
            ->first();

        if (!$attendance || !$attendance->check_in_time) {
            return response()->json(['message' => 'You must check in first.'], 400);
        }

        if ($attendance->check_out_time) {
            return response()->json(['message' => 'Already checked out today.'], 400);
        }

        // Validate Perimeter
        $this->verifyLocation($tenantId, $request->input('latitude'), $request->input('longitude'));

        $notes = $attendance->notes;
        if ($request->input('notes')) {
            $notes = $notes ? $notes . "\nCheck-out: " . $request->input('notes') : $request->input('notes');
        }

        $attendance->update([
            'check_out_time' => now(),
            'check_out_location' => [
                'lat' => $request->input('latitude'),
                'lng' => $request->input('longitude')
            ],
            'notes' => $notes,
        ]);

        return response()->json([
            'message' => 'Checked out successfully.',
            'data' => $attendance
        ]);
    }

    protected function verifyLocation($tenantId, $lat, $lng)
    {
        $check = $this->isWithinPerimeter($tenantId, $lat, $lng);
        if (!$check['valid']) {
            abort(400, "You are outside all valid office perimeters. Closest is " . round($check['minDistance'] ?? 0) . "m away.");
        }
        return true;
    }

    protected function isWithinPerimeter($tenantId, $lat, $lng)
    {
        $locationsJson = $this->settings->get('office_locations', null, $tenantId);
        
        // Backward compatibility
        if (!$locationsJson) {
            $officeLat = (float) $this->settings->get('office_latitude', 0, $tenantId);
            $officeLng = (float) $this->settings->get('office_longitude', 0, $tenantId);
            $officeRadius = (float) $this->settings->get('office_radius', 500, $tenantId);

            if ($officeLat == 0 && $officeLng == 0) {
                return ['valid' => true];
            }

            $distance = $this->calculateDistance($lat, $lng, $officeLat, $officeLng);
            if ($distance <= $officeRadius) {
                return ['valid' => true];
            }
            return ['valid' => false, 'minDistance' => $distance, 'closestRadius' => $officeRadius];
        }

        $locations = is_string($locationsJson) ? json_decode($locationsJson, true) : $locationsJson;
        if (!is_array($locations) || count($locations) === 0) {
            return ['valid' => true];
        }

        $minDistance = PHP_INT_MAX;
        $closestRadius = 0;

        foreach ($locations as $loc) {
            $distance = $this->calculateDistance($lat, $lng, (float)$loc['lat'], (float)$loc['lng']);
            $radius = isset($loc['radius']) ? (float)$loc['radius'] : 500;
            
            if ($distance <= $radius) {
                return ['valid' => true];
            }
            
            if ($distance < $minDistance) {
                $minDistance = $distance;
                $closestRadius = $radius;
            }
        }

        return ['valid' => false, 'minDistance' => $minDistance, 'closestRadius' => $closestRadius];
    }

    public function ping(Request $request)
    {
        $request->validate([
            'latitude' => 'required|numeric',
            'longitude' => 'required|numeric',
            'recorded_at' => 'nullable|date'
        ]);

        $user = $request->user();
        $tenantId = $user->tenant_id;
        $today = now()->toDateString();

        $attendance = Attendance::where('user_id', $user->id)
            ->where('tenant_id', $tenantId)
            ->where('date', $today)
            ->whereNull('check_out_time')
            ->first();

        if (!$attendance) {
            return response()->json(['message' => 'No active check-in found.'], 400);
        }

        $check = $this->isWithinPerimeter($tenantId, $request->latitude, $request->longitude);
        $inZone = $check['valid'];
        $recordedAt = $request->has('recorded_at') ? \Carbon\Carbon::parse($request->input('recorded_at')) : now();
        $checkInTime = \Carbon\Carbon::parse($attendance->check_in_time);
        
        if ($recordedAt->lessThan($checkInTime)) {
            $recordedAt = $checkInTime;
        }

        $lastTime = $attendance->last_ping_time ? \Carbon\Carbon::parse($attendance->last_ping_time) : $checkInTime;

        if ($recordedAt->greaterThan($lastTime)) {
            if ($inZone) {
                $minutesPassed = $lastTime->diffInMinutes($recordedAt);
                
                if ($minutesPassed > 0) {
                    if ($minutesPassed > 30) {
                        // Cap prolonged disconnected time
                        $attendance->time_in_zone_minutes += 5;
                        $attendance->last_ping_time = $recordedAt;
                    } else {
                        $attendance->time_in_zone_minutes += $minutesPassed;
                        // Advance last_ping_time by the exact full minutes to preserve seconds balance
                        $attendance->last_ping_time = $lastTime->copy()->addMinutes($minutesPassed);
                    }
                }
            } else {
                // Out of zone, reset the last ping time to now
                $attendance->last_ping_time = $recordedAt;
            }

            $attendance->save();
        }

        return response()->json([
            'message' => 'Ping recorded',
            'in_zone' => $inZone,
            'time_in_zone_minutes' => $attendance->time_in_zone_minutes,
            'distance_to_perimeter' => $inZone ? 0 : round($check['minDistance'] ?? 0)
        ]);
    }

    protected function calculateDistance($lat1, $lon1, $lat2, $lon2) {
        $earthRadius = 6371000;

        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);

        $a = sin($dLat/2) * sin($dLat/2) +
             cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
             sin($dLon/2) * sin($dLon/2);

        $c = 2 * atan2(sqrt($a), sqrt(1-$a));

        return $earthRadius * $c;
    }
}
