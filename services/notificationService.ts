import { Medication } from '../types';

class NotificationService {
  private permission: NotificationPermission = 'default';

  constructor() {
    if ('Notification' in window) {
      this.permission = Notification.permission;
    }
  }

  async requestPermission(): Promise<void> {
    if (!('Notification' in window)) {
      console.warn('Este navegador não suporta notificações.');
      return;
    }
    if (this.permission !== 'granted') {
      this.permission = await Notification.requestPermission();
    }
  }

  updateSchedules(medications: Medication[]): void {
    if (this.permission !== 'granted') return;

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        if (registration.active) {
            registration.active.postMessage({
                type: 'SET_MEDICATIONS',
                payload: medications
            });
        }
      }).catch(error => {
          console.error("Error getting service worker registration:", error);
      });
    }
  }
}

export const notificationService = new NotificationService();
