import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService, UserRole } from '../../@core/services/auth.service';
import { StaffRole, StaffUsersService } from '../../@core/services/staff-users.service';
import { FirebaseUser } from '../../@core/interfaces/user.model';
import { TablePagination } from '../../@core/components/table-pagination/table-pagination';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, TablePagination],
  templateUrl: './users.html',
  styleUrl: './users.scss',
})
export class Users implements OnInit {
  private readonly usersService = inject(StaffUsersService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly messageService = inject(MessageService);
  readonly authService = inject(AuthService);

  readonly roles: { value: StaffRole; label: string }[] = [
    { value: 'supervisor', label: 'Supervisor' },
    { value: 'crew', label: 'Crew' },
    { value: 'conductor', label: 'Conductor' },
    { value: 'mecanico', label: 'Mecánico' },
  ];
  readonly roleFilters: { value: UserRole | ''; label: string }[] = [
    { value: '', label: 'Todos los roles' },
    { value: 'admin', label: 'Administrador' },
    ...this.roles,
  ];

  users: FirebaseUser[] = [];
  filteredUsers: FirebaseUser[] = [];
  loading = true;
  saving = false;
  modalOpen = false;
  searchTerm = '';
  roleFilter: UserRole | '' = '';
  pageError = '';
  formError = '';
  selectedUser: FirebaseUser | null = null;
  selectedStatusUser: FirebaseUser | null = null;
  confirmationError = '';
  page = 0;
  readonly pageSize = 10;

  userForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    lastName: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    phone: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    rol: new FormControl<StaffRole | ''>('', { nonNullable: true, validators: [Validators.required] }),
  });

  get isAdmin(): boolean {
    return this.authService.hasRole(['admin']);
  }

  get paginatedUsers(): FirebaseUser[] {
    const start = this.page * this.pageSize;
    return this.filteredUsers.slice(start, start + this.pageSize);
  }

  async ngOnInit(): Promise<void> {
    await this.loadUsers();
  }

  async loadUsers(): Promise<void> {
    this.loading = true;
    this.pageError = '';
    try {
      this.users = await this.usersService.getStaffUsers();
      this.applySearch();
    } catch {
      this.pageError = 'No se pudo cargar la lista de usuarios.';
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  applySearch(): void {
    const term = this.searchTerm.trim().toLowerCase();
    this.filteredUsers = this.users.filter((user) =>
      `${user.name} ${user.lastName} ${user.email} ${user.rol}`.toLowerCase().includes(term)
      && (!this.roleFilter || user.rol === this.roleFilter),
    );
    this.page = 0;
  }

  openCreateForm(): void {
    if (!this.isAdmin) return;
    this.selectedUser = null;
    this.formError = '';
    this.userForm.reset({ name: '', lastName: '', email: '', phone: '', rol: '' });
    this.userForm.controls.email.enable();
    this.modalOpen = true;
  }

  openEditForm(user: FirebaseUser): void {
    if (!this.isAdmin || user.rol === 'admin') return;
    this.selectedUser = user;
    this.formError = '';
    this.userForm.reset({
      name: user.name,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone ?? '',
      rol: user.rol as StaffRole,
    });
    this.userForm.controls.email.disable();
    this.modalOpen = true;
  }

  closeCreateForm(): void {
    if (!this.saving) {
      this.modalOpen = false;
      this.selectedUser = null;
    }
  }

  async saveUser(): Promise<void> {
    if (!this.isAdmin) return;
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }

    const form = this.userForm.getRawValue();
    if (!form.rol) return;

    this.saving = true;
    this.formError = '';
    try {
      if (this.selectedUser) {
        await this.usersService.updateStaffUser(this.selectedUser.uid, {
          name: form.name,
          lastName: form.lastName,
          phone: form.phone,
          rol: form.rol,
        });
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Usuario actualizado.',
        });
      } else {
        const resetEmailSent = await this.usersService.createStaffUser({ ...form, rol: form.rol });
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: resetEmailSent
            ? 'Usuario creado. Se envió un enlace para establecer su contraseña.'
            : 'Usuario creado, pero no se pudo enviar el enlace para establecer su contraseña.',
        });
      }
      this.modalOpen = false;
      this.selectedUser = null;
      await this.loadUsers();
    } catch (error: any) {
      this.formError = error?.code === 'auth/email-already-in-use'
        ? 'Ya existe una cuenta con ese correo electrónico.'
        : 'No se pudo crear el usuario. Verifica los datos e inténtalo de nuevo.';
    } finally {
      this.saving = false;
      this.cdr.detectChanges();
    }
  }

  openStatusConfirmation(user: FirebaseUser): void {
    if (!this.isAdmin || user.rol === 'admin' || user.uid === this.authService.getCurrentUserId()) return;
    this.selectedStatusUser = user;
    this.confirmationError = '';
  }

  closeStatusConfirmation(): void {
    if (!this.saving) {
      this.selectedStatusUser = null;
      this.confirmationError = '';
    }
  }

  async confirmStatusChange(): Promise<void> {
    const user = this.selectedStatusUser;
    if (!this.isAdmin || !user || user.rol === 'admin' || user.uid === this.authService.getCurrentUserId()) return;

    const nextActiveState = user.activo === false;
    this.saving = true;
    this.confirmationError = '';
    try {
      await this.usersService.setStaffUserActive(user.uid, nextActiveState);
      user.activo = nextActiveState;
      this.applySearch();
      this.selectedStatusUser = null;
      this.messageService.add({
        severity: 'success',
        summary: 'Éxito',
        detail: `Usuario ${nextActiveState ? 'activado' : 'desactivado'}.`,
      });
    } catch {
      this.confirmationError = 'No se pudo actualizar el estado del usuario.';
    } finally {
      this.saving = false;
      this.cdr.detectChanges();
    }
  }
}
