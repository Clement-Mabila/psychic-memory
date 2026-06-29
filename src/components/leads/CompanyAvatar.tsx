'use client'

import { useState } from 'react'

const COLORS = [
  'bg-indigo-500', 'bg-violet-500', 'bg-rose-500', 'bg-amber-500',
  'bg-emerald-500', 'bg-sky-500', 'bg-pink-500', 'bg-teal-500',
]

function colorForDomain(domain: string) {
  let hash = 0
  for (let i = 0; i < domain.length; i++) hash = domain.charCodeAt(i) + ((hash << 5) - hash)
  return COLORS[Math.abs(hash) % COLORS.length]
}

interface CompanyAvatarProps {
  domain: string
  name: string
  size?: 'sm' | 'md' | 'lg' | 'xxs' | 'xs'
  circle?: boolean
}

const SIZE = {
  xxs: 'w-5 h-5 text-[10px]',
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
}
const IMG_SIZE = { xxs: 16, xs: 24, sm: 32, md: 40, lg: 48 }

export default function CompanyAvatar({ domain, name, size = 'md', circle = false }: CompanyAvatarProps) {
  const [src, setSrc] = useState(`https://logo.clearbit.com/${domain}`)
  const [triedFavicon, setTriedFavicon] = useState(false)
  const [failed, setFailed] = useState(false)

  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('')

  const px = IMG_SIZE[size]

  const roundClass = circle ? 'rounded-full' : 'rounded-xl'

  if (failed) {
    return (
      <div className={`${SIZE[size]} ${colorForDomain(domain)} ${roundClass} flex items-center justify-center flex-shrink-0 ring-1 ring-stone-300 dark:ring-stone-600`}>
        <span className="text-white font-semibold leading-none">{initials}</span>
      </div>
    )
  }

  return (
    <div className={`${SIZE[size]} ${roundClass} overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-zinc-800 ring-1 ring-stone-300 dark:ring-stone-600`}>
      <img
        src={src}
        alt={name}
        width={px}
        height={px}
        className="w-full h-full object-contain"
        onError={() => {
          if (!triedFavicon) {
            setTriedFavicon(true)
            setSrc(`https://www.google.com/s2/favicons?domain=${domain}&sz=64`)
          } else {
            setFailed(true)
          }
        }}
      />
    </div>
  )
}
