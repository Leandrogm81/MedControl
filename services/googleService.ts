
import { Medication, HistoryEntry, FrequencyType } from '../types';
import { formatDate, formatTime } from '../utils/time';

const SPREADSHEET_NAME = 'Meu Gerenciador de Medicamentos';
const APP_ID_PROPERTY_KEY = 'medicationAppId';

// Wrapper for gapi.load
export const loadGapi = (callback: () => void) => {
    if ((window as any).gapi) {
        (window as any).gapi.load('client', callback);
    } else {
        console.error('gapi is not loaded');
    }
}

// Wrapper for gapi.client.init
export const initGapiClient = (accessToken: string) => {
    const gapi = (window as any).gapi;
    if (gapi && gapi.client) {
        gapi.client.init({
            apiKey: process.env.GOOGLE_API_KEY, // You may need an API Key for some discovery services
        }).then(() => {
            gapi.client.setToken({ access_token: accessToken });
            gapi.client.load('https://sheets.googleapis.com/$discovery/rest?version=v4');
            gapi.client.load('https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest');
            gapi.client.load('https://www.googleapis.com/discovery/v1/apis/drive/v3/rest');
        });
    } else {
        throw new Error('gapi.client is not available');
    }
};

const findOrCreateSpreadsheet = async (): Promise<string> => {
    const gapi = (window as any).gapi;
    let spreadsheetId = '';

    // 1. Search for the spreadsheet
    const response = await gapi.client.drive.files.list({
        q: `name='${SPREADSHEET_NAME}' and mimeType='application/vnd.google-apps.spreadsheet'`,
        fields: 'files(id, name)',
    });

    if (response.result.files.length > 0) {
        spreadsheetId = response.result.files[0].id;
    } else {
        // 2. Create it if not found
        const spreadsheet = await gapi.client.sheets.spreadsheets.create({
            properties: {
                title: SPREADSHEET_NAME,
            },
            sheets: [
                { properties: { title: 'Medicamentos' } },
                { properties: { title: 'Histórico' } }
            ]
        });
        spreadsheetId = spreadsheet.result.spreadsheetId;
    }
    return spreadsheetId;
};

export const syncToSheets = async (medications: Medication[], history: HistoryEntry[]) => {
    const spreadsheetId = await findOrCreateSpreadsheet();
    const gapi = (window as any).gapi;

    // Prepare Medications Data
    const medsHeader = [['ID', 'Nome', 'Tipo Frequência', 'Horários/Intervalo', 'Primeira Dose', 'Data Início', 'Data Fim']];
    // Fix: Ensure all values are strings to match the expected type for the Google Sheets API.
    const medsRows = medications.map(m => [
        m.id,
        m.name,
        m.frequencyType,
        m.frequencyType === FrequencyType.FIXED_TIMES ? (m.fixedTimes?.join(', ') || '') : (m.intervalHours?.toString() || ''),
        m.firstDoseTime || '',
        m.startDate,
        m.endDate || ''
    ]);

    // Prepare History Data
    const historyHeader = [['ID', 'Med ID', 'Nome Medicamento', 'Data/Hora Tomado', 'Horário Agendado']];
    const historyRows = history.map(h => [
        h.id,
        h.medicationId,
        h.medicationName,
        `${formatDate(h.takenAt)} ${formatTime(h.takenAt)}`,
        h.scheduledTime
    ]);

    const data = [
        { range: 'Medicamentos!A1', values: medsHeader.concat(medsRows) },
        { range: 'Histórico!A1', values: historyHeader.concat(historyRows) }
    ];

    // Clear and write data
    await gapi.client.sheets.spreadsheets.values.batchClear({
        spreadsheetId,
        ranges: ['Medicamentos', 'Histórico']
    });

    await gapi.client.sheets.spreadsheets.values.batchUpdate({
        spreadsheetId,
        resource: {
            valueInputOption: 'USER_ENTERED',
            data: data
        }
    });
};


export const syncToCalendar = async (medications: Medication[]) => {
    const gapi = (window as any).gapi;
    
    // 1. Get all existing events created by this app
    const response = await gapi.client.calendar.events.list({
        calendarId: 'primary',
        privateExtendedProperty: `${APP_ID_PROPERTY_KEY}`, // Check for any event with this property
    });
    
    const eventsToDelete = response.result.items;

    // 2. Batch delete old events
    if (eventsToDelete.length > 0) {
        const batch = gapi.client.newBatch();
        eventsToDelete.forEach((event: any) => {
            batch.add(gapi.client.calendar.events.delete({
                calendarId: 'primary',
                eventId: event.id,
            }));
        });
        await batch;
    }

    // 3. Batch create new events
    const batchCreate = gapi.client.newBatch();
    medications.forEach(med => {
        if (med.frequencyType === FrequencyType.AS_NEEDED) return;

        const event = createCalendarEvent(med);
        if (event) {
            batchCreate.add(gapi.client.calendar.events.insert({
                calendarId: 'primary',
                resource: event
            }));
        }
    });
    await batchCreate;
};


const createCalendarEvent = (med: Medication) => {
    const startDate = new Date(`${med.startDate}T00:00:00`);
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const recurrence = [];
    
    let startTimeStr = '00:00';
    
    if (med.frequencyType === FrequencyType.FIXED_TIMES && med.fixedTimes) {
        const hours = med.fixedTimes.map(t => t.split(':')[0]).join(',');
        const minutes = med.fixedTimes.map(t => t.split(':')[1]).join(',');
        recurrence.push(`RRULE:FREQ=DAILY;BYHOUR=${hours};BYMINUTE=${minutes}`);
        startTimeStr = med.fixedTimes[0];
    } else if (med.frequencyType === FrequencyType.INTERVAL && med.intervalHours && med.firstDoseTime) {
        recurrence.push(`RRULE:FREQ=HOURLY;INTERVAL=${med.intervalHours}`);
        startTimeStr = med.firstDoseTime;
    }

    if (med.endDate) {
        const endDateISO = new Date(med.endDate).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        recurrence[0] += `;UNTIL=${endDateISO}`;
    }

    const [startHour, startMinute] = startTimeStr.split(':').map(Number);
    const startDateTime = new Date(startDate);
    startDateTime.setHours(startHour, startMinute);

    // Make event duration 15 minutes
    const endDateTime = new Date(startDateTime);
    endDateTime.setMinutes(startDateTime.getMinutes() + 15);

    return {
        summary: `Tomar: ${med.name}`,
        start: {
            dateTime: startDateTime.toISOString(),
            timeZone: timeZone,
        },
        end: {
            dateTime: endDateTime.toISOString(),
            timeZone: timeZone,
        },
        recurrence: recurrence,
        reminders: {
            useDefault: false,
            overrides: [
                { 'method': 'popup', 'minutes': 15 },
            ],
        },
        extendedProperties: {
            private: {
                [APP_ID_PROPERTY_KEY]: med.id
            }
        }
    };
};
