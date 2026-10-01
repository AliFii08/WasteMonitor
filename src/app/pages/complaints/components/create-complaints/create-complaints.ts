import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Auth } from '@angular/fire/auth';
import { QuejasService } from '../../../../@core/services/quejas.service';
import { NotificationService } from '../../../../@core/services/notification.service';
import { UserService } from '../../../../@core/services/user.service';

@Component({
  selector: 'app-create-complaints',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
  ],
  templateUrl: './create-complaints.html',
  styleUrl: './create-complaints.scss',
})
export class CreateComplaints {
  private fb = inject(FormBuilder);
  private quejasService = inject(QuejasService);
  private notificationService = inject(NotificationService);
  private userService = inject(UserService);
  private auth = inject(Auth);

  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  isClosing = false;
  @Output() quejaCreada = new EventEmitter<void>();

  loading = false;

  form: FormGroup = this.fb.group({
    asunto: ['', [Validators.required, Validators.minLength(5)]],
    descripcion: ['', [Validators.required, Validators.minLength(10)]],
  });

  cerrarModal() {
    if (this.isClosing) return;
    this.isClosing = true;
    setTimeout(() => {
      this.isClosing = false;
      this.visible = false;
      this.visibleChange.emit(false);
      this.form.reset();
    }, 180);
  }

  async guardarQueja() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    // 🔹 Obtener dinámicamente el UID del usuario actual desde la Signal o desde Auth
    const currentUser = this.userService.currentUserSignal();
    const userId = currentUser?.uid || this.auth.currentUser?.uid;

    if (!userId) {
      console.error('❌ No se encontró un usuario autenticado para registrar la queja.');
      return;
    }

    this.loading = true;
    const { asunto, descripcion } = this.form.value;

    try {
      // 1. Guardar la queja asociando el userId dinámico
      await this.quejasService.registrarQueja(userId, asunto, descripcion);

      // 2. Enviar notificación a los administradores
      await this.notificationService.crearNotificacion(
        'Nueva Queja Registrada',
        `Se ha recibido una nueva queja: "${asunto}".`,
        'alerta',
        'admin'
      );

      this.quejaCreada.emit();
      this.cerrarModal();
    } catch (error) {
      console.error('Error al registrar la queja:', error);
    } finally {
      this.loading = false;
    }
  }
}
