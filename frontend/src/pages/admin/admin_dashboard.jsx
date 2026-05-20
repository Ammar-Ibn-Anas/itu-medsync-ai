import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '../../services/api_client'
import { FileText, Search, Activity, Bell } from 'lucide-react'

export default function AdminDashboard() {
  return (
    <div className="min-h-screen bg-background dark:bg-surface p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold font-sora">Admin Dashboard</h1>
          <Link to="/admin/documents/upload" className="bg-primary text-primary-foreground px-4 py-2 rounded shadow hover:bg-primary/90">
            + Upload Document
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatCard icon={<FileText />} title="Total Documents" value="-" />
          <StatCard icon={<Search />} title="Indexed Chunks" value="-" />
          <StatCard icon={<Activity />} title="Pending Audit" value="-" />
          <StatCard icon={<Bell />} title="Notifications" value="-" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
          <div className="border border-border rounded-lg p-6 bg-white dark:bg-surface/50 shadow-sm">
            <h2 className="text-xl font-bold mb-4 font-sora">Recent Activity</h2>
            <p className="text-gray-500 text-sm">No recent activity.</p>
          </div>
          <div className="border border-border rounded-lg p-6 bg-white dark:bg-surface/50 shadow-sm">
            <h2 className="text-xl font-bold mb-4 font-sora flex items-center gap-2">
              <span className="text-danger">●</span> Needs Attention
            </h2>
            <p className="text-gray-500 text-sm">No documents have pending drift contradictions.</p>
          </div>
        </div>
        
        <div className="flex gap-4">
            <Link to="/admin/documents" className="text-primary hover:underline">Manage Documents →</Link>
            <Link to="/admin/categories" className="text-primary hover:underline">Manage Categories →</Link>
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, title, value }) {
  return (
    <div className="border border-border p-6 rounded-lg bg-white dark:bg-surface/50 shadow-sm flex items-center gap-4">
      <div className="p-3 bg-primary/10 text-primary rounded-full">
        {icon}
      </div>
      <div>
        <h3 className="text-sm font-medium text-gray-500">{title}</h3>
        <p className="text-2xl font-bold">{value}</p>
      </div>
    </div>
  )
}
