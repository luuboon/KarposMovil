/**
 * SERVICIO PARA DATOS DE DEMOSTRACIÓN
 * 
 * IMPORTANTE: Este servicio proporciona datos de demostración para mostrar
 * la funcionalidad de la aplicación mientras la base de datos real está vacía.
 * Debe eliminarse una vez que la base de datos contenga datos reales.
 */

import { PatientData, Appointment, MedicalRecord } from './medicalRecords';

export const DemoDataService = {
  /**
   * Obtiene un paciente de demostración
   * @param patientId ID del paciente
   * @returns Datos de paciente de demostración
   */
  getPatientDemoData(patientId: number): PatientData {
    return {
      id_pc: patientId,
      nombre: 'Carlos',
      apellido_p: 'Gómez',
      apellido_m: 'Sánchez',
      age: 35,
      weight: 75,
      height: 178,
      gender: 'male',
      blood_type: 'O+',
      id_us: 1
    };
  },

  /**
   * Obtiene citas de demostración
   * @param patientId ID del paciente
   * @returns Lista de citas de demostración
   */
  getAppointmentsDemoData(patientId: number): Appointment[] {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);
    
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    return [
      {
        id_ap: 1001,
        id_pc: patientId,
        id_dc: 1,
        date: lastWeek.toISOString().split('T')[0],
        time: '10:00',
        status: 'completed',
        notes: 'Consulta general y revisión anual',
        doctor: {
          nombre: 'Juan',
          apellido_p: 'Pérez',
          apellido_m: 'García',
          speciality: 'Medicina General'
        },
        payment_status: 'paid',
        payment_amount: 500
      },
      {
        id_ap: 1002,
        id_pc: patientId,
        id_dc: 2,
        date: yesterday.toISOString().split('T')[0],
        time: '16:00',
        status: 'completed',
        notes: 'Revisión de exámenes de sangre',
        doctor: {
          nombre: 'María',
          apellido_p: 'Rodríguez',
          apellido_m: 'López',
          speciality: 'Cardiología'
        },
        payment_status: 'paid',
        payment_amount: 800
      },
      {
        id_ap: 1003,
        id_pc: patientId,
        id_dc: 1,
        date: nextWeek.toISOString().split('T')[0],
        time: '11:30',
        status: 'pending',
        notes: 'Seguimiento de tratamiento',
        doctor: {
          nombre: 'Juan',
          apellido_p: 'Pérez',
          apellido_m: 'García',
          speciality: 'Medicina General'
        },
        payment_status: 'pending',
        payment_amount: 500
      }
    ];
  },

  /**
   * Obtiene registros médicos de demostración
   * @param patientId ID del paciente
   * @returns Lista de registros médicos de demostración
   */
  getMedicalRecordsDemoData(patientId: number): MedicalRecord[] {
    return [
      {
        id_mr: 101,
        id_ap: 1001,
        id_pc: patientId,
        id_dc: 1,
        diagnosis: 'Presión arterial ligeramente elevada (130/85). Se recomienda control de sal en la dieta.',
        treatment: 'Dieta baja en sodio. Actividad física regular (30 min/día).',
        observations: 'Paciente refiere estrés laboral. Seguimiento en 3 meses.',
        created_at: '2023-10-15'
      },
      {
        id_mr: 102,
        id_ap: 1002,
        id_pc: patientId,
        id_dc: 2,
        diagnosis: 'Colesterol LDL ligeramente elevado (145 mg/dL). HDL en rango normal.',
        treatment: 'Dieta baja en grasas saturadas. Aumentar consumo de omega 3.',
        observations: 'Se sugiere repetir análisis en 6 meses. No requiere medicación por ahora.',
        created_at: '2023-11-22'
      }
    ];
  }
}; 