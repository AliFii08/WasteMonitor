const fs = require('fs');
const os = require('os');
const path = require('path');

const roots = [process.cwd(), path.join(os.tmpdir(), 'wastemonitor-pptx-tool', 'node_modules')];
const pptxgen = require(require.resolve('pptxgenjs', { paths: roots }));
const pptx = new pptxgen();
pptx.layout = 'LAYOUT_WIDE';
pptx.author = 'WasteMonitor';
pptx.subject = 'Diagramas UML y de flujo de WasteMonitor';
pptx.title = 'WasteMonitor: diagramas de procesos';
pptx.lang = 'es-ES';
pptx.theme = { headFontFace: 'Aptos Display', bodyFontFace: 'Aptos', lang: 'es-ES' };

const W = 13.333;
const H = 7.5;
const S = pptx.ShapeType;
const C = {
  ink: '17231F', text: '30423A', muted: '5F7066', green: '287D68',
  greenLight: 'EAF1EB', blue: '4C7D91', blueLight: 'EEF3F5',
  coral: 'D46A4C', coralLight: 'F9EEE9', gold: 'A77B39',
  goldLight: 'F5F0E6', line: '718278', border: 'BCC9C0', white: 'FFFFFF',
};

function addText(slide, value, x, y, w, h, options = {}) {
  slide.addText(value, {
    x, y, w, h, margin: 0.04, breakLine: false, fit: 'shrink', valign: 'mid',
    fontFace: 'Aptos', fontSize: 11, color: C.ink, ...options,
  });
}

function rect(slide, x, y, w, h, fill = C.white, stroke = C.border, rounded = true) {
  slide.addShape(rounded ? S.roundRect : S.rect, {
    x, y, w, h, rectRadius: 0.04,
    fill: { color: fill }, line: { color: stroke, width: 1.1 },
  });
}

function connector(slide, x1, y1, x2, y2, options = {}) {
  slide.addShape(S.line, {
    x: x1, y: y1, w: x2 - x1, h: y2 - y1,
    line: {
      color: options.color || C.line,
      width: options.width || 1.25,
      endArrowType: options.arrow === false ? 'none' : 'triangle',
      dashType: options.dash ? 'dash' : 'solid',
    },
  });
}

function beginSlide(type, title, subtitle = '') {
  const slide = pptx.addSlide();
  slide.background = { color: C.white };
  slide.addShape(S.rect, { x: 0, y: 0, w: 0.12, h: H, line: { color: C.green, transparency: 100 }, fill: { color: C.green } });
  addText(slide, type.toUpperCase(), 0.55, 0.25, 12, 0.22, { fontSize: 9, bold: true, color: C.green, charSpacing: 0.25 });
  addText(slide, title, 0.55, 0.5, 12.1, 0.48, { fontFace: 'Aptos Display', fontSize: 24, bold: true });
  if (subtitle) addText(slide, subtitle, 0.58, 1.02, 12, 0.3, { fontSize: 10.5, color: C.muted, valign: 'top' });
  slide.addShape(S.line, { x: 0.55, y: 7.27, w: 12.2, h: 0, line: { color: 'DFE6E1', width: 0.8 } });
  addText(slide, 'WASTEMONITOR · DOCUMENTACIÓN DE PROCESOS', 0.58, 7.32, 6, 0.12, { fontSize: 7, color: C.muted });
  addText(slide, String(pptx._slides.length).padStart(2, '0'), 12.1, 7.3, 0.55, 0.13, { fontSize: 7.5, color: C.muted, align: 'right' });
  return slide;
}

function footerNote(slide, value, options = {}) {
  const y = options.y || 6.73;
  rect(slide, 0.72, y, 11.9, 0.29, options.fill || 'F3F6F3', options.stroke || 'E1E8E3');
  addText(slide, value, 0.87, y + 0.035, 11.6, 0.2, { fontSize: 8.3, color: C.muted, align: 'left' });
}

function actor(slide, x, y, label, color = C.ink, scale = 1) {
  const head = 0.18 * scale;
  slide.addShape(S.ellipse, { x: x - head / 2, y, w: head, h: head, fill: { color: C.white, transparency: 100 }, line: { color, width: 1.1 } });
  slide.addShape(S.line, { x, y: y + head, w: 0, h: 0.37 * scale, line: { color, width: 1.1 } });
  slide.addShape(S.line, { x: x - 0.18 * scale, y: y + 0.28 * scale, w: 0.36 * scale, h: 0, line: { color, width: 1.1 } });
  slide.addShape(S.line, { x, y: y + 0.55 * scale, w: -0.14 * scale, h: 0.2 * scale, line: { color, width: 1.1 } });
  slide.addShape(S.line, { x, y: y + 0.55 * scale, w: 0.14 * scale, h: 0.2 * scale, line: { color, width: 1.1 } });
  addText(slide, label, x - 0.52 * scale, y + 0.78 * scale, 1.04 * scale, 0.33 * scale, { fontSize: 9 * scale, bold: true, align: 'center' });
}

function useCaseDiagram(title, actorName, useCases, options = {}) {
  const slide = beginSlide('Diagrama UML de casos de uso', title, options.subtitle || `Actor principal: ${actorName}. Las elipses son objetivos del actor dentro del sistema.`);
  const bx = 3.35;
  const by = 1.62;
  const bw = 9.35;
  const bh = 4.95;
  slide.addShape(S.rect, { x: bx, y: by, w: bw, h: bh, fill: { color: 'F9FBF9' }, line: { color: '7F9588', width: 1.1 } });
  addText(slide, 'WasteMonitor', bx + 0.18, by + 0.12, 2.2, 0.22, { fontSize: 10, bold: true, color: C.green, align: 'left' });
  const actorX = 1.7;
  const actorY = by + bh / 2 - 0.48;
  actor(slide, actorX, actorY, actorName, options.actorColor || C.ink, 1.05);
  const ellipseX = 5.4;
  const ellipseW = 4.75;
  const top = by + 0.65;
  const available = bh - 0.88;
  const row = available / useCases.length;
  const positions = useCases.map((uc, index) => ({ x: ellipseX, y: top + index * row + (row - 0.46) / 2, w: ellipseW, h: 0.46, uc }));
  positions.forEach((p) => connector(slide, actorX + 0.22, actorY + 0.34, p.x, p.y + p.h / 2, { arrow: false, width: 0.95, color: '8D9B92' }));
  positions.forEach(({ x, y, w, h, uc }) => {
    slide.addShape(S.ellipse, { x, y, w, h, fill: { color: C.white }, line: { color: uc.color || options.color || C.green, width: 1.15 } });
    addText(slide, typeof uc === 'string' ? uc : uc.title, x + 0.14, y + 0.06, w - 0.28, h - 0.12, { fontSize: 11.2, align: 'center' });
  });
  if (options.note) footerNote(slide, options.note, { fill: options.noteFill || 'F3F6F3' });
  return slide;
}

function startNode(slide, x, y, label = 'Inicio', end = false) {
  slide.addShape(S.ellipse, { x, y, w: 1.55, h: 0.4, fill: { color: end ? C.ink : C.green }, line: { color: end ? C.ink : C.green, width: 1 } });
  addText(slide, label, x + 0.08, y + 0.055, 1.39, 0.28, { color: C.white, fontSize: 10, bold: true });
}

function actionNode(slide, x, y, w, label, options = {}) {
  const h = options.height || 0.52;
  rect(slide, x, y, w, h, options.fill || C.white, options.stroke || C.green);
  addText(slide, label, x + 0.13, y + 0.04, w - 0.26, h - 0.08, { fontSize: options.fontSize || 10.5, align: 'center', color: options.color || C.ink });
}

