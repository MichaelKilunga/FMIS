<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $query = AuditLog::where('tenant_id', $tenantId)->with('user')->latest();

        if ($request->filled('action'))     $query->where('action', $request->action);
        if ($request->filled('user_id'))    $query->where('user_id', $request->user_id);
        if ($request->filled('model_type')) $query->where('model_type', $request->model_type);
        if ($request->filled('from'))       $query->where('created_at', '>=', $request->from);
        if ($request->filled('to'))         $query->where('created_at', '<=', $request->to . ' 23:59:59');

        return response()->json($query->paginate($request->get('per_page', 50)));
    }

    public function show(Request $request, AuditLog $auditLog): JsonResponse
    {
        abort_if($auditLog->tenant_id !== $request->user()->tenant_id, 403);
        return response()->json($auditLog->load('user'));
    }
    // No store/update/delete — immutable
}
