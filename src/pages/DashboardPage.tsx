import React from 'react'
import { ParticipantDashboard } from '../components/user/ParticipantDashboard'
import { UserNavigation } from '../components/user/UserNavigation'

export function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <UserNavigation />

      {/* Main Content */}
      <main>
        <ParticipantDashboard />
      </main>
    </div>
  )
}