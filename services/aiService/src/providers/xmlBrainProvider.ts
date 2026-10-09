import { XMLBuilder, XMLParser } from 'fast-xml-parser';

/**
 * "XmlBrain Logistics" — proveedor externo simulado que sólo habla XML.
 *
 * Petición:
 *   <solicitud><paquete peso="1.2" volumen="4" fragil="false"/>
 *     <viaje distancia="5.2" recta="4.1" trafico="0.72"/><prioridad>ALTA</prioridad>
 *     <limiteMin>90</limiteMin></solicitud>
 * Respuesta:
 *   <recommendation engine="xmlbrain-1.4"><vehicle code="MC"/>
 *     <confidence>0.82</confidence><reason>...</reason></recommendation>
 */
const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '', parseAttributeValue: true });
const builder = new XMLBuilder({ ignoreAttributes: false, attributeNamePrefix: '@_', format: true });

type VehicleCode = 'CAM' | 'MC' | 'BC' | 'DR';

export function parseXmlRequest(xml: string) {
  const doc = parser.parse(xml)?.solicitud;
  if (!doc?.paquete || !doc?.viaje) throw new Error('XML inválido: se esperaba <solicitud> con <paquete> y <viaje>');
  return {
    peso: Number(doc.paquete.peso),
    volumen: Number(doc.paquete.volumen),
    fragil: String(doc.paquete.fragil) === 'true',
    distancia: Number(doc.viaje.distancia),
    recta: Number(doc.viaje.recta),
    trafico: Number(doc.viaje.trafico),
    prioridad: String(doc.prioridad ?? 'NORMAL'),
    limiteMin: Number(doc.limiteMin ?? 240),
  };
}

export function suggestXml(xml: string): string {
  const req = parseXmlRequest(xml);
  let code: VehicleCode;
  let confidence: number;
  let reason: string;

  // Reglas de negocio "propietarias" del proveedor (distintas a RouteAI a propósito).
  if (req.peso > 20 || req.volumen > 100) {
    code = 'CAM';
    confidence = 0.93;
    reason = 'Carga voluminosa: requiere vehículo de carga';
  } else if (req.peso <= 2 && req.volumen <= 6 && req.recta <= 10 && !req.fragil && req.prioridad !== 'NORMAL') {
    code = 'DR';
    confidence = 0.78;
    reason = 'Paquete ligero con prioridad: vuelo directo';
  } else if (req.trafico >= 0.5 && req.peso <= 12) {
    code = 'MC';
    confidence = 0.7 + req.trafico * 0.2;
    reason = 'Tráfico alto y paquete pequeño';
  } else if (req.distancia <= 4 && req.peso <= 5) {
    code = 'BC';
    confidence = 0.74;
    reason = 'Trayecto corto: la bicicleta es la opción más económica';
  } else if (req.distancia > 18) {
    code = 'CAM';
    confidence = 0.66;
    reason = 'Distancia larga fuera de la zona urbana';
  } else {
    code = 'MC';
    confidence = 0.61;
    reason = 'Entrega urbana estándar';
  }
  confidence = Math.min(0.99, confidence + (Math.random() - 0.5) * 0.06);

  return `<?xml version="1.0" encoding="UTF-8"?>\n${builder.build({
    recommendation: {
      '@_engine': 'xmlbrain-1.4',
      vehicle: { '@_code': code },
      confidence: confidence.toFixed(3),
      reason,
    },
  })}`;
}
