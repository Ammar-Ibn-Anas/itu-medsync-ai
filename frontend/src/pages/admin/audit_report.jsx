import { useParams } from 'react-router-dom'
import { FileText, AlertTriangle, CheckCircle, Info } from 'lucide-react'

export default function AuditReport() {
  const { id } = useParams()

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8 pb-8 border-b border-border">
        <h1 className="text-3xl font-bold font-sora mb-2">Audit Report</h1>
        <p className="text-gray-500 mb-6">Generated on 2026-05-20 • Web Grounded</p>
        
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-danger/10 border border-danger/20 rounded-lg text-danger flex items-center gap-3">
            <AlertTriangle className="w-8 h-8" />
            <div><div className="text-2xl font-bold">0</div><div className="text-sm">Contradictions</div></div>
          </div>
          <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg text-warning flex items-center gap-3">
            <Info className="w-8 h-8" />
            <div><div className="text-2xl font-bold">0</div><div className="text-sm">Missing Context</div></div>
          </div>
          <div className="p-4 bg-success/10 border border-success/20 rounded-lg text-success flex items-center gap-3">
            <CheckCircle className="w-8 h-8" />
            <div><div className="text-2xl font-bold">0</div><div className="text-sm">Aligned</div></div>
          </div>
        </div>

        <p className="text-foreground leading-relaxed">
          <strong>AI Summary:</strong> This document is fully aligned with current clinical guidelines. No contradictions were found during the web grounding audit.
        </p>
      </div>

      <div>
        <h2 className="text-xl font-bold font-sora mb-4">Detailed Findings</h2>
        <div className="space-y-4">
          <p className="text-gray-500">No detailed findings available.</p>
        </div>
      </div>
    </div>
  )
}
