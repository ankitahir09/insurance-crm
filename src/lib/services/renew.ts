// Adds 1 year, clamping Feb 29 to Feb 28 in non-leap years
export function addOneYearSafe(date: Date): Date {
  const newDate = new Date(date);
  const currentMonth = newDate.getMonth();
  const currentDate = newDate.getDate();

  newDate.setFullYear(newDate.getFullYear() + 1);

  // Clamp Feb 29 to Feb 28 in non-leap years
  if (currentMonth === 1 && currentDate === 29 && newDate.getMonth() !== 1) {
    newDate.setDate(28);
    newDate.setMonth(1);
  }

  return newDate;
}
