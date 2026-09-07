import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

function passwordsIgualesValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirmar = control.get('confirmar')?.value;
  return password && confirmar && password !== confirmar ? { noCoinciden: true } : null;
}

/**
 * Pantalla pública para crear/restablecer la contraseña a partir del token
 * de un solo uso recibido por correo (?token=...).
 */
@Component({
  selector: 'app-restablecer-password',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    RouterLink,
  ],
  templateUrl: './restablecer-password.component.html',
  styleUrl: './restablecer-password.component.scss',
})
export class RestablecerPasswordComponent implements OnInit {
  form: FormGroup;
  token = '';
  isLoading = false;
  exito = false;
  errorMessage = '';
  hidePassword = true;
  tokenFaltante = false;

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
  ) {
    this.form = this.formBuilder.group(
      {
        password: ['', [Validators.required, Validators.minLength(6)]],
        confirmar: ['', [Validators.required]],
      },
      { validators: passwordsIgualesValidator },
    );
  }

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
    this.tokenFaltante = !this.token;
  }

  onSubmit(): void {
    if (this.form.invalid || this.tokenFaltante) return;

    this.isLoading = true;
    this.errorMessage = '';
    this.authService.restablecerPassword(this.token, this.form.value.password).subscribe({
      next: () => {
        this.isLoading = false;
        this.exito = true;
        setTimeout(() => this.router.navigate(['/login']), 3000);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.mensaje || 'El enlace no es válido o ya expiró.';
      },
    });
  }
}
