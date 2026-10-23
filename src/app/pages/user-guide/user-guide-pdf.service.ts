import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import { loadWasteMonitorLogo } from '../../@core/services/pdf-report.service';

export type GuideRole = 'admin' | 'supervisor' | 'mecanico' | 'crew' | 'conductor' | 'user';

interface ManualSection {
  title: string;
  paragraphs: string[];
  steps?: string[];
}

interface RoleManual {
  description: string;
  sections: ManualSection[];
}

const ROLE_NAMES: Record<GuideRole, string> = {
  admin: 'Administrador',
  supervisor: 'Supervisor',
  conductor: 'Conductor',
  mecanico: 'Mecánico',
  crew: 'Tripulación',
  user: 'Ciudadano',
};

const MANUALS: Record<GuideRole, RoleManual> = {
  admin: {
    description:
      'Guía detallada para supervisar la operación, administrar recursos, atender reportes y comunicar avisos desde WasteMonitor.',
    sections: [
      {
        title: '1. Alcance del rol y navegación',
        paragraphs: [
          'La cuenta de Administrador reúne las herramientas de coordinación general. El menú lateral organiza Inicio, Horarios, Dashboard, Rutas, Vehículos, Tripulación, Informe Administrativo, Usuarios, Taller, Quejas e Informe de Jornada. Perfil y Ayuda y manual se encuentran al final del menú.',
          'Las opciones disponibles dependen de los permisos de la cuenta. Si una sección no aparece, confirma el rol asignado en Perfil con el responsable del sistema. Utiliza el menú para cambiar de módulo y la campana para consultar las notificaciones internas.',
        ],
      },
      {
        title: '2. Supervisar el estado del servicio',
        paragraphs: [
          'Abre Dashboard al iniciar la revisión operativa. Usa sus indicadores y vistas para consultar la información que presenta el sistema sobre vehículos, empleados e historial de operaciones. Revisa los datos con el contexto de la fecha y del registro seleccionado; un indicador es un resumen y no reemplaza la revisión del registro original.',
          'Horarios muestra la planificación semanal publicada. Si un día indica que no hay recorrido asignado o que el horario no está publicado, no lo interpretes como una asignación confirmada: coordina la programación con el equipo responsable.',
        ],
        steps: [
          'Empieza por Inicio o Dashboard y localiza los indicadores que requieren seguimiento.',
          'Abre la sección correspondiente para revisar el registro detallado antes de tomar una decisión.',
          'Utiliza Informe Administrativo para consultar informes y sus fechas, y conserva el contexto al compartir resultados.',
        ],
      },
      {
        title: '3. Administrar vehículos, tripulación y rutas',
        paragraphs: [
          'Vehículos permite revisar y mantener el registro de las unidades. Tripulación concentra la información del personal operativo. En Rutas se administran las rutas disponibles. Revisa con cuidado identificadores, asignaciones y datos antes de guardar cambios, porque otros módulos pueden utilizar esas referencias.',
          'Para registrar o actualizar personal, abre Usuarios. El formulario solicita datos como nombre, apellido, correo, teléfono y rol. Asigna únicamente el rol que corresponda a las funciones de la persona: el rol determina qué secciones y acciones verá al iniciar sesión.',
          'Cuando un módulo marque un vehículo como ingresado al taller, valida su estado antes de considerarlo disponible. El registro de mantenimiento y el estado operativo deben concordar.',
        ],
      },
      {
        title: '4. Revisar informes de jornada',
        paragraphs: [
          'Informe de Jornada reúne los registros operativos creados por supervisores. Revisa el usuario responsable, vehículo, ruta, fecha, viajes asociados y el estado de firma o cierre que muestre la pantalla. Utiliza la búsqueda para localizar registros y abre cada informe para consultar sus detalles.',
          'Informe Administrativo ofrece una vista de consulta adicional. Comprueba el periodo o los filtros activos antes de interpretar los resultados. Si exportas un PDF desde un módulo que lo ofrezca, revisa el resumen y el contenido antes de distribuirlo.',
        ],
      },
      {
        title: '5. Atender emergencias y coordinar el taller',
        paragraphs: [
          'Al abrir Emergencia, revisa el vehículo, el tipo de incidencia, la descripción y la ubicación indicada. El reporte puede describir un retraso, una solicitud de mecánico o la necesidad de una grúa. Mantén la comunicación breve y basada en el estado confirmado del caso.',
          'Cuando sea necesario, selecciona la acción de solicitar mecánico o enviar grúa disponible en el reporte. La persona mecánica recibe el caso dirigido a su rol y puede actualizar el progreso. Para fallas que requieran mantenimiento programado, usa Taller y conserva el motivo y los detalles del ingreso.',
          'En Taller, sigue el estado registrado durante el trabajo y confirma que la unidad esté realmente lista antes de tratarla como disponible. Los estados visibles pueden incluir espera de repuesto, en reparación, espera de entrega y listo.',
        ],
      },
      {
        title: '6. Publicar anuncios y usar notificaciones',
        paragraphs: [
          'El control Anuncio abre el formulario de envío. Escribe un título claro y un mensaje que indique qué ocurre, a quién afecta y cuándo habrá novedades. Selecciona el público y el destino que correspondan (por ejemplo, rol, camión, sector o ruta, según las opciones del formulario) y verifica la audiencia antes de enviar.',
          'La campana permite consultar el historial de notificaciones de la aplicación. Los avisos del navegador son locales: para recibir avisos nuevos, la aplicación debe estar abierta, conectada y con una sesión iniciada, y el permiso del navegador debe estar concedido. No se recibirán avisos nuevos cuando la aplicación esté cerrada o la sesión finalizada.',
        ],
        steps: [
          'Redacta mensajes concretos, con fecha, alcance y acción esperada cuando aplique.',
          'Comprueba los destinatarios antes de publicar; no incluyas información privada innecesaria.',
          'Tras el envío, consulta la campana para verificar el registro disponible.',
        ],
      },
      {
        title: '7. Gestionar quejas y cerrar el ciclo',
        paragraphs: [
          'En Quejas revisa el asunto y la descripción, abre el registro para conocer el contexto y utiliza las acciones de administración disponibles para revisarlo o actualizarlo. Evita cerrar o cambiar un estado sin dejar la información necesaria para que el equipo entienda la resolución.',
          'Al terminar una revisión, confirma que los datos se hayan guardado y que el estado refleje la situación real. Si falta información, coordina con quien reportó el caso en vez de asumir detalles que no aparecen en el registro.',
        ],
      },
      {
        title: '8. Buenas prácticas y solución de problemas',
        paragraphs: [
          'Mantén los roles y datos de usuarios actualizados, verifica dos veces las selecciones que afecten a vehículos o destinatarios y evita usar cuentas compartidas. Si una pantalla no muestra información, confirma la conexión, actualiza la vista y comprueba que estés en el módulo y periodo correctos.',
          'Si el acceso a una sección está restringido, no intentes eludirlo: solicita que revisen los permisos de la cuenta. Para avisos de navegador, comprueba tanto el permiso del sitio como el estado de la campana dentro de la aplicación.',
        ],
      },
    ],
  },
  supervisor: {
    description:
      'Guía de trabajo para iniciar y cerrar jornadas, registrar viajes y coordinar incidencias con administración y taller.',
    sections: [
      {
        title: '1. Tu espacio de trabajo',
        paragraphs: [
          'El menú de Supervisor incluye Inicio, Horarios e Informe de Jornada, además de las secciones operativas autorizadas como Usuarios y Taller. Perfil y Ayuda y manual están al final. Utiliza el menú para entrar al módulo requerido y la campana para revisar avisos.',
          'El Informe de Jornada es el lugar para iniciar el seguimiento de una jornada y registrar sus viajes. Los informes quedan asociados a la cuenta que los crea, por lo que debes trabajar con tu propia sesión. El Informe Administrativo corresponde exclusivamente a la administración.',
        ],
      },
      {
        title: '2. Preparar e iniciar una jornada',
        paragraphs: [
          'Antes de crear el informe, confirma el día de trabajo y los datos operativos que utilizarás. La aplicación puede impedir iniciar otro informe si ya existen informes de viaje de esa fecha sin finalizar. Revisa primero los registros activos y completa o finaliza el que corresponda.',
        ],
        steps: [
          'Abre Informe de Jornada y selecciona la opción para crear un informe.',
          'Completa los datos solicitados, verifica el vehículo y la ruta y guarda el informe.',
          'Confirma en la lista que el informe aparece activo antes de iniciar las tareas en campo.',
        ],
      },
      {
        title: '3. Registrar los viajes',
        paragraphs: [
          'En el informe activo agrega cada viaje por separado. Describe el recorrido y registra la dirección y las toneladas en los campos disponibles. Asegúrate de que la información corresponda al viaje real y al vehículo del informe; evita acumular varios viajes en una sola descripción si el sistema ofrece registros individuales.',
          'Guarda cada registro y revisa que aparezca asociado al informe correcto. Si necesitas corregir un dato, usa la acción de edición permitida antes de finalizar la jornada.',
        ],
      },
      {
        title: '4. Finalizar la jornada y el seguimiento',
        paragraphs: [
          'Al concluir el trabajo, confirma que los viajes y datos necesarios estén registrados. Usa Finalizar jornada desde el informe activo. Esta acción cierra el seguimiento de ubicación iniciado con la jornada; revisa el informe después de la operación para confirmar que dejó de figurar como activo.',
          'No finalices un informe por error: asegúrate de estar en el informe correcto y de haber guardado los últimos viajes. Si un informe no se puede cerrar, revisa los datos pendientes o consulta con administración.',
        ],
      },
      {
        title: '5. Informar emergencias y problemas del vehículo',
        paragraphs: [
          'El control Emergencia permite informar una avería en los roles que tienen habilitado el formulario. Indica la identificación del camión, selecciona el tipo de situación (retraso, necesidad de mecánico o grúa) y explica el problema junto con su ubicación. Envía el reporte para que administración pueda coordinar una respuesta.',
          'Describe hechos observables, no supongas el diagnóstico mecánico. Si el formulario no está disponible en el momento, comunícate con administración por el canal operativo establecido. Para un ingreso no urgente a mantenimiento, registra el vehículo en Taller cuando la opción esté disponible.',
        ],
      },
      {
        title: '6. Revisar notificaciones',
        paragraphs: [
          'La campana reúne las notificaciones de la aplicación y puede avisarte de eventos operativos. La elaboración y consulta de informes administrativos corresponde al administrador; el informe del supervisor es el Informe de Jornada.',
          'Los avisos del navegador requieren permiso concedido y aplicación abierta, conectada y con sesión iniciada. Son avisos locales, no notificaciones remotas: si cierras la aplicación o la sesión, no recibirás nuevos avisos hasta volver a abrirla.',
        ],
      },
      {
        title: '7. Lista de comprobación y solución de problemas',
        paragraphs: [
          'Antes de salir, confirma vehículo y ruta. Durante la jornada, registra viajes tan pronto como sea posible. Al terminar, revisa los datos y cierra el informe. Si el informe no aparece, confirma que estás conectado y que la fecha o búsqueda no lo están filtrando. Si no puedes crear otro, busca informes activos de la fecha y finalízalos únicamente cuando corresponda.',
          'Si una acción está bloqueada o falta una sección necesaria, pide a administración que verifique los permisos de tu cuenta. No compartas tus credenciales.',
        ],
      },
    ],
  },
  conductor: {
    description:
      'Guía práctica para consultar información operativa, mantenerse al tanto de los avisos y comunicar incidentes en ruta.',
    sections: [
      {
        title: '1. Acceder a tu espacio',
        paragraphs: [
          'Como Conductor puedes utilizar Inicio, Horarios, Dashboard, Vehículos, Tripulación y Usuarios según los permisos configurados para la cuenta. Perfil y Ayuda y manual están al final del menú. No todas las cuentas muestran las mismas acciones; trabaja solo con las opciones habilitadas.',
          'Antes de iniciar una tarea, confirma que estás usando tu propia sesión y que la información de Inicio corresponde al servicio que necesitas consultar.',
        ],
      },
      {
        title: '2. Consultar datos de vehículos y equipo',
        paragraphs: [
          'Abre Vehículos para consultar los datos de las unidades visibles para tu rol. Utiliza la identificación del vehículo correcta cuando hables con el supervisor o administración. No des por disponible una unidad que figure ingresada al taller o con mantenimiento pendiente.',
          'Tripulación muestra información del personal operativo. Utilízala para identificar el equipo de trabajo y coordinarte con las personas asignadas. Si observas una discrepancia en una asignación, comunícala al supervisor; no asumas que puedes modificarla si no aparece esa acción.',
        ],
      },
      {
        title: '3. Revisar horarios y avisos',
        paragraphs: [
          'Horarios presenta la programación semanal publicada. Si aparece que no hay recorrido asignado o que el horario no está publicado, confirma la planificación con tu supervisor antes de actuar basándote en un horario supuesto.',
          'Abre la campana para consultar notificaciones y anuncios. Para activar avisos del navegador, concede el permiso solicitado y deja la aplicación abierta, conectada y con tu sesión iniciada. Los avisos son locales al navegador y no llegan cuando la aplicación está cerrada.',
        ],
      },
      {
        title: '4. Actuar ante un incidente',
        paragraphs: [
          'Ante una avería, retraso u otra situación que afecte el recorrido, informa al supervisor cuanto antes. Comparte identificación del vehículo, ubicación, qué ocurrió y si la unidad puede continuar. Usa el control de Emergencia solo si el formulario está habilitado en tu cuenta; algunas acciones de reporte y coordinación pueden estar reservadas a otros roles.',
          'No registres diagnósticos que no hayas confirmado ni marques un vehículo como operativo si continúa con una falla. Administración coordina el apoyo y puede solicitar la intervención de un mecánico o una grúa.',
        ],
        steps: [
          'Detalla primero la ubicación y la condición actual del vehículo.',
          'Indica si hay retraso, si se necesita mecánico o si el camión no puede continuar.',
          'Mantén informado al supervisor cuando cambie la situación y sigue la coordinación recibida.',
        ],
      },
      {
        title: '5. Buenas prácticas',
        paragraphs: [
          'Consulta el horario antes del recorrido, verifica la identificación de la unidad y revisa la campana al comenzar el turno. Comparte únicamente la información necesaria para resolver el incidente. Si pierdes acceso, la sección esperada no aparece o los datos parecen desactualizados, confirma tu conexión y contacta al supervisor o administrador.',
          'No compartas contraseñas. Si necesitas modificar datos de perfil, utiliza Perfil y sigue las opciones disponibles para tu cuenta.',
        ],
      },
    ],
  },
  mecanico: {
    description:
      'Guía de mantenimiento para revisar ingresos al taller, actualizar el progreso y responder a solicitudes de asistencia.',
    sections: [
      {
        title: '1. Navegación y responsabilidades',
        paragraphs: [
          'El menú de Mecánico incluye las secciones autorizadas para el trabajo, entre ellas Taller, Usuarios y la campana de notificaciones. Emergencia muestra reportes y solicitudes dirigidos a mecánicos cuando están disponibles. Perfil y Ayuda y manual están al final del menú.',
          'Utiliza los registros del sistema como fuente del estado de cada caso. No marques una unidad como lista hasta completar el trabajo y verificar que puede volver a operación.',
        ],
      },
      {
        title: '2. Revisar el tablero de Taller',
        paragraphs: [
          'Abre Taller para consultar los vehículos ingresados, su razón de ingreso, la descripción, prioridad y estado del mantenimiento. Usa la búsqueda para localizar un vehículo por su identificación, motivo o estado. Antes de modificar un registro, confirma que seleccionaste la unidad correcta.',
          'Los estados operativos pueden incluir espera de repuesto, en reparación, espera de entrega y listo. El estado debe reflejar el paso real del trabajo, no la intención de iniciar una tarea.',
        ],
      },
      {
        title: '3. Actualizar un mantenimiento',
        paragraphs: [
          'Abre el registro correspondiente y actualiza el estado y los detalles disponibles. Explica el trabajo realizado o lo que falta, con suficiente claridad para que administración y operación comprendan la situación. Si el vehículo está esperando una pieza, conserva ese estado hasta que la pieza esté disponible.',
        ],
        steps: [
          'Confirma la identificación del vehículo y lee el motivo y la descripción de ingreso.',
          'Actualiza el estado al comenzar o cuando cambie la etapa del mantenimiento.',
          'Añade detalles concretos sobre el avance o el pendiente en los campos habilitados.',
          'Selecciona Listo solo después de terminar y comprobar el trabajo; verifica que el registro se haya actualizado.',
        ],
      },
      {
        title: '4. Atender una emergencia',
        paragraphs: [
          'Revisa los reportes de emergencia dirigidos al equipo mecánico. Comprueba el vehículo, la descripción y la ubicación antes de aceptar o actualizar una acción. Conforme avances, utiliza las acciones disponibles para comunicar el estado real del caso.',
          'Si el reporte indica que el camión no puede continuar o solicita grúa, no sustituyas esa acción por una reparación no confirmada. Coordina con administración y actualiza el progreso para evitar que otros equipos trabajen con información desactualizada.',
        ],
      },
      {
        title: '5. Notificaciones y coordinación',
        paragraphs: [
          'La campana muestra notificaciones internas relacionadas con la operación. Los avisos del navegador necesitan permiso y solo se presentan mientras la aplicación esté abierta, conectada y con sesión iniciada; no son push remotos.',
          'Cuando termines un caso, deja el registro en el estado correspondiente y comunica cualquier limitación relevante a administración. Evita incluir datos personales innecesarios en las notas de mantenimiento.',
        ],
      },
      {
        title: '6. Si un registro no aparece o no se actualiza',
        paragraphs: [
          'Comprueba que la búsqueda no esté filtrando el registro, que la conexión siga activa y que seleccionaste el vehículo correcto. Actualiza la vista y vuelve a abrir el caso. Si la acción no está permitida o el registro sigue sin aparecer, solicita apoyo a administración; no crees duplicados para sustituir un registro que no encuentras.',
        ],
      },
    ],
  },
  crew: {
    description:
      'Guía para el personal de Tripulación: consulta de información de operación, coordinación con el conductor y comunicación de incidentes.',
    sections: [
      {
        title: '1. Tu cuenta y las secciones disponibles',
        paragraphs: [
          'Tripulación puede consultar Inicio, Horarios, Dashboard, Vehículos, Tripulación y Usuarios conforme a los permisos de su cuenta. La disponibilidad de acciones depende del rol; algunas herramientas de administración o edición no estarán disponibles. Perfil y Ayuda y manual están al final del menú.',
          'Inicia sesión con tu propia cuenta y revisa el menú para conocer las funciones habilitadas. Si falta una sección necesaria para tu trabajo, comunícalo al supervisor o a administración.',
        ],
      },
      {
        title: '2. Consultar vehículo, equipo y horarios',
        paragraphs: [
          'En Vehículos consulta la información de la unidad que se utilizará. En Tripulación revisa los datos visibles del personal operativo para facilitar la coordinación. Si notas que la información no coincide con el equipo del día, pide al supervisor que verifique la asignación.',
          'Horarios muestra la programación semanal publicada. Un día que indique que no hay recorrido asignado o que el horario no está publicado no confirma una ruta: valida la información con el supervisor antes de organizar el trabajo.',
        ],
      },
      {
        title: '3. Mantenerse al tanto',
        paragraphs: [
          'Abre la campana para consultar notificaciones y anuncios dirigidos a tu rol. Si deseas avisos del navegador, actívalos desde el panel de notificaciones y acepta el permiso del navegador.',
          'Los avisos del navegador son locales y requieren que la aplicación permanezca abierta, conectada y con sesión activa. No se reciben avisos nuevos si cierras la aplicación o finalizas la sesión; el historial visible en la campana depende de las notificaciones guardadas.',
        ],
      },
      {
        title: '4. Comunicar un incidente',
        paragraphs: [
          'Si ocurre una incidencia durante la operación, informa al conductor o supervisor de inmediato. Describe dónde ocurrió, qué observaste y cómo afecta al recorrido. Incluye la identificación del vehículo para que el equipo pueda localizar el registro correcto.',
          'No supongas el diagnóstico ni uses una acción de emergencia si el formulario no está habilitado para tu cuenta. El supervisor o administración coordina el reporte y, si se requiere, solicita mecánico o grúa.',
        ],
        steps: [
          'Comunica los hechos y la ubicación con claridad.',
          'Indica si el vehículo puede continuar o si la operación debe detenerse.',
          'Informa al supervisor si la situación cambia o si aparece un nuevo riesgo operativo.',
        ],
      },
      {
        title: '5. Resolver dificultades de acceso',
        paragraphs: [
          'Si la información no aparece, confirma la conexión y revisa que no haya una búsqueda o filtro activo. Si el problema persiste, informa a tu supervisor indicando la sección y el dato que intentabas consultar. No compartas tus credenciales ni uses una cuenta de otra persona.',
        ],
      },
    ],
  },
  user: {
    description:
      'Guía para Ciudadanos: consulta de información del servicio, revisión de horarios y registro de una queja.',
    sections: [
      {
        title: '1. Entrar y orientarse',
        paragraphs: [
          'La cuenta Ciudadano utiliza las secciones habilitadas para consulta y comunicación con el servicio: Inicio, Horarios, Quejas, Perfil y Ayuda y manual. Las opciones pueden variar si la administración actualiza los permisos de la cuenta.',
          'Desde el menú lateral abre la sección que necesitas. Si utilizas un teléfono, abre el menú con el botón correspondiente y vuelve a cerrarlo después de seleccionar una página.',
        ],
      },
      {
        title: '2. Consultar rutas y horarios',
        paragraphs: [
          'Inicio permite consultar la información de rutas que presenta la aplicación. Horarios muestra la programación semanal publicada para la parroquia. Revisa el día que te interesa y observa el estado de publicación.',
          'Si un día muestra que no hay recorrido asignado o que el horario no está publicado, la aplicación no está confirmando un horario para ese día. Consulta de nuevo más tarde o contacta a la administración por el canal de atención disponible; no asumas una hora que no aparezca publicada.',
        ],
      },
      {
        title: '3. Registrar una queja',
        paragraphs: [
          'Utiliza Quejas para comunicar un problema del servicio. Selecciona Nueva Queja y completa el asunto y la descripción. El asunto debe explicar brevemente el motivo (por ejemplo, un retraso en la recolección) y la descripción debe incluir contexto suficiente para que el equipo pueda entenderlo.',
        ],
        steps: [
          'Abre Quejas y selecciona Nueva Queja.',
          'Escribe un asunto claro y específico.',
          'Describe qué ocurrió, dónde y cuándo; incluye solo información relevante.',
          'Pulsa Guardar y espera a que termine el envío antes de cerrar el formulario.',
          'Busca la queja en la lista para comprobar que quedó registrada. Si no aparece, verifica la conexión y vuelve a cargar la sección antes de enviarla otra vez.',
        ],
      },
      {
        title: '4. Revisar una queja y proteger tus datos',
        paragraphs: [
          'La lista de Quejas permite consultar los registros disponibles para tu cuenta. La administración puede ver el estado y gestionar los casos; las acciones de edición dependen del rol. Si necesitas agregar información o corregir un error, comunícate con la administración y explica el asunto de la queja.',
          'No incluyas contraseñas, datos bancarios ni información personal de terceros en la descripción. Comparte solo los datos necesarios para identificar y resolver el problema.',
        ],
      },
      {
        title: '5. Perfil y avisos',
        paragraphs: [
          'Abre Perfil para revisar las opciones disponibles de tu cuenta. Para notificaciones, la campana muestra avisos guardados. Puedes activar los avisos del navegador desde ese panel y conceder el permiso cuando el navegador lo solicite.',
          'Los avisos del navegador son locales, no push remotos. Para ver avisos nuevos, WasteMonitor debe permanecer abierta, conectada y con la sesión iniciada. No se recibirán cuando cierres la aplicación o la sesión.',
        ],
      },
      {
        title: '6. Si necesitas ayuda',
        paragraphs: [
          'Si no puedes iniciar sesión, usa la opción de recuperación de contraseña en la pantalla de acceso y sigue las instrucciones. Si no ves una página o no puedes registrar una queja, confirma tu conexión y contacta a la persona administradora de WasteMonitor. Indica qué intentabas hacer y el mensaje que apareció, pero nunca envíes tu contraseña.',
        ],
      },
    ],
  },
};

