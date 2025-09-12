
import { useState, useEffect, useCallback } from 'react';
import { Medication, HistoryEntry, FrequencyType, Dose } from '../types';
import { parseTimeStringToDate } from '../utils/time';

const MEDICATIONS_STORAGE_KEY = 'medications';
const HISTORY_STORAGE_KEY = 'medicationHistory';

export const useMedications = () => {
  const [medications, setMedications] = useState<Medication[]>(() => {
    try {
      const storedMedications = localStorage.getItem(MEDICATIONS_STORAGE_KEY);
      return storedMedications ? JSON.parse(storedMedications) : [];
    } catch (error) {
      console.error("Failed to parse medications from localStorage", error);
      return [];
    }
  });

  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    try {
      const storedHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
      return storedHistory ? JSON.parse(storedHistory) : [];
    } catch (error) {
      console.error("Failed to parse history from localStorage", error);
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(MEDICATIONS_STORAGE_KEY, JSON.stringify(medications));
  }, [medications]);

  useEffect(() => {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
  }, [history]);

  const addMedication = (medication: Omit<Medication, 'id'>) => {
    const newMedication: Medication = { ...medication, id: crypto.randomUUID() };
    setMedications(prev => [...prev, newMedication]);
  };

  const updateMedication = (updatedMedication: Medication) => {
    setMedications(prev => prev.map(m => m.id === updatedMedication.id ? updatedMedication : m));
  };
  
  const takeDose = (medicationId: string, scheduledTime: string) => {
    const med = medications.find(m => m.id === medicationId);
    if (!med) return;

    const newHistoryEntry: HistoryEntry = {
      id: crypto.randomUUID(),
      medicationId,
      medicationName: med.name,
      takenAt: Date.now(),
      scheduledTime,
    };
    setHistory(prev => [...prev, newHistoryEntry]);
  };

  const deleteHistoryEntry = (entryId: string) => {
    setHistory(prev => prev.filter(entry => entry.id !== entryId));
  };

  const getDailyDoses = useCallback((date: Date): Dose[] => {
    const todayString = date.toISOString().split('T')[0];
    const todayHistory = history.filter(h => new Date(h.takenAt).toISOString().split('T')[0] === todayString);

    const scheduledDoses: Dose[] = [];

    medications.forEach(med => {
      const startDate = new Date(med.startDate + 'T00:00:00');
      const endDate = med.endDate ? new Date(med.endDate + 'T23:59:59') : null;
      
      const isDateInRange = date >= startDate && (!endDate || date <= endDate);

      if (!isDateInRange) return;

      if (med.frequencyType === FrequencyType.FIXED_TIMES && med.fixedTimes) {
        med.fixedTimes.forEach(time => {
            const takenEntry = todayHistory.find(h => h.medicationId === med.id && h.scheduledTime === time);
            scheduledDoses.push({
              medicationId: med.id,
              medicationName: med.name,
              scheduledTime: time,
              isAsNeeded: false,
              takenEntry,
              medication: med
            });
        });
      } else if (med.frequencyType === FrequencyType.INTERVAL && med.intervalHours && med.firstDoseTime) {
          let currentTime = parseTimeStringToDate(med.firstDoseTime, date);
          while (currentTime.getDate() === date.getDate()) {
              const timeString = `${String(currentTime.getHours()).padStart(2, '0')}:${String(currentTime.getMinutes()).padStart(2, '0')}`;
              const takenEntry = todayHistory.find(h => h.medicationId === med.id && h.scheduledTime === timeString);
              scheduledDoses.push({
                  medicationId: med.id,
                  medicationName: med.name,
                  scheduledTime: timeString,
                  isAsNeeded: false,
                  takenEntry,
                  medication: med
              });
              currentTime.setHours(currentTime.getHours() + med.intervalHours);
          }
      } else if (med.frequencyType === FrequencyType.AS_NEEDED) {
          // It doesn't have a schedule, but we add it to the list for manual logging
          scheduledDoses.push({
              medicationId: med.id,
              medicationName: med.name,
              scheduledTime: 'Livre',
              isAsNeeded: true,
              takenEntry: undefined, // "As needed" doses are just logged in history
              medication: med
          });
      }
    });

    return scheduledDoses.sort((a, b) => {
        if (a.isAsNeeded) return 1;
        if (b.isAsNeeded) return -1;
        return a.scheduledTime.localeCompare(b.scheduledTime);
    });
  }, [medications, history]);

  return { medications, history, addMedication, updateMedication, takeDose, deleteHistoryEntry, getDailyDoses };
};
