import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../@core/services/auth.service';
import { MessageService } from 'primeng/api';
import { UserGuidePdfService, type GuideRole } from './user-guide-pdf.service';

type FaqCategory = 'Cuenta' | 'Operaciones' | 'Notificaciones' | 'Emergencias';

interface GuideStep {
  title: string;
  description: string;
}

interface RoleGuide {
  id: GuideRole;
  title: string;
  subtitle: string;
  icon: string;
  steps: GuideStep[];
  links: Array<{ label: string; route: string }>;
}

interface FaqItem {
  question: string;
  answer: string;
  category: FaqCategory;
  roles: readonly GuideRole[];
}

@Component({
  selector: 'app-user-guide',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './user-guide.html',
  styleUrl: './user-guide.scss',
})
export class UserGuide {
  private readonly authService = inject(AuthService);
  private readonly messageService = inject(MessageService);
  private readonly userGuidePdfService = inject(UserGuidePdfService);

  activeCategory: FaqCategory | 'Todas' = 'Todas';
  expandedFaq: string | null = null;
  guideExpanded = false;

  private readonly categoryOrder: FaqCategory[] = [
    'Cuenta',
    'Operaciones',
    'Notificaciones',
    'Emergencias',
  ];

  readonly guides: RoleGuide[] = [
    {
      id: 'user',
      title: 'Ciudadano',
      subtitle: 'Consulta las rutas y mantente al tanto del servicio.',
      icon: 'pi pi-map-marker',
      steps: [
        { title: 'Consulta tu ruta', description: 'En Inicio revisa el mapa, la dirección registrada y la ruta de recolección más cercana.' },
        { title: 'Revisa los horarios', description: 'Abre Horarios para consultar la planificación disponible.' },
        { title: 'Envía una queja', description: 'En Quejas selecciona Nueva Queja y explica el asunto y la situación.' },
      ],
      links: [
        { label: 'Ver horarios', route: '/home/schedules' },
        { label: 'Ir a quejas', route: '/home/complaints' },
      ],
    },
    {
      id: 'supervisor',
      title: 'Supervisor',
      subtitle: 'Organiza jornadas, rutas de campo y atención de incidentes.',
      icon: 'pi pi-compass',
      steps: [
        { title: 'Inicia una jornada', description: 'En Informe de Jornada crea el informe. La app registra el seguimiento de ubicación mientras la jornada está activa.' },
        { title: 'Registra los viajes', description: 'Abre el informe activo y agrega cada viaje con su descripción, dirección y toneladas.' },
        { title: 'Cierra la jornada', description: 'Al terminar, confirma que los viajes estén registrados y pulsa Finalizar jornada para cerrar el seguimiento.' },
        { title: 'Reporta una emergencia', description: 'Abre Emergencia, selecciona el vehículo, el tipo y describe lo ocurrido.' },
      ],
      links: [
        { label: 'Informe de jornada', route: '/home/journey-report' },
        { label: 'Taller', route: '/home/taller' },
      ],
    },
    {
      id: 'admin',
      title: 'Administrador',
      subtitle: 'Gestiona el servicio, los usuarios, los avisos y el seguimiento.',
      icon: 'pi pi-shield',
      steps: [
        { title: 'Supervisa la operación', description: 'Usa Dashboard para consultar indicadores, vehículos, empleados e historial de operaciones.' },
        { title: 'Gestiona recursos', description: 'Administra vehículos, tripulación, usuarios, rutas y registros de taller desde sus secciones.' },
        { title: 'Publica un anuncio', description: 'Abre Anuncio, redacta el mensaje, selecciona el público y confirma los destinatarios antes de enviarlo.' },
        { title: 'Atiende emergencias', description: 'En Emergencia revisa el reporte y elige la respuesta adecuada; puedes solicitar apoyo mecánico.' },
      ],
      links: [
        { label: 'Dashboard', route: '/home/dashboard' },
        { label: 'Vehículos', route: '/home/vehicles' },
        { label: 'Usuarios', route: '/home/users' },
        { label: 'Rutas', route: '/home/routes' },
        { label: 'Informe administrativo', route: '/home/admin-journey-report' },
      ],
    },
    {
      id: 'mecanico',
      title: 'Mecánico',
      subtitle: 'Consulta los ingresos al taller y responde a solicitudes de asistencia.',
      icon: 'pi pi-wrench',
      steps: [
        { title: 'Revisa el taller', description: 'En Taller consulta los vehículos, el motivo de ingreso, la prioridad y el estado del mantenimiento.' },
        { title: 'Actualiza el trabajo', description: 'Abre un registro para actualizar su estado y los detalles del mantenimiento.' },
        { title: 'Responde a emergencias', description: 'En Emergencia revisa las solicitudes dirigidas a mecánicos y actualiza el estado conforme avances.' },
      ],
      links: [
        { label: 'Ir al taller', route: '/home/taller' },
      ],
    },
    {
      id: 'crew',
      title: 'Tripulación',
      subtitle: 'Consulta la información de apoyo para las operaciones de recolección.',
      icon: 'pi pi-users',
      steps: [
        { title: 'Consulta vehículos y rutas', description: 'Usa las secciones disponibles en el menú para revisar la información operativa asignada.' },
        { title: 'Revisa avisos', description: 'Abre la campana para leer las notificaciones dirigidas a tu rol.' },
        { title: 'Comunica una emergencia', description: 'Si ocurre un incidente en ruta, avisa al supervisor para que registre el reporte y coordine el apoyo.' },
      ],
      links: [
        { label: 'Vehículos', route: '/home/vehicles' },
        { label: 'Tripulación', route: '/home/crew' },
      ],
    },
    {
      id: 'conductor',
      title: 'Conductor',
      subtitle: 'Consulta los datos de la operación y comunica incidentes en ruta.',
      icon: 'pi pi-truck',
      steps: [
        { title: 'Consulta información operativa', description: 'Revisa las secciones de vehículos y tripulación disponibles para tu cuenta.' },
        { title: 'Mantente informado', description: 'Usa la campana para ver avisos y anuncios dirigidos a tu rol.' },
        { title: 'Solicita ayuda', description: 'Si ocurre un incidente en ruta, comunícate con el supervisor para que registre la emergencia y coordine la asistencia.' },
      ],
      links: [
        { label: 'Vehículos', route: '/home/vehicles' },
        { label: 'Tripulación', route: '/home/crew' },
      ],
    },
  ];

