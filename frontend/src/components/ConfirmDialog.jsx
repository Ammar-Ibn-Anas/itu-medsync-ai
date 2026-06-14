import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { cn } from './shared';

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  variant = "warning", // 'warning' | 'danger'
  requireTyping = null // string to type for confirmation
}) {
  const [inputValue, setInputValue] = useState('');

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (requireTyping && inputValue !== requireTyping) return;
    onConfirm();
    setInputValue('');
  };

  const handleCancel = () => {
    onCancel();
    setInputValue('');
  };

  const isDanger = variant === 'danger';
  const isValid = requireTyping ? inputValue === requireTyping : true;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm fade-in">
      <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl max-w-md w-full overflow-hidden slide-up">
        <div className={cn(
          "px-6 py-4 border-b flex items-center gap-3",
          isDanger ? "border-rose-500/30 bg-rose-500/10" : "border-amber-500/30 bg-amber-500/10"
        )}>
          <div className={cn(
            "p-2 rounded-full",
            isDanger ? "bg-rose-500/20 text-rose-400" : "bg-amber-500/20 text-amber-400"
          )}>
            <AlertTriangle className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-white">{title}</h3>
          <button 
            onClick={handleCancel}
            className="ml-auto text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6">
          <p className="text-slate-300 mb-6">{message}</p>
          
          {requireTyping && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-400 mb-2">
                Type <strong className="text-white select-all">{requireTyping}</strong> to confirm:
              </label>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-rose-500 transition-shadow"
                placeholder={requireTyping}
              />
            </div>
          )}
          
          <div className="flex gap-3 justify-end">
            <button
              onClick={handleCancel}
              className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-700 hover:text-white transition-colors font-medium"
            >
              {cancelText}
            </button>
            <button
              onClick={handleConfirm}
              disabled={!isValid}
              className={cn(
                "px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
                isDanger 
                  ? "bg-rose-600 hover:bg-rose-500 text-white" 
                  : "bg-amber-600 hover:bg-amber-500 text-white"
              )}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
