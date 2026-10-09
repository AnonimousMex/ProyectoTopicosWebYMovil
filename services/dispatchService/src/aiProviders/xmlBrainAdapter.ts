import { XMLParser } from 'fast-xml-parser';
import { xmlBrainClient } from '../lib/infrastructure.js';
import type { AiProvider, ContextoIA, ResultadoProveedor } from './aiProvider.js';

const CODE_TO_MEDIO: Record<string, string> = {
  CAM: 'camioneta',
  MC: 'motocicleta',
  BC: 'bicicleta',
  DR: 'dron',
};

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' });

const xmlNumber = (value: number) => Number(value.toFixed(3)).toString();

/** Adapter: arma la petición XML de XmlBrain y traduce su respuesta XML al dominio. */
export class XmlBrainAdapter implements AiProvider {
  readonly id = 'xmlbrain';
  readonly nombre = 'XmlBrain Logistics';
  readonly formato = 'XML' as const;

  async sugerir(contexto: ContextoIA): Promise<ResultadoProveedor> {
    const { paquete, tramo } = contexto;
    const prioridad = contexto.urgente ? 'CRITICA' : paquete.urgencia;
    const requestXml = `<?xml version="1.0" encoding="UTF-8"?>
<solicitud>
  <paquete peso="${xmlNumber(paquete.pesoKg)}" volumen="${xmlNumber(paquete.volumenL)}" fragil="${paquete.fragil}"/>
  <viaje distancia="${xmlNumber(tramo.distanciaKm)}" recta="${xmlNumber(tramo.lineaRectaKm)}" trafico="${xmlNumber(tramo.nivelTrafico)}"/>
  <prioridad>${prioridad}</prioridad>
  <limiteMin>${Math.max(0, Math.round(contexto.minutosLimite))}</limiteMin>
</solicitud>`;

    const responseXml = await xmlBrainClient.request<string>('POST', '/proveedores/xmlbrain/suggest', {
      rawBody: requestXml,
      contentType: 'application/xml',
      responseType: 'text',
    });

    const recommendation = parser.parse(responseXml)?.recommendation;
    const code = recommendation?.vehicle?.code;
    if (!code || !CODE_TO_MEDIO[code]) throw new Error('XmlBrain respondió un XML sin vehículo reconocible');

    return {
      sugerencia: {
        medio: CODE_TO_MEDIO[code],
        motivo: String(recommendation.reason ?? 'sin motivo').toLowerCase(),
        confianza: Number(recommendation.confidence ?? 0.5),
        proveedor: this.id,
      },
      respuestaOriginal: responseXml,
    };
  }
}
