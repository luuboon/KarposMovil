const API_URL = "https://karpos-v1-luuboon.turso.io";

export const api = {
  login: `${API_URL}/login`,
  register: `${API_URL}/register`,
  getAppointments: `${API_URL}/appointments`,
  createAppointment: `${API_URL}/appointments/create`,
  getProfile: `${API_URL}/profile`,
  updateProfile: `${API_URL}/profile/update`,
  getMedicalRecord: `${API_URL}/medical-record`,
  getInvoices: `${API_URL}/invoices`,
  getDevices: `${API_URL}/devices`,
};