  readonly faqs: FaqItem[] = [
    {
      question: '¿Cómo puedo cambiar mis datos o revisar mi perfil?',
      answer: 'Abre Perfil desde el menú lateral. Las opciones disponibles pueden variar según los permisos de tu cuenta.',
      category: 'Cuenta',
      roles: ['admin', 'supervisor', 'conductor', 'mecanico', 'crew', 'user'],
    },
    {
      question: '¿Por qué no veo una sección en el menú?',
      answer: 'Las secciones dependen del rol asignado a tu cuenta. Si necesitas acceso por tus funciones, consulta con la administración.',
      category: 'Cuenta',
      roles: ['admin', 'supervisor', 'conductor', 'mecanico', 'crew', 'user'],
    },
    {
      question: '¿Cómo recibo avisos en la pantalla o barra de notificaciones?',
      answer: 'Abre la campana y selecciona Activar avisos del navegador. Acepta el permiso cuando el navegador lo solicite. La app debe estar abierta, conectada y con tu sesión iniciada para mostrar los avisos nuevos.',
      category: 'Notificaciones',
      roles: ['admin', 'supervisor', 'conductor', 'mecanico', 'crew', 'user'],
    },
    {
      question: '¿Llegarán avisos si cierro la app o mi sesión?',
      answer: 'No. Estos son avisos locales del navegador, no push remotos. Si la app está cerrada, sin conexión o cerraste sesión, no se recibirán avisos nuevos.',
      category: 'Notificaciones',
      roles: ['admin', 'supervisor', 'conductor', 'mecanico', 'crew', 'user'],
    },
    {
      question: '¿Cómo desactivo los avisos del navegador?',
      answer: 'En la campana, selecciona Desactivar avisos del navegador. También puedes revocar el permiso desde la configuración de notificaciones de tu navegador.',
      category: 'Notificaciones',
      roles: ['admin', 'supervisor', 'conductor', 'mecanico', 'crew', 'user'],
    },
    {
      question: '¿Qué hago si no aparece un aviso?',
      answer: 'Verifica que la app siga abierta y conectada, que tengas una sesión iniciada y que el permiso de notificaciones esté concedido para este sitio.',
      category: 'Notificaciones',
      roles: ['admin', 'supervisor', 'conductor', 'mecanico', 'crew', 'user'],
    },
    {
      question: '¿Cómo inicio y finalizo una jornada?',
      answer: 'El supervisor crea un informe en Informe de Jornada, registra los viajes y al terminar elige Finalizar jornada. La ubicación se sigue durante la jornada activa.',
      category: 'Operaciones',
      roles: ['supervisor'],
    },
    {
      question: '¿Por qué no puedo crear otro informe de jornada?',
      answer: 'Puede haber informes de viaje de esa fecha todavía sin finalizar. Revísalos y ciérralos antes de crear el siguiente informe.',
      category: 'Operaciones',
      roles: ['supervisor'],
    },
    {
      question: '¿Cómo registro un vehículo en el taller?',
      answer: 'Desde Taller, crea un ingreso y selecciona el vehículo, el motivo, la descripción, el estado y la prioridad. Al guardarlo, el vehículo queda marcado como ingresado al taller.',
      category: 'Operaciones',
      roles: ['admin', 'supervisor', 'mecanico'],
    },
    {
      question: '¿Qué pasa cuando un vehículo queda listo?',
      answer: 'Al actualizar el registro del taller al estado Listo, el sistema lo marca como disponible nuevamente.',
      category: 'Operaciones',
      roles: ['admin', 'supervisor', 'mecanico'],
    },
    {
      question: '¿Cómo se reporta una emergencia?',
      answer: 'El supervisor abre Emergencia, elige el vehículo, selecciona el tipo de situación y agrega una descripción. Administración recibe el aviso dentro de la aplicación.',
      category: 'Emergencias',
      roles: ['admin', 'supervisor', 'mecanico'],
    },
    {
      question: '¿Cómo solicito un mecánico para una emergencia?',
      answer: 'Administración puede seleccionar Solicitar mecánico dentro del reporte. El mecánico recibe el aviso en la app y puede actualizar el estado mientras atiende el caso.',
      category: 'Emergencias',
      roles: ['admin', 'mecanico'],
    },
    {
      question: '¿Qué hago si olvidé mi contraseña?',
      answer: 'En la pantalla de inicio de sesión utiliza la opción para recuperar la contraseña y sigue las instrucciones que aparecen.',
      category: 'Cuenta',
      roles: ['admin', 'supervisor', 'conductor', 'mecanico', 'crew', 'user'],
    },
    {
      question: '¿Cómo envío una queja sobre el servicio?',
      answer: 'Abre Quejas, selecciona Nueva Queja y completa un asunto claro junto con una descripción de lo ocurrido. Pulsa Guardar y comprueba que el registro aparezca en la lista.',
      category: 'Operaciones',
      roles: ['user'],
    },
    {
      question: '¿Qué información debo incluir en una queja?',
      answer: 'Explica qué ocurrió, dónde y cuándo, e incluye solo los detalles necesarios para que administración pueda revisar el caso. No incluyas contraseñas ni datos personales innecesarios.',
      category: 'Operaciones',
      roles: ['user'],
    },
    {
      question: '¿Cómo consulto el horario de recolección?',
      answer: 'Abre Horarios desde el menú y revisa el día correspondiente. Si el sistema indica que no hay recorrido asignado o que el horario no está publicado, confirma la información con administración.',
      category: 'Operaciones',
      roles: ['user', 'conductor', 'crew'],
    },
    {
      question: '¿Cómo consulto el estado de un mantenimiento?',
      answer: 'En Taller busca el vehículo por su identificación y revisa la razón de ingreso, prioridad y estado actual. Actualiza el registro solo cuando el avance del trabajo lo justifique.',
      category: 'Operaciones',
      roles: ['mecanico'],
    },
    {
      question: '¿Qué debo hacer si el vehículo necesita una reparación?',
      answer: 'Revisa el ingreso en Taller, confirma que sea el vehículo correcto y actualiza el estado y los detalles conforme avances. Marca el vehículo como listo solo después de completar y comprobar el trabajo.',
      category: 'Operaciones',
      roles: ['mecanico'],
    },
    {
      question: '¿Qué información debo comunicar ante un incidente en ruta?',
      answer: 'Informa al supervisor la identificación del vehículo, la ubicación, qué ocurrió y si la unidad puede continuar. No supongas un diagnóstico mecánico; administración coordinará el apoyo necesario.',
      category: 'Emergencias',
      roles: ['conductor', 'crew'],
    },
    {
      question: '¿Cómo publico un anuncio para el equipo?',
      answer: 'Abre Anuncio, redacta un título y un mensaje claros, selecciona el público y el destino disponibles, y revisa los destinatarios antes de enviar.',
      category: 'Notificaciones',
      roles: ['admin'],
    },
  ];

