'use client'

import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'

interface PopoverProps {
  trigger: React.ReactNode
  children: React.ReactNode
  /** Which edge of the trigger to anchor the popover to horizontally */
  align?: 'left' | 'right'
  /** Gap in px between trigger and popover */
  gap?: number
}

/**
 * Hover popover that renders into document.body via a portal — escapes
 * card overflow and stacking contexts completely.
 *
 * A small close delay (80ms) lets the mouse move from trigger → content
 * without the popover flickering away.
 */
export function Popover({ trigger, children, align = 'left', gap = 8 }: PopoverProps) {
  const [open, setOpen]   = useState(false)
  const [rect, setRect]   = useState<DOMRect | null>(null)
  const triggerRef        = useRef<HTMLDivElement>(null)
  const closeTimer        = useRef<ReturnType<typeof setTimeout> | null>(null)

  const cancelClose = () => {
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null }
  }

  const scheduleClose = () => {
    closeTimer.current = setTimeout(() => setOpen(false), 80)
  }

  const open_ = () => {
    cancelClose()
    if (triggerRef.current) setRect(triggerRef.current.getBoundingClientRect())
    setOpen(true)
  }

  const style: React.CSSProperties = rect ? {
    position:  'fixed',
    zIndex:    9999,
    top:       rect.top - gap,
    left:      align === 'left' ? rect.left : rect.right,
    transform: align === 'left'
      ? 'translateY(-100%)'
      : 'translateX(-100%) translateY(-100%)',
  } : { display: 'none' }

  return (
    <>
      <div ref={triggerRef} onMouseEnter={open_} onMouseLeave={scheduleClose}>
        {trigger}
      </div>

      {open && rect && createPortal(
        <div style={style} onMouseEnter={cancelClose} onMouseLeave={scheduleClose}>
          {children}
        </div>,
        document.body,
      )}
    </>
  )
}
