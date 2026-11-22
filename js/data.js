/* =========================================================
   DATOS DE LA TEMPORADA 2026

   Los resultados ya no se editan a mano: js/live.js los descarga de /api/season
   (función de Netlify que lee la API oficial de motogp.com) y rellena estas
   estructuras antes de pintar cada página. Si la API no responde, usa la última
   copia guardada en el navegador o, en su defecto, js/snapshot.js.

   Aquí solo queda lo fijo: nombres en español, circuitos, longitudes y coordenadas.
   ========================================================= */

export const SEASON = {
  year: 2026,
  totalRounds: 22,
  completedRounds: 0,   // ← live.js
  asOf: '',             // ← live.js (ISO)
  asOfLabel: '',        // ← live.js ("12·11·2026")
  lastRaceLabel: '',    // ← live.js ("GP de Catar · Lusail")
  source: 'snapshot',   // 'live' | 'cache' | 'snapshot'
};

/* Calendario. winner / maker / pole / cancelled: carrera de MotoGP (← live.js).
   km: longitud orientativa del trazado. lat/lon: ubicación aproximada (mapa de circuitos). */
const gp = (r, country, circuit, city, start, end, km, lat, lon) => ({
  r, country, circuit, city, start, end, km, lat, lon, winner: null, maker: null, pole: null, cancelled: false,
});

export const CALENDAR = [
  gp(1,  'Tailandia',       'Chang International Circuit',           'Buriram',              '2026-02-27', '2026-03-01', '4,554', 14.96, 103.09),
  gp(2,  'Brasil',          'Autódromo Internacional Ayrton Senna',  'Goiânia',              '2026-03-20', '2026-03-22', '3,835', -16.72, -49.20),
  gp(3,  'Américas',        'Circuito de las Américas',              'Austin',               '2026-03-27', '2026-03-29', '5,513', 30.13, -97.64),
  gp(4,  'España',          'Circuito de Jerez',                     'Jerez',                '2026-04-24', '2026-04-26', '4,423', 36.71, -6.03),
  gp(5,  'Francia',         'Le Mans',                               'Le Mans',              '2026-05-08', '2026-05-10', '4,185', 47.95, 0.21),
  gp(6,  'Cataluña',        'Circuit de Barcelona-Catalunya',        'Montmeló',             '2026-05-15', '2026-05-17', '4,657', 41.57, 2.26),
  gp(7,  'Italia',          'Mugello',                               'Mugello',              '2026-05-29', '2026-05-31', '5,245', 43.99, 11.37),
  gp(8,  'Hungría',         'Balaton Park',                          'Balatonfőkajár',       '2026-06-05', '2026-06-07', '4,075', 47.03, 18.21),
  gp(9,  'República Checa', 'Brno Circuit',                          'Brno',                 '2026-06-19', '2026-06-21', '5,403', 49.20, 16.44),
  gp(10, 'Países Bajos',    'TT Circuit Assen',                      'Assen',                '2026-06-26', '2026-06-28', '4,542', 52.96, 6.52),
  gp(11, 'Alemania',        'Sachsenring',                           'Hohenstein-Ernstthal', '2026-07-10', '2026-07-12', '3,671', 50.79, 12.69),
  gp(12, 'Gran Bretaña',    'Silverstone',                           'Silverstone',          '2026-08-07', '2026-08-09', '5,900', 52.07, -1.02),
  gp(13, 'Aragón',          'MotorLand Aragón',                      'Alcañiz',              '2026-08-28', '2026-08-30', '5,077', 41.08, -0.20),
  gp(14, 'San Marino',      'Misano World Circuit Marco Simoncelli', 'Misano',               '2026-09-11', '2026-09-13', '4,226', 43.96, 12.68),
  gp(15, 'Austria',         'Red Bull Ring',                         'Spielberg',            '2026-09-18', '2026-09-20', '4,318', 47.22, 14.76),
  gp(16, 'Japón',           'Mobility Resort Motegi',                'Motegi',               '2026-10-02', '2026-10-04', '4,801', 36.53, 140.23),
  gp(17, 'Indonesia',       'Pertamina Mandalika Circuit',           'Mandalika',            '2026-10-09', '2026-10-11', '4,310', -8.89, 116.30),
  gp(18, 'Australia',       'Phillip Island',                        'Phillip Island',       '2026-10-23', '2026-10-25', '4,448', -38.50, 145.23),
  gp(19, 'Malasia',         'Sepang International Circuit',          'Sepang',               '2026-10-30', '2026-11-01', '5,543', 2.76, 101.74),
  gp(20, 'Catar',           'Lusail International Circuit',          'Lusail',               '2026-11-06', '2026-11-08', '5,380', 25.49, 51.45),
  gp(21, 'Portugal',        'Autódromo Internacional do Algarve',    'Portimão',             '2026-11-20', '2026-11-22', '4,592', 37.23, -8.63),
  gp(22, 'Valencia',        'Circuit Ricardo Tormo',                 'Cheste',               '2026-11-27', '2026-11-29', '4,005', 39.49, -0.63),
];

/* Próxima carrera (← live.js). round: null cuando la temporada ha terminado. */
export const NEXT_RACE = { round: null, raceUTC: '', localLabel: '', approx: false };

export const STANDINGS = {
  motogp: { label: 'MotoGP', source: '', maxLeft: 0, riders: [] },
  moto2:  { label: 'Moto2',  source: '', maxLeft: 0, riders: [] },
  moto3:  { label: 'Moto3',  source: '', maxLeft: 0, riders: [] },
};

export const CONSTRUCTORS = { source: '', rows: [] };

/* Última carrera disputada: top 10 de cada categoría (← live.js) */
export const LAST_RACE = {
  round: 0, title: '', circuit: '', place: '', dateLabel: '',
  motogp: { source: '', rows: [], note: '' },
  moto2:  { source: '', rows: [], note: '' },
  moto3:  { source: '', rows: [], note: '' },
};

/* Textos editoriales generados a partir de los datos (← live.js) */
export const SCENES = [];
export const FIGURES = [];
export const MARQUEE = [];
export const PHRASES = [];

export const SOURCES = [
  { label: 'Resultados oficiales · motogp.com', url: 'https://www.motogp.com/es/gp-results' },
  { label: 'Clasificación del Mundial · motogp.com', url: 'https://www.motogp.com/es/world-standing' },
  { label: 'Calendario y horarios · motogp.com', url: 'https://www.motogp.com/es/calendar' },
  { label: 'Estadísticas oficiales · stats.motogp.com', url: 'https://stats.motogp.com/en/world-standing' },
];