@Injectable({ providedIn: 'root' })
export class UserGuidePdfService {
  async generate(role: GuideRole): Promise<void> {
    const manual = MANUALS[role];
    if (!manual) throw new Error(`No hay un manual definido para el rol "${role}".`);

    const roleName = ROLE_NAMES[role];
    const logoData = await loadWasteMonitorLogo();
    const document = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = document.internal.pageSize.getWidth();
    const pageHeight = document.internal.pageSize.getHeight();
    const margin = 18;
    const contentWidth = pageWidth - margin * 2;
    const footerSpace = 18;
    let cursorY = 44;
    const generatedAt = new Date().toLocaleString('es-ES');

    const drawPageHeader = (): void => {
      document.setFillColor(0, 54, 40);
      document.rect(0, 0, pageWidth, 34, 'F');
      document.setFillColor(104, 163, 87);
      document.rect(0, 34, pageWidth, 2, 'F');
      document.setTextColor(255, 255, 255);
      document.setFont('helvetica', 'bold');
      document.setFontSize(18);
      document.addImage(logoData, 'PNG', 14, 9, 14, 14);
      document.text(`Manual de Usuario ${roleName}`, 34, 16, { maxWidth: pageWidth - 48 });
      document.setFont('helvetica', 'normal');
      document.setFontSize(9);
      document.text(`Generado: ${generatedAt}`, 34, 25);
      document.setTextColor(31, 55, 46);
    };

    const addPage = (): void => {
      document.addPage();
      drawPageHeader();
      cursorY = 44;
    };

    const ensureSpace = (height: number): void => {
      if (cursorY + height > pageHeight - footerSpace) addPage();
    };

    const writeParagraph = (
      text: string,
      options: { fontSize?: number; color?: [number, number, number]; indent?: number } = {},
    ): void => {
      const fontSize = options.fontSize ?? 10;
      const indent = options.indent ?? 0;
      const lineHeight = fontSize * 0.48;
      document.setFont('helvetica', 'normal');
      document.setFontSize(fontSize);
      document.setTextColor(...(options.color ?? [49, 69, 59]));
      const lines = document.splitTextToSize(text, contentWidth - indent) as string[];
      const maxLinesPerPage = Math.max(1, Math.floor((pageHeight - footerSpace - 34) / lineHeight));
      let offset = 0;

      while (offset < lines.length) {
        const availableLines = Math.max(
          1,
          Math.floor((pageHeight - footerSpace - cursorY) / lineHeight),
        );
        if (availableLines < 2 && lines.length - offset > availableLines) {
          addPage();
          continue;
        }
        const count = Math.min(lines.length - offset, availableLines, maxLinesPerPage);
        document.text(lines.slice(offset, offset + count), margin + indent, cursorY);
        cursorY += count * lineHeight;
        offset += count;
        if (offset < lines.length) addPage();
      }
      cursorY += 2.5;
    };

    drawPageHeader();
    document.setFont('helvetica', 'normal');
    document.setFontSize(11);
    document.setTextColor(55, 75, 65);
    const descriptionLines = document.splitTextToSize(manual.description, contentWidth) as string[];
    document.text(descriptionLines, margin, cursorY);
    cursorY += descriptionLines.length * 6 + 3;

    document.setDrawColor(104, 163, 87);
    document.setLineWidth(0.6);
    document.line(margin, cursorY, pageWidth - margin, cursorY);
    cursorY += 10;

    for (const section of manual.sections) {
      document.setFont('helvetica', 'bold');
      document.setFontSize(13);
      document.setTextColor(15, 75, 58);
      const headingLines = document.splitTextToSize(section.title, contentWidth) as string[];
      ensureSpace(headingLines.length * 6 + 8);
      document.text(headingLines, margin, cursorY);
      cursorY += headingLines.length * 6 + 2;

      for (const paragraph of section.paragraphs) {
        writeParagraph(paragraph);
      }

      if (section.steps?.length) {
        section.steps.forEach((step, index) => {
          writeParagraph(`${index + 1}. ${step}`, { indent: 2 });
        });
      }
      cursorY += 4;
    }

    const pageCount = document.getNumberOfPages();
    for (let page = 1; page <= pageCount; page += 1) {
      document.setPage(page);
      document.setDrawColor(218, 230, 222);
      document.setLineWidth(0.3);
      document.line(margin, pageHeight - 13, pageWidth - margin, pageHeight - 13);
      document.setFont('helvetica', 'normal');
      document.setFontSize(8);
      document.setTextColor(88, 105, 96);
      document.text('WasteMonitor · Manual de usuario', margin, pageHeight - 8);
      document.text(`Página ${page} de ${pageCount}`, pageWidth - margin, pageHeight - 8, {
        align: 'right',
      });
    }

    document.save(`Manual de Usuario ${roleName}.pdf`);
  }
}