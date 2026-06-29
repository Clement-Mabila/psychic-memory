const SIZE_PX: Record<string, number> = {
  xxxs:  20,
  xs:    28,
  sm:    32,
  md:    36,
  lg:    40,
  xl:    56,
  '2xl': 100,
}

const SIZE_CLASS: Record<string, string> = {
  xxxs:  'w-5 h-5',
  xs:    'w-7 h-7',
  sm:    'w-8 h-8',
  md:    'w-9 h-9',
  lg:    'w-10 h-10',
  xl:    'w-14 h-14',
  '2xl': 'w-[100px] h-[100px]',
}

const BG_COLORS    = '0a5b83,1c799f,69d2e7,f1f4dc,f88c49'
const SHAPE_COLORS = '0a5b83,1c799f,69d2e7,f1f4dc,f88c49'

export type AvatarSize = 'xxxs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'

export function Avatar({
  name,
  email,
  size = 'md',
  square = false,
  className = '',
}: {
  name?:      string | null
  email?:     string | null
  size?:      AvatarSize
  square?:    boolean
  className?: string
}) {
  const seed = encodeURIComponent(name || email || 'User')
  const px   = SIZE_PX[size] ?? SIZE_PX.md

  const src = [
    'https://api.dicebear.com/9.x/shapes/svg',
    `?seed=${seed}`,
    `&size=${px * 2}`,
    `&backgroundColor=${BG_COLORS}`,
    `&backgroundType=solid`,
    `&scale=120`,
    `&shape1Color=${SHAPE_COLORS}`,
    `&shape2Color=${SHAPE_COLORS}`,
    `&shape3Color=${SHAPE_COLORS}`,
    `&clip=true`,
    `&randomizeIds=true`,
  ].join('')

  const roundClass = square ? 'rounded-lg' : 'rounded-full'
  const sizeClass  = SIZE_CLASS[size] ?? SIZE_CLASS.md

  return (
    <div className={`flex-shrink-0 overflow-hidden ${sizeClass} ${roundClass} ${className}`}>
      <img
        src={src}
        alt={name || 'Avatar'}
        width={px}
        height={px}
        className="block w-full h-full"
      />
    </div>
  )
}
