export function isValidExam(examData: object, templateSchema: object): boolean {
  if (typeof examData !== 'object' || examData === null || Array.isArray(examData)) {
    return false;
  }

  const examKeys = Object.keys(examData);
  const templateKeys = Object.keys(templateSchema);

  if (examKeys.length !== templateKeys.length) return false;

  // Mesmo CONJUNTO de chaves (independe da ordem de serialização do JSON).
  const templateKeySet = new Set(templateKeys);
  if (!examKeys.every((key) => templateKeySet.has(key))) return false;

  // Cada resultado é um escalar aceitável: número, texto ou vazio. Bloqueia
  // objetos/arrays aninhados sendo gravados como resultado de exame.
  return Object.values(examData).every(
    (value) => value === null || typeof value === 'number' || typeof value === 'string',
  );
}
