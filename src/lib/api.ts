import axios, { type AxiosInstance } from 'axios'
import Cookies from 'js-cookie'

const BASE = '/api/console'

const api: AxiosInstance = axios.create({ baseURL: BASE })

// Attach access token to every request
api.interceptors.request.use(config => {
  const token = Cookies.get('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Auto-refresh on 401
api.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const refresh = Cookies.get('refresh_token')
        if (!refresh) throw new Error('No refresh token')
        const { data } = await axios.post(`${BASE}/auth/token/refresh`, { refresh })
        Cookies.set('access_token', data.access, { secure: IS_HTTPS, sameSite: 'lax' })
        original.headers.Authorization = `Bearer ${data.access}`
        return api(original)
      } catch {
        Cookies.remove('access_token')
        Cookies.remove('refresh_token')
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)

export default api

// ── Auth ──────────────────────────────────────────────────────────────────
const IS_HTTPS = typeof window !== 'undefined' && window.location.protocol === 'https:'

export const whoami = () => api.get('/auth/whoami').then(r => r.data)

export async function login(username: string, password: string) {
  const { data } = await axios.post(`${BASE}/auth/token`, { username, password })
  Cookies.set('access_token',  data.access,  { secure: IS_HTTPS, sameSite: 'lax' })
  Cookies.set('refresh_token', data.refresh, { secure: IS_HTTPS, sameSite: 'lax', expires: 7 })
  return data
}

export function logout() {
  Cookies.remove('access_token')
  Cookies.remove('refresh_token')
  window.location.href = '/login'
}

export function isAuthenticated() {
  return !!Cookies.get('access_token')
}

// ── Leads ─────────────────────────────────────────────────────────────────
export const leadApi = {
  getDetail:      (id: string)                            => api.get(`/leads/${id}`).then(r => r.data),
  update:         (id: string, data: Record<string, any>) => api.patch(`/leads/${id}/update`, data).then(r => r.data),
  getFavorites:   ()            => api.get('/leads/favorites').then(r => r.data),
  getBookmarks:   ()            => api.get('/leads/bookmarks').then(r => r.data),
  toggleFavorite: (id: string)  => api.post(`/leads/${id}/favorite`).then(r => r.data),
  toggleBookmark: (id: string)  => api.post(`/leads/${id}/bookmark`).then(r => r.data),
}

// ── Vault ──────────────────────────────────────────────────────────────────
export const vaultApi = {
  getStats:    () => api.get('/vault/stats').then(r => r.data),
  getRecords:  (params?: any) => api.get('/vault/records', { params }).then(r => r.data),
  getRecord:   (id: string)   => api.get(`/vault/records/${id}`).then(r => r.data),

  getErasureRequests:    (params?: any) => api.get('/vault/erasure-requests', { params }).then(r => r.data),
  submitErasureRequest:  (body: any)    => api.post('/vault/erasure-requests/submit', body).then(r => r.data),
  approveErasureRequest: (id: string)   => api.post(`/vault/erasure-requests/${id}/approve`).then(r => r.data),
  completeErasureRequest: (id: string, stepUpToken: string) =>
    api.post(`/vault/erasure-requests/${id}/complete`, {}, { headers: { 'X-Step-Up-Token': stepUpToken } }).then(r => r.data),
  rejectErasureRequest: (id: string, reason: string) =>
    api.post(`/vault/erasure-requests/${id}/reject`, { reason }).then(r => r.data),

  getRetentionPolicies:   () => api.get('/vault/retention-policies').then(r => r.data),
  updateRetentionPolicy:  (record_type: string, body: any) =>
    api.put(`/vault/retention-policies/${record_type}`, body).then(r => r.data),

  // Companies dataset
  getCompanies: (params?: { page?: number; search?: string; vertical?: string; priority_tier?: string; lifecycle_stage?: string }) =>
    api.get('/vault/companies', { params }).then(r => r.data),

  // LinkedIn profiles dataset
  getLinkedInProfiles: (params?: { page?: number; search?: string; tier?: string }) =>
    api.get('/vault/identities', { params: { has_linkedin: 'true', ...params } }).then(r => r.data),

  // Phone numbers dataset
  getPhoneProfiles: (params?: { page?: number; search?: string; tier?: string }) =>
    api.get('/vault/identities', { params: { has_phone: 'true', ...params } }).then(r => r.data),

  // Identity resolution
  getCollections:     ()              => api.get('/vault/identities/collections').then(r => r.data),
  getIdentities:      (params?: any)  => api.get('/vault/identities', { params }).then(r => r.data),
  getIdentity:        (id: string)    => api.get(`/vault/identities/${id}`).then(r => r.data),
  getSyncStatus:      ()              => api.get('/vault/sync/status').then(r => r.data),
  triggerSync:        ()              => api.post('/vault/sync/trigger').then(r => r.data),
  exportIdentities: async (params?: { tier?: string; search?: string }) => {
    const p: Record<string, string> = {}
    if (params?.tier)   p.tier   = params.tier
    if (params?.search) p.search = params.search
    const res = await api.get('/vault/identities/export', { params: p, responseType: 'blob' })
    const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `mbody_identities_${params?.tier ?? 'all'}.csv`
    a.click()
    URL.revokeObjectURL(url)
  },
}

// ── Security ───────────────────────────────────────────────────────────────
export const securityApi = {
  getMe:             () => api.get('/security/me').then(r => r.data),
  getSessions:       () => api.get('/security/sessions').then(r => r.data),
  revokeAllSessions: () => api.post('/security/sessions/revoke-all').then(r => r.data),
  getAuditLog:       (params?: any) => api.get('/security/audit-log', { params }).then(r => r.data),
  getUsers:          (params?: any) => api.get('/security/users', { params }).then(r => r.data),
  getRoles:          () => api.get('/security/roles').then(r => r.data),
  assignRole:        (userId: number, roleId: number) =>
    api.post(`/security/users/${userId}/role`, { role_id: roleId }).then(r => r.data),
  getPermissionLog:  (params?: any) => api.get('/security/permission-log', { params }).then(r => r.data),

  getMfaStatus:  () => api.get('/auth/mfa/status').then(r => r.data),
  setupMfa:      () => api.post('/auth/mfa/setup').then(r => r.data),
  confirmMfa:    (code: string) => api.post('/auth/mfa/confirm', { code }).then(r => r.data),
  disableMfa:    (code: string) => api.delete('/auth/mfa/disable', { data: { code } }).then(r => r.data),
  requestStepUp: (code: string) => api.post('/auth/step-up', { code }).then(r => r.data),
}
