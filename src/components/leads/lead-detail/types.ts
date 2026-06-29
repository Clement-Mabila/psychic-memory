export type LeadTab = 'overview' | 'contacts' | 'scores' | 'details' | 'activity'

export type Draft = {
  company_name: string
  domain: string
  vertical: string
  lifecycle_stage: string
  hq_city: string
  hq_state: string
  hq_country: string
  hq_phone: string
  employee_count: string
  revenue_range: string
  currency: string
  qualification_summary: string
}

export interface LeadDetailModalProps {
  leadId: string
  onClose: () => void
  onRun: (id: string) => void
  onRerun: (id: string, from: string) => void
  onRunOnly: (id: string, agentType: string) => void
}
