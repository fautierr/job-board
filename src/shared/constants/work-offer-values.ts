export const USER_ROLES = ['EMPLOYER', 'CANDIDATE'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const OFFER_STATUSES = ['PUBLISHED', 'PAUSED', 'CLOSED'] as const;
export type OfferStatus = (typeof OFFER_STATUSES)[number];

export const JOB_CATEGORIES = [
  'TECHNOLOGY_SYSTEMS',
  'ADMINISTRATION',
  'SALES_COMMERCIAL',
  'CUSTOMER_SERVICE',
  'MARKETING_COMMUNICATION',
  'DESIGN_MULTIMEDIA',
  'HUMAN_RESOURCES',
  'FINANCE_ACCOUNTING',
  'LOGISTICS_TRANSPORT',
  'PRODUCTION_OPERATIONS',
  'GASTRONOMY_TOURISM',
  'HEALTH',
  'EDUCATION',
  'CONSTRUCTION_TRADES',
  'LEGAL',
  'OTHER',
] as const;
export type JobCategory = (typeof JOB_CATEGORIES)[number];

export const SENIORITIES = [
  'NO_EXPERIENCE',
  'TRAINEE',
  'JUNIOR',
  'SEMI_SENIOR',
  'SENIOR',
  'LEADER_MANAGER',
] as const;
export type Seniority = (typeof SENIORITIES)[number];

export const WORK_MODES = ['REMOTE', 'ONSITE', 'HYBRID'] as const;
export type WorkMode = (typeof WORK_MODES)[number];

export const WORKDAYS = ['FULL_TIME', 'PART_TIME'] as const;
export type Workday = (typeof WORKDAYS)[number];

export const CONTRACT_TYPES = [
  'EMPLOYMENT',
  'TEMPORARY_CONTRACT',
  'FREELANCE_PROJECT',
  'INTERNSHIP',
] as const;
export type ContractType = (typeof CONTRACT_TYPES)[number];

export const JOB_CATEGORY_LABELS: Record<JobCategory, string> = {
  TECHNOLOGY_SYSTEMS: 'Tecnología y Sistemas',
  ADMINISTRATION: 'Administración',
  SALES_COMMERCIAL: 'Ventas y Comercial',
  CUSTOMER_SERVICE: 'Atención al Cliente',
  MARKETING_COMMUNICATION: 'Marketing y Comunicación',
  DESIGN_MULTIMEDIA: 'Diseño y Multimedia',
  HUMAN_RESOURCES: 'Recursos Humanos',
  FINANCE_ACCOUNTING: 'Finanzas y Contabilidad',
  LOGISTICS_TRANSPORT: 'Logística y Transporte',
  PRODUCTION_OPERATIONS: 'Producción y Operaciones',
  GASTRONOMY_TOURISM: 'Gastronomía y Turismo',
  HEALTH: 'Salud',
  EDUCATION: 'Educación',
  CONSTRUCTION_TRADES: 'Construcción y Oficios',
  LEGAL: 'Legal',
  OTHER: 'Otros',
};

export const SENIORITY_LABELS: Record<Seniority, string> = {
  NO_EXPERIENCE: 'Sin experiencia',
  TRAINEE: 'Trainee',
  JUNIOR: 'Junior',
  SEMI_SENIOR: 'Semi Senior',
  SENIOR: 'Senior',
  LEADER_MANAGER: 'Líder / Manager',
};

export const WORK_MODE_LABELS: Record<WorkMode, string> = {
  REMOTE: 'Remoto',
  ONSITE: 'Presencial',
  HYBRID: 'Híbrido',
};

export const WORKDAY_LABELS: Record<Workday, string> = {
  FULL_TIME: 'Tiempo completo',
  PART_TIME: 'Medio tiempo',
};

export const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
  EMPLOYMENT: 'Relación de dependencia',
  TEMPORARY_CONTRACT: 'Contrato temporal',
  FREELANCE_PROJECT: 'Freelance / Por proyecto',
  INTERNSHIP: 'Pasantía',
};
