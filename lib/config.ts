export const API_CONFIG = {
  BASE_URL: 'http://10.13.8.121:3000',
  TIMEOUT: 60000, // 60 segundos
  RETRY_ATTEMPTS: 2,
  RETRY_DELAY: 1000,
  ENDPOINTS: {
    AUTH: {
      LOGIN: '/auth/login',
      REGISTER: '/auth/register',
      REGISTER_PATIENT: '/auth/register-patient',
      REGISTER_DOCTOR: '/auth/register-doctor',
      REFRESH: '/auth/refresh',
      LOGOUT: '/auth/logout',
      GOOGLE: '/auth/google'
    },
    USERS: '/users',
    DOCTORS: '/doctors',
    DOCTOR_AVAILABILITY: (doctorId: number, date?: string) => 
      date ? `/appointments/doctor/${doctorId}/availability?date=${date}` : `/appointments/doctor/${doctorId}/availability`,
    PATIENTS: '/patients',
    PATIENT_DATA: '/patients/view/pacien-datos',
    APPOINTMENTS: {
      BASE: '/appointments',
      DETAILED: '/appointments/detailed',
      FILTERED: '/appointments/filtered',
      PATIENT: (id: number) => `/appointments/patient/${id}`,
      PATIENT_DETAILED: (id: number) => `/appointments/patient/${id}/detailed`,
      DOCTOR: (id: number) => `/appointments/doctor/${id}`,
      CANCEL: (id: number) => `/appointments/${id}/cancel`,
      NOTIFICATION: (id: number) => `/appointments/${id}/notification`
    },
    MEDICAL_RECORDS: {
      BASE: '/medical-records',
      BY_APPOINTMENT: (appointmentId: number) => 
        appointmentId ? `/medical-records/appointment/${appointmentId}` : '/medical-records/appointments'
    },
    IOT: {
      BASE: '/iot',
      DATA_BY_CITA: (citaId: number) => `/iot/cita/${citaId}`,
      DATA_BY_FECHA: (fecha: string) => `/iot/fecha/${fecha}`,
      COMMAND: '/iot/command',
      COMMAND_LATEST: '/iot/command/latest',
      COMMAND_EXECUTED: (id: number) => `/iot/command/${id}/executed`
    },
    IOT_DATA: '/iot',
    IOT_DATA_BY_CITA: '/iot/cita/:citaId',
    IOT_DATA_STATS: '/iot/cita/:citaId/stats',
    IOT_COMMAND: '/iot/command',
    IOT_COMMAND_LATEST: '/iot/command/latest',
    IOT_COMMAND_EXECUTED: '/iot/command/:id/executed',
    IOT_STATUS: '/iot/status',
    IOT_DEBUG: '/iot/debug/latest'
  }
}; 