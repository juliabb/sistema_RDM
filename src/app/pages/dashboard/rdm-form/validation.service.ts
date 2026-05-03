// src\app\pages\dashboard\rdm-form\validation.service.ts
import { Injectable } from '@angular/core';
import { STEP_VALIDATIONS, FieldValidation, ERROR_MESSAGES } from './validation.config';

@Injectable({
  providedIn: 'root',
})
export class ValidationService {
  /**
   * Valida um campo específico e retorna mensagem de erro
   */
  validateField(formData: any, validation: FieldValidation): string | null {
    try {
      const value = this.getFieldValue(formData, validation.field);

      // Verifica se é um campo condicional
      if (validation.dependsOn && validation.dependsValue) {
        const dependsValue = this.getFieldValue(formData, validation.dependsOn);
        if (dependsValue !== validation.dependsValue) {
          return null;
        }
      }

      if (validation.conditional && !validation.conditional(formData)) {
        return null;
      }

      // Validação de required
      if (validation.required) {
        if (typeof value === 'string') {
          if (!value || value.trim() === '') {
            return ERROR_MESSAGES.required(validation.label);
          }
        } else if (Array.isArray(value)) {
          if (!value || value.length === 0) {
            return ERROR_MESSAGES.required(validation.label);
          }
        } else if (value === null || value === undefined) {
          return ERROR_MESSAGES.required(validation.label);
        } else if (typeof value === 'number' && isNaN(value)) {
          return ERROR_MESSAGES.required(validation.label);
        }
      }

      // Validação de minLength para strings
      if (validation.minLength && typeof value === 'string' && value.trim().length > 0) {
        if (value.trim().length < validation.minLength) {
          return ERROR_MESSAGES.minLength(validation.label, validation.minLength);
        }
      }

      // Validação de maxLength para strings
      if (validation.maxLength && typeof value === 'string' && value.trim().length > 0) {
        if (value.trim().length > validation.maxLength) {
          return ERROR_MESSAGES.maxLength(validation.label, validation.maxLength);
        }
      }

      // Validação de pattern
      if (validation.pattern && typeof value === 'string' && value.trim().length > 0) {
        if (!validation.pattern.test(value)) {
          return ERROR_MESSAGES.pattern(validation.label, validation.patternError);
        }
      }

      return null;
    } catch (error) {
      console.error('Erro ao validar campo:', validation.field, error);
      return `Erro ao validar ${validation.label}`;
    }
  }

  /**
   * Valida todos os campos de um passo e retorna erros e status
   */
  validateStep(formData: any, step: number): { isValid: boolean; errors: Record<string, string> } {
    const errors: Record<string, string> = {};
    const validations = STEP_VALIDATIONS[step] || [];

    for (const validation of validations) {
      const error = this.validateField(formData, validation);
      if (error) {
        errors[validation.field] = error;
      }
    }

    // Validações especiais
    if (step === 3) {
      const emails = this.getFieldValue(formData, 'planComunication.EmailsCc') || [];
      if (emails.length > 0) {
        const invalidEmails = emails.filter((email: string) => !this.isValidEmail(email));
        if (invalidEmails.length > 0) {
          errors['planComunication.EmailsCc'] = `E-mails inválidos: ${invalidEmails.join(', ')}`;
        }
      }
    }

    if (step === 4) {
      // Validação de datas de execução
      const execStart = this.getFieldValue(formData, 'phases.executionWindow.startDate');
      const execEnd = this.getFieldValue(formData, 'phases.executionWindow.endDate');

      if (execStart && execEnd && typeof execStart === 'string' && typeof execEnd === 'string') {
        if (execStart.trim() && execEnd.trim()) {
          try {
            const startDate = new Date(execStart);
            const endDate = new Date(execEnd);
            if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime()) && startDate > endDate) {
              errors['phases.executionWindow.dateRange'] = ERROR_MESSAGES.dateRange;
            }
          } catch {
            // Ignorar erro de parsing
          }
        }
      }

