import { Injectable } from '@angular/core';
import {
  HttpEvent,
  HttpHandler,
  HttpHeaders,
  HttpInterceptor,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import { API_BASE_URL } from '../config/api.config';

const DEMO_EMAIL = 'teste@teste.com';
const DEMO_PASSWORD = 'Password@123';
const STORAGE_KEY = 'rdm_demo_database_v1';

const initialDatabase = {
  users: [
    { name: 'Usuário de Teste', email: DEMO_EMAIL, department: 'Tecnologia da Informação', situation: 'Aprovado', role: 'administrador', registrationDate: '12/08/2026' },
    { name: 'Mariana Costa', email: 'mariana.costa@empresa.com', department: 'Infraestrutura', situation: 'Aprovado', role: 'teamMember', registrationDate: '03/08/2026' },
    { name: 'Rafael Almeida', email: 'rafael.almeida@empresa.com', department: 'Segurança da Informação', situation: 'Aprovado', role: 'teamMember', registrationDate: '28/07/2026' },
    { name: 'Camila Souza', email: 'camila.souza@empresa.com', department: 'Sistemas', situation: 'Pendente', role: 'teamMember', registrationDate: '21/08/2026' },
    { name: 'Bruno Lima', email: 'bruno.lima@empresa.com', department: 'Service Desk', situation: 'Desativado', role: 'teamMember', registrationDate: '15/06/2026' },
  ],
  systems: [
    { systemService: 'Portal Institucional', department: 'Sistemas', status: 'Ativo' },
    { systemService: 'ERP Corporativo', department: 'Sistemas', status: 'Ativo' },
    { systemService: 'Microsoft 365', department: 'Infraestrutura', status: 'Ativo' },
    { systemService: 'Firewall Perimetral', department: 'Segurança da Informação', status: 'Ativo' },
    { systemService: 'Sistema Legado RH', department: 'Recursos Humanos', status: 'Inativo' },
  ],
  rdms: [
    createRdm('RDM-2026-1042', 'Atualização do portal institucional', 'Aprovado', 'Normal', 'Usuário de Teste', '25-08-2026 13:30', 'Portal Institucional', 'Sistemas'),
    createRdm('RDM-2026-1038', 'Correção crítica no ERP financeiro', 'Pendente', 'Emergencial', 'Usuário de Teste', '23-08-2026 16:15', 'ERP Corporativo', 'Sistemas'),
    createRdm('RDM-2026-1031', 'Atualização das regras de firewall', 'Aprovado', 'Padrão', 'Rafael Almeida', '19-08-2026 11:00', 'Firewall Perimetral', 'Segurança da Informação'),
    createRdm('RDM-2026-1024', 'Migração de caixas de e-mail', 'Reprovado', 'Normal', 'Mariana Costa', '14-08-2026 14:45', 'Microsoft 365', 'Infraestrutura'),
    createRdm('RDM-2026-1017', 'Desativação do servidor legado', 'Cancelado', 'Normal', 'Bruno Lima', '08-08-2026 09:20', 'Sistema Legado RH', 'Recursos Humanos'),
    createRdm('RDM-2026-1009', 'Ampliação do cluster de banco de dados', 'Aprovado', 'Normal', 'Mariana Costa', '02-08-2026 18:00', 'ERP Corporativo', 'Infraestrutura'),
  ],
  validations: [
    { ticket: 'RDM-2026-1042', name: 'Usuário de Teste', title: 'Atualização do portal institucional', date: '26-08-2026 18:00', status: 'No prazo', result: 'Aberto', reviewer: '', resultsDescription: '' },
    { ticket: 'RDM-2026-1031', name: 'Rafael Almeida', title: 'Atualização das regras de firewall', date: '22-08-2026 10:00', status: 'Vencido', result: 'sucesso', reviewer: 'Usuário de Teste', resultsDescription: 'Mudança validada sem intercorrências.' },
    { ticket: 'RDM-2026-1009', name: 'Mariana Costa', title: 'Ampliação do cluster de banco de dados', date: '05-08-2026 20:00', status: 'Vencido', result: 'com-ressalva', reviewer: 'Usuário de Teste', resultsDescription: 'Executado; monitorar consumo por sete dias.' },
  ],
  notifications: [
    { id: 1, ticket: 'RDM-2026-1038', title: 'Nova RDM aguardando análise', message: 'A correção crítica no ERP financeiro precisa de aprovação.', link: '/admin/rdm/RDM-2026-1038', read: false, createdAt: new Date().toISOString() },
    { id: 2, ticket: 'RDM-2026-1042', title: 'Mudança aprovada', message: 'A atualização do portal institucional foi aprovada.', link: '/rdm-details/RDM-2026-1042', read: false, createdAt: new Date().toISOString() },
  ],
};

function createRdm(ticket: string, title: string, status: string, type: string, name: string, date: string, system: string, department: string): any {
  return {
    ticket, title, status, type, name, date, createdAt: date, requesterEmail: name === 'Usuário de Teste' ? DEMO_EMAIL : `${name.toLowerCase().replace(/ /g, '.')}@empresa.com`, department, area: department, priority: type === 'Emergencial' ? 'Alta' : 'Média',
    identification: { type, title, area: department, name, status, dateCreated: date },
    justification: { problemJustification: 'A mudança é necessária para manter a estabilidade, segurança e continuidade do serviço.' },
    solution: { objectiveOrSolution: `Implementar ${title.toLowerCase()} com validação técnica e plano de retorno.` },
    category: { objective: 'Melhoria contínua', action: 'Alteração de ambiente', impact: type === 'Emergencial' ? 'Alto' : 'Médio', urgency: type === 'Emergencial' ? 'Alta' : 'Média' },
    impactCategory: { changeSystem: system, activity: 'Manutenção evolutiva', impactedServices: system, environment: 'Produção', iCsImpacted: 'Aplicação, banco de dados e monitoramento' },
    deploymentWindow: { impactType: 'Indisponibilidade parcial', dayOfWeek: 'Sábado', startTime: '22:00', endTime: '23:30' },
    planComunication: { whosNotified: 'Usuários-chave e Service Desk', moment: 'Antes e após a implantação', comunicationType: 'E-mail e Teams', technologyArea: department },
    phases: {
      planning: { stage: 'Planejamento técnico', startDate: '20/08/2026', endDate: '21/08/2026', wasPlanned: 'Sim', justificationPlanned: '' },
      testHomology: { stage: 'Homologação', startDate: '21/08/2026', endDate: '22/08/2026', wasTested: 'Sim', justificationTest: '' },
      execute: { stage: 'Implantação controlada', startDate: '30/08/2026', endDate: '30/08/2026' },
      validation: { stage: 'Validação e monitoramento', startDate: '30/08/2026', endDate: '31/08/2026' },
    },
    planningExecutation: { activity: 'Backup, implantação, testes de fumaça e monitoramento.', technologyArea: department, probabilityOfSuccess: 'Alta' },
    planningRemediation: { activity: 'Restaurar backup e versão anterior.', technologyArea: department, probabilityOfSuccess: 'Alta', wasRemediationPlanned: 'Sim' },
  };
}

@Injectable()
export class MockApiInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (!req.url.startsWith(API_BASE_URL) && !req.url.includes('/Admin/Report/Excel/')) return next.handle(req);

    const path = new URL(req.url, window.location.origin).pathname;
    const db = this.database();
    const response = (body: any = null, headers?: HttpHeaders) => of(new HttpResponse({ status: 200, body, headers })).pipe(delay(250));
    const page = Number(req.params.get('PageNumber') || 1);
    const size = Number(req.params.get('PageSize') || 10);
    const paginate = (items: any[]) => {
      const body = items.slice((page - 1) * size, page * size);
      const pagination = JSON.stringify({ currentPage: page, itemsPerPage: size, totalItems: items.length, totalCount: items.length, totalPages: Math.max(1, Math.ceil(items.length / size)) });
      return response(body, new HttpHeaders({ Pagination: pagination, 'X-Total-Count': String(items.length) }));
    };

    if (path === '/api/Login' && req.method === 'POST') {
      if (req.body?.email?.toLowerCase() !== DEMO_EMAIL || req.body?.password !== DEMO_PASSWORD) {
        return throwError(() => ({ status: 401, error: { errorMessages: ['Email ou senha incorretos. Use as credenciais de demonstração.'] } })).pipe(delay(250));
      }
      return response({ token: this.demoToken(), email: DEMO_EMAIL });
    }
    if (path === '/api/User/get-profile') return response(db.users[0]);
    if (path === '/api/User' && req.method === 'PUT') return response({ success: true });
    if (path === '/api/User/change-password') return response({ success: true });
    if (path === '/api/User' && req.method === 'POST') return response({ success: true });

    if (path === '/api/Admin/List-Users') return paginate(db.users.filter((u: any) => u.situation !== 'Pendente'));
    if (path === '/api/Admin/Users/Pending') return paginate(db.users.filter((u: any) => u.situation === 'Pendente'));
    if (path.startsWith('/api/Admin/GetUser/')) {
      const term = decodeURIComponent(path.split('/').pop() || '').toLowerCase();
      return response(db.users.filter((u: any) => u.email.toLowerCase().includes(term) || u.name.toLowerCase().includes(term)));
    }
    if (path.startsWith('/api/Admin/approve/')) { this.updateUser(db, path, { situation: 'Aprovado' }); return response({ success: true }); }
    if (path.startsWith('/api/Admin/change-role/')) { this.updateUser(db, path, { role: req.body?.role || req.body?.newRole }); return response({ success: true }); }
    if (path.startsWith('/api/Admin/Update/User/')) { this.updateUser(db, path, req.body); return response({ success: true }); }
    if (path.startsWith('/api/Admin/reset-password/')) return response({ password: 'Demo@2026' });

    if (path === '/api/RDM/Logged-user') return paginate(db.rdms.filter((r: any) => r.requesterEmail === DEMO_EMAIL));
    if (path === '/api/RDM' && req.method === 'POST') {
      const form = req.body as FormData;
      const ticket = `RDM-2026-${1043 + db.rdms.length}`;
      const title = String(form.get('identification.Title') || 'Nova requisição de mudança');
      const type = String(form.get('identification.Type') || 'Normal');
      const system = String(form.get('categorization.SystemOrService') || 'Portal Institucional');
      db.rdms.unshift(createRdm(ticket, title, 'Pendente', type, 'Usuário de Teste', this.now(), system, 'Tecnologia da Informação'));
      this.save(db);
      return response({ ticket });
    }
    if (path === '/api/Admin/rdm-pending') return paginate(db.rdms.filter((r: any) => r.status === 'Pendente'));
    if (path === '/api/Admin/Get-RDM-all-users') return paginate(db.rdms);
    if (path.startsWith('/api/Admin/Get-ticket-allusers/') || (/^\/api\/RDM\/[^/]+$/.test(path) && req.method === 'GET')) {
      const ticket = decodeURIComponent(path.split('/').pop() || '');
      return response(db.rdms.find((r: any) => r.ticket === ticket) || null);
    }
    if (path.startsWith('/api/RDM/ticket-short/')) {
      const rdm = db.rdms.find((r: any) => r.ticket === decodeURIComponent(path.split('/').pop() || ''));
      return response(rdm ? { ticket: rdm.ticket, name: rdm.name, title: rdm.title, status: rdm.status, date: rdm.date } : null);
    }
    if (path.startsWith('/api/Admin/rdm-approve/')) {
      const rdm = db.rdms.find((r: any) => r.ticket === decodeURIComponent(path.split('/').pop() || ''));
      if (rdm) { rdm.status = req.body?.status || rdm.status; rdm.identification.status = rdm.status; this.save(db); }
      return response({ success: true });
    }
    if (path.startsWith('/api/RDM/Cancel/')) {
      const rdm = db.rdms.find((r: any) => r.ticket === decodeURIComponent(path.split('/').pop() || ''));
      if (rdm) { rdm.status = 'Cancelado'; rdm.identification.status = 'Cancelado'; this.save(db); }
      return response({ success: true });
    }
    if (/^\/api\/RDM\/[^/]+$/.test(path) && req.method === 'PUT') {
      const rdm = db.rdms.find((r: any) => r.ticket === decodeURIComponent(path.split('/').pop() || ''));
      if (rdm) {
        rdm.title = req.body?.identification?.title || rdm.title;
        rdm.identification.title = rdm.title;
        rdm.solution = req.body?.solution || rdm.solution;
        this.save(db);
      }
      return response({ success: true });
    }

    if (path === '/api/Admin/RDM/Validation') return paginate(db.validations);
    if (path.startsWith('/api/Admin/Update/Result/')) {
      const item = db.validations.find((v: any) => v.ticket === decodeURIComponent(path.split('/').pop() || ''));
      if (item) { Object.assign(item, req.body, { reviewer: 'Usuário de Teste' }); this.save(db); }
      return response();
    }
    if (path === '/api/Notification') return response(db.notifications.filter((n: any) => !n.read));
    if (path.startsWith('/api/Notification/Read/')) { const n = db.notifications.find((x: any) => x.id === Number(path.split('/').pop())); if (n) n.read = true; this.save(db); return response(); }

    if (path === '/api/SystemService' && req.method === 'GET') return response(db.systems);
    if (path === '/api/SystemService/SystemServices/Pagination') return paginate(db.systems.filter((s: any) => (!req.params.get('systemService') || s.systemService.toLowerCase().includes(req.params.get('systemService')!.toLowerCase())) && (!req.params.get('department') || s.department.toLowerCase().includes(req.params.get('department')!.toLowerCase())) && (!req.params.get('status') || s.status === req.params.get('status'))));
    if (path === '/api/SystemService' && req.method === 'POST') { db.systems.push(req.body); this.save(db); return response(req.body); }
    if (path.startsWith('/api/SystemService/Update/')) { const old = decodeURIComponent(path.split('/').pop() || ''); const index = db.systems.findIndex((s: any) => s.systemService === old); if (index >= 0) db.systems[index] = req.body; this.save(db); return response(); }

    if (path.match(/^\/api\/Admin\/RDM\/Amount\//)) return response(this.amountReport(db.rdms));
    if (path.match(/^\/api\/Admin\/RDM\/Services\//)) {
      const counts = db.rdms.reduce((acc: any, r: any) => { const key = r.impactCategory.changeSystem; acc[key] = (acc[key] || 0) + 1; return acc; }, {});
      return response(Object.entries(counts).map(([systemService, quantity]) => ({ systemService, quantity })));
    }
    if (path.includes('/Attachments/')) return response(new Blob([], { type: 'application/octet-stream' }));
    if (path === '/api/Report' || path.startsWith('/Admin/Report/Excel/')) return response(new Blob(['Relatório demonstrativo'], { type: 'application/octet-stream' }));
    return response({ success: true });
  }

  private database(): any { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '') || structuredClone(initialDatabase); } catch { const db = structuredClone(initialDatabase); this.save(db); return db; } }
  private save(db: any): void { localStorage.setItem(STORAGE_KEY, JSON.stringify(db)); }
  private updateUser(db: any, path: string, changes: any): void { const email = decodeURIComponent(path.split('/').pop() || ''); const user = db.users.find((u: any) => u.email === email); if (user) Object.assign(user, changes); this.save(db); }
  private demoToken(): string { const encode = (value: any) => btoa(unescape(encodeURIComponent(JSON.stringify(value)))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_'); return `${encode({ alg: 'none', typ: 'JWT' })}.${encode({ sid: 1, unique_name: 'Usuário de Teste', email: DEMO_EMAIL, role: 'administrador', department: 'Tecnologia da Informação', exp: Math.floor(Date.now() / 1000) + 86400 })}.demo`; }
  private now(): string { const date = new Date(); return `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`; }
  private amountReport(rdms: any[]): any { const status = (value: string) => rdms.filter((r: any) => r.status.toLowerCase().includes(value)).length; return { quantity: rdms.length, defaultQuantity: rdms.filter((r: any) => r.type === 'Padrão').length, normalQuantity: rdms.filter((r: any) => r.type === 'Normal').length, emergencyRdmQuantity: rdms.filter((r: any) => r.type === 'Emergencial').length, approvedCount: status('aprovado'), rejectedCount: status('reprovado'), successfulExecutedCount: 1, withoutSuccessExecutedCount: 0, executedWithRemarksCount: 1, canceledCount: status('cancelado') }; }
}
