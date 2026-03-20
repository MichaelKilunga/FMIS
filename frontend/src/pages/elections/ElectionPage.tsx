import { useState, useEffect } from 'react'
import { Gavel, Users, Clock, CheckCircle2, AlertCircle, TrendingUp } from 'lucide-react'
import { electionsApi } from '../../services/api'
import { useAuthStore } from '../../store'
import toast from 'react-hot-toast'
import clsx from 'clsx'

interface User {
  id: number
  name: string
  email: string
  avatar_url: string
}

interface Vote {
  id: number
  voter_id: number
  candidate_id: number
  voter: User
  candidate: User
}

interface Election {
  id: number
  status: 'ongoing' | 'completed' | 'cancelled'
  started_by: number
  winner_id: number | null
  started_at: string
  ended_at: string | null
  initiator: User
  winner?: User
  votes: Vote[]
}

export default function ElectionPage() {
  const { user } = useAuthStore()
  const [currentElection, setCurrentElection] = useState<Election | null>(null)
  const [eligibleVoters, setEligibleVoters] = useState<User[]>([])
  const [eligibleCandidates, setEligibleCandidates] = useState<User[]>([])
  const [history, setHistory] = useState<Election[]>([])
  const [loading, setLoading] = useState(true)
  const [voting, setVoting] = useState(false)

  const isDirector = user?.roles.includes('director')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [currentRes, historyRes] = await Promise.all([
        electionsApi.current(),
        electionsApi.history(),
      ])
      setCurrentElection(currentRes.data.election)
      setEligibleVoters(currentRes.data.eligible_voters)
      setEligibleCandidates(currentRes.data.eligible_candidates)
      setHistory(historyRes.data)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }

  const handleInitiate = async () => {
    try {
      await electionsApi.initiate()
      toast.success('Election initiated successfully')
      fetchData()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to initiate election')
    }
  }

  const handleVote = async (candidateId: number) => {
    try {
      setVoting(true)
      await electionsApi.vote(candidateId)
      toast.success('Vote cast successfully')
      fetchData()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to cast vote')
    } finally {
      setVoting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  const hasVoted = currentElection?.votes.some(v => v.voter_id === user?.id)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Gavel className="text-blue-400" />
            Election Center
          </h1>
          <p className="text-slate-400">Manage and participate in administrative transitions.</p>
        </div>
        {!currentElection && isDirector && (
          <button
            onClick={handleInitiate}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <TrendingUp size={18} />
            Initiate New Election
          </button>
        )}
      </div>

      {currentElection ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Current Status Card */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-card p-6 border-blue-500/30">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                    <Clock size={24} className="animate-pulse" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">Active Administrative Election</h2>
                    <p className="text-sm text-slate-400">Started on {new Date(currentElection.started_at).toLocaleString()}</p>
                  </div>
                </div>
                <div className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-bold uppercase tracking-wider">
                  Ongoing
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
                  <p className="text-xs text-slate-400 uppercase font-bold mb-1">Participation</p>
                  <div className="flex items-end justify-between">
                    <p className="text-2xl font-bold text-white">
                      {currentElection.votes.length} / {eligibleVoters.length}
                    </p>
                    <p className="text-sm text-blue-400">
                      {Math.round((currentElection.votes.length / eligibleVoters.length) * 100)}%
                    </p>
                  </div>
                  <div className="mt-3 h-1.5 w-full bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all duration-1000"
                      style={{ width: `${(currentElection.votes.length / eligibleVoters.length) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
                  <p className="text-xs text-slate-400 uppercase font-bold mb-1">Initiator</p>
                  <div className="flex items-center gap-3 mt-1">
                    <img src={currentElection.initiator.avatar_url} alt="" className="h-8 w-8 rounded-full" />
                    <p className="font-medium text-white">{currentElection.initiator.name}</p>
                  </div>
                </div>
              </div>

              {hasVoted ? (
                <div className="p-4 rounded-xl bg-emerald-900/20 border border-emerald-500/30 flex items-center gap-3 text-emerald-400">
                  <CheckCircle2 size={24} />
                  <div>
                    <p className="font-bold">You have already cast your vote.</p>
                    <p className="text-sm opacity-80">The results will be announced once all directors have voted.</p>
                  </div>
                </div>
              ) : isDirector ? (
                <div className="space-y-4">
                  <h3 className="font-semibold text-white">Select a candidate for Tenant Administrator:</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {eligibleCandidates.map(candidate => (
                      <button
                        key={candidate.id}
                        disabled={voting}
                        onClick={() => handleVote(candidate.id)}
                        className="flex items-center gap-3 p-3 rounded-xl border border-slate-700 hover:border-blue-500 bg-slate-800/30 hover:bg-blue-900/10 transition-all text-left group"
                      >
                        <img src={candidate.avatar_url} alt="" className="h-10 w-10 rounded-full" />
                        <div className="flex-1">
                          <p className="font-medium text-white group-hover:text-blue-300">{candidate.name}</p>
                          <p className="text-xs text-slate-400">{candidate.email}</p>
                        </div>
                        <div className="h-6 w-6 rounded-full border border-slate-600 group-hover:border-blue-500 flex items-center justify-center">
                          <div className="h-3 w-3 rounded-full bg-blue-500 scale-0 group-hover:scale-100 transition-transform" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-yellow-900/20 border border-yellow-500/30 flex items-center gap-3 text-yellow-400">
                  <AlertCircle size={24} />
                  <div>
                    <p className="font-bold">Observation Mode Only</p>
                    <p className="text-sm opacity-80">Only directors can participate in administrative elections.</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Activity Feed */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
              <Users size={20} className="text-slate-400" />
              Recent Votes
            </h2>
            <div className="space-y-4">
              {currentElection.votes.length > 0 ? (
                currentElection.votes.map(vote => (
                  <div key={vote.id} className="flex items-center gap-3 pb-4 border-b border-slate-700/50 last:border-0">
                    <img src={vote.voter.avatar_url} alt="" className="h-8 w-8 rounded-full" />
                    <div className="flex-1">
                      <p className="text-sm text-slate-200">
                        <span className="font-medium text-blue-300">{vote.voter.name}</span> cast a vote
                      </p>
                      <p className="text-xs text-slate-500">Just now</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center py-8 text-slate-500 italic text-sm">No votes cast yet.</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-card p-12 text-center max-w-2xl mx-auto">
          <div className="h-20 w-20 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-6">
            <Gavel size={40} className="text-slate-500" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">No Active Election</h2>
          <p className="text-slate-400 mb-8">
            The administrative structure is stable. Directors can initiate a new election if a change in leadership is required.
          </p>
          {isDirector && (
            <button
              onClick={handleInitiate}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all transform hover:scale-105"
            >
              Start Election Process
            </button>
          )}
        </div>
      )}

      {/* History Table */}
      {history.length > 0 && (
        <div className="glass-card overflow-hidden">
          <div className="p-6 border-b border-slate-700/50">
            <h2 className="text-lg font-semibold text-white">Election History</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-800/50 text-slate-400 text-xs font-bold uppercase tracking-wider">
                  <th className="px-6 py-4">Winner</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Started By</th>
                  <th className="px-6 py-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {history.map(item => (
                  <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4">
                      {item.winner ? (
                        <div className="flex items-center gap-3">
                          <img src={item.winner.avatar_url} alt="" className="h-8 w-8 rounded-full" />
                          <span className="font-medium text-white">{item.winner.name}</span>
                        </div>
                      ) : (
                        <span className="text-slate-500 italic">No Winner</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={clsx(
                        'px-2 py-0.5 rounded text-[10px] font-bold uppercase',
                        item.status === 'completed' ? 'bg-emerald-900/30 text-emerald-400' : 'bg-red-900/30 text-red-400'
                      )}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-300 text-sm">
                      {item.initiator.name}
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-sm">
                      {new Date(item.ended_at || item.started_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
