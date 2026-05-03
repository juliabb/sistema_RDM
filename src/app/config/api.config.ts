// src/app/config/api.config.ts
/* Configurações centralizadas da API */
import { ApplicationConfig } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';

// Constantes básicas
// export const API_BASE_URL = 'https://apirdmhml.saude.sp.gov.br';
export const API_BASE_URL = 'https://localhost:7277';

export const appConfig: ApplicationConfig = {
  providers: [provideHttpClient()],
};

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
  ADMIN_USERS_PENDING: '/api/Admin/Users/Pending',
  USER_PROFILE: '/api/User/get-profile',
  USER_CHANGE_PASSWORD: '/api/User/change-password',

  // Administração
  ADMIN_LIST_USERS: '/api/Admin/List-Users',
  ADMIN_GET_USER: (search: string) => `/api/Admin/GetUser/${encodeURIComponent(search)}`,
  ADMIN_APPROVE_USER: (email: string) => `/api/Admin/approve/${encodeURIComponent(email)}`,
  ADMIN_RESET_PASSWORD: (email: string) => `/api/Admin/reset-password/${encodeURIComponent(email)}`,
  ADMIN_CHANGE_ROLE: (email: string) => `/api/Admin/change-role/${encodeURIComponent(email)}`,
  ADMIN_UPDATE_USER: (email: string) => `/api/Admin/Update/User/${encodeURIComponent(email)}`,

  // Admin - RDMs
  ADMIN_RDM_PENDING: '/api/Admin/rdm-pending',
  ADMIN_GET_ALL_USERS: '/api/Admin/Get-RDM-all-users',
  ADMIN_GET_TICKET_ALLUSERS: (ticket: string) => `/api/Admin/Get-ticket-allusers/${ticket}`,
  ADMIN_RDM_APPROVE: (ticket: string) => `/api/Admin/rdm-approve/${ticket}`,
  ADMIN_ATTACHMENTS: (ticket: string) => `/api/Admin/Attachments/Admin/${ticket}`,
  UPDATE_RESULT: (ticket: string) => `/api/Admin/Update/Result/${ticket}`,
  ADMIN_RDM_VALIDATION: '/api/Admin/RDM/Validation',
  ADMIN_RDM_REPORT: (startDate: string, endDate: string) =>
    `/api/Admin/RDM/Amount/${startDate}/${endDate}`,
  ADMIN_SYSTEM_REPORT: (startDate: string, endDate: string) =>
    `/api/Admin/RDM/Services/${startDate}/${endDate}`,

  // RDM
  RDM_BASE: '/api/RDM',
  RDM_LOGGED_USER: '/api/RDM/Logged-user',
  RDM_BY_ID: (ticketId: string) => `/api/RDM/${ticketId}`,
  RDM_SHORT: (ticket: string) => `/api/RDM/ticket-short/${ticket}`,
  RDM_ATTACHMENTS: (ticket: string) => `/api/RDM/Attachments/${ticket}`,
  RDM_EXCEL: (startDate: string, endDate: string) => `/Admin/Report/Excel/${startDate}/${endDate}`,
  RDM_CANCEL: (ticket: string) => `/api/RDM/Cancel/${ticket}`,

  // Relatórios
  REPORT_BASE: '/api/Report',
  REPORT_BY_TICKET: (ticket: string) => `/api/Report?ticket=${ticket}`,

  // Notificações
  NOTIFICATION_BASE: '/api/Notification',
  NOTIFICATION_MARK_READ: (id: number) => `/api/Notification/Read/${id}`,

  //SystemService
  SYSTEM_BASE: '/api/SystemService',
  SYSTEM_GET_ALL: '/api/SystemService',
  SYSTEM_PAGINATION: '/api/SystemService/SystemServices/Pagination',
  SYSTEM_GET_BY_NAME: (name: string) => `/api/SystemService/${encodeURIComponent(name)}`,
  SYSTEM_CREATE: '/api/SystemService',
  SYSTEM_UPDATE: (name: string) => `/api/SystemService/Update/${encodeURIComponent(name)}`,
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
