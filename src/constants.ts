import { SyntheticPatientRecord } from './types';

// Deterministic synthetic patient records (strictly fictional, HIPAA compliance demo)
export const SYNTHETIC_PATIENT_RECORDS: Record<string, SyntheticPatientRecord> = {
  'SYN-REC-1001.json': {
    id: 'SYN-REC-1001',
    patient: 'Eleanor Vance',
    diagnosis: 'Type 2 Diabetes',
    ssn: '***-**-4910',
    dob: '1964-08-14',
    department: 'Endocrinology',
    classification: 'CONFIDENTIAL_HIPAA'
  },
  'SYN-REC-1002.json': {
    id: 'SYN-REC-1002',
    patient: 'Marcus Holloway',
    diagnosis: 'Moderate Persistent Asthma',
    ssn: '***-**-8201',
    dob: '1988-11-20',
    department: 'Pulmonology',
    classification: 'CONFIDENTIAL_HIPAA'
  },
  'SYN-REC-1003.json': {
    id: 'SYN-REC-1003',
    patient: 'Chloe Decker',
    diagnosis: 'Hypertension Stage 1',
    ssn: '***-**-3341',
    dob: '1981-03-05',
    department: 'Cardiology',
    classification: 'CONFIDENTIAL_HIPAA'
  }
};

export interface SyntheticIdentity {
  name: string;
  token: string | null;
  role: string | null;
}

export const SYNTHETIC_IDENTITIES: Record<string, SyntheticIdentity> = {
  ANONYMOUS: { name: 'Anonymous', token: null, role: null },
  INVALID: { name: 'Invalid Token', token: 'token-invalid-99', role: null },
  ANALYST: { name: 'Security Analyst', token: 'token-analyst-449', role: 'analyst' },
  ADMIN: { name: 'Administrator', token: 'token-admin-901', role: 'admin' }
};
