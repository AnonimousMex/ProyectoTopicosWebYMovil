import { z } from 'zod';

const punto = z.object(
  { direccion: z.string(), lat: z.number(), lng: z.number(), lugarId: z.string().nullish(), nombre: z.string().optional() },
  { required_error: 'Elige un lugar', invalid_type_error: 'Elige un lugar' },
);

export const nuevoPedidoSchema = z
  .object({
    origen: punto,
    destino: punto,
    destinatarioNombre: z.string().trim().min(2, '¿Quién recibe?'),
    destinatarioTelefono: z.string().regex(/^(\d{10})?$/, '10 dígitos').optional(),
    pesoKg: z.coerce.number({ invalid_type_error: 'Número' }).positive('Mayor a 0').max(500, 'Máx. 500 kg'),
    largoCm: z.coerce.number().positive('Mayor a 0').max(300),
    anchoCm: z.coerce.number().positive('Mayor a 0').max(300),
    altoCm: z.coerce.number().positive('Mayor a 0').max(300),
    fragil: z.boolean(),
    urgencia: z.enum(['NORMAL', 'ALTA', 'CRITICA']),
    horasLimite: z.coerce.number().min(0.5, 'Mínimo 30 min').max(72),
    extras: z.array(z.string()),
    valorDeclarado: z.coerce.number().min(0).max(500_000),
    notas: z.string().max(300).optional(),
  })
  .refine((data) => data.origen.lat !== data.destino.lat || data.origen.lng !== data.destino.lng, {
    path: ['destino'],
    message: 'El destino debe ser distinto al origen',
  })
  .refine((data) => !data.extras.includes('SEGURO') || data.valorDeclarado > 0, {
    path: ['valorDeclarado'],
    message: 'Declara el valor para asegurarlo',
  });

export type NuevoPedidoForm = z.input<typeof nuevoPedidoSchema>;
export type NuevoPedidoValues = z.output<typeof nuevoPedidoSchema>;
