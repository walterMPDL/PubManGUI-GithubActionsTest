import { HttpContext, HttpContextToken } from '@angular/common/http';

export const IGNORED_STATUSES = new HttpContextToken<number[]>(() => []);
export const SILENT_LOGOUT = new HttpContextToken<boolean>(() => false);
export const DISPLAY_ERROR = new HttpContextToken<boolean>(() => true);

export function ignoredStatuses(statuses: number[]) {
  return new HttpContext().set(IGNORED_STATUSES, statuses);
}

