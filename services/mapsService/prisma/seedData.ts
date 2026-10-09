/**
 * Datos SIMULADOS de Morelia, Michoacán. Las coordenadas son aproximadas y
 * sirven para que el proveedor de mapas propio calcule distancias, rutas y
 * tráfico sin pagar una API externa.
 */

// Perfiles de congestión (0 = libre, 1 = detenido) para cada hora 0..23.
const perfilCentro = [0.1, 0.05, 0.05, 0.05, 0.08, 0.15, 0.35, 0.7, 0.9, 0.75, 0.6, 0.6, 0.65, 0.75, 0.85, 0.7, 0.6, 0.7, 0.9, 0.95, 0.75, 0.5, 0.3, 0.15];
const perfilResidencial = [0.05, 0.03, 0.03, 0.03, 0.05, 0.12, 0.3, 0.65, 0.7, 0.45, 0.3, 0.3, 0.35, 0.45, 0.55, 0.45, 0.4, 0.55, 0.7, 0.6, 0.4, 0.25, 0.12, 0.08];
const perfilComercial = [0.05, 0.03, 0.03, 0.03, 0.05, 0.1, 0.2, 0.45, 0.55, 0.5, 0.5, 0.55, 0.65, 0.7, 0.7, 0.65, 0.65, 0.75, 0.85, 0.85, 0.7, 0.5, 0.25, 0.1];
const perfilPeriferia = [0.03, 0.02, 0.02, 0.03, 0.06, 0.15, 0.35, 0.55, 0.5, 0.3, 0.2, 0.2, 0.25, 0.3, 0.35, 0.3, 0.3, 0.45, 0.55, 0.45, 0.3, 0.15, 0.08, 0.05];

export const zonasSeed = [
  { id: 'centro', nombre: 'Centro Histórico', color: '#F43F5E', centroLat: 19.7024, centroLng: -101.1905, radioKm: 1.4, tortuosidad: 1.45, perfilTrafico: perfilCentro },
  { id: 'norte', nombre: 'Norte · Tecnológico', color: '#6366F1', centroLat: 19.7235, centroLng: -101.1870, radioKm: 2.6, tortuosidad: 1.3, perfilTrafico: perfilResidencial },
  { id: 'poniente', nombre: 'Poniente · CU', color: '#10B981', centroLat: 19.7000, centroLng: -101.2170, radioKm: 2.6, tortuosidad: 1.32, perfilTrafico: perfilResidencial },
  { id: 'oriente', nombre: 'Oriente · Camelinas', color: '#F59E0B', centroLat: 19.6880, centroLng: -101.1680, radioKm: 2.6, tortuosidad: 1.28, perfilTrafico: perfilComercial },
  { id: 'sur', nombre: 'Sur · Altozano', color: '#06B6D4', centroLat: 19.6690, centroLng: -101.1650, radioKm: 3.0, tortuosidad: 1.25, perfilTrafico: perfilComercial },
  { id: 'periferia', nombre: 'Periferia y municipios', color: '#8B5CF6', centroLat: 19.7900, centroLng: -101.1000, radioKm: 12, tortuosidad: 1.18, perfilTrafico: perfilPeriferia },
];

type LugarSeed = [nombre: string, tipo: string, direccion: string, colonia: string, cp: string, lat: number, lng: number];

