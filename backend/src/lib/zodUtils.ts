import { z } from 'zod';

// Like schema.partial(), but drops .default() values — otherwise Zod fills defaults into
// update requests and a partial edit silently resets fields (e.g. a deal's status to 'inquiry').
export function partialWithoutDefaults<T extends z.ZodRawShape>(schema: z.ZodObject<T>) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const [key, field] of Object.entries(schema.shape)) {
    let inner = field as z.ZodTypeAny;
    while (inner instanceof z.ZodDefault) inner = (inner as z.ZodDefault<z.ZodTypeAny>).unwrap() as z.ZodTypeAny;
    shape[key] = inner.optional();
  }
  return z.object(shape);
}
