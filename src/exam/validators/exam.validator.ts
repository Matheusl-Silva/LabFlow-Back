export function isValidExam(examData: object, templateSchema: object): boolean{
  const examKeys = Object.keys(examData);
  const templateKeys = Object.keys(templateSchema);

  return examKeys.length === templateKeys.length && examKeys.every((item, index) => item === templateKeys[index]);
}
