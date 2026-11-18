const format = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export function taskDate(value: string | null) {
  if (!value) return null;
  const date = new Date(/Z$|[+-]\d\d:\d\d$/i.test(value) ? value : `${value}Z`);
  return Number.isNaN(date.getTime()) ? null : format.format(date);
}