function decisionNode(slide, x, y, w, label, h = 0.78) {
  slide.addShape(S.diamond, { x, y, w, h, fill: { color: C.goldLight }, line: { color: C.gold, width: 1.2 } });
  addText(slide, label, x + 0.22, y + h * 0.28, w - 0.44, h * 0.42, { fontSize: 9.5, align: 'center' });
}

function flowDiagram(process) {
  const slide = beginSlide('Diagrama de flujo', `${process.id} · ${process.title}`, `Actor: ${process.actor}. ${process.pre || ''}`);
  const centerX = 5.12;
  const nodeW = 3.7;
  const mid = centerX + nodeW / 2;
  let y = 1.62;
  const startX = mid - 0.775;
  startNode(slide, startX, y);
  let prevBottom = y + 0.4;
  y += 0.48;
  const flowSteps = [...process.steps, ...(process.tail || [])];
  for (const step of flowSteps) {
    connector(slide, mid, prevBottom, mid, y);
    actionNode(slide, centerX, y, nodeW, step, { height: 0.38, fontSize: 9.6 });
    prevBottom = y + 0.38;
    y += 0.5;
    if (process.branch && step === process.branch.at) {
      const branch = process.branch;
      const dy = y;
      decisionNode(slide, mid - 1.55, dy, 3.1, branch.question, 0.54);
      connector(slide, mid, prevBottom, mid, dy);
      const sideX = 0.85;
      const sideY = dy + 0.08;
      const sideW = 3.2;
      connector(slide, mid - 1.55, dy + 0.27, sideX + sideW, sideY + 0.19, { color: C.coral, width: 1.1 });
      addText(slide, branch.noLabel || 'No', 3.76, dy + 0.04, 0.46, 0.2, { fontSize: 8.5, bold: true, color: C.coral });
      actionNode(slide, sideX, sideY, sideW, branch.no, { fill: C.coralLight, stroke: C.coral, fontSize: 8.8, height: 0.38 });
      if (branch.noEnd) {
        connector(slide, sideX + sideW / 2, sideY + 0.38, sideX + sideW / 2, sideY + 0.53, { color: C.coral });
        startNode(slide, sideX + sideW / 2 - 0.775, sideY + 0.55, branch.noEnd, true);
      }
      addText(slide, branch.yesLabel || 'Sí', mid + 0.16, dy + 0.55, 0.4, 0.16, { fontSize: 8.5, bold: true, color: C.green });
      prevBottom = dy + 0.54;
      y = dy + 0.67;
    }
  }
  connector(slide, mid, prevBottom, mid, y);
  startNode(slide, mid - 0.775, y + 0.03, process.end || 'Fin', true);
  const notes = [process.source || 'Fuente: Capítulo IV, historia de usuario correspondiente.', process.codeNote].filter(Boolean).join('  ');
  footerNote(slide, notes, { y: 6.77, fill: process.codeNote ? C.goldLight : 'F3F6F3', stroke: process.codeNote ? 'E8DCC1' : 'E1E8E3' });
  return slide;
}

function activityDiagram(title, subtitle, steps, branchText, source) {
  const slide = beginSlide('Diagrama de actividad UML', title, subtitle);
  const mid = 6.66;
  const boxX = 4.76;
  const boxW = 3.8;
  let y = 1.58;
  startNode(slide, mid - 0.775, y);
  let prev = y + 0.4;
  y += 0.62;
  for (let i = 0; i < steps.length; i++) {
    connector(slide, mid, prev, mid, y);
    actionNode(slide, boxX, y, boxW, steps[i], { height: 0.38, fontSize: 9.7 });
    prev = y + 0.38;
    y += 0.5;
    if (branchText && i === branchText.index) {
      decisionNode(slide, mid - 1.55, y, 3.1, branchText.question, 0.54);
      connector(slide, mid, prev, mid, y);
      const bx = 0.78;
      const by = y + 0.08;
      actionNode(slide, bx, by, 3.2, branchText.no, { fill: C.coralLight, stroke: C.coral, fontSize: 8.9, height: 0.38 });
      connector(slide, mid - 1.55, y + 0.27, bx + 3.2, by + 0.19, { color: C.coral });
      addText(slide, 'No', 3.76, y + 0.04, 0.45, 0.18, { color: C.coral, bold: true, fontSize: 8.5 });
      addText(slide, 'Sí', mid + 0.15, y + 0.55, 0.4, 0.16, { color: C.green, bold: true, fontSize: 8.5 });
      prev = y + 0.54;
      y += 0.67;
    }
  }
  connector(slide, mid, prev, mid, y);
  startNode(slide, mid - 0.775, y + 0.02, 'Fin', true);
  footerNote(slide, source, { y: 6.77 });
}

function sequenceDiagram(title, participants, messages, source) {
  const slide = beginSlide('Diagrama de secuencia UML', title, 'Líneas de vida verticales; flecha continua = llamada; flecha discontinua = respuesta/evento de retorno.');
  const left = 1.15;
  const gap = 11.0 / (participants.length - 1);
  const xs = participants.map((_, i) => left + gap * i);
  participants.forEach((name, i) => {
    rect(slide, xs[i] - 0.83, 1.5, 1.66, 0.55, C.white, C.blue);
    addText(slide, name, xs[i] - 0.75, 1.57, 1.5, 0.4, { fontSize: 9.1, bold: true, align: 'center' });
    connector(slide, xs[i], 2.08, xs[i], 6.32, { arrow: false, dash: true, color: 'AAB7AF', width: 0.85 });
  });
  const max = messages.length;
  const stepY = Math.min(0.58, 3.85 / max);
  messages.forEach((message, i) => {
    const y = 2.42 + i * stepY;
    const x1 = xs[message.from];
    const x2 = xs[message.to];
    connector(slide, x1, y, x2, y, { color: message.return ? C.blue : C.green, dash: !!message.return, width: 1.15 });
    const labelX = Math.min(x1, x2) + 0.08;
    const labelW = Math.max(1.2, Math.abs(x2 - x1) - 0.16);
    addText(slide, `${i + 1}. ${message.text}`, labelX, y - 0.23, labelW, 0.18, { fontSize: 8.4, color: C.text, align: 'center' });
  });
  footerNote(slide, source, { y: 6.77 });
}

// Portada
{
  const slide = pptx.addSlide();
  slide.background = { color: C.white };
  slide.addShape(S.rect, { x: 0, y: 0, w: 0.16, h: H, fill: { color: C.green }, line: { color: C.green } });
  addText(slide, 'SISTEMA DE MONITOREO Y CONTROL DE FLOTA', 0.9, 1.15, 10.8, 0.3, { fontSize: 12, bold: true, color: C.green, charSpacing: 0.2 });
  addText(slide, 'Procesos de recolección\ny diagramas UML', 0.9, 1.8, 10.5, 1.5, { fontFace: 'Aptos Display', fontSize: 36, bold: true, color: C.ink, valign: 'top' });
  addText(slide, 'WasteMonitor · Juana de Ávila, Maracaibo', 0.95, 3.65, 9.0, 0.35, { fontSize: 18, color: C.muted });
  addText(slide, 'Casos de uso · flujos de las 28 historias · secuencias · actividades · clases · entidad-relación · arquitectura', 0.95, 4.35, 10.9, 0.62, { fontSize: 13, color: C.text, valign: 'top' });
  addText(slide, 'Base documental: Capítulos III y IV. Los requisitos de tesis y el comportamiento verificado en el código se distinguen en las notas.', 0.95, 6.25, 10.9, 0.55, { fontSize: 10.5, color: C.muted, valign: 'top' });
}

