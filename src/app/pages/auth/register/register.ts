// src/app/pages/auth/register/register.ts
import { Component, inject, EventEmitter, Output, OnDestroy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ModalComponent } from '../../../components/modal/modal.component';

// Importar configurações da API
import { buildApiUrl, API_PATHS } from '../../../config/api.config';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, ModalComponent],
  templateUrl: './register.html',
  styleUrls: ['./register.css'],
})
export class RegisterComponent implements OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  private timeoutId?: number;

  @Output() toggleMode = new EventEmitter<void>();
  @Output() registerSuccess = new EventEmitter<void>();

  errorMessage = '';
  successMessage = '';
  isLoading = false;
  showApprovalModal = false;
  modalSize: 'small' | 'medium' | 'large' | 'xlarge' = 'small';
  allowModalScroll = false;

  private readonly API_TIMEOUT = 10000;

  registerForm = this.fb.group(
    {
      nome: ['', [Validators.required, Validators.minLength(2)]],
      sobrenome: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      confirmarEmail: ['', [Validators.required, Validators.email]],
      departamento: ['', [Validators.required, Validators.minLength(2)]],
      password: ['', [Validators.required, Validators.minLength(8), this.passwordStrengthValidator]],
      confirmarPassword: ['', [Validators.required]],
    },
    {
      validators: [this.emailMatchValidator, this.passwordMatchValidator],
    }
  );

  private passwordStrengthValidator(control: AbstractControl) {
    const value = control.value || '';

    if (!value) {
      return null;
    }

    const hasUpperCase = /[A-Z]/.test(value);
    const hasLowerCase = /[a-z]/.test(value);
    const hasNumbers = /\d/.test(value);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value);
    const isValidLength = value.length >= 8;

    const passwordValid = hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar && isValidLength;

    if (!passwordValid) {
      return {
        passwordStrength: {
          hasUpperCase,
          hasLowerCase,
          hasNumbers,
          hasSpecialChar,
          isValidLength,
        },
      };
    }

    return null;
  }

  private emailMatchValidator(control: AbstractControl) {
    const email = control.get('email')?.value;
    const confirmarEmail = control.get('confirmarEmail')?.value;

    if (email !== confirmarEmail) {
      control.get('confirmarEmail')?.setErrors({ emailMismatch: true });
      return { emailMismatch: true };
    }
    return null;
  }

  private passwordMatchValidator(control: AbstractControl) {
    const password = control.get('password')?.value;
    const confirmarPassword = control.get('confirmarPassword')?.value;

    if (password !== confirmarPassword) {
      control.get('confirmarPassword')?.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    return null;
  }

  ngOnDestroy() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
  }

  onRegisterSubmit() {
    this.clearMessages();

    if (this.registerForm.invalid) {
      this.markAllFieldsAsTouched();

      if (this.registerForm.get('nome')?.hasError('required')) {
        this.errorMessage = 'Nome é obrigatório';
      } else if (this.registerForm.get('email')?.hasError('email')) {
        this.errorMessage = 'Email inválido';
      } else if (this.registerForm.hasError('emailMismatch')) {
        this.errorMessage = 'Os emails não coincidem';
      }
      return;
    }

    this.isLoading = true;

    const registerData = {
      name: this.registerForm.get('nome')?.value?.trim(),
      lastName: this.registerForm.get('sobrenome')?.value?.trim(),
      email: this.registerForm.get('email')?.value?.trim(),
      department: this.registerForm.get('departamento')?.value?.trim(),
      password: this.registerForm.get('password')?.value,
    };

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Accept: 'application/json',
    });

    this.timeoutId = window.setTimeout(() => {
      if (this.isLoading) {
        this.isLoading = false;
        this.errorMessage = 'Tempo de conexão excedido. Tente novamente.';
      }
    }, this.API_TIMEOUT);

    // Usar API config
    const registerUrl = buildApiUrl(API_PATHS.REGISTER);
    this.http.post(registerUrl, registerData, { headers }).subscribe({
      next: () => {
        this.clearTimeout();
        this.isLoading = false;
        this.showApprovalModal = true;
        this.registerSuccess.emit();

        // LIMPAR OS CAMPOS DO FORMULÁRIO
        this.registerForm.reset();
      },
      error: (error) => {
        this.clearTimeout();
        this.isLoading = false;
        this.handleRegisterError(error);
      },
    });
  }

  private handleRegisterError(error: any) {
    if (error.error?.errorMessages?.[0]) {
      const errorMsg = error.error.errorMessages[0];
      this.errorMessage = typeof errorMsg === 'string' ? errorMsg : 'Erro no cadastro';
    } else if (error.status === 409) {
      this.errorMessage = 'Este email já está cadastrado.';
    } else if (error.status === 400) {
      this.errorMessage = 'Dados inválidos para cadastro.';
    } else {
      this.errorMessage = 'Erro ao realizar cadastro. Tente novamente.';
    }
  }

  closeModal() {
    this.showApprovalModal = false;
    setTimeout(() => {
      this.toggleMode.emit();
    }, 100);
  }

  hasError(controlName: string, errorType: string): boolean {
    const control = this.registerForm.get(controlName);
    return !!control && control.hasError(errorType) && (control.touched || control.dirty);
  }

  hasEmailMismatch(): boolean {
    const hasMismatchError = this.registerForm.hasError('emailMismatch');
    const confirmarEmailControl = this.registerForm.get('confirmarEmail');
    const isTouchedOrDirty = confirmarEmailControl?.touched || confirmarEmailControl?.dirty;
    return hasMismatchError && !!isTouchedOrDirty;
  }

  hasPasswordMismatch(): boolean {
    const hasMismatchError = this.registerForm.hasError('passwordMismatch');
    const confirmarPasswordControl = this.registerForm.get('confirmarPassword');
    const isTouchedOrDirty = confirmarPasswordControl?.touched || confirmarPasswordControl?.dirty;
    return hasMismatchError && !!isTouchedOrDirty;
  }

  isPasswordWeak(): boolean {
    const passwordErrors = this.registerForm.get('password')?.errors;
    return !!passwordErrors?.['passwordStrength'];
  }

  hasUpperCase(): boolean {
    return this.getPasswordValidation()?.hasUpperCase || false;
  }

  hasLowerCase(): boolean {
    return this.getPasswordValidation()?.hasLowerCase || false;
  }

  hasNumbers(): boolean {
    return this.getPasswordValidation()?.hasNumbers || false;
  }

  hasSpecialChar(): boolean {
    return this.getPasswordValidation()?.hasSpecialChar || false;
  }

  isValidLength(): boolean {
    return this.getPasswordValidation()?.isValidLength || false;
  }

  private getPasswordValidation() {
    return this.registerForm.get('password')?.errors?.['passwordStrength'];
  }

  private markAllFieldsAsTouched() {
    Object.keys(this.registerForm.controls).forEach(key => {
      this.registerForm.get(key)?.markAsTouched();
    });
  }

  private clearMessages() {
    this.errorMessage = '';
    this.successMessage = '';
  }

  private clearTimeout() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = undefined;
    }
  }
}
