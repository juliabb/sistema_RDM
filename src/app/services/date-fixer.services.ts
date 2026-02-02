// src/app/services/date-fixer.services.ts
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class DateFixerService {
  /**
   * Formata data COM hora para exibição em listas
   * Formato de saída: "DD/MM/AAAA HH:mm"
   * @param dateValue Valor da data a ser formatada
   * @returns Data formatada ou 'Não informado' se inválida
   */
formatWithTime(dateValue: any): string {
  // Primeiro tenta o formato do ticket-short com ajuste de fuso
  const ticketShortFormat = this.formatTicketShortDate(dateValue, true);
  if (ticketShortFormat !== 'Não informado' && !ticketShortFormat.includes('Data inválida')) {
    return ticketShortFormat;
  }

  // Fallback para o método original
  return this.formatDateInternal(dateValue, true);
}

/**
 * Formata datas do formato ticket-short "DD-MM-YYYY HH:mm" com ajuste UTC→UTC-3
 */
private formatTicketShortDate(dateValue: any, includeTime: boolean): string {
  if (!dateValue) {
    return 'Não informado';
  }

  const input = String(dateValue).trim();
  const pattern = /^(\d{2})-(\d{2})-(\d{4}) (\d{2}):(\d{2})$/;
  const match = input.match(pattern);

  if (!match) {
    return 'Não informado'; // Não é formato ticket-short
  }

  const [, dayStr, monthStr, yearStr, hourStr, minuteStr] = match;

  const day = parseInt(dayStr, 10);
  const month = parseInt(monthStr, 10) - 1;
  const year = parseInt(yearStr, 10);
  let hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);

  // **CORREÇÃO DE FUSO HORÁRIO: UTC → UTC-3**
  // Exemplo: "17-01-2026 00:46" (UTC) → "16/01/2026 21:46" (UTC-3)

  // Cria como UTC
  const utcDate = new Date(Date.UTC(year, month, day, hour, minute, 0));

  // Ajusta para UTC-3 (Brasil)
  const brasilDate = new Date(utcDate.getTime() - (3 * 60 * 60 * 1000));

  // Formata
  const formattedDay = brasilDate.getDate().toString().padStart(2, '0');
  const formattedMonth = (brasilDate.getMonth() + 1).toString().padStart(2, '0');
  const formattedYear = brasilDate.getFullYear();

  if (includeTime) {
    const formattedHour = brasilDate.getHours().toString().padStart(2, '0');
    const formattedMinute = brasilDate.getMinutes().toString().padStart(2, '0');
    return `${formattedDay}/${formattedMonth}/${formattedYear} ${formattedHour}:${formattedMinute}`;
  } else {
    return `${formattedDay}/${formattedMonth}/${formattedYear}`;
  }
}


  /**
   * Formata data SEM hora para exibição em detalhes
   * Formato de saída: "DD/MM/AAAA"
   * @param dateValue Valor da data a ser formatada
   * @returns Data formatada ou 'Não informado' se inválida
   */
  formatDateOnly(dateValue: any): string {
    return this.formatDateInternal(dateValue, false);
  }

  /**
   * Método interno centralizado para formatação de datas
   * Suporta múltiplos formatos de entrada e ajustes de fuso horário
   * @param dateValue Valor da data a ser processada
   * @param includeTime Define se inclui hora na formatação
   * @returns Data formatada apropriadamente
   */