  get currentRole(): GuideRole {
    const role = this.authService.getCurrentRole();
    return this.guides.some((guide) => guide.id === role) ? (role as GuideRole) : 'user';
  }

  get currentGuide(): RoleGuide {
    return this.guides.find((guide) => guide.id === this.currentRole) ?? this.guides[0];
  }

  get filteredFaqs(): FaqItem[] {
    return this.faqs.filter((faq) => {
      return faq.roles.includes(this.currentRole)
        && (this.activeCategory === 'Todas' || faq.category === this.activeCategory);
    });
  }

  get availableCategories(): Array<FaqCategory | 'Todas'> {
    const roleCategories = new Set(
      this.faqs
        .filter((faq) => faq.roles.includes(this.currentRole))
        .map((faq) => faq.category),
    );
    return ['Todas', ...this.categoryOrder.filter((category) => roleCategories.has(category))];
  }

  selectCategory(category: FaqCategory | 'Todas'): void {
    this.activeCategory = category;
  }

  toggleGuide(): void {
    this.guideExpanded = !this.guideExpanded;
  }

  async downloadRoleManual(): Promise<void> {
    try {
      await this.userGuidePdfService.generate(this.currentGuide.id);
      this.messageService.add({
        severity: 'success',
        summary: 'Manual descargado',
        detail: `Se descargó el manual para ${this.currentGuide.title}.`,
      });
    } catch (error) {
      console.error('No se pudo generar el manual de usuario:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'No se pudo generar el PDF',
        detail: 'Inténtalo de nuevo. Si el problema continúa, contacta con administración.',
      });
    }
  }

  toggleFaq(question: string): void {
    this.expandedFaq = this.expandedFaq === question ? null : question;
  }
}
