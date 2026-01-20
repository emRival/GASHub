import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDateTime(date: string | Date | number | null | undefined) {
  if (!date) return '-';

  // Parse UTC date and convert to Jakarta time (UTC+7)
  const utcDate = new Date(date);
  const jakartaTime = new Date(utcDate.getTime() + (7 * 60 * 60 * 1000));

  return jakartaTime.toLocaleString('id-ID', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export function formatDate(date: string | Date | number | null | undefined) {
  if (!date) return '-';

  // Parse UTC date and convert to Jakarta time (UTC+7)
  const utcDate = new Date(date);
  const jakartaTime = new Date(utcDate.getTime() + (7 * 60 * 60 * 1000));

  return jakartaTime.toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
