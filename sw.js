// sw.js

// --- START IndexedDB Helpers ---
const DB_NAME = 'medicationDB';
const STORE_NAME = 'medications';
const DB_VERSION = 1;

const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject("Error opening DB");
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

const saveMeds = async (meds) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.clear(); // Clear old meds first
    meds.forEach(med => store.put(med));
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject("Error saving meds");
  });
};

const loadMeds = async () => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject("Error loading meds");
  });
};
// --- END IndexedDB Helpers ---


// --- START HELPERS (duplicated from utils/time.ts for self-containment) ---
const parseTimeStringToDate = (timeString, baseDate = new Date()) => {
  const [hours, minutes] = timeString.split(':').map(Number);
  const date = new Date(baseDate);
  date.setHours(hours, minutes, 0, 0);
  return date;
};
// --- END HELPERS ---

let medications = [];
let notificationTimeouts = [];

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
      clients.claim().then(async () => {
          // Load medications from DB on activation and schedule
          try {
              medications = await loadMeds();
              scheduleNotifications();
              console.log('Service Worker activated and schedules loaded from DB.');
          } catch (error) {
              console.error('Error loading schedules on activation:', error);
          }
      })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SET_MEDICATIONS') {
    medications = event.data.payload;
    // Persist to IndexedDB
    saveMeds(medications).then(() => {
        console.log('Medications saved to DB and notifications rescheduled.');
        scheduleNotifications();
    }).catch(error => {
        console.error('Failed to save medications to DB:', error);
        // Still schedule notifications for the current session
        scheduleNotifications();
    });
  }
});

const clearScheduledNotifications = () => {
    notificationTimeouts.forEach(clearTimeout);
    notificationTimeouts = [];
};

const scheduleNotifications = () => {
    clearScheduledNotifications();

    if (!medications || medications.length === 0) {
        console.log('No medications to schedule.');
        return;
    }

    const now = new Date();
    // Schedule notifications for the next 48 hours to be safe
    const scheduleLimit = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    medications.forEach(med => {
        let currentDate = new Date(now);
        currentDate.setHours(0, 0, 0, 0);

        while (currentDate <= scheduleLimit) {
            const startDate = new Date(med.startDate + 'T00:00:00');
            const endDate = med.endDate ? new Date(med.endDate + 'T23:59:59') : null;
            
            const isDateInRange = currentDate >= startDate && (!endDate || currentDate <= endDate);

            if (isDateInRange) {
                 if (med.frequencyType === "Horários Fixos" && med.fixedTimes) {
                    med.fixedTimes.forEach(time => {
                        const doseTime = parseTimeStringToDate(time, currentDate);
                        if (doseTime > now && doseTime <= scheduleLimit) {
                            scheduleSingleNotification(med, doseTime);
                        }
                    });
                } else if (med.frequencyType === "Intervalo de Horas" && med.intervalHours && med.firstDoseTime) {
                    let nextDoseTime = parseTimeStringToDate(med.firstDoseTime, currentDate);
                    while (nextDoseTime.getDate() === currentDate.getDate()) {
                         if (nextDoseTime > now && nextDoseTime <= scheduleLimit) {
                            scheduleSingleNotification(med, nextDoseTime);
                         }
                         nextDoseTime.setHours(nextDoseTime.getHours() + med.intervalHours);
                    }
                }
            }
            currentDate.setDate(currentDate.getDate() + 1);
        }
    });
    console.log(`Scheduled ${notificationTimeouts.length} notifications.`);
};

const scheduleSingleNotification = (med, time) => {
    const delay = time.getTime() - Date.now();
    // setTimeout has a max delay value (32-bit signed integer, ~24.8 days)
    if (delay > 0 && delay < 2147483647) { 
        const timeoutId = setTimeout(() => {
            showNotification(med.name, time.getTime());
        }, delay);
        notificationTimeouts.push(timeoutId);
    }
}

const showNotification = (medicationName, timestamp) => {
    self.registration.showNotification('Hora do Medicamento', {
        body: `Está na hora de tomar seu ${medicationName}.`,
        tag: `medication-${timestamp}`,
        requireInteraction: true,
        data: {
            medicationName: medicationName,
            url: self.location.origin,
        },
        actions: [
            { action: 'snooze', title: 'Adiar 15 minutos' },
        ],
    });
};


self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const medicationName = event.notification.data.medicationName;

    if (event.action === 'snooze') {
        const snoozeTime = new Date(Date.now() + 15 * 60 * 1000);
        const delay = snoozeTime.getTime() - Date.now();

        setTimeout(() => {
            showNotification(medicationName, snoozeTime.getTime());
        }, delay);
    } else {
        // Default action: focus or open the app
        event.waitUntil(
            clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
                const urlToOpen = new URL(event.notification.data.url || '/', self.location.origin).href;

                for (const client of clientList) {
                    if (client.url === urlToOpen && 'focus' in client) {
                        return client.focus();
                    }
                }
                if (clients.openWindow) {
                    return clients.openWindow(urlToOpen);
                }
            })
        );
    }
});