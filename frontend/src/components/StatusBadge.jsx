import React from 'react';
import { cn } from './shared';
import { 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  RefreshCw, 
  XCircle,
  ShieldCheck
} from 'lucide-react';

export default function StatusBadge({ status, className }) {
  const config = {
    'OK': {
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-400',
      border: 'border-emerald-500/20',
      icon: ShieldCheck,
      label: 'Verified OK'
    },
    'REQUIRES_ATTENTION': {
      bg: 'bg-amber-500/10',
      text: 'text-amber-400',
      border: 'border-amber-500/20',
      icon: AlertTriangle,
      label: 'Needs Attention',
      pulse: true
    },
    'OUTDATED': {
      bg: 'bg-rose-500/10',
      text: 'text-rose-400',
      border: 'border-rose-500/20',
      icon: Clock,
      label: 'Outdated'
    },
    'FIXED': {
      bg: 'bg-blue-500/10',
      text: 'text-blue-400',
      border: 'border-blue-500/20',
      icon: CheckCircle2,
      label: 'Resolved'
    },
    'PROCESSING': {
      bg: 'bg-slate-500/10',
      text: 'text-slate-400',
      border: 'border-slate-500/20',
      icon: RefreshCw,
      label: 'Processing',
      spin: true
    },
    'INDEXED': {
      bg: 'bg-teal-500/10',
      text: 'text-teal-400',
      border: 'border-teal-500/20',
      icon: CheckCircle2,
      label: 'Indexed'
    },
    'FAILED': {
      bg: 'bg-rose-500/10',
      text: 'text-rose-400',
      border: 'border-rose-500/20',
      icon: XCircle,
      label: 'Failed'
    }
  };

  const style = config[status] || {
    bg: 'bg-slate-500/10',
    text: 'text-slate-400',
    border: 'border-slate-500/20',
    icon: AlertTriangle,
    label: status
  };

  const Icon = style.icon;

  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border",
      style.bg, style.text, style.border, className
    )}>
      <Icon className={cn(
        "w-3.5 h-3.5",
        style.spin && "animate-spin",
        style.pulse && "animate-pulse"
      )} />
      {style.label}
    </span>
  );
}
