<?php

namespace App\Services;

use App\Models\Election;
use App\Models\Vote;
use App\Models\User;
use App\Models\Tenant;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Role;

class ElectionService
{
    public function __construct(protected NotificationService $notifications) {}
    /**
     * Initiate a new election for the tenant.
     */
    public function initiateElection(User $initiator): Election
    {
        // Check if there is an ongoing election
        $ongoing = Election::where('tenant_id', $initiator->tenant_id)
            ->where('status', 'ongoing')
            ->first();

        if ($ongoing) {
            throw new \Exception('An election is already in progress.');
        }

        // Only directors can initiate
        if (!$initiator->hasRole('director')) {
            throw new \Exception('Only directors can initiate an election.');
        }

        return DB::transaction(function () use ($initiator) {
            $election = Election::create([
                'tenant_id'  => $initiator->tenant_id,
                'status'     => 'ongoing',
                'started_by' => $initiator->id,
                'started_at' => now(),
            ]);

            // Notify all directors
            try {
                $directors = User::forTenant($initiator->tenant_id)->role('director')->get();
                if ($directors->isNotEmpty()) {
                    $this->notifications->send(
                        users: $directors,
                        title: 'New Election Initiated',
                        content: "A new election for administrative capability has been started by {$initiator->name}. Please cast your vote.",
                        featureKey: 'elections',
                        action: ['label' => 'Go to Election', 'url' => "/elections"],
                        type: 'warning'
                    );
                }
            } catch (\Exception $e) {
                \Log::error('Election notification failed: ' . $e->getMessage());
            }

            return $election;
        });
    }

    /**
     * Cast a vote in an ongoing election.
     */
    public function castVote(Election $election, User $voter, User $candidate): Vote
    {
        if ($election->status !== 'ongoing') {
            throw new \Exception('This election is not active.');
        }

        if ($voter->tenant_id !== $election->tenant_id) {
            throw new \Exception('You do not belong to this tenant.');
        }

        if (!$voter->hasRole('director')) {
            throw new \Exception('Only directors can vote.');
        }

        // Candidate must also be a director? 
        // User said "among the director one must have administrative capability"
        if (!$candidate->hasRole('director')) {
            throw new \Exception('The candidate must be a director.');
        }

        if ($candidate->tenant_id !== $election->tenant_id) {
            throw new \Exception('The candidate must belong to the same tenant.');
        }

        if (Vote::where('election_id', $election->id)->where('voter_id', $voter->id)->exists()) {
            throw new \Exception('You have already cast your vote in this election.');
        }

        return DB::transaction(function () use ($election, $voter, $candidate) {
            $vote = Vote::create([
                'election_id'  => $election->id,
                'voter_id'     => $voter->id,
                'candidate_id' => $candidate->id,
            ]);

            // Check if everyone has voted
            $this->checkAndConclude($election);

            return $vote;
        });
    }

    /**
     * Check if all directors have voted and conclude if so.
     */
    protected function checkAndConclude(Election $election)
    {
        $totalDirectors = User::role('director')->where('tenant_id', $election->tenant_id)->count();
        $votesCount = Vote::where('election_id', $election->id)->count();

        if ($votesCount >= $totalDirectors) {
            $this->concludeElection($election);
        }
    }

    /**
     * Conclude the election and assign the admin role.
     */
    public function concludeElection(Election $election)
    {
        DB::transaction(function () use ($election) {
            // Count votes
            $winner = Vote::where('election_id', $election->id)
                ->select('candidate_id', DB::raw('count(*) as total'))
                ->groupBy('candidate_id')
                ->orderByDesc('total')
                ->first();

            if (!$winner) {
                $election->update(['status' => 'cancelled', 'ended_at' => now()]);
                return;
            }

            $winnerId = $winner->candidate_id;
            $winnerUser = User::find($winnerId);

            // Update election
            $election->update([
                'status'    => 'completed',
                'winner_id' => $winnerId,
                'ended_at'  => now(),
            ]);

            // Ensure the role exists
            $adminRole = Role::firstOrCreate(['name' => 'tenant-admin', 'guard_name' => 'web']);

            // Remove previous admin role from everyone in this tenant
            User::role('tenant-admin')
                ->where('tenant_id', $election->tenant_id)
                ->each(function ($user) use ($adminRole) {
                    $user->removeRole($adminRole);
                });

            // Assign new admin role
            $winnerUser->assignRole($adminRole);

            // Notify directors of results
            try {
                $directors = User::forTenant($election->tenant_id)->role('director')->get();
                if ($directors->isNotEmpty()) {
                    $this->notifications->send(
                        users: $directors,
                        title: 'Election Concluded',
                        content: "The election has ended. {$winnerUser->name} has been elected as the new Tenant Admin.",
                        featureKey: 'elections',
                        action: ['label' => 'View Results', 'url' => "/elections"],
                        type: 'success'
                    );
                }
            } catch (\Exception $e) {
                \Log::error('Election conclusion notification failed: ' . $e->getMessage());
            }
        });
    }

    public function getEligibleVoters(int $tenantId)
    {
        return User::role('director')->where('tenant_id', $tenantId)->get();
    }

    public function getEligibleCandidates(int $tenantId)
    {
        return User::role('director')->where('tenant_id', $tenantId)->get();
    }
}
