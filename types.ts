
export enum FrequencyType {
  FIXED_TIMES = "Horários Fixos",
  INTERVAL = "Intervalo de Horas",
  AS_NEEDED = "Uso Livre / Se Necessário",
}

export interface Medication {
  id: string;
  name: string;
  frequencyType: FrequencyType;
  // For FIXED_TIMES
  fixedTimes?: string[]; // e.g., ["08:00", "14:00"]
  // For INTERVAL
  intervalHours?: number; // e.g., 8
  firstDoseTime?: string; // e.g., "09:00"
  // For all
  startDate: string; // ISO string "YYYY-MM-DD"
  endDate?: string; // ISO string "YYYY-MM-DD"
}

export interface Dose {
  medicationId: string;
  medicationName: string;
  scheduledTime: string; // "HH:mm"
  isAsNeeded: boolean;
  takenEntry?: HistoryEntry;
  medication: Medication;
}

export interface HistoryEntry {
  id: string;
  medicationId: string;
  medicationName: string;
  takenAt: number; // timestamp
  scheduledTime: string; // "HH:mm" or "Livre" for AS_NEEDED
}

export interface UserProfile {
  name: string;
  email: string;
  picture: string;
}

export interface GapiTokenResponse {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
  // and other fields...
}