private formatDateInternal(dateValue: any, includeTime: boolean): string {
  // Tenta primeiro o formato ticket-short
  const ticketShortResult = this.formatTicketShortDate(dateValue, includeTime);
  if (ticketShortResult !== 'Não informado') {
    return ticketShortResult;
  }

  const input = String(dateValue).trim();

  // **CASO 1: Formato "DD-MM-YYYY HH:mm" do endpoint ticket-short**
  // Exemplo: "17-01-2026 00:46" (está em UTC, precisa converter para UTC-3)
  const ddMMyyyyPattern = /^(\d{2})-(\d{2})-(\d{4}) (\d{2}):(\d{2})$/;
  const match = input.match(ddMMyyyyPattern);

  if (match) {
    const [, dayStr, monthStr, yearStr, hourStr, minuteStr] = match;

    const day = parseInt(dayStr, 10);
    const month = parseInt(monthStr, 10) - 1; // Date usa meses 0-indexed
    const year = parseInt(yearStr, 10);
    let hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr, 10);

    console.log(`=== DEBUG DateFixerService ===`);
    console.log(`Input: ${input}`);
    console.log(`Parsed: ${year}-${month+1}-${day} ${hour}:${minute}`);

    // **IMPORTANTE: AJUSTE DE FUSO HORÁRIO**
    // A data vem em UTC do backend: "17-01-2026 00:46" (UTC)
    // Mas foi criada em: "16/01/2026 21:46" (UTC-3)
    // UTC (00:46) - 3 horas = UTC-3 (21:46 do dia anterior)

    // Cria data como se fosse UTC
    const utcDate = new Date(Date.UTC(year, month, day, hour, minute, 0));
    console.log(`UTC Date: ${utcDate.toISOString()}`);

    // Converte para horário local (UTC-3 para Brasil)
    const localDate = new Date(utcDate.getTime() - (3 * 60 * 60 * 1000)); // -3 horas
    console.log(`Local Date (UTC-3): ${localDate.toISOString()}`);

    // Formata no padrão brasileiro DD/MM/YYYY
    const formattedDay = localDate.getDate().toString().padStart(2, '0');
    const formattedMonth = (localDate.getMonth() + 1).toString().padStart(2, '0');
    const formattedYear = localDate.getFullYear();

    if (includeTime) {
      const formattedHour = localDate.getHours().toString().padStart(2, '0');
      const formattedMinute = localDate.getMinutes().toString().padStart(2, '0');
      console.log(`Result: ${formattedDay}/${formattedMonth}/${formattedYear} ${formattedHour}:${formattedMinute}`);
      return `${formattedDay}/${formattedMonth}/${formattedYear} ${formattedHour}:${formattedMinute}`;
    } else {
      console.log(`Result: ${formattedDay}/${formattedMonth}/${formattedYear}`);
      return `${formattedDay}/${formattedMonth}/${formattedYear}`;
    }
  }

  // **CASO 2: Formato "dd-MM-yyyy HH:mm" (outro formato possível)**
  // Exemplo: "17-01-2026 20:07"
  const ddMMyyyyPattern2 = /^(\d{2})-(\d{2})-(\d{4}) (\d{2}):(\d{2})$/;
  const match2 = input.match(ddMMyyyyPattern2);

  if (match2) {
    const [, day, month, year, hour, minute] = match2;

    // Mesmo ajuste do caso 1
    const utcDate = new Date(`${year}-${month}-${day}T${hour}:${minute}:00Z`);
    const localDate = new Date(utcDate.getTime() - (3 * 60 * 60 * 1000));

    const localDay = localDate.getDate().toString().padStart(2, '0');
    const localMonth = (localDate.getMonth() + 1).toString().padStart(2, '0');
    const localYear = localDate.getFullYear();

    if (includeTime) {
      const localHour = localDate.getHours().toString().padStart(2, '0');
      const localMinute = localDate.getMinutes().toString().padStart(2, '0');
      return `${localDay}/${localMonth}/${localYear} ${localHour}:${localMinute}`;
    } else {
      return `${localDay}/${localMonth}/${localYear}`;
    }
  }

    // CASO 3: Formato brasileiro (já formatado)
    // Exemplo: "17/01/2026 17:07" ou "17/01/2026"
    const brPattern = /^(\d{2})\/(\d{2})\/(\d{4})/;
    const brMatch = input.match(brPattern);

    if (brMatch) {
      if (includeTime) {
        // Verifica se já tem hora incluída
        const timeMatch = input.match(/(\d{2}:\d{2})$/);
        if (timeMatch) {
          return input; // Já está no formato correto
        } else {
          // Tem data mas não hora - retorna apenas data
          return `${brMatch[1]}/${brMatch[2]}/${brMatch[3]}`;
        }
      } else {
        // Apenas data solicitada
        return `${brMatch[1]}/${brMatch[2]}/${brMatch[3]}`;
      }
    }

    // CASO 4: Tentativa genérica com Date.parse
    try {
      const date = new Date(input);
      if (!isNaN(date.getTime())) {
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();

        if (includeTime) {
          const hour = date.getHours().toString().padStart(2, '0');
          const minute = date.getMinutes().toString().padStart(2, '0');
          return `${day}/${month}/${year} ${hour}:${minute}`;
        } else {
          return `${day}/${month}/${year}`;
        }
      }
    } catch {
      // Silencia erro e segue para fallback
    }

    // CASO 5: Fallback - retorna valor original se nenhum padrão for reconhecido
    return input;
  }

  /**
   * Método de compatibilidade com uso anterior
   * Formata data COM hora por padrão
   * @param dateValue Valor da data a ser formatada
   * @returns Data formatada com hora
   */
  format(dateValue: any): string {
    return this.formatWithTime(dateValue);
  }
}