// Índice breve
{
  const slide = beginSlide('Índice', 'Contenido de la presentación', 'Diagramas separados por actor y proceso para facilitar la lectura.');
  const items = [
    ['01', 'Operación real de recolección', 'Turnos, despacho, ciclos de viaje y control en sede/relleno'],
    ['02', 'Casos de uso UML', 'Ciudadano, supervisor, administrador, mecánico y personal autenticado'],
    ['03', 'Flujos de proceso', 'HU-001 a HU-028, cada historia en una lámina independiente'],
    ['04', 'UML de comportamiento', 'Secuencia y actividad para jornadas, GPS, quejas y emergencias'],
    ['05', 'UML estructural', 'Clases, entidad-relación, arquitectura lógica y física'],
  ];
  items.forEach((item, i) => {
    const y = 1.65 + i * 0.91;
    addText(slide, item[0], 0.95, y, 0.56, 0.35, { fontSize: 16, bold: true, color: C.coral });
    addText(slide, item[1], 1.7, y, 4.05, 0.31, { fontSize: 13, bold: true });
    addText(slide, item[2], 5.75, y, 6.5, 0.38, { fontSize: 10.5, color: C.muted, align: 'left' });
  });
  footerNote(slide, 'Estilo intencionalmente simple: tipo de diagrama, título del caso y notación estándar por encima de la decoración.');
}

// Procesos reales de recolección descritos en entrevistas
flowDiagram({
  id: 'OPERACIÓN-01', title: 'Planificar y despachar unidades por turno', actor: 'Administrador / coordinación',
  pre: 'Proceso operativo descrito en Capítulo IV; no todo ocurre dentro de WasteMonitor.',
  steps: ['Definir sectores, unidades y rutas del servicio', 'Asignar camión, conductor y turno diurno/nocturno', 'Publicar horario y comunicar salida de las unidades'],
  branch: { at: 'Publicar horario y comunicar salida de las unidades', question: '¿Unidad y ruta asignadas?', no: 'No despachar; completar asignación antes de iniciar', noEnd: 'Fin sin despacho' },
  source: 'Fuente: Capítulo IV · entrevista al coordinador; dos turnos y rutas por sectores.',
  codeNote: 'El capítulo describe turnos y asignación; la pantalla de horarios actual crea día/sector/camión/turno.',
});
flowDiagram({
  id: 'OPERACIÓN-02', title: 'Ciclo de recolección por viaje', actor: 'Conductor y supervisor',
  pre: 'El coordinador reporta varios viajes por unidad; el tiempo del ciclo depende del recorrido y descarga.',
  steps: ['Salir hacia los sectores de la ruta asignada', 'Recolectar residuos en los sectores atendidos', 'Trasladar la carga al sitio de descarga', 'Registrar viaje, toneladas, dirección y observaciones', 'Repetir el ciclo mientras continúe el turno'],
  source: 'Fuente: Capítulo IV · entrevista y HU-020. No se fija un número rígido de viajes.',
});
flowDiagram({
  id: 'OPERACIÓN-03', title: 'Registrar entrada y salida en sede o relleno', actor: 'Supervisor de operaciones',
  pre: 'Proceso presencial descrito por el coordinador antes de su registro digital.',
  steps: ['Recibir formato del vehículo al llegar al punto de control', 'Anotar hora de entrada y datos del viaje', 'Verificar salida y sellar el formato', 'Comunicar la salida de los vehículos a la sede'],
  source: 'Fuente: Capítulo IV · registro físico en sede y relleno sanitario.',
  codeNote: 'Contexto operativo de entrevista; no se representa como funcionalidad implementada en la aplicación.',
});
flowDiagram({
  id: 'OPERACIÓN-04', title: 'Cerrar el turno y consolidar viajes', actor: 'Supervisor y administración',
  pre: 'El supervisor documenta la jornada; administración consolida resultados por fecha.',
  steps: ['Completar los viajes del turno', 'Revisar toneladas y observaciones del informe', 'Finalizar o firmar el informe de jornada', 'Agrupar jornadas y viajes finalizados por fecha', 'Consultar total de viajes y toneladas recolectadas'],
  source: 'Fuente: Capítulos III/IV · HU-019, HU-020 y HU-022.',
});

// Casos de uso legibles: un actor principal por diagrama para reducir cruces.
useCaseDiagram('Actor: Ciudadano', 'Ciudadano', [
  { title: 'HU-001 · Registrar ciudadano' },
  { title: 'HU-002 · Iniciar sesión' },
  { title: 'HU-003 · Restablecer contraseña' },
  { title: 'HU-004 · Gestionar perfil' },
  { title: 'HU-005 · Registrar y revisar quejas' },
  { title: 'HU-006 · Consultar la ruta cercana' },
], { actorColor: C.blue, color: C.blue, note: 'Actores y funcionalidades según Capítulo IV, HU-001 a HU-006.' });
useCaseDiagram('Actor: Supervisor', 'Supervisor', [
  { title: 'HU-007 · Consultar mapa y seguimiento' },
  { title: 'HU-010 · Reportar emergencia' },
  { title: 'HU-019 · Iniciar informe de jornada' },
  { title: 'HU-020 · Modificar / finalizar informe' },
  { title: 'HU-024 · Gestionar mantenimiento en taller' },
], { actorColor: C.green, color: C.green, note: 'El GPS en vivo se vincula a una jornada activa de supervisor. Ver HU-007 y HU-019.' });
useCaseDiagram('Actor: Conductor', 'Conductor', [
  { title: 'HU-002 · Iniciar sesión' },
  { title: 'HU-007 · Consultar ruta y mapa asignados' },
  { title: 'HU-009 · Consultar notificaciones' },
  { title: 'HU-018 · Integrar equipo de recolección' },
  { title: 'HU-027 · Consultar guía de usuario' },
  { title: 'HU-028 · Exportar informe disponible' },
], { actorColor: C.blue, color: C.blue, note: 'El GPS de jornada se atribuye al supervisor en HU-007/HU-019; no se dibuja como función del conductor.' });
useCaseDiagram('Actor: Tripulación (crew)', 'Tripulación', [
  { title: 'HU-002 · Iniciar sesión' },
  { title: 'HU-007 · Consultar ruta asignada' },
  { title: 'HU-009 · Consultar notificaciones' },
  { title: 'HU-018 · Pertenecer a equipo asignado' },
  { title: 'HU-027 · Consultar guía de usuario' },
  { title: 'HU-028 · Exportar informe disponible' },
], { actorColor: C.blue, color: C.blue, note: 'Funciones compartidas presentadas por HU; disponibilidad final depende del rol y módulo habilitado.' });
useCaseDiagram('Actor: Administrador', 'Administrador', [
  { title: 'HU-008 · Enviar anuncios' },
  { title: 'HU-011/012 · Crear y editar rutas' },
  { title: 'HU-013/014/015 · Gestionar vehículos y rutas' },
  { title: 'HU-016/017/018 · Gestionar personal y equipos' },
  { title: 'HU-021/022/023 · Informes de jornada y administrativos' },
  { title: 'HU-025/026 · Consultar tablero operativo' },
], { actorColor: C.coral, color: C.coral, note: 'Este es un diagrama de casos de uso por actor, no un flujo temporal.' });
useCaseDiagram('Actor: Mecánico', 'Mecánico', [
  { title: 'HU-007 · Consultar mapa / ruta asignada' },
  { title: 'HU-009 · Consultar notificaciones' },
  { title: 'HU-010 · Atender emergencia' },
  { title: 'HU-024 · Gestionar mantenimiento en taller' },
  { title: 'HU-027 · Consultar guía de usuario' },
], { actorColor: C.gold, color: C.gold, note: 'HU-024 define participación del mecánico; los permisos reales de modificación se anotan en sus flujos.' });
useCaseDiagram('Actor: Personal autenticado', 'Personal autenticado', [
  { title: 'HU-007 · Consultar mapa según rol' },
  { title: 'HU-009 · Consultar avisos y marcar como leídos' },
  { title: 'HU-027 · Consultar guía de usuario' },
  { title: 'HU-028 · Exportar informes a PDF' },
], { actorColor: C.ink, color: C.blue, note: 'Los casos compartidos se habilitan según rol y módulo; HU-028 aplica a módulos con exportación.' });

