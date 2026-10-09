import { ValidationError } from '@rumbo/shared';
import type { Paquete } from '../domain/dispatchTypes.js';
import { quotePrice } from '../pricing/pricingBuilder.js';
import type { QuoteInput } from '../schemas/quoteSchemas.js';
import { getMedioStrategy } from '../strategies/medios/medioRegistry.js';
import { aiSuggestionService } from './aiSuggestionService.js';
import { catalogService } from './catalogService.js';
import { routeMetricsService } from './routeMetricsService.js';

/** Minutos que tarda en promedio asignar y recoger un pedido pagado. */
const MINUTOS_ASIGNACION = 12;

export const quoteService = {
  async quote(input: QuoteInput) {
    const volumenL = Number(((input.largoCm * input.anchoCm * input.altoCm) / 1000).toFixed(2));
    const paquete: Paquete = { pesoKg: input.pesoKg, volumenL, fragil: input.fragil, urgencia: input.urgencia };
    const minutosLimite = (new Date(input.fechaLimite).getTime() - Date.now()) / 60_000;
    if (minutosLimite < 20) throw new ValidationError('La fecha límite debe ser al menos 20 minutos en el futuro');

    const [ruta, medios, extras] = await Promise.all([
      routeMetricsService.route(input.origen, input.destino),
      catalogService.activeMedios(),
      catalogService.activeExtras(),
    ]);
    if (ruta.lineaRectaKm < 0.05) throw new ValidationError('El origen y el destino son el mismo punto');

    const extrasValidos = input.extras.filter((id) => extras.some((extra) => extra.id === id));
    const urgente = extrasValidos.includes('URGENTE');

    const opciones = medios.map((perfil) => {
      const evaluacion = getMedioStrategy(perfil.id).evaluar(paquete, ruta, perfil);
      const minutosTotales = evaluacion.minutos + MINUTOS_ASIGNACION * (urgente ? 0.5 : 1);
      const precio = quotePrice(extrasValidos, extras, {
        perfil,
        paquete,
        distanciaKm: evaluacion.distanciaKm,
        valorDeclarado: input.valorDeclarado,
      });
      return {
        medioId: perfil.id,
        nombre: perfil.nombre,
        icono: perfil.icono,
        color: perfil.color,
        factible: evaluacion.factible,
        motivos: evaluacion.motivos,
        distanciaKm: evaluacion.distanciaKm,
        minutos: Math.round(minutosTotales),
        llegadaEstimada: new Date(Date.now() + minutosTotales * 60_000).toISOString(),
        cumpleLimite: minutosTotales <= minutosLimite,
        emisionesG: Math.round(evaluacion.distanciaKm * perfil.emisionesGCO2Km),
        precio,
      };
    });

    const mediosFactibles = opciones.filter((opcion) => opcion.factible).map((opcion) => opcion.medioId);
    const sugerencia = mediosFactibles.length
      ? await aiSuggestionService.sugerir({
          paquete,
          tramo: ruta,
          minutosLimite,
          urgente,
          mediosFactibles,
        })
      : null;

    return {
      paquete: { ...paquete, largoCm: input.largoCm, anchoCm: input.anchoCm, altoCm: input.altoCm },
      ruta: {
        distanciaKm: ruta.distanciaKm,
        lineaRectaKm: ruta.lineaRectaKm,
        nivelTrafico: ruta.nivelTrafico,
        minutosAuto: ruta.minutosAuto,
        zonaOrigen: ruta.zonaOrigen,
        zonaDestino: ruta.zonaDestino,
        polilinea: ruta.polilinea,
        estimada: ruta.estimada,
      },
      opciones,
      sugerencia,
      extras: extras.filter((extra) => extrasValidos.includes(extra.id)),
      generadaEn: new Date().toISOString(),
    };
  },
};
