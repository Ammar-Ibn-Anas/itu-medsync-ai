import { useParams } from 'react-router-dom'
import { Bookmark, Clock } from 'lucide-react'

export default function DocumentReader() {
  const { id } = useParams()

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Sidebar Outline */}
      <div className="w-full md:w-64 border-r border-border bg-white dark:bg-surface/50 p-6 hidden md:block overflow-y-auto h-screen sticky top-0">
        <h3 className="font-bold font-sora mb-4 text-sm text-gray-500 uppercase tracking-wider">Outline</h3>
        <ul className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
          <li className="text-primary font-medium hover:underline cursor-pointer">1. Introduction</li>
          <li className="hover:text-primary transition cursor-pointer">2. Diagnostic Criteria</li>
          <li className="hover:text-primary transition cursor-pointer">3. Treatment Pathways</li>
        </ul>
      </div>

      {/* Main Content */}
      <div className="flex-1 max-w-4xl px-8 py-12 mx-auto w-full">
        <div className="mb-12">
          <div className="flex justify-between items-start mb-4">
            <h1 className="text-4xl font-bold font-sora leading-tight">Heart Failure Guidelines 2026</h1>
            <button className="p-2 border border-border rounded text-gray-500 hover:text-primary hover:border-primary transition">
              <Bookmark className="w-5 h-5" />
            </button>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span className="bg-primary/10 text-primary px-2 py-1 rounded">Cardiology</span>
            <span className="flex items-center gap-1"><Clock className="w-4 h-4"/> Last verified: 2 days ago</span>
          </div>
        </div>

        <div className="prose prose-lg dark:prose-invert max-w-none">
          <p className="lead">
            This document outlines the standard clinical pathways for managing heart failure...
          </p>
          <p>
            Loading content...
          </p>
        </div>
      </div>
    </div>
  )
}
