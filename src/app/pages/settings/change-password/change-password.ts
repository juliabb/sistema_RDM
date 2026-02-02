import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, AbstractControl, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { UserService, ChangePasswordRequest } from '../../../services/user-services';
import { AuthService, UserProfile } from '../../../services/auth-services';
import { Subject, takeUntil, map, Observable } from 'rxjs';
import { SharedMaterialModule  } from '../../../shared/ui/index';

interface PasswordValidations {
  hasUpperCase: boolean;
  hasLowerCase: boolean;
  hasNumbers: boolean;
  hasSpecialChar: boolean;
  isValidLength: boolean;
}

@Component({
  selector: 'app-change-password',
  templateUrl: './change-password.html',
  styleUrls: ['./change-password.css'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    SharedMaterialModule  // Usar o módulo compartilhado
  ]
})
export class ChangePasswordComponent implements OnInit, OnDestroy {
  changePasswordForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  formSubmitted = false;

  // Validações de senha
  passwordValidations: PasswordValidations = {
    hasUpperCase: false,
    hasLowerCase: false,
    hasNumbers: false,
    hasSpecialChar: false,
    isValidLength: false
  };

  passwordStrength = 0;

  // Perfil do usuário
  userProfile$ = this.authService.currentUser$;

  // Iniciais do usuário como Observable
  userInitials$: Observable<string> = this.userProfile$.pipe(
    map(user => {
      if (!user?.name) return 'U';

      const names = user.name.split(' ');
      if (names.length === 1) return names[0].charAt(0).toUpperCase();

      return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
    })
  );

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private authService: AuthService,
    private router: Router
  ) {
    this.changePasswordForm = this.createForm();
  }

  ngOnInit(): void {
    this.setupFormListeners();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private createForm(): FormGroup {
    return this.fb.group({
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [
        Validators.required,
        Validators.minLength(8)
      ]],
      confirmPassword: ['', [Validators.required]]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  private setupFormListeners(): void {
    // Monitora mudanças na nova senha
    this.newPasswordControl?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.onPasswordChange());

    // Monitora mudanças na confirmação de senha
    this.confirmPasswordControl?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.validatePasswordMatch();
      });
  }

  private passwordMatchValidator(group: AbstractControl): { [key: string]: boolean } | null {
    const newPassword = group.get('newPassword')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;

    if (newPassword && confirmPassword && newPassword !== confirmPassword) {
      return { passwordMismatch: true };
    }
    return null;
  }

  onPasswordChange(): void {
    const password = this.newPasswordControl?.value;

    if (!password) {
      this.resetPasswordValidations();
      return;
    }

    // Validações
    this.passwordValidations = {
      hasUpperCase: /[A-Z]/.test(password),
      hasLowerCase: /[a-z]/.test(password),
      hasNumbers: /\d/.test(password),
      hasSpecialChar: /[@$!%*?&]/.test(password),
      isValidLength: password.length >= 8
    };

    // Calcula força da senha (0-100)
    this.calculatePasswordStrength();

    // Valida correspondência de senhas
    this.validatePasswordMatch();
  }

  private calculatePasswordStrength(): void {
    const validations = Object.values(this.passwordValidations);
    const validCount = validations.filter(v => v).length;
    this.passwordStrength = Math.round((validCount / validations.length) * 100);
  }

  private resetPasswordValidations(): void {
    this.passwordValidations = {
      hasUpperCase: false,
      hasLowerCase: false,
      hasNumbers: false,
      hasSpecialChar: false,
      isValidLength: false
    };
    this.passwordStrength = 0;
  }

  validatePasswordMatch(): void {
    const newPassword = this.newPasswordControl?.value;
    const confirmPassword = this.confirmPasswordControl?.value;

    if (newPassword && confirmPassword && newPassword !== confirmPassword) {
      this.confirmPasswordControl?.setErrors({ passwordMismatch: true });
    } else if (this.confirmPasswordControl?.errors?.['passwordMismatch']) {
      this.confirmPasswordControl?.setErrors(null);
    }
  }

  hasError(controlName: string, errorName: string): boolean {
    const control = this.changePasswordForm.get(controlName);
    return control ? control.hasError(errorName) && (control.touched || this.formSubmitted) : false;
  }

  get passwordsMismatch(): boolean {
    return this.changePasswordForm.errors?.['passwordMismatch'] || false;
  }

  onSubmit(): void {
    this.formSubmitted = true;
    this.errorMessage = '';
    this.successMessage = '';

    if (this.changePasswordForm.invalid || this.passwordsMismatch) {
      this.markAllAsTouched();
      return;
    }

    this.isLoading = true;

    // Garantir que os valores não são null/undefined
    const currentPassword = this.currentPasswordControl?.value || '';
    const newPassword = this.newPasswordControl?.value || '';

    const formData: ChangePasswordRequest = {
      password: currentPassword,
      newPassword: newPassword
    };

    this.userService.changePassword(formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.successMessage = 'Senha alterada com sucesso!';
          this.changePasswordForm.reset();
          this.formSubmitted = false;
          this.resetPasswordValidations();

          // Redireciona após 2 segundos
          setTimeout(() => {
            this.router.navigate(['/dashboard']);
          }, 2000);
        },
        error: (error: Error) => {
          this.errorMessage = error.message || 'Erro ao alterar senha. Tente novamente.';
          this.isLoading = false;
        },
        complete: () => {
          this.isLoading = false;
        }
      });
  }

  private markAllAsTouched(): void {
    Object.keys(this.changePasswordForm.controls).forEach(key => {
      const control = this.changePasswordForm.get(key);
      control?.markAsTouched();
    });
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }

  get currentPasswordControl(): AbstractControl | null {
    return this.changePasswordForm.get('currentPassword');
  }

  get newPasswordControl(): AbstractControl | null {
    return this.changePasswordForm.get('newPassword');
  }

  get confirmPasswordControl(): AbstractControl | null {
    return this.changePasswordForm.get('confirmPassword');
  }
}
