'use client'
import { useRef, useState } from 'react'
import { Paperclip, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { uploadFile } from '@/lib/chatApi'

interface FileUploadProps {
  disabled?: boolean
}

type Status = 'idle' | 'uploading' | 'done' | 'error'

export function FileUpload({ disabled }: FileUploadProps) {
  const inputRef       = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('')

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''   // allow re-selecting the same file

    setStatus('uploading')
    setMessage('')
    try {
      const result = await uploadFile(file)
      setStatus('done')
      setMessage(`${result.file_name} is being processed`)
      setTimeout(() => setStatus('idle'), 3000)
    } catch (err: unknown) {
      setStatus('error')
      setMessage((err as Error).message ?? 'Upload failed')
      setTimeout(() => setStatus('idle'), 4000)
    }
  }

  const icon = {
    idle:      <Paperclip size={16} />,
    uploading: <Loader2 size={16} className="animate-spin" />,
    done:      <CheckCircle size={16} className="text-emerald-500" />,
    error:     <AlertCircle size={16} className="text-red-500" />,
  }[status]

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.csv,.txt"
        className="hidden"
        onChange={handleChange}
        disabled={disabled || status === 'uploading'}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || status === 'uploading'}
        title={message || 'Attach file (PDF, DOCX, CSV, TXT — max 20 MB)'}
        className={cn(
          'flex items-center justify-center w-8 h-8 rounded-lg transition-colors',
          'text-slate-400 dark:text-neutral-500',
          'hover:text-slate-600 dark:hover:text-neutral-300',
          'hover:bg-slate-100 dark:hover:bg-neutral-700',
          (disabled || status === 'uploading') && 'opacity-50 cursor-not-allowed',
        )}
      >
        {icon}
      </button>

      {/* Status tooltip */}
      {message && status !== 'idle' && (
        <div className={cn(
          'absolute bottom-full left-1/2 -translate-x-1/2 mb-2',
          'text-xs px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-md',
          status === 'error'
            ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
            : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
        )}>
          {message}
        </div>
      )}
    </div>
  )
}
