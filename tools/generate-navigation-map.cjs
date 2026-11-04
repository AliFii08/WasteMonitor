const os = require('os');
const path = require('path');
const pptxgen = require(require.resolve('pptxgenjs', {
  paths: [process.cwd(), path.join(os.tmpdir(), 'wastemonitor-pptx-tool', 'node_modules')],
}));

const pptx = new pptxgen();
pptx.layout = 'LAYOUT_WIDE';
pptx.author = 'WasteMonitor';
pptx.subject = 'Mapa de navegación basado en rutas y menú Angular';
pptx.title = 'Mapa de navegación | WasteMonitor';
pptx.lang = 'es-ES';
pptx.theme = { headFontFace: 'Aptos Display', bodyFontFace: 'Aptos', lang: 'es-ES' };

const W = 13.333;
const H = 7.5;
const C = {
  ink: '17231F',
  muted: '56665D',
  green: '287D68',
  greenLight: 'EAF1EB',
  coral: 'D46A4C',
  coralLight: 'F9EEE9',
  blue: '4C7D91',
  blueLight: 'EEF3F5',
  gold: 'A77B39',
  goldLight: 'F5F0E6',
  border: 'D4DED7',
  paper: 'FFFFFF',
  bg: 'F7F8F5',
};
const S = pptx.ShapeType;
const slide = pptx.addSlide();
slide.background = { color: C.bg };

function addText(value, opts) {
  slide.addText(value, {
    fontFace: 'Aptos',
    color: C.ink,
    margin: 0.03,
    breakLine: false,
    fit: 'shrink',
    valign: 'mid',
    ...opts,
  });
}

function addCard(x, y, w, h, title, opts = {}) {
  slide.addShape(opts.shape || S.roundRect, {
    x, y, w, h,
    rectRadius: 0.04,
    fill: { color: opts.fill || C.paper },
    line: { color: opts.stroke || C.border, width: opts.width || 1.1 },
  });
  addText(title, {
    x: x + 0.07, y: y + 0.035, w: w - 0.14, h: h - 0.07,
    fontFace: 'Aptos Display', fontSize: opts.fontSize || 11,
    bold: opts.bold ?? true, align: opts.align || 'center',
    color: opts.color || C.ink,
  });
}

function addLine(x1, y1, x2, y2, opts = {}) {
  slide.addShape(S.line, {
    x: x1, y: y1, w: x2 - x1, h: y2 - y1,
    line: {
      color: opts.color || C.green,
      width: opts.width || 1.35,
      dashType: opts.dash || 'solid',
      endArrowType: opts.arrow === false ? 'none' : 'triangle',
    },
  });
}

addText('MAPA DE NAVEGACIÓN', {
  x: 0.55, y: 0.29, w: 12.2, h: 0.43,
  fontFace: 'Aptos Display', fontSize: 26, bold: true,
});
addText('WasteMonitor · rutas, menú por rol y destinos del usuario', {
  x: 0.58, y: 0.77, w: 12.15, h: 0.22, fontSize: 10.5, color: C.muted,
});

// Public routes
slide.addShape(S.roundRect, {
  x: 0.55, y: 1.16, w: 12.23, h: 0.92,
  rectRadius: 0.05, fill: { color: C.paper }, line: { color: C.border, width: 1 },
});
addText('RUTAS PÚBLICAS · sin sesión', {
  x: 0.72, y: 1.22, w: 2.6, h: 0.18, fontSize: 8.5, bold: true, color: C.blue,
});
const publicCards = [
  { x: 2.08, title: 'Iniciar sesión', path: '/login', stroke: C.green },
  { x: 5.38, title: 'Registrarse', path: '/register', stroke: C.blue },
  { x: 8.68, title: 'Cambiar contraseña', path: '/change-password', stroke: C.gold },
];
publicCards.forEach((card) => {
  addCard(card.x, 1.48, 2.58, 0.45, card.title, { stroke: card.stroke, fontSize: 10.5 });
  addText(card.path, { x: card.x + 0.06, y: 1.94, w: 2.46, h: 0.1, fontSize: 7.5, color: C.muted, align: 'center' });
});

// Authentication and protected application shell
addLine(6.67, 2.08, 6.67, 2.28, { color: C.green });
addCard(5.2, 2.28, 2.94, 0.42, 'JWT guard · sesión válida', { stroke: C.green, fill: C.greenLight, fontSize: 10 });
addLine(6.67, 2.7, 6.67, 2.91, { color: C.green });
addCard(4.7, 2.91, 3.94, 0.51, 'LAYOUT AUTENTICADO  ·  menú lateral + router-outlet', { stroke: C.ink, fill: C.ink, color: C.paper, fontSize: 11.2 });

