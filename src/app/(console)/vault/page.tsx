'use client'

import { useState } from 'react'
import {
  VaultLanding,
  CollectionDetail,
  CompaniesCollection,
  LinkedInCollection,
  PhoneCollection,
  IdentityCard,
  ComplianceView,
} from '@/components/vault'

type VaultView = 'landing' | 'collection' | 'identity' | 'compliance'

export default function VaultPage() {
  const [view,     setView]     = useState<VaultView>('landing')
  const [tier,     setTier]     = useState<string | null>(null)
  const [personId, setPersonId] = useState<string | null>(null)

  // ── Level 2: single identity ──────────────────────────────────────────────
  if (view === 'identity' && personId) {
    return (
      <div className="p-6 max-w-5xl">
        <IdentityCard
          personId={personId}
          onBack={() => { setView('collection'); setPersonId(null) }}
        />
      </div>
    )
  }

  // ── Level 1: companies dataset ───────────────────────────────────────────
  if (view === 'collection' && tier === 'companies') {
    return (
      <CompaniesCollection
        onBack={() => { setView('landing'); setTier(null) }}
      />
    )
  }

  // ── Level 1: LinkedIn profiles dataset ───────────────────────────────────
  if (view === 'collection' && tier === 'linkedin') {
    return (
      <LinkedInCollection
        onBack={() => { setView('landing'); setTier(null) }}
        onSelectIdentity={id => { setPersonId(id); setView('identity') }}
      />
    )
  }

  // ── Level 1: Phone numbers dataset ───────────────────────────────────────
  if (view === 'collection' && tier === 'phones') {
    return (
      <PhoneCollection
        onBack={() => { setView('landing'); setTier(null) }}
        onSelectIdentity={id => { setPersonId(id); setView('identity') }}
      />
    )
  }

  // ── Level 1: identity collection detail ──────────────────────────────────
  if (view === 'collection' && tier) {
    return (
      <CollectionDetail
        tier={tier}
        onBack={() => { setView('landing'); setTier(null) }}
        onSelectIdentity={id => { setPersonId(id); setView('identity') }}
      />
    )
  }

  // ── Compliance sidebar ────────────────────────────────────────────────────
  if (view === 'compliance') {
    return (
      <div className="p-6 max-w-5xl">
        <ComplianceView onBack={() => setView('landing')} />
      </div>
    )
  }

  // ── Level 0: landing ──────────────────────────────────────────────────────
  return (
    <VaultLanding
      onSelectCollection={t => { setTier(t); setView('collection') }}
      onOpenCompliance={() => setView('compliance')}
    />
  )
}