      // Validação de datas de validação
      const valStart = this.getFieldValue(formData, 'phases.validation.startDate');
      const valEnd = this.getFieldValue(formData, 'phases.validation.endDate');

      if (valStart && valEnd && typeof valStart === 'string' && typeof valEnd === 'string') {
        if (valStart.trim() && valEnd.trim()) {
          try {
            const startDate = new Date(valStart);
            const endDate = new Date(valEnd);
            if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime()) && startDate > endDate) {
              errors['phases.validation.dateRange'] = ERROR_MESSAGES.dateRange;
            }
          } catch {
            // Ignorar erro de parsing
          }
        }
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  }

  /**
   * Inicializa um objeto de erros vazio
   */
  initializeErrors(): Record<string, string> {
    return {};
  }

  /**
   * Verifica se um passo pode ser validado com segurança
   */
  canValidateStep(formData: any, step: number): boolean {
    if (!formData) return false;
    const validations = STEP_VALIDATIONS[step];
    return !!(validations && validations.length > 0);
  }

  /**
   * Valida TODOS os passos do formulário
   */
  validateAllSteps(formData: any): Record<number, Record<string, string>> {
    const allErrors: Record<number, Record<string, string>> = {};

    for (let step = 1; step <= 5; step++) {
      const result = this.validateStep(formData, step);
      if (!result.isValid) {
        allErrors[step] = result.errors;
      }
    }

    return allErrors;
  }

  /**
   * Verifica APENAS se um passo está válido
   */
  isStepValid(formData: any, step: number): boolean {
    const validations = STEP_VALIDATIONS[step] || [];
    for (const validation of validations) {
      // Verifica condição condicional
      if (validation.conditional && !validation.conditional(formData)) {
        continue;
      }

      if (validation.dependsOn && validation.dependsValue) {
        const dependsValue = this.getFieldValue(formData, validation.dependsOn);
        if (dependsValue !== validation.dependsValue) {
          continue;
        }
      }

      const value = this.getFieldValue(formData, validation.field);

      if (validation.required) {
        if (value === undefined || value === null) return false;
        if (typeof value === 'string' && value.trim() === '') return false;
        if (Array.isArray(value) && value.length === 0) return false;
      }

      if (validation.minLength && typeof value === 'string' && value.trim().length > 0) {
        if (value.trim().length < validation.minLength) return false;
      }

      if (validation.pattern && typeof value === 'string' && value.trim().length > 0) {
        if (!validation.pattern.test(value)) return false;
      }
    }

    // Validações especiais
    if (step === 3) {
      const commType = this.getFieldValue(formData, 'planComunication.ComunicationType');
      if (commType === 'Email') {
        const emails = this.getFieldValue(formData, 'planComunication.EmailsCc') || [];
        if (emails.length === 0) return false;
      }
    }

    if (step === 4) {
      const execStart = this.getFieldValue(formData, 'phases.executionWindow.startDate');
      const execEnd = this.getFieldValue(formData, 'phases.executionWindow.endDate');
      if (execStart && execEnd) {
        try {
          if (new Date(execStart) > new Date(execEnd)) return false;
        } catch {}
      }

      const valStart = this.getFieldValue(formData, 'phases.validation.startDate');
      const valEnd = this.getFieldValue(formData, 'phases.validation.endDate');
      if (valStart && valEnd) {
        try {
          if (new Date(valStart) > new Date(valEnd)) return false;
        } catch {}
      }
    }

    return true;
  }

  /**
   * Obtém valor de um campo pelo caminho
   */
  private getFieldValue(obj: any, path: string): any {
    if (!obj) return '';

    try {
      return path.split('.').reduce((current, key) => {
        if (current === null || current === undefined) {
          return '';
        }
        return current[key] !== undefined ? current[key] : '';
      }, obj);
    } catch (error) {
      return '';
    }
  }

  // Validação de e-mail simples
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