// Shared navigation bus branches to four readable groups.
const columns = [
  {
    x: 0.38, title: 'GENERAL · TODOS', color: C.green, rows: [
      ['Inicio', '/  ·  /home', 'M: todos  |  G: JWT'],
      ['Horarios', '/home/schedules', 'M: todos  |  G: JWT'],
      ['Perfil', '/home/profile', 'M: todos  |  G: JWT'],
      ['Ayuda y manual', '/home/ayuda', 'M: todos  |  G: JWT'],
      ['Notificaciones', 'popover (sin ruta)', 'M: todos  |  G: JWT'],
      ['Cerrar sesión', 'acción → /login', 'M: todos'],
    ],
  },
  {
    x: 3.55, title: 'MENÚ ADMINISTRADOR', color: C.coral, rows: [
      ['Dashboard', '/home/dashboard', 'M: admin  |  G: admin/sup/crew/cond'],
      ['Rutas', '/home/routes', 'M: admin  |  G: admin'],
      ['Vehículos', '/home/vehicles', 'M: admin  |  G: admin/sup/crew/cond'],
      ['Tripulación', '/home/crew', 'M: admin  |  G: admin/sup/crew/cond'],
      ['Informe administrativo', '/home/admin-journey-report', 'M: admin  |  G: admin'],
    ],
  },
  {
    x: 6.72, title: 'MÓDULOS POR ROL', color: C.blue, rows: [
      ['Usuarios', '/home/users', 'M/G: admin/sup/crew/cond/mec'],
      ['Taller', '/home/taller', 'M: admin/sup/mec  |  G: JWT'],
      ['Quejas', '/home/complaints', 'M: admin/user  |  G: JWT'],
      ['Informe de jornada', '/home/journey-report', 'M/G: admin/sup'],
    ],
  },
  {
    x: 9.89, title: 'VENTANAS Y REDIRECCIONES', color: C.gold, rows: [
      ['Emergencia', 'modal desde el layout', 'Botón: admin/sup/crew/cond/mec'],
      ['Modal de emergencia', 'sin URL', 'Componente: admin/sup/mec'],
      ['Anuncio general', 'modal sin URL', 'admin'],
      ['Acceso denegado', '→ /home/routes', 'roleGuard'],
      ['Ruta desconocida', '→ /login', '/**'],
    ],
  },
];

const colW = 3.06;
const centers = columns.map((col) => col.x + colW / 2);
addLine(6.67, 3.42, 6.67, 3.67, { arrow: false, color: C.ink, width: 1.4 });
addLine(centers[0], 3.67, centers[3], 3.67, { arrow: false, color: C.ink, width: 1.4 });
centers.forEach((center) => addLine(center, 3.67, center, 3.91, { color: C.ink, width: 1.3 }));

const panelY = 3.91;
const panelH = 2.7;
const rowY = 4.43;
const rowH = 0.315;
const rowGap = 0.045;
columns.forEach((col) => {
  slide.addShape(S.roundRect, {
    x: col.x, y: panelY, w: colW, h: panelH,
    rectRadius: 0.045, fill: { color: C.paper }, line: { color: col.color, width: 1.05 },
  });
  slide.addShape(S.rect, {
    x: col.x, y: panelY, w: colW, h: 0.39,
    fill: { color: col.color }, line: { color: col.color, width: 1 },
  });
  addText(col.title, {
    x: col.x + 0.08, y: panelY + 0.055, w: colW - 0.16, h: 0.25,
    fontSize: 9.2, bold: true, color: C.paper, align: 'center',
  });
  col.rows.forEach(([label, route, access], index) => {
    const y = rowY + index * (rowH + rowGap);
    slide.addShape(S.roundRect, {
      x: col.x + 0.09, y, w: colW - 0.18, h: rowH,
      rectRadius: 0.025,
      fill: { color: C.bg },
      line: { color: C.border, width: 0.65 },
    });
    addText(label, {
      x: col.x + 0.16, y: y + 0.018, w: 1.42, h: 0.13,
      fontSize: 8.2, bold: true, align: 'left',
    });
    addText(route, {
      x: col.x + 1.57, y: y + 0.018, w: colW - 1.78, h: 0.13,
      fontSize: 7.0, color: C.muted, align: 'right',
    });
    addText(access, {
      x: col.x + 0.16, y: y + 0.16, w: colW - 0.32, h: 0.105,
      fontSize: 6.7, color: col.color, align: 'left',
    });
  });
});

// Legend and accurate caveats from route/menu configuration.
addText('Roles: admin = administrador · sup = supervisor · crew = tripulación · cond = conductor · mec = mecánico · user = ciudadano', {
  x: 0.48, y: 6.72, w: 12.35, h: 0.16, fontSize: 7.7, color: C.ink, align: 'left',
});
addText('M = aparece en el menú  ·  G = rol aceptado por roleGuard. Taller y Quejas no declaran roleGuard en app.routes.ts.', {
  x: 0.48, y: 6.91, w: 12.35, h: 0.16, fontSize: 7.4, color: C.muted, align: 'left',
});
addText('Nota del código: el botón Emergencia contempla crew/conductor, pero el componente modal se monta solo para admin/sup/mec.', {
  x: 0.48, y: 7.1, w: 12.35, h: 0.16, fontSize: 7.2, color: C.coral, align: 'left',
});

const outputPath = path.join(process.cwd(), 'Mapa-de-Navegacion-WasteMonitor.pptx');
pptx.writeFile({ fileName: outputPath }).then(() => {
  console.log(`Mapa creado: ${outputPath}`);
  console.log('Diapositivas: 1');
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});