// 28 historias de usuario: cada entrada genera un diagrama de flujo independiente.
const stories = [
  { id: 'HU-001', title: 'Registrar ciudadano', actor: 'Ciudadano', pre: 'Completar los datos requeridos en el registro.', steps: ['Abrir la opción de registro', 'Completar datos personales y credenciales'], branch: { at: 'Completar datos personales y credenciales', question: '¿Campos completos y válidos?', no: 'Mostrar validación; corregir información', noEnd: 'Fin sin registro' }, tail: ['Crear usuario en Firebase Authentication', 'Guardar perfil con rol ciudadano/user'], end: 'Fin: cuenta creada', note: 'Cap. IV pide unicidad/formato; el rol inicial user está confirmado en AuthService.' },
  { id: 'HU-002', title: 'Iniciar sesión', actor: 'Administrador, supervisor, conductor, tripulación, mecánico y ciudadano', pre: 'La cuenta debe existir y estar activa.', steps: ['Ingresar correo y contraseña', 'Validar credenciales y leer perfil por UID'], branch: { at: 'Validar credenciales y leer perfil por UID', question: '¿Credenciales válidas y cuenta activa?', no: 'Mostrar error y mantener acceso bloqueado', noEnd: 'Fin sin sesión' }, tail: ['Cargar perfil y rol', 'Mostrar/navegar a las opciones del rol'], end: 'Fin: sesión iniciada', note: 'AuthService cierra Firebase Auth si falta perfil o la cuenta está inactiva.' },
  { id: 'HU-003', title: 'Restablecer contraseña', actor: 'Usuario con cuenta registrada', pre: 'Disponer del correo asociado a la cuenta.', steps: ['Abrir recuperación desde login', 'Ingresar correo electrónico'], branch: { at: 'Ingresar correo electrónico', question: '¿Correo reconocido?', no: 'Informar que debe verificar el correo o reintentar', noEnd: 'Fin sin cambio' }, tail: ['Solicitar enlace a Firebase Auth', 'Abrir enlace y definir nueva contraseña'], end: 'Fin: credencial restablecida', note: 'La historia especifica enlace Firebase; el código también conserva un flujo OTP alternativo.' },
  { id: 'HU-004', title: 'Gestionar perfil', actor: 'Usuario autenticado', pre: 'Contar con sesión activa.', steps: ['Abrir perfil propio', 'Consultar datos actuales', 'Editar datos permitidos'], branch: { at: 'Editar datos permitidos', question: '¿Datos válidos?', no: 'Mostrar campos inválidos y conservar valores', noEnd: 'Fin sin cambios' }, tail: ['Guardar perfil actualizado', 'Mostrar confirmación'], end: 'Fin: perfil actualizado', note: 'Cap. IV HU-004; el detalle de campos editables depende del módulo de perfil.' },
  { id: 'HU-005', title: 'Registrar y revisar quejas', actor: 'Ciudadano y administrador', pre: 'Ciudadano y administración deben iniciar sesión.', steps: ['Ciudadano redacta asunto y descripción', 'Validar asunto y detalle requeridos'], branch: { at: 'Validar asunto y detalle requeridos', question: '¿Formulario válido?', no: 'Marcar campos y solicitar corrección', noEnd: 'Fin sin queja' }, tail: ['Guardar queja vinculada al userId', 'Notificar a administración', 'Admin revisa y cambia estado pendiente/en revisión/resuelta'], end: 'Fin: estado actualizado', note: 'QuejasService filtra por userId cuando se consulta el historial personal.' },
  { id: 'HU-006', title: 'Consultar la ruta cercana', actor: 'Ciudadano', pre: 'Perfil con sector y coordenadas de vivienda.', steps: ['Abrir inicio como ciudadano', 'Leer ubicación registrada y rutas disponibles'], branch: { at: 'Leer ubicación registrada y rutas disponibles', question: '¿Ubicación válida y hay rutas?', no: 'Solicitar completar perfil o mostrar sin resultados', noEnd: 'Fin sin ruta' }, tail: ['Comparar ubicación con rutas', 'Mostrar ruta cercana y distancia aproximada'], end: 'Fin: ruta consultada', note: 'Cap. IV HU-006; se marca como requisito documental cuando el cálculo exacto no se identifica en el servicio leído.' },
  { id: 'HU-007', title: 'Consultar el mapa y seguimiento', actor: 'Administrador, supervisor, conductor, tripulación y mecánico', pre: 'Acceso autenticado; deben existir rutas, camiones o jornadas.', steps: ['Abrir mapa', 'Resolver rol, rutas asignadas y ubicación disponible'], branch: { at: 'Resolver rol, rutas asignadas y ubicación disponible', question: '¿Supervisor con jornada activa?', no: 'Mostrar solo mapa/rutas autorizadas al rol', noEnd: 'Fin: mapa sin tracking propio' }, tail: ['Supervisor comparte GPS ligado al informe', 'Administración consulta ubicaciones activas'], end: 'Fin: mapa actualizado', note: 'LocationService confirma tracking de supervisor; la visibilidad por rol debe seguir reglas de Firebase.' },
  { id: 'HU-008', title: 'Enviar un anuncio a usuarios', actor: 'Administrador', pre: 'Admin autenticado; destinatarios disponibles.', steps: ['Redactar título y mensaje', 'Seleccionar destino por rol, vehículo, sector o ruta'], branch: { at: 'Seleccionar destino por rol, vehículo, sector o ruta', question: '¿Contenido y destinatario válidos?', no: 'Indicar los campos faltantes; no enviar', noEnd: 'Fin sin anuncio' }, tail: ['Guardar notificación con destino', 'Entregarla a los usuarios correspondientes'], end: 'Fin: anuncio enviado', note: 'Cap. IV HU-008; distinguir de notificaciones automáticas del sistema.' },
  { id: 'HU-009', title: 'Consultar notificaciones y avisos del navegador', actor: 'Personal y ciudadano autenticados', pre: 'Sesión activa y notificaciones dirigidas al UID o rol.', steps: ['Abrir campana de notificaciones', 'Leer y filtrar avisos del usuario'], branch: { at: 'Leer y filtrar avisos del usuario', question: '¿Permiso del navegador concedido?', no: 'Mantener el aviso en la bandeja interna', noEnd: 'Fin: historial disponible' }, tail: ['Mostrar aviso local cuando está habilitado', 'Marcar uno o todos como leídos'], end: 'Fin: avisos consultados', note: 'BrowserNotificationService no es push cuando la app está cerrada.' },
  { id: 'HU-010', title: 'Reportar y atender una emergencia', actor: 'Supervisor, administrador y mecánico', pre: 'Supervisor reporta; admin/mecánico atienden.', steps: ['Supervisor informa vehículo, tipo y descripción', 'Validar campos obligatorios'], branch: { at: 'Validar campos obligatorios', question: '¿Reporte completo?', no: 'Mostrar error y solicitar completar datos', noEnd: 'Fin sin reporte' }, tail: ['Guardar emergencia y primer evento', 'Notificar a administración', 'Admin o mecánico agrega evento y cambia estado'], end: 'Fin: emergencia resuelta', note: 'EmergencyService registra los eventos ordenados y actualiza estado.' },
  { id: 'HU-011', title: 'Crear ruta', actor: 'Administrador', pre: 'Admin autenticado dentro del módulo Rutas.', steps: ['Iniciar creación local de ruta', 'Seleccionar puntos en el mapa', 'Asignar nombre y resolver direcciones'], branch: { at: 'Asignar nombre y resolver direcciones', question: '¿Datos guardables?', no: 'Conservar puntos locales y mostrar error', noEnd: 'Fin sin ruta guardada' }, tail: ['Guardar ruta y puntos en Firebase', 'Actualizar lista y mapa'], end: 'Fin: ruta creada', note: 'RoutesService implementa saveRoute; OSRM obtiene geometría cuando hay dos o más puntos.' },
  { id: 'HU-012', title: 'Editar puntos de una ruta', actor: 'Administrador', pre: 'Ruta existente y administrador autenticado.', steps: ['Seleccionar ruta y punto', 'Agregar, mover o eliminar punto', 'Validar coordenadas y resolver dirección'], branch: { at: 'Validar coordenadas y resolver dirección', question: '¿Coordenadas válidas y guardado exitoso?', no: 'Mantener datos originales y mostrar error', noEnd: 'Fin sin cambios' }, tail: ['Persistir el punto modificado', 'Actualizar tabla y mapa'], end: 'Fin: ruta actualizada', note: 'El flujo de errores y conservación del original está especificado por HU-012.' },
  { id: 'HU-013', title: 'Registrar vehículo', actor: 'Administrador', pre: 'Admin con datos y ruta registrada.', steps: ['Capturar placa, tipo, capacidad y ruta', 'Validar datos y unicidad de placa'], branch: { at: 'Validar datos y unicidad de placa', question: '¿Datos válidos y placa única?', no: 'Mostrar error; no crear vehículo', noEnd: 'Fin sin alta' }, tail: ['Generar identificador VEH-###', 'Guardar unidad activa y registrar operación'], end: 'Fin: vehículo registrado', note: 'El requisito de placa única está en HU-013; no se halló una validación explícita de unicidad en VehiculoService.' },
  { id: 'HU-014', title: 'Modificar vehículo', actor: 'Administrador', pre: 'Vehículo existente y administrador autenticado.', steps: ['Seleccionar unidad', 'Editar datos de flota', 'Validar campos'], branch: { at: 'Validar campos', question: '¿Cambios válidos?', no: 'Mantener ficha anterior y mostrar error', noEnd: 'Fin sin cambios' }, tail: ['Guardar datos actualizados', 'Notificar si cambia a estado en ruta'], end: 'Fin: vehículo actualizado', note: 'La notificación de estado en ruta está confirmada en VehiculoService.' },
  { id: 'HU-015', title: 'Asignar ruta a vehículo', actor: 'Administrador', pre: 'Debe existir ruta y vehículo.', steps: ['Seleccionar vehículo', 'Seleccionar ruta registrada'], branch: { at: 'Seleccionar ruta registrada', question: '¿Ambos registros válidos?', no: 'Informar asignación fallida', noEnd: 'Fin sin asignación' }, tail: ['Actualizar camiones/{id}.ruta', 'Refrescar la ficha del vehículo'], end: 'Fin: ruta asignada', note: 'La HU describe este caso; RoutesService y VehiculoService deben reflejar la asignación en la ficha.' },
  { id: 'HU-016', title: 'Crear cuenta de personal', actor: 'Administrador', pre: 'Admin con datos de contacto y rol.', steps: ['Completar nombre, apellido, correo, teléfono y rol', 'Validar campos y correo no duplicado'], branch: { at: 'Validar campos y correo no duplicado', question: '¿Datos válidos y correo único?', no: 'Mostrar error y no crear cuenta', noEnd: 'Fin sin alta' }, tail: ['Crear cuenta Auth y perfil usuarios/{uid}', 'Enviar enlace para establecer contraseña'], end: 'Fin: personal invitado', note: 'StaffUsersService usa Firebase Auth secundario y remite correo de restablecimiento.' },
  { id: 'HU-017', title: 'Actualizar y activar cuentas de personal', actor: 'Administrador', pre: 'Admin y cuenta de personal existente.', steps: ['Seleccionar cuenta staff', 'Editar perfil o estado activo'], branch: { at: 'Editar perfil o estado activo', question: '¿Admin autorizado?', no: 'Rechazar actualización', noEnd: 'Fin sin cambios' }, tail: ['Actualizar perfil/rol o activo', 'Mantener correo de la cuenta'], end: 'Fin: personal actualizado', note: 'Validación admin explícita en StaffUsersService.' },
  { id: 'HU-018', title: 'Organizar tripulaciones por vehículo', actor: 'Administrador', pre: 'Personal y vehículo previamente registrados.', steps: ['Elegir vehículo', 'Elegir supervisor, conductor y crew', 'Validar roles y asignaciones activas'], branch: { at: 'Validar roles y asignaciones activas', question: '¿Equipo completo y no duplicado?', no: 'Indicar omisiones o usuario ocupado', noEnd: 'Fin sin grupo' }, tail: ['Guardar grupo de tripulación', 'Refrescar asignación visible'], end: 'Fin: grupo organizado', note: 'Requisito HU-018. El servicio leído consulta grupoTripulacion, pero no se encontró su escritura en ese servicio.' },
  { id: 'HU-019', title: 'Iniciar informe de jornada', actor: 'Supervisor', pre: 'Supervisor autenticado con camión y ruta asignados.', steps: ['Abrir inicio de jornada', 'Consultar camión y ruta asignados'], branch: { at: 'Consultar camión y ruta asignados', question: '¿Asignación completa?', no: 'Impedir inicio y mostrar qué falta', noEnd: 'Fin sin jornada' }, tail: ['Crear informe activo', 'Activar tracking GPS vinculado al informe', 'Notificar jornada a administración'], end: 'Fin: jornada activa', note: 'El tracking se inicia si el actor es supervisor y el navegador soporta geolocalización.' },
  { id: 'HU-020', title: 'Modificar informe de fin de jornada', actor: 'Supervisor', pre: 'Informe propio y no finalizado.', steps: ['Abrir informe activo', 'Registrar o corregir viaje, toneladas y observaciones'], branch: { at: 'Registrar o corregir viaje, toneladas y observaciones', question: '¿Informe propio y editable?', no: 'Bloquear cambios si es ajeno o finalizado', noEnd: 'Fin sin cambios' }, tail: ['Guardar cambios de informe y viajes', 'Al cerrar/firmar: estado finalizado', 'Detener seguimiento GPS'], end: 'Fin: jornada cerrada', note: 'InformeService aplica verificación de propietario y bloquea informe finalizado.' },
  { id: 'HU-021', title: 'Consultar y depurar informes de jornada', actor: 'Administrador', pre: 'Admin autenticado en Informe de Jornada.', steps: ['Consultar informes de jornada', 'Filtrar/buscar y seleccionar registros', 'Revisar detalle o solicitar depuración'], branch: { at: 'Revisar detalle o solicitar depuración', question: '¿Operación permitida?', no: 'Conservar informe y avisar restricción', noEnd: 'Fin sin depuración' }, tail: ['Actualizar estado lógico del informe', 'Si corresponde, apagar tracking ligado al informe'], end: 'Fin: lista actualizada', note: 'HU-021 requiere depuración admin; la implementación inspeccionada debe contrastarse con permisos del componente y reglas DB.', codeNote: 'La edición de jornada en la vista actual se orienta al propietario; no asumir borrado admin como confirmado.' },
  { id: 'HU-022', title: 'Crear y finalizar informe administrativo', actor: 'Administrador', pre: 'Admin autenticado; elegir fecha y jornadas finalizadas.', steps: ['Seleccionar fecha', 'Consolidar jornadas, viajes y toneladas', 'Agregar observaciones'], branch: { at: 'Agregar observaciones', question: '¿Resumen disponible?', no: 'Avisar que no hay datos suficientes', noEnd: 'Fin sin informe' }, tail: ['Guardar informe administrativo', 'Revisar y finalizar informe'], end: 'Fin: consolidado finalizado', note: 'InformeService valida rol admin al crear; la finalización depende del método correspondiente.' },
  { id: 'HU-023', title: 'Consultar informes administrativos', actor: 'Administrador', pre: 'Admin autenticado en el módulo administrativo.', steps: ['Definir fecha o texto de búsqueda', 'Consultar registros guardados'], branch: { at: 'Consultar registros guardados', question: '¿Hay coincidencias?', no: 'Mostrar estado sin resultados', noEnd: 'Fin: búsqueda vacía' }, tail: ['Mostrar estado, jornadas, viajes y toneladas', 'Abrir detalle si se requiere'], end: 'Fin: informe consultado', note: 'Cap. IV HU-023; la vista muestra únicamente informes guardados.' },
  { id: 'HU-024', title: 'Gestionar mantenimiento en el taller', actor: 'Mecánico, administrador y supervisor', pre: 'Sesión activa; vehículo disponible al registrar.', steps: ['Seleccionar vehículo fuera del taller', 'Indicar motivo, descripción, estado y prioridad', 'Guardar registro de mantenimiento'], branch: { at: 'Guardar registro de mantenimiento', question: '¿Vehículo y motivo válidos?', no: 'No guardar; mostrar campos requeridos', noEnd: 'Fin sin ingreso' }, tail: ['Marcar camión en taller', 'Registrar operación y notificar destinatarios', 'Actualizar estado y liberar unidad al concluir'], end: 'Fin: unidad disponible', note: 'El servicio restringe edición a admin o propietario del registro; verificar contra roles de HU-024.', codeNote: 'Cap. IV asigna HU-024 a mecánico/admin/supervisor; el servicio actual no concede edición general por rol mecánico.' },
  { id: 'HU-025', title: 'Consultar el tablero operativo', actor: 'Administrador', pre: 'Admin autenticado y datos registrados.', steps: ['Abrir Dashboard', 'Solicitar indicadores y operaciones recientes'], branch: { at: 'Solicitar indicadores y operaciones recientes', question: '¿Datos disponibles?', no: 'Mostrar estado vacío / sin datos', noEnd: 'Fin sin indicadores' }, tail: ['Calcular indicadores', 'Mostrar estadísticas e historial'], end: 'Fin: tablero consultado', note: 'DashboardService obtiene estadísticas e historial de operaciones.' },
  { id: 'HU-026', title: 'Consultar el tablero operativo · datos no disponibles', actor: 'Administrador', pre: 'Admin autenticado; puede no haber registros en el período.', steps: ['Abrir Dashboard', 'Solicitar resumen del período'], branch: { at: 'Solicitar resumen del período', question: '¿El servicio devuelve datos?', no: 'Presentar mensaje de datos no disponibles', noEnd: 'Fin: tablero vacío' }, tail: ['Mostrar métricas calculadas', 'Permitir nueva consulta tras registrar operaciones'], end: 'Fin: tablero actualizado', note: 'El Capítulo IV repite el título de HU-025 para HU-026 y la identifica por escenario sin datos.' },
  { id: 'HU-027', title: 'Consultar la guía de usuario', actor: 'Usuario autenticado', pre: 'Sesión iniciada y acceso a Ayuda y manual.', steps: ['Abrir la guía', 'Resolver contenido aplicable al rol', 'Filtrar por tema o pregunta'], branch: { at: 'Filtrar por tema o pregunta', question: '¿Descarga permitida?', no: 'Mantener lectura en pantalla e informar restricción', noEnd: 'Fin sin descarga' }, tail: ['Abrir o descargar documento PDF'], end: 'Fin: guía consultada', note: 'Cap. IV HU-027; puede consultarse en pantalla aunque no se descargue.' },
  { id: 'HU-028', title: 'Exportar informes a PDF', actor: 'Usuario autenticado', pre: 'Módulo con exportación y registros visibles.', steps: ['Aplicar búsqueda/filtros al listado', 'Preparar nombre, columnas y filas visibles', 'Revisar cantidad y confirmar exportación'], branch: { at: 'Revisar cantidad y confirmar exportación', question: '¿Hay filas y PDF generado?', no: 'Mostrar error o impedir exportación vacía', noEnd: 'Fin sin archivo' }, tail: ['Generar PDF con filtros activos', 'Abrir/descargar archivo'], end: 'Fin: PDF generado', note: 'El flujo de confirmación y generación está implementado con PdfReportService.' },
];

