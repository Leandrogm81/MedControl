
import { Dose } from '../types';
import { formatTime } from '../utils/time';

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

  scheduleDoseNotification(dose: Dose) {
    if (this.permission !== 'granted' || dose.isAsNeeded || dose.takenEntry) {
      return;
    }

    const [hours, minutes] = dose.scheduledTime.split(':').map(Number);
    const now = new Date();
    const notificationTime = new Date();
    notificationTime.setHours(hours, minutes, 0, 0);

    if (notificationTime > now) {
      const delay = notificationTime.getTime() - now.getTime();
      setTimeout(() => {
        this.showNotification(dose.medicationName, 0);
      }, delay);
    }
  }
  
  private showNotification(medicationName: string, snoozeCount: number) {
      const title = 'Hora do Medicamento';
      const body = `Está na hora de tomar seu ${medicationName}.`;
      
      // NOTE: Actions are not fully supported on all browsers/platforms without a service worker.
      // This is a simplified implementation for demonstration.
      const notification = new Notification(title, { body, requireInteraction: true });
      
      // Simple snooze simulation with another timeout
      // A robust solution would use a Service Worker.
      // We can't add action buttons easily without one, so we'll just log the concept.
      console.log(`Notificação para ${medicationName}. Para adiar, feche e um lembrete soará em 15 min.`);

      notification.onclose = () => {
        if (snoozeCount < 3) { // Limit snoozes
            setTimeout(() => {
                this.showNotification(medicationName, snoozeCount + 1);
            }, 15 * 60 * 1000); // 15 minutes
        }
      }
  }
}

export const notificationService = new NotificationService();
