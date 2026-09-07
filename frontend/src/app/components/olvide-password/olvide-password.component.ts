import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

/**
 * Pantalla pública "¿Olvidaste tu contraseña?": pide el email y encola el
 * correo con el enlace para crear/restablecer la contraseña.
 */
@Component({
  selector: 'app-olvide-password',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    RouterLink,
  ],
  templateUrl: './olvide-password.component.html',
  styleUrl: './olvide-password.component.scss',
})
export class OlvidePasswordComponent {
  form: FormGroup;
  isLoading = false;
  enviado = false;
  errorMessage = '';

  constructor(private formBuilder: FormBuilder, private authService: AuthService) {
    this.form = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
    });
  }

  get email() {
    return this.form.get('email')!;
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    this.isLoading = true;
    this.errorMessage = '';
    this.authService.olvidePassword(this.form.value.email).subscribe({
      next: () => {
        this.isLoading = false;
        this.enviado = true;
      },
      error: () => {
        this.isLoading = false;
        this.errorMessage = 'Ocurrió un error. Intenta de nuevo en unos minutos.';
      },
    });
  }
}