stories.forEach(flowDiagram);

// Secuencias UML: interacción temporal entre actor, interfaz, servicio y persistencia.
sequenceDiagram('HU-002 · Iniciar sesión', ['Usuario', 'Login UI', 'AuthService', 'Firebase Auth', 'Realtime DB', 'Router'], [
  { from: 0, to: 1, text: 'correo y contraseña' },
  { from: 1, to: 2, text: 'login(email, pass)' },
  { from: 2, to: 3, text: 'validar credenciales' },
  { from: 2, to: 4, text: 'leer perfil usuarios/{uid}' },
  { from: 4, to: 2, text: 'perfil + rol + activo', return: true },
  { from: 2, to: 1, text: 'actualizar sesión local', return: true },
  { from: 1, to: 5, text: 'navegar según acceso' },
], 'Fuente: AuthService, app.routes.ts y roleGuard.');
sequenceDiagram('HU-019/020 · Iniciar, actualizar y cerrar jornada', ['Supervisor', 'Informe UI', 'InformeService', 'LocationService', 'Realtime DB', 'Admin'], [
  { from: 0, to: 1, text: 'solicitar inicio' },
  { from: 1, to: 2, text: 'consultar asignación actual' },
  { from: 2, to: 4, text: 'leer usuarios y camiones' },
  { from: 1, to: 2, text: 'crear informe activo' },
  { from: 2, to: 4, text: 'persistir cabecera' },
  { from: 1, to: 3, text: 'iniciar GPS por informeId' },
  { from: 3, to: 4, text: 'actualizar tracking/{uid}/current' },
  { from: 1, to: 5, text: 'notificar jornada iniciada' },
  { from: 0, to: 1, text: 'cerrar jornada' },
  { from: 1, to: 2, text: 'validar propietario; finalizar' },
  { from: 2, to: 3, text: 'detener rastreo' },
], 'Fuente: CreateJourneyReport, InformeService y LocationService.');
sequenceDiagram('HU-010 · Reportar y atender emergencia', ['Supervisor', 'Emergency UI', 'EmergencyService', 'Realtime DB', 'Notificación', 'Admin / mecánico'], [
  { from: 0, to: 1, text: 'vehículo, tipo, descripción' },
  { from: 1, to: 2, text: 'report(alert, firstEvent)' },
  { from: 2, to: 3, text: 'guardar emergencia' },
  { from: 2, to: 3, text: 'guardar evento inicial' },
  { from: 2, to: 4, text: 'crear aviso para admin' },
  { from: 4, to: 5, text: 'entregar aviso' },
  { from: 5, to: 2, text: 'agregar evento y estado' },
  { from: 2, to: 3, text: 'persistir respuesta' },
], 'Fuente: EmergencyAlertComponent, EmergencyService y NotificationService.');
sequenceDiagram('HU-005 · Registrar y revisar quejas', ['Ciudadano', 'Quejas UI', 'QuejasService', 'Realtime DB', 'NotificationService', 'Administrador'], [
  { from: 0, to: 1, text: 'asunto y descripción' },
  { from: 1, to: 2, text: 'validar y registrar(userId)' },
  { from: 2, to: 3, text: 'POST /quejas' },
  { from: 1, to: 4, text: 'notificar nueva queja' },
  { from: 4, to: 3, text: 'guardar destino admin' },
  { from: 5, to: 2, text: 'consultar / cambiar estado' },
  { from: 2, to: 3, text: 'leer/update queja' },
], 'Fuente: componentes de quejas y QuejasService.');
sequenceDiagram('HU-011/012 · Crear y actualizar ruta', ['Administrador', 'RouteDrivers UI', 'RoutesService', 'Nominatim', 'OSRM', 'Realtime DB'], [
  { from: 0, to: 1, text: 'marcar puntos en mapa' },
  { from: 1, to: 2, text: 'resolver dirección' },
  { from: 2, to: 3, text: 'reverse geocoding' },
  { from: 1, to: 4, text: 'obtener geometría de ruta' },
  { from: 2, to: 5, text: 'guardar /routes/{id}' },
  { from: 1, to: 2, text: 'editar/eliminar punto' },
  { from: 2, to: 5, text: 'actualizar punto de ruta' },
  { from: 5, to: 1, text: 'recargar lista y mapa', return: true },
], 'Fuente: RouteDrivers y RoutesService.');

