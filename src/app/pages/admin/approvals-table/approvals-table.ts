// src/app/pages/admin/approvals-table/approvals-table.ts
import { Component } from '@angular/core';
interface Approval {
  requester: string;
  email?: string; // Campo opcional para email
  title: string;
  type: string;
  date: string;
  status?: string; // Status da solicitação (Pendente, Aprovado, Rejeitado)
}

@Component({
  selector: 'app-approvals-table',
  standalone: true,
  imports: [],
  templateUrl: './approvals-table.html',
  styleUrls: ['./approvals-table.css'],
})
export class ApprovalsTable {
  approvals: Approval[] = [
    {
      requester: 'Maria Santos',
      email: 'maria.santos@empresa.com',
      title: 'Solicitação de acesso ao CRM',
      type: 'Acesso',
      date: '24/10/2023',
      status: 'Pendente',
    },
  ];

  approveRequest(request: Approval): void {
    alert(`Solicitação de ${request.requester} aprovada!`);
  }

  rejectRequest(request: Approval): void {
    alert(`Solicitação de ${request.requester} rejeitada!`);
  }
}
