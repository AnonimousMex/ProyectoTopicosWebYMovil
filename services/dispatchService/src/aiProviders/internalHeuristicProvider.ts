import type { PerfilMedio } from '../domain/dispatchTypes.js';
import { prisma } from '../lib/infrastructure.js';
import { getMedioStrategy } from '../strategies/medios/medioRegistry.js';
import type { AiProvider, ContextoIA, ResultadoProveedor } from './aiProvider.js';

/**
 * Modelo interno: devuelve SU propio objeto (distinto a JSON y XML) y
 * aprende del desempeño real de cada medio (tabla MedioDesempeno, que se
 * alimenta cuando los pedidos se entregan). Nunca depende de la red.
 */
interface RecomendacionInterna {
  vehiculo: { clave: string; puntaje: number };
  certeza: number;
  razones: string[];
  ranking: Array<{ clave: string; puntaje: number }>;
}

export class InternalHeuristicProvider implements AiProvider {
  readonly id = 'interno';
  readonly nombre = 'Modelo interno Rumbo';
  readonly formato = 'OBJETO' as const;

  constructor(private readonly loadPerfiles: () => Promise<PerfilMedio[]>) {}

  async evaluar(contexto: ContextoIA): Promise<RecomendacionInterna> {
    const perfiles = (await this.loadPerfiles()).filter((perfil) => contexto.mediosFactibles.includes(perfil.id));
    const desempeno = await prisma.medioDesempeno.findMany();
    const tasa = new Map(desempeno.map((row) => [row.medioId, row.entregas ? row.aTiempo / row.entregas : 0.85]));

    const evaluados = perfiles.map((perfil) => {
      const evaluacion = getMedioStrategy(perfil.id).evaluar(contexto.paquete, contexto.tramo, perfil);
      const holgura = contexto.minutosLimite - evaluacion.minutos;
      const puntualidad = tasa.get(perfil.id) ?? 0.85;
      const pesoTiempo = contexto.urgente || contexto.paquete.urgencia !== 'NORMAL' ? 0.6 : 0.35;
      // Menor es mejor: tiempo y costo normalizados, castigo por no llegar a tiempo.
      const puntaje =
        pesoTiempo * (evaluacion.minutos / 30) +
        (1 - pesoTiempo) * (evaluacion.costoOperativo / 60) +
        (holgura < 0 ? 2 : 0) +
        (1 - puntualidad);
      return { perfil, evaluacion, holgura, puntaje };
    });
    evaluados.sort((a, b) => a.puntaje - b.puntaje);

    const best = evaluados[0];
    if (!best) {
      return { vehiculo: { clave: 'camioneta', puntaje: 0 }, certeza: 0.3, razones: ['ningún medio es factible'], ranking: [] };
    }
    const razones: string[] = [];
    if (contexto.tramo.nivelTrafico > 0.55 && best.perfil.sensibilidadTrafico < 0.5) razones.push('tráfico alto');
    if (contexto.paquete.pesoKg <= 3) razones.push('paquete pequeño');
    if (contexto.paquete.pesoKg > 15) razones.push('paquete pesado');
    if (best.holgura < 20) razones.push('fecha límite ajustada');
    if (best.perfil.id === 'bicicleta') razones.push('trayecto corto y sin emisiones');
    if (best.perfil.id === 'dron') razones.push('vuelo directo sin tráfico');
    if (razones.length === 0) razones.push('mejor equilibrio entre tiempo y costo');

    const margin = evaluados[1] ? evaluados[1].puntaje - best.puntaje : 1;
    return {
      vehiculo: { clave: best.perfil.id, puntaje: Number(best.puntaje.toFixed(3)) },
      certeza: Math.min(0.97, 0.6 + margin * 0.4),
      razones,
      ranking: evaluados.map((item) => ({ clave: item.perfil.id, puntaje: Number(item.puntaje.toFixed(3)) })),
    };
  }

  async sugerir(contexto: ContextoIA): Promise<ResultadoProveedor> {
    const recomendacion = await this.evaluar(contexto);
    return {
      sugerencia: {
        medio: recomendacion.vehiculo.clave,
        motivo: recomendacion.razones.join(' y '),
        confianza: Number(recomendacion.certeza.toFixed(3)),
        proveedor: this.id,
      },
      respuestaOriginal: JSON.stringify(recomendacion, null, 2),
    };
  }
}
