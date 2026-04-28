<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\SyncLog;
use App\Models\Transaction;
use App\Services\TransactionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SyncController extends Controller
{
    public function __construct(protected TransactionService $transactionService) {}

    /**
     * Receive batched offline changes from PWA
     */
    public function pushChanges(Request $request): JsonResponse
    {
        $data = $request->validate([
            'changes'              => 'required|array',
            'changes.*.entity_type'=> 'required|string',
            'changes.*.entity_id'  => 'required|string',
            'changes.*.action'     => 'required|in:created,updated,deleted',
            'changes.*.payload'    => 'required|array',
            'changes.*.client_ts'  => 'required|integer',
        ]);

        $user     = $request->user();
        $tenantId = $user->tenant_id;
        $results  = [];

        foreach ($data['changes'] as $change) {
            try {
                DB::beginTransaction();

                $result = $this->processChange($change, $user, $tenantId);

                SyncLog::create([
                    'tenant_id'   => $tenantId,
                    'user_id'     => $user->id,
                    'entity_type' => $change['entity_type'],
                    'entity_id'   => $change['entity_id'],
                    'action'      => $change['action'],
                    'payload'     => $change['payload'],
                    'status'      => 'synced',
                    'synced_at'   => now(),
                ]);

                DB::commit();
                $results[] = ['entity_id' => $change['entity_id'], 'status' => 'synced', 'server_id' => $result['id'] ?? null];
            } catch (\Throwable $e) {
                DB::rollBack();
                SyncLog::create([
                    'tenant_id'     => $tenantId,
                    'user_id'       => $user->id,
                    'entity_type'   => $change['entity_type'],
                    'entity_id'     => $change['entity_id'],
                    'action'        => $change['action'],
                    'payload'       => $change['payload'],
                    'status'        => 'failed',
                    'error_message' => $e->getMessage(),
                ]);
                $results[] = ['entity_id' => $change['entity_id'], 'status' => 'failed', 'error' => $e->getMessage()];
            }
        }

        return response()->json(['results' => $results, 'synced' => count(array_filter($results, fn($r) => $r['status'] === 'synced'))]);
    }

    protected function processChange(array $change, $user, int $tenantId): array
    {
        return match($change['entity_type']) {
            'transaction' => $this->syncTransaction($change, $user, $tenantId),
            default       => throw new \RuntimeException("Unknown entity type: {$change['entity_type']}"),
        };
    }

    protected function syncTransaction(array $change, $user, int $tenantId): array
    {
        $payload = $change['payload'];
        $payload['tenant_id']  = $tenantId;
        $payload['created_by'] = $user->id;

        if ($change['action'] === 'created') {
            // Check if already synced (idempotency)
            $existing = SyncLog::where('entity_id', $change['entity_id'])->where('status', 'synced')->first();
            if ($existing) return ['id' => $existing->id];
            $transaction = $this->transactionService->create($payload);
            return $transaction->toArray();
        }

        return [];
    }
}
