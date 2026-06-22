export interface Contact {
  id: string
  lead_id: string
  lead_name: string | null
  lead_domain: string | null
  name: string
  title: string
  department: string | null
  buying_role: string
  priority_rank: number
  email: string | null
  email_confidence: string
  email_verified: boolean
  verification_tier: string
  verified_with_zerobounce: boolean
  zb_verified_at: string | null
  ai_inferred_email: string | null
  ai_inferred_email_status: string
  phone: string | null
  linkedin_url: string | null
  outreach_status: string
  resolvable: boolean
  zb_verifiable: boolean
  modified: string | null
}

export interface ContactsResponse {
  contacts: Contact[]
  total: number
  page: number
  total_pages: number
}

export interface GeneratedEmailData {
  id: string
  subject: string
  body: string
  status: string
  model_used: string
  created: string | null
  contact_id: string
  contact_name: string
  contact_title: string
  contact_buying_role: string
  contact_email: string
  contact_email_count: number
  lead_id: string
  company_name: string
  company_domain: string
}

export interface EmailsResponse {
  emails: GeneratedEmailData[]
  total: number
  page: number
  total_pages: number
}

export interface FiltersState {
  tierFilter: string
  resolvableOnly: boolean
  zbUnverified: boolean
  company: string
  domain: string
  topN: string
}

export type SortField = 'name' | 'company' | 'role' | 'modified' | null
export type SortDir   = 'asc' | 'desc'
export type GenPhase  = 'idle' | 'thinking' | 'content' | 'preview' | 'saving'
export type RowAction = 'idle' | 'finding' | 'verifying' | 'done' | 'failed'