// Actividades UML con decisión explícita.
activityDiagram('Proceso operativo · completar el ciclo del viaje', 'Actividad del equipo recolector desde la salida hasta el siguiente viaje del turno.', [
  'Supervisor inicia informe de jornada', 'Conductor recorre sectores de la ruta asignada', 'Equipo recolecta residuos', 'Trasladar carga al sitio de descarga', 'Registrar toneladas y observaciones del viaje', 'Continuar con otro viaje o cerrar turno',
], { index: 5, question: '¿Quedan viajes en el turno?', no: 'Cerrar informe y detener seguimiento GPS' }, 'Fuente: Capítulo IV, entrevista y HU-019/HU-020.');
activityDiagram('Proceso digital · jornada y seguimiento GPS', 'Actividad UML centrada en el supervisor y los servicios de informe/ubicación.', [
  'Autenticar supervisor', 'Obtener camión y ruta asignados', 'Crear cabecera de informe activa', 'Solicitar permiso y comenzar GPS', 'Guardar ubicación actual durante la jornada', 'Finalizar informe y apagar GPS',
], { index: 1, question: '¿Tiene camión y ruta?', no: 'Mostrar error y no crear la jornada' }, 'Fuente: InformeService, CreateJourneyReport y LocationService.');
activityDiagram('Atender una emergencia en ruta', 'Actividad UML con el supervisor como iniciador y administración/mecánico como responsables de seguimiento.', [
  'Supervisor identifica incidente', 'Registrar vehículo, tipo y descripción', 'Guardar emergencia y evento inicial', 'Notificar a administración', 'Agregar eventos de respuesta y cambiar estado', 'Cerrar alerta cuando esté resuelta',
], { index: 1, question: '¿Datos obligatorios completos?', no: 'Solicitar corrección; no guardar alerta' }, 'Fuente: EmergencyAlertComponent y EmergencyService.');
activityDiagram('Atender una queja ciudadana', 'Actividad UML del canal de atención entre ciudadano y administración.', [
  'Ciudadano presenta asunto y descripción', 'Validar formulario y usuario autenticado', 'Guardar queja vinculada al ciudadano', 'Notificar a administración', 'Revisar reporte y actualizar estado', 'Consultar estado final en el historial',
], { index: 1, question: '¿Formulario válido?', no: 'Marcar campos y permitir corrección' }, 'Fuente: componentes de quejas y QuejasService.');

