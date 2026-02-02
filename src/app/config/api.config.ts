// src/app/config/api.config.ts
/* Configurações centralizadas da API */

// Constantes básicas
export const API_BASE_URL = 'http://192.168.1.68:8080';

// Endpoints públicos
export const PUBLIC_ENDPOINTS = [
  { url: '/api/Login', methods: ['POST', 'OPTIONS'] },
  { url: '/api/User', methods: ['POST'] },
] as const;

// Paths das APIs
export const API_PATHS = {
  // Autenticação
  LOGIN: '/api/Login',
  REGISTER: '/api/User',

  // Usuário
  USER_BASE: '/api/User',
  USER_PROFILE: '/api/User/get-profile',
  USER_CHANGE_PASSWORD: '/api/User/change-password',

  // Administração
  ADMIN_BASE: '/api/Admin',
  ADMIN_LIST_USERS: '/api/Admin/List-Users',
  ADMIN_GET_USER: (search: string) => `/api/Admin/GetUser/${encodeURIComponent(search)}`,
  ADMIN_APPROVE_USER: (email: string) => `/api/Admin/approve/${encodeURIComponent(email)}`,
  ADMIN_RESET_PASSWORD: (email: string) => `/api/Admin/reset-password/${encodeURIComponent(email)}`,
  ADMIN_CHANGE_ROLE: (email: string) => `/api/Admin/change-role/${encodeURIComponent(email)}`,

  // Admin - RDMs
  ADMIN_RDM_PENDING: '/api/Admin/rdm-pending',
  ADMIN_GET_ALL_USERS: '/api/Admin/Get-all-users',
  ADMIN_GET_TICKET_ALLUSERS: (ticket: string) => `/api/Admin/Get-ticket-allusers/${ticket}`,
  ADMIN_RDM_APPROVE: (ticket: string) => `/api/Admin/rdm-approve/${ticket}`,

  // RDM
  RDM_BASE: '/api/RDM',
  RDM_LOGGED_USER: '/api/RDM/Logged-user',
  RDM_BY_ID: (ticketId: string) => `/api/RDM/${ticketId}`,
  RDM_SHORT: (ticket: string) => `/api/RDM/ticket-short/${ticket}`,
  RDM_ATTACHMENTS: (ticket: string) => `/api/RDM/Attachments/${ticket}`,

  // Relatórios
  REPORT_BASE: '/api/Report',
  REPORT_BY_TICKET: (ticket: string) => `/api/Report?ticket=${ticket}`,
} as const;

// Funções auxiliares
export function buildApiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

export function isPublicEndpoint(url: string, method: string): boolean {
  return PUBLIC_ENDPOINTS.some((endpoint) => {
    const urlMatches = url.includes(endpoint.url);
    const methodMatches = endpoint.methods.includes(method as any);
    return urlMatches && methodMatches;
  });
}