export const lugaresSeed: LugarSeed[] = [
  ['Catedral de Morelia', 'Punto de interés', 'Av. Francisco I. Madero Pte. s/n', 'Centro', '58000', 19.7024, -101.1924],
  ['Palacio Clavijero', 'Cultura', 'Nigromante 79', 'Centro', '58000', 19.7029, -101.1946],
  ['Plaza Valladolid', 'Plaza', 'Plaza Valladolid s/n', 'Centro', '58000', 19.7031, -101.1888],
  ['Jardín de las Rosas', 'Plaza', 'Santiago Tapia s/n', 'Centro', '58000', 19.7045, -101.1958],
  ['Templo de las Monjas', 'Punto de interés', 'Av. Madero Ote. 900', 'Centro', '58000', 19.7019, -101.1866],
  ['Fuente de las Tarascas', 'Punto de interés', 'Av. Acueducto esq. Madero', 'Centro', '58000', 19.7022, -101.1828],
  ['Mercado Independencia', 'Mercado', 'Vasco de Quiroga s/n', 'Centro', '58000', 19.6968, -101.1883],
  ['Mercado de San Juan', 'Mercado', 'Av. Revolución s/n', 'Centro', '58000', 19.7082, -101.1878],
  ['Hospital Civil Dr. Miguel Silva', 'Hospital', 'Isidro Huarte y Samuel Ramos', 'Centro', '58000', 19.7058, -101.1985],
  ['Santuario de Guadalupe', 'Punto de interés', 'Calzada Fray Antonio de San Miguel', 'Centro', '58000', 19.7011, -101.1772],
  ['Bosque Cuauhtémoc', 'Parque', 'Av. Acueducto s/n', 'Bosque Cuauhtémoc', '58020', 19.6986, -101.1800],
  ['Instituto Tecnológico de Morelia', 'Escuela', 'Av. Tecnológico 1500', 'Lomas de Santiaguito', '58120', 19.7215, -101.1857],
  ['Colonia Eduardo Ruiz', 'Colonia', 'Av. Morelos Norte 1200', 'Eduardo Ruiz', '58010', 19.7140, -101.1940],
  ['Colonia Industrial', 'Colonia', 'Av. Héroes de Nocupétaro 2100', 'Industrial', '58130', 19.7205, -101.2020],
  ['Colonia Vasco de Quiroga', 'Colonia', 'Calle Ignacio Zaragoza 450', 'Vasco de Quiroga', '58230', 19.7282, -101.1722],
  ['Colonia Mil Cumbres', 'Colonia', 'Av. Mil Cumbres 120', 'Mil Cumbres', '58200', 19.7292, -101.1918],
  ['Infonavit La Colina', 'Colonia', 'Retorno La Colina 33', 'La Colina', '58240', 19.7302, -101.1650],
  ['Real Ucareo', 'Colonia', 'Av. Real Ucareo 900', 'Real Ucareo', '58250', 19.7402, -101.1702],
  ['Mercado de Abastos', 'Mercado', 'Av. Periférico Paseo de la República', 'Mercado de Abastos', '58195', 19.7332, -101.1832],
  ['Colonia Gertrudis Bocanegra', 'Colonia', 'Av. Lázaro Cárdenas 3100', 'Gertrudis Bocanegra', '58070', 19.7121, -101.1768],
  ['Torreón Nuevo', 'Colonia', 'Av. Torreón Nuevo 700', 'Torreón Nuevo', '58204', 19.7320, -101.2050],
  ['Central de Autobuses', 'Terminal', 'Periférico Paseo de la República 5555', 'Ejidal Ocolusen', '58279', 19.7185, -101.2290],
  ['Colonia Prados Verdes', 'Colonia', 'Calle Hortensia 210', 'Prados Verdes', '58110', 19.7170, -101.2280],
  ['Colonia Solidaridad', 'Colonia', 'Av. Solidaridad 1500', 'Solidaridad', '58145', 19.7180, -101.2150],
  ['Colonia Obrera', 'Colonia', 'Calle Obreros de Cananea 300', 'Obrera', '58080', 19.7100, -101.2070],
  ['Colonia Electricistas', 'Colonia', 'Av. Juan Pablo II 250', 'Electricistas', '58290', 19.7060, -101.2160],
  ['Estadio Morelos', 'Deportes', 'Av. del Estadio s/n', 'Ciudad Deportiva', '58110', 19.7140, -101.2363],
  ['Valle Quieto', 'Colonia', 'Av. Valle Quieto 80', 'Valle Quieto', '58066', 19.7240, -101.2250],
  ['Colonia Isaac Arriaga', 'Colonia', 'Calle Isaac Arriaga 120', 'Isaac Arriaga', '58210', 19.7001, -101.2012],
  ['Colonia Molino de Parras', 'Colonia', 'Calle Molino de Parras 45', 'Molino de Parras', '58010', 19.6952, -101.1996],
  ['Hospital de la Mujer', 'Hospital', 'Av. Solidaridad s/n', 'Nueva Valladolid', '58190', 19.6990, -101.2085],
  ['Ciudad Universitaria UMSNH', 'Escuela', 'Av. Francisco J. Múgica s/n', 'Felícitas del Río', '58030', 19.6886, -101.2040],
  ['Villa Universidad', 'Colonia', 'Calle Universidad 330', 'Villa Universidad', '58060', 19.6830, -101.2110],
  ['Lomas de Hidalgo', 'Colonia', 'Av. Lomas de Hidalgo 900', 'Lomas de Hidalgo', '58240', 19.6890, -101.1980],
  ['Zoológico Benito Juárez', 'Parque', 'Calzada Juárez s/n', 'Félix Ireta', '58070', 19.6852, -101.1942],
  ['Colonia Félix Ireta', 'Colonia', 'Av. Lázaro Cárdenas 1500', 'Félix Ireta', '58070', 19.6905, -101.1835],
  ['Colonia Ventura Puente', 'Colonia', 'Av. Ventura Puente 800', 'Ventura Puente', '58020', 19.6930, -101.1880],
  ['Centro de Convenciones', 'Cultura', 'Av. Ventura Puente 1500', 'Centro de Convenciones', '58090', 19.6885, -101.1790],
  ['Nueva Chapultepec', 'Colonia', 'Av. Acueducto 3200', 'Nueva Chapultepec', '58280', 19.6970, -101.1720],
  ['Chapultepec Norte', 'Colonia', 'Calle Batallón de San Patricio 140', 'Chapultepec Norte', '58260', 19.7050, -101.1690],
  ['Colonia La Soledad', 'Colonia', 'Av. Siervo de la Nación 400', 'La Soledad', '58180', 19.7052, -101.1612],
  ['Plaza Fiesta Camelinas', 'Comercio', 'Av. Camelinas 3233', 'Las Camelinas', '58290', 19.6870, -101.1730],
  ['Las Camelinas', 'Colonia', 'Av. Camelinas 2100', 'Las Camelinas', '58290', 19.6830, -101.1800],
  ['Plaza Las Américas', 'Comercio', 'Av. Camelinas 1255', 'Ocolusen', '58279', 19.6869, -101.1567],
  ['Hospital Star Médica', 'Hospital', 'Virrey de Mendoza 2000', 'Félix Ireta', '58070', 19.6830, -101.1620],
  ['Colonia Ocolusen', 'Colonia', 'Calle Ocolusen 60', 'Ocolusen', '58279', 19.6810, -101.1700],
  ['Jardines de Guadalupe', 'Colonia', 'Calle Jardín 25', 'Jardines de Guadalupe', '58140', 19.6880, -101.1520],
  ['Santa María de Guido', 'Colonia', 'Av. Santa María 350', 'Santa María de Guido', '58090', 19.6720, -101.1920],
  ['Universidad Vasco de Quiroga', 'Escuela', 'Av. Juan Pablo II 555', 'Santa María de Guido', '58090', 19.6715, -101.1880],
  ['Lomas de Santa María', 'Colonia', 'Av. Lomas de Santa María 1000', 'Lomas de Santa María', '58090', 19.6760, -101.1780],
  ['Tres Marías', 'Colonia', 'Blvd. Tres Marías 120', 'Tres Marías', '58254', 19.6690, -101.1440],
  ['Paseo Altozano', 'Comercio', 'Av. Montaña Monarca 1000', 'Altozano', '58350', 19.6602, -101.1552],
  ['Club de Golf Altozano', 'Deportes', 'Paseo de la Reforma 2000', 'Altozano', '58350', 19.6560, -101.1480],
  ['Ex Hacienda La Huerta', 'Colonia', 'Calzada La Huerta 750', 'La Huerta', '58080', 19.6770, -101.2050],
  ['Tarímbaro', 'Municipio', 'Av. Morelos 10, Tarímbaro', 'Tarímbaro Centro', '58880', 19.7960, -101.1780],
  ['Charo', 'Municipio', 'Plaza Principal, Charo', 'Charo Centro', '58300', 19.7480, -101.0430],
  ['Aeropuerto de Morelia', 'Terminal', 'Km 27 Carretera Morelia–Zinapécuaro', 'Álvaro Obregón', '58920', 19.8496, -101.0255],
];