// UML de clases y modelo entidad-relación.
{
  const slide = beginSlide('Diagrama UML de clases', 'Clases principales del dominio WasteMonitor', 'Estructura estática basada en interfaces y servicios; los datos se almacenan como nodos de Realtime Database.');
  const classes = [
    { x: 0.65, y: 1.65, w: 2.25, title: 'Usuario', attrs: '- uid\n- name\n- email\n- rol\n- activo', color: C.green },
    { x: 3.1, y: 1.65, w: 2.25, title: 'Vehículo', attrs: '- id\n- placa\n- tipo\n- capacidad\n- ruta / estado', color: C.blue },
    { x: 5.55, y: 1.65, w: 2.25, title: 'Ruta', attrs: '- id\n- nombreRuta\n- puntos[]\n- activa', color: C.blue },
    { x: 8.0, y: 1.65, w: 2.25, title: 'InformeJornada', attrs: '- id\n- usuario\n- camión / ruta\n- activo / estado', color: C.green },
    { x: 10.45, y: 1.65, w: 2.25, title: 'Viaje', attrs: '- informeId\n- toneladas\n- dirección\n- observaciones', color: C.green },
    { x: 1.85, y: 4.25, w: 2.25, title: 'Emergencia', attrs: '- id / vehículo\n- tipo / estado\n- eventos[]\n- creadoPor', color: C.coral },
    { x: 4.75, y: 4.25, w: 2.25, title: 'RegistroTaller', attrs: '- idCamion\n- razón / estado\n- prioridad\n- activo', color: C.gold },
    { x: 7.65, y: 4.25, w: 2.25, title: 'Queja', attrs: '- id / userId\n- asunto\n- descripción\n- estado', color: '687A70' },
    { x: 10.55, y: 4.25, w: 2.25, title: 'Notificación', attrs: '- destino uid/rol\n- título / mensaje\n- tipo / leída\n- timestamp', color: C.coral },
  ];
  // Asociaciones primero para que las clases queden por encima.
  [[2.9,2.45,3.1,2.45],[5.35,2.45,5.55,2.45],[7.8,2.45,8.0,2.45],[10.25,2.45,10.45,2.45],
   [2.0,2.95,2.95,4.25],[4.15,2.95,5.85,4.25],[9.15,2.95,8.8,4.25],[10.95,2.95,11.65,4.25]].forEach((e) => connector(slide,e[0],e[1],e[2],e[3],{arrow:false,width:1}));
  classes.forEach((c) => {
    slide.addShape(S.rect,{x:c.x,y:c.y,w:c.w,h:1.9,fill:{color:C.white},line:{color:c.color,width:1.1}});
    slide.addShape(S.rect,{x:c.x,y:c.y,w:c.w,h:0.38,fill:{color:c.color},line:{color:c.color}});
    addText(slide,`«entity» ${c.title}`,c.x+0.07,c.y+0.05,c.w-0.14,0.26,{fontSize:10.2,bold:true,color:C.white});
    addText(slide,c.attrs,c.x+0.12,c.y+0.48,c.w-0.24,1.33,{fontSize:9.2,color:C.text,align:'left',valign:'top'});
  });
  footerNote(slide, 'Relaciones conceptuales: Usuario registra informes/quejas; InformeJornada agrupa Viaje; Vehículo se vincula con Ruta y RegistroTaller.');
}
{
  const slide = beginSlide('Diagrama entidad-relación', 'Entidades y cardinalidades operativas', 'Modelo lógico para lectura del dominio; las cardinalidades deben contrastarse con los datos y reglas reales de Firebase.');
  const entities = [
    { x: 0.75, y: 1.8, w: 2.15, t: 'USUARIO', a: 'uid (PK)\nrol\nactivo' },
    { x: 3.65, y: 1.8, w: 2.15, t: 'VEHÍCULO', a: 'id (PK)\nplaca\nrutaId (FK*)' },
    { x: 6.55, y: 1.8, w: 2.15, t: 'RUTA', a: 'id (PK)\nnombre\nactiva' },
    { x: 9.45, y: 1.8, w: 2.15, t: 'INFORME_JORNADA', a: 'id (PK)\nusuarioId\nvehículo/ruta' },
    { x: 9.45, y: 4.25, w: 2.15, t: 'VIAJE', a: 'id (PK)\ninformeId\ntoneladas' },
    { x: 3.65, y: 4.25, w: 2.15, t: 'QUEJA', a: 'id (PK)\nuserId\nestado' },
    { x: 6.55, y: 4.25, w: 2.15, t: 'TALLER', a: 'id (PK)\nidCamion\nestado' },
  ];
  [[2.9,2.45,3.65,2.45,'1','0..*'],[5.8,2.45,6.55,2.45,'0..*','1'],[2.9,2.7,3.65,4.5,'1','0..*'],
   [2.9,2.35,9.45,2.35,'1','0..*'],[10.5,3.7,10.5,4.25,'1','0..*'],[5.8,2.75,6.55,4.25,'1','0..*']].forEach((r)=>{
     connector(slide,r[0],r[1],r[2],r[3],{arrow:false,width:1});
     addText(slide,`${r[4]}     ${r[5]}`,Math.min(r[0],r[2]),Math.min(r[1],r[3])-0.16,Math.max(0.8,Math.abs(r[2]-r[0])),0.16,{fontSize:8,color:C.muted,align:'center'});
   });
  entities.forEach((e)=>{
    rect(slide,e.x,e.y,e.w,1.35,C.white,C.blue,false);
    slide.addShape(S.rect,{x:e.x,y:e.y,w:e.w,h:0.33,fill:{color:C.blue},line:{color:C.blue}});
    addText(slide,e.t,e.x+0.08,e.y+0.04,e.w-0.16,0.24,{fontSize:9.2,bold:true,color:C.white});
    addText(slide,e.a,e.x+0.13,e.y+0.43,e.w-0.26,0.82,{fontSize:9,color:C.text,align:'left',valign:'top'});
  });
  footerNote(slide, '*Las rutas se guardan como referencias en el JSON; las FK y cardinalidades son conceptuales, no restricciones de SQL.', { fill: C.goldLight, stroke: 'E8DCC1' });
}

