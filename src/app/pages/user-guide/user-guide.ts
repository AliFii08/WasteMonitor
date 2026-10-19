import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../@core/services/auth.service';

type GuideRole = 'admin' | 'supervisor' | 'mecanico' | 'crew' | 'conductor' | 'user';
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

  activeCategory: FaqCategory | 'Todas' = 'Todas';
  expandedFaq: string | null = null;
  guideExpanded = false;

  readonly categories: Array<FaqCategory | 'Todas'> = [
    'Todas',
    'Cuenta',
    'Operaciones',
    'Notificaciones',
    'Emergencias',
  ];

  readonly guides: RoleGuide[] = [
    {
      id: 'user',
      title: 'Usuario',
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
        { label: 'Informe administrativo', route: '/home/admin-journey-report' },
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
    },
    {
      question: '¿Por qué no veo una sección en el menú?',
      answer: 'Las secciones dependen del rol asignado a tu cuenta. Si necesitas acceso por tus funciones, consulta con la administración.',
      category: 'Cuenta',
    },
    {
      question: '¿Cómo recibo avisos en la pantalla o barra de notificaciones?',
      answer: 'Abre la campana y selecciona Activar avisos del navegador. Acepta el permiso cuando el navegador lo solicite. La app debe estar abierta, conectada y con tu sesión iniciada para mostrar los avisos nuevos.',
      category: 'Notificaciones',
    },
    {
      question: '¿Llegarán avisos si cierro la app o mi sesión?',
      answer: 'No. Estos son avisos locales del navegador, no push remotos. Si la app está cerrada, sin conexión o cerraste sesión, no se recibirán avisos nuevos.',
      category: 'Notificaciones',
    },
    {
      question: '¿Cómo desactivo los avisos del navegador?',
      answer: 'En la campana, selecciona Desactivar avisos del navegador. También puedes revocar el permiso desde la configuración de notificaciones de tu navegador.',
      category: 'Notificaciones',
    },
    {
      question: '¿Qué hago si no aparece un aviso?',
      answer: 'Verifica que la app siga abierta y conectada, que tengas una sesión iniciada y que el permiso de notificaciones esté concedido para este sitio.',
      category: 'Notificaciones',
    },
    {
      question: '¿Cómo inicio y finalizo una jornada?',
      answer: 'El supervisor crea un informe en Informe de Jornada, registra los viajes y al terminar elige Finalizar jornada. La ubicación se sigue durante la jornada activa.',
      category: 'Operaciones',
    },
    {
      question: '¿Por qué no puedo crear otro informe de jornada?',
      answer: 'Puede haber informes de viaje de esa fecha todavía sin finalizar. Revísalos y ciérralos antes de crear el siguiente informe.',
      category: 'Operaciones',
    },
    {
      question: '¿Cómo registro un vehículo en el taller?',
      answer: 'Desde Taller, crea un ingreso y selecciona el vehículo, el motivo, la descripción, el estado y la prioridad. Al guardarlo, el vehículo queda marcado como ingresado al taller.',
      category: 'Operaciones',
    },
    {
      question: '¿Qué pasa cuando un vehículo queda listo?',
      answer: 'Al actualizar el registro del taller al estado Listo, el sistema lo marca como disponible nuevamente.',
      category: 'Operaciones',
    },
    {
      question: '¿Cómo se reporta una emergencia?',
      answer: 'El supervisor abre Emergencia, elige el vehículo, selecciona el tipo de situación y agrega una descripción. Administración recibe el aviso dentro de la aplicación.',
      category: 'Emergencias',
    },
    {
      question: '¿Cómo solicito un mecánico para una emergencia?',
      answer: 'Administración puede seleccionar Solicitar mecánico dentro del reporte. El mecánico recibe el aviso en la app y puede actualizar el estado mientras atiende el caso.',
      category: 'Emergencias',
    },
    {
      question: '¿Qué hago si olvidé mi contraseña?',
      answer: 'En la pantalla de inicio de sesión utiliza la opción para recuperar la contraseña y sigue las instrucciones que aparecen.',
      category: 'Cuenta',
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
      return this.activeCategory === 'Todas' || faq.category === this.activeCategory;
    });
  }

  selectCategory(category: FaqCategory | 'Todas'): void {
    this.activeCategory = category;
  }

  toggleGuide(): void {
    this.guideExpanded = !this.guideExpanded;
  }

  toggleFaq(question: string): void {
    this.expandedFaq = this.expandedFaq === question ? null : question;
  }
}
