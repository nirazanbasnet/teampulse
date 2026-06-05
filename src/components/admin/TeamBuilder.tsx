// src/components/admin/TeamBuilder.tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter }   from 'next/navigation'
import { Avatar }      from '@/components/shared/Avatar'
import { createTeam, deleteTeam, addTeamMember, removeTeamMember, setTeamRole } from '@/server/actions/teams'
import type { Team } from '@/lib/types'

interface TeamBuilderProps {
  workspaceId: string
  teams:       (Team & { team_members: any[] })[]
  /** Every registered user — adding one to a team also adds them to the workspace. */
  candidates:  { profile_id: string; profile: any }[]
  /** Only workspace admins create / delete teams; leads just manage membership. */
  canCreateTeams?:  boolean
  /** profile_ids that are workspace admins — drives the "Admin" badge. */
  adminProfileIds?: string[]
}

export function TeamBuilder({
  workspaceId, teams, candidates, canCreateTeams = false, adminProfileIds = [],
}: TeamBuilderProps) {
  const adminIds = new Set(adminProfileIds)
  const [selectedTeam,    setSelectedTeam]    = useState<string | null>(teams[0]?.id ?? null)
  const [creating,        setCreating]        = useState(false)
  const [newTeamName,     setNewTeamName]      = useState('')
  const [error,           setError]            = useState('')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const activeTeam = teams.find(t => t.id === selectedTeam)

  function handleCreateTeam() {
    if (!newTeamName.trim()) return
    setError('')
    startTransition(async () => {
      try {
        await createTeam({ workspaceId, name: newTeamName.trim() })
        setNewTeamName('')
        setCreating(false)
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to create team')
      }
    })
  }

  function handleDeleteTeam(teamId: string, teamName: string) {
    if (!window.confirm(`Delete "${teamName}"? This removes the team and all its feedback notes. This cannot be undone.`)) return
    setError('')
    startTransition(async () => {
      try {
        await deleteTeam({ teamId })
        if (selectedTeam === teamId) setSelectedTeam(null)
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to delete team')
      }
    })
  }

  function handleAddMember(profileId: string) {
    if (!selectedTeam) return
    setError('')
    startTransition(async () => {
      try {
        await addTeamMember({ teamId: selectedTeam, profileId })
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to add member')
      }
    })
  }

  function handleSetRole(profileId: string, role: 'lead' | 'member') {
    if (!selectedTeam) return
    setError('')
    startTransition(async () => {
      try {
        await setTeamRole({ teamId: selectedTeam, profileId, role })
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to update role')
      }
    })
  }

  function handleRemoveMember(profileId: string) {
    if (!selectedTeam) return
    setError('')
    startTransition(async () => {
      try {
        await removeTeamMember({ teamId: selectedTeam, profileId })
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to remove member')
      }
    })
  }

  const currentMembers   = activeTeam?.team_members ?? []
  const currentMemberIds = new Set(currentMembers.map((m: any) => m.profile_id))
  const addableMembers   = candidates.filter(m => !currentMemberIds.has(m.profile_id))

  return (
    <div>
    {error && (
      <div className="mb-3 px-3 py-[10px] rounded-lg bg-[#FCEBEB] border border-[#F7C1C1] text-[13px] text-[#A32D2D] flex items-center justify-between gap-2">
        <span><i className="ti ti-alert-triangle text-[14px] mr-[6px]" aria-hidden="true" />{error}</span>
        <button onClick={() => setError('')} aria-label="Dismiss" className="border-none bg-transparent cursor-pointer text-[#A32D2D] text-[14px]">
          <i className="ti ti-x" aria-hidden="true" />
        </button>
      </div>
    )}
    <div className="grid gap-4 grid-cols-1 md:grid-cols-[220px_1fr]">

      {/* Teams sidebar */}
      <div>
        <div className="border border-border rounded-[12px] overflow-hidden bg-white">
          <div className="px-3 py-[10px] border-b border-border bg-muted text-[12px] font-medium text-muted-foreground flex items-center justify-between">
            Teams
            {canCreateTeams && (
              <button
                onClick={() => setCreating(v => !v)}
                className="w-5 h-5 rounded-[4px] border-none bg-transparent cursor-pointer text-muted-foreground flex items-center justify-center text-[14px]"
                aria-label="New team"
              >
                <i className="ti ti-plus" aria-hidden="true" />
              </button>
            )}
          </div>

          {creating && (
            <div className="p-2 border-b border-border">
              <input
                value={newTeamName}
                onChange={e => setNewTeamName(e.target.value)}
                placeholder="Team name..."
                onKeyDown={e => { if (e.key === 'Enter') handleCreateTeam(); if (e.key === 'Escape') setCreating(false) }}
                autoFocus
                className="w-full text-[12px] py-[5px] px-2 border border-border rounded-[6px] bg-background text-foreground"
              />
              <div className="flex gap-1 mt-[6px]">
                <button onClick={() => setCreating(false)} className="py-[5px] px-[10px] text-[12px] rounded-[6px] border border-border bg-transparent cursor-pointer text-muted-foreground">Cancel</button>
                <button onClick={handleCreateTeam} disabled={!newTeamName.trim() || isPending} className="py-[5px] px-[10px] text-[12px] rounded-[6px] border-none bg-primary text-white cursor-pointer font-medium">
                  Create
                </button>
              </div>
            </div>
          )}

          {teams.map(team => (
            <button
              key={team.id}
              onClick={() => setSelectedTeam(team.id)}
              className={`flex items-center gap-2 w-full py-[9px] px-3 border-none cursor-pointer text-left ${selectedTeam === team.id ? 'bg-muted border-l-2 border-l-primary' : 'bg-transparent border-l-2 border-l-transparent'}`}
            >
              <div className="w-2 h-2 rounded-full bg-primary opacity-50 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[13px] text-foreground whitespace-nowrap overflow-hidden text-ellipsis">
                  {team.name}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {team.team_members.length} member{team.team_members.length !== 1 ? 's' : ''}
                </div>
              </div>
            </button>
          ))}

          {teams.length === 0 && !creating && (
            <div className="p-4 text-center text-muted-foreground/70 text-[12px]">
              No teams yet. Create one above.
            </div>
          )}
        </div>
      </div>

      {/* Team detail */}
      {activeTeam ? (
        <div>
          <div className="border border-border rounded-[12px] overflow-hidden mb-3">
            <div className="px-[14px] py-[10px] border-b border-border bg-muted flex items-center justify-between">
              <div>
                <h2 className="text-[14px] font-medium m-0">{activeTeam.name}</h2>
                <p className="text-[11px] text-muted-foreground m-0 mt-[2px]">
                  {currentMembers.length} member{currentMembers.length !== 1 ? 's' : ''}
                </p>
              </div>
              {canCreateTeams && (
                <button
                  onClick={() => handleDeleteTeam(activeTeam.id, activeTeam.name)}
                  disabled={isPending}
                  className="py-[5px] px-[10px] text-[12px] rounded-[8px] border border-border bg-transparent cursor-pointer flex items-center gap-[5px] text-[#993C1D]"
                >
                  <i className="ti ti-trash text-[13px]" aria-hidden="true" />
                  Delete
                </button>
              )}
            </div>

            {/* Current members */}
            <div className="bg-white">
              {currentMembers.map((m: any) => {
                const memberIsAdmin = adminIds.has(m.profile_id)
                const memberIsLead  = m.role === 'lead'
                return (
                <div key={m.profile_id} className="flex items-center gap-[10px] px-[14px] py-[10px] border-b border-border">
                  <Avatar name={m.profiles?.full_name ?? m.profile_id} size={30} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-[6px]">
                      <span className="text-[13px] text-foreground truncate">
                        {m.profiles?.full_name ?? m.profile_id}
                      </span>
                      {memberIsAdmin ? (
                        <span className="text-[10px] px-[6px] py-[1px] rounded-[20px] bg-[#EEEDFE] text-[#534AB7] border border-[#D8D5F5] shrink-0">Admin</span>
                      ) : memberIsLead ? (
                        <span className="text-[10px] px-[6px] py-[1px] rounded-[20px] bg-[#FAEEDA] text-[#854F0B] border border-[#F5E0B8] shrink-0">Lead</span>
                      ) : (
                        <span className="text-[10px] px-[6px] py-[1px] rounded-[20px] bg-muted text-muted-foreground border border-border shrink-0">Member</span>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {m.profiles?.email}
                    </div>
                  </div>
                  <button
                    onClick={() => handleSetRole(m.profile_id, memberIsLead ? 'member' : 'lead')}
                    disabled={isPending}
                    title={memberIsLead ? 'Demote to member' : 'Promote to team lead'}
                    className="py-[4px] px-[8px] text-[11px] rounded-[6px] border border-border bg-transparent cursor-pointer text-muted-foreground hover:text-foreground whitespace-nowrap"
                  >
                    {memberIsLead ? 'Make member' : 'Make lead'}
                  </button>
                  <button
                    onClick={() => handleRemoveMember(m.profile_id)}
                    disabled={isPending}
                    aria-label="Remove member"
                    className="w-[28px] h-[28px] rounded-[6px] border border-border bg-transparent cursor-pointer flex items-center justify-center text-[#993C1D] text-[13px] opacity-60 hover:opacity-100 transition-opacity duration-150 shrink-0"
                  >
                    <i className="ti ti-user-minus" aria-hidden="true" />
                  </button>
                </div>
              )})}
            </div>
          </div>

          {/* Add any registered user (also grants workspace membership) */}
          {addableMembers.length > 0 && (
            <div className="border border-border rounded-[12px] overflow-hidden">
              <div className="px-[14px] py-[10px] border-b border-border bg-muted text-[12px] font-medium text-muted-foreground">
                Add members
              </div>
              {addableMembers.map(m => (
                <div key={m.profile_id} className="flex items-center gap-[10px] px-[14px] py-[9px] border-b border-border">
                  <Avatar name={m.profile?.full_name ?? ''} size={26} />
                  <div className="flex-1">
                    <div className="text-[12px] text-foreground">{m.profile?.full_name}</div>
                    <div className="text-[11px] text-muted-foreground">{m.profile?.email}</div>
                  </div>
                  <button
                    onClick={() => handleAddMember(m.profile_id)}
                    disabled={isPending}
                    className="py-1 px-[10px] text-[11px] rounded-[6px] border border-border bg-transparent cursor-pointer flex items-center gap-1 text-muted-foreground"
                  >
                    <i className="ti ti-plus text-[12px]" aria-hidden="true" />
                    Add
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="border border-dashed border-border rounded-[12px] p-[40px] flex flex-col items-center justify-center gap-[10px] text-muted-foreground/70">
          <i className="ti ti-users-group text-[28px] opacity-40" aria-hidden="true" />
          <p className="text-[13px] m-0">Select a team or create a new one</p>
        </div>
      )}
    </div>
    </div>
  )
}
