import { z } from "zod";

export const TITLE_MAX = 32;
export const DESCRIPTION_MAX = 124;
export const LABEL_TEXT_MAX = 45;
export const LABELS_MAX = 5;

const labelSchema = z.object({
  id: z.string().min(1, "Cada etiqueta deve ter um identificador."),
  text: z
    .string()
    .min(1, "O texto da etiqueta não pode ficar em branco.")
    .max(LABEL_TEXT_MAX, `O texto da etiqueta deve ter no máximo ${LABEL_TEXT_MAX} caracteres.`),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "A cor da etiqueta deve ser um hex válido (ex: #3b82f6)."),
});

/** Schema para os dados do formulário de criação/edição de room (sem id/userId/createdAt). */
export const roomFormSchema = z.object({
  title: z
    .string()
    .min(1, "O título da sala é obrigatório.")
    .max(TITLE_MAX, `O título deve ter no máximo ${TITLE_MAX} caracteres.`),
  subtitle: z
    .string()
    .max(DESCRIPTION_MAX, `O subtítulo deve ter no máximo ${DESCRIPTION_MAX} caracteres.`),
  labels: z
    .array(labelSchema)
    .max(LABELS_MAX, `É permitido no máximo ${LABELS_MAX} etiquetas.`),
});

export type RoomFormData = z.infer<typeof roomFormSchema>;

/** Valida os dados do formulário e retorna erros por campo (chave = nome do campo). */
export function validateRoomForm(data: {
  title: string;
  subtitle: string;
  labels: Array<{ id: string; text: string; color: string }>;
}): { success: true; data: RoomFormData } | { success: false; errors: Record<string, string> } {
  const normalized = {
    title: (data.title ?? "").trim().slice(0, TITLE_MAX),
    subtitle: (data.subtitle ?? "").trim().slice(0, DESCRIPTION_MAX),
    labels: (data.labels ?? []).slice(0, LABELS_MAX).map((l) => ({
      id: l.id,
      text: l.text.trim().slice(0, LABEL_TEXT_MAX),
      color: l.color,
    })),
  };

  const result = roomFormSchema.safeParse(normalized);
  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const path = issue.path.join(".");
    if (!errors[path]) {
      errors[path] = issue.message;
    }
  }
  return { success: false, errors };
}
