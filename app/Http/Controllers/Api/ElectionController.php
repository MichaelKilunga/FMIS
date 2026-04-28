<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Election;
use App\Models\Vote;
use App\Services\ElectionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ElectionController extends Controller
{
    protected $electionService;

    public function __construct(ElectionService $electionService)
    {
        $this->electionService = $electionService;
    }

    /**
     * Get the current ongoing election for the tenant.
     */
    public function current()
    {
        $user = Auth::user();
        $election = Election::where('tenant_id', $user->tenant_id)
            ->where('status', 'ongoing')
            ->with(['initiator', 'votes.voter', 'votes.candidate'])
            ->first();

        return response()->json([
            'election' => $election,
            'eligible_voters' => $this->electionService->getEligibleVoters($user->tenant_id),
            'eligible_candidates' => $this->electionService->getEligibleCandidates($user->tenant_id),
        ]);
    }

    /**
     * Initiate a new election.
     */
    public function initiate()
    {
        try {
            $election = $this->electionService->initiateElection(Auth::user());
            return response()->json([
                'message' => 'Election initiated successfully.',
                'election' => $election,
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    /**
     * Cast a vote.
     */
    public function vote(Request $request)
    {
        $request->validate([
            'candidate_id' => 'required|exists:users,id',
        ]);

        try {
            $user = Auth::user();
            $election = Election::where('tenant_id', $user->tenant_id)
                ->where('status', 'ongoing')
                ->firstOrFail();

            $candidate = \App\Models\User::findOrFail($request->candidate_id);

            $vote = $this->electionService->castVote($election, $user, $candidate);

            return response()->json([
                'message' => 'Vote cast successfully.',
                'vote' => $vote,
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    /**
     * Get election history.
     */
    public function history()
    {
        $user = Auth::user();
        $history = Election::where('tenant_id', $user->tenant_id)
            ->where('status', '!=', 'ongoing')
            ->orderByDesc('ended_at')
            ->with(['winner', 'initiator'])
            ->get();

        return response()->json($history);
    }
}