// Arquitectura lógica y física requeridas por Capítulo III.
{
  const slide = beginSlide('Diagrama de arquitectura lógica', 'Capas lógicas del sistema', 'Organización funcional: presentación, aplicación/servicios, datos e integraciones externas.');
  const layers = [
    { y: 1.7, h: 0.9, title: 'Presentación', body: 'Angular · páginas · formularios · mapas · tablas', color: C.green },
    { y: 2.9, h: 0.9, title: 'Aplicación', body: 'Auth · rutas · horarios · informes · emergencias · taller · quejas', color: C.blue },
    { y: 4.1, h: 0.9, title: 'Persistencia', body: 'Firebase Authentication · Realtime Database', color: C.coral },
    { y: 5.3, h: 0.9, title: 'Integraciones', body: 'OSRM · Nominatim · EmailJS · GPS del navegador', color: C.gold },
  ];
  layers.forEach((l,i)=>{
    rect(slide,2.1,l.y,9.2,l.h,C.white,l.color);
    addText(slide,l.title,2.28,l.y+0.12,1.8,0.24,{fontSize:12,bold:true,color:l.color,align:'left'});
    addText(slide,l.body,4.25,l.y+0.12,6.75,0.55,{fontSize:10.4,align:'left'});
    if(i<layers.length-1) connector(slide,6.7,l.y+l.h,6.7,layers[i+1].y,{color:C.line,width:1.1});
  });
  footerNote(slide, 'Fuente: app.config.ts, rutas Angular y servicios de dominio del repositorio.');
}
{
  const slide = beginSlide('Diagrama de arquitectura física / despliegue', 'Nodos de ejecución e integraciones', 'La infraestructura física real no está completamente descrita; el diagrama muestra nodos confirmados y límites por verificar.');
  const nodes = [
    { x:0.8,y:1.85,w:3.0,h:2.1,title:'«device» Navegador',body:'Angular SPA/PWA\nGeolocation API\nService Worker\nlocalStorage',color:C.green },
    { x:5.15,y:1.85,w:3.0,h:2.1,title:'«cloud» Firebase',body:'Authentication\nRealtime Database\nlisteners en tiempo real',color:C.coral },
    { x:9.5,y:1.85,w:3.0,h:2.1,title:'«external» APIs',body:'OSRM · Nominatim\nEmailJS',color:C.blue },
  ];
  connector(slide,3.8,2.9,5.15,2.9,{color:C.green,width:1.6});
  connector(slide,8.15,2.9,9.5,2.9,{color:C.blue,width:1.6});
  nodes.forEach((n)=>{
    rect(slide,n.x,n.y,n.w,n.h,C.white,n.color,false);
    slide.addShape(S.rect,{x:n.x,y:n.y,w:n.w,h:0.42,fill:{color:n.color},line:{color:n.color}});
    addText(slide,n.title,n.x+0.1,n.y+0.06,n.w-0.2,0.3,{fontSize:12,bold:true,color:C.white});
    addText(slide,n.body,n.x+0.25,n.y+0.68,n.w-0.5,1.2,{fontSize:11,align:'left',valign:'top'});
  });
  rect(slide,1.1,4.7,5.15,1.18,C.greenLight,C.green);
  addText(slide,'Confirmado',1.3,4.86,1.45,0.25,{fontSize:12,bold:true,color:C.green,align:'left'});
  addText(slide,'Firebase inicializado · SSR configurado · Service Worker registrado en producción',2.8,4.82,3.2,0.65,{fontSize:10,align:'left'});
  rect(slide,7.1,4.7,5.15,1.18,C.goldLight,C.gold);
  addText(slide,'Por confirmar',7.3,4.86,1.45,0.25,{fontSize:12,bold:true,color:C.gold,align:'left'});
  addText(slide,'Proveedor de hosting · reglas de seguridad · servicios backend desplegados',8.8,4.82,3.2,0.65,{fontSize:10,align:'left'});
  footerNote(slide, 'No se inventa servidor, base SQL ni Cloud Functions: no aparecen confirmados en la configuración inspeccionada.', { fill: C.goldLight, stroke: 'E8DCC1' });
}

// Resumen de trazabilidad documental
{
  const slide = beginSlide('Trazabilidad', 'Tesis y código: alcance de los diagramas', 'Los diagramas de flujo siguen las historias de usuario; las notas distinguen requisito escrito de implementación comprobada.');
  const rows = [
    ['Capítulo III', 'Casos de uso, secuencia, actividades, flujo, clases, entidad-relación y arquitectura lógica/física'],
    ['Capítulo IV', '28 historias HU-001…HU-028, entrevistas y operación de recolección'],
    ['Código Angular', 'Servicios y componentes de autenticación, rutas, viajes, GPS, quejas, emergencias, taller, informes'],
    ['Discrepancias señaladas', 'HU-018 asignación de equipo; permisos HU-021/HU-024; ciertos detalles de mapa y validación'],
  ];
  rows.forEach((r,i)=>{
    const y=1.72+i*1.0;
    rect(slide,0.9,y,2.35,0.68,i===3?C.goldLight:C.greenLight,i===3?C.gold:C.green);
    addText(slide,r[0],1.04,y+0.12,2.06,0.42,{fontSize:11.3,bold:true});
    rect(slide,3.5,y,8.85,0.68,C.white,C.border);
    addText(slide,r[1],3.72,y+0.08,8.4,0.5,{fontSize:10.2,align:'left'});
  });
  footerNote(slide, 'Capítulo IV incluye HU-025 y HU-026 con el mismo título de tablero operativo; se conservan ambos escenarios en el documento.');
}

const output = path.join(process.cwd(), 'WasteMonitor-UML.pptx');
pptx.writeFile({ fileName: output }).then(() => {
  const stat = fs.statSync(output);
  console.log(`Archivo: ${output}`);
  console.log(`Diapositivas: ${pptx._slides.length}`);
  console.log(`Bytes: ${stat.size}`);
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
