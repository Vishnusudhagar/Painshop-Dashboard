export type ShiftType = 'A' | 'B' | 'C' | string;

export interface ProductionRow {
  ID: string | number;
  DateKey: string; // YYYY-MM-DD
  Shift: ShiftType;
  Line: string;
  Part: string;
  Stage: string;
  Load: number;
  Insp: number;
  OK: number;
  NOK: number;
  Rework: number;
  Rej: number;
  Defect: string;
  Timestamp?: string;
  RawDate?: string;
}

export type ViewPage = 'overview' | 'production' | 'quality' | 'defects' | 'trends' | 'reports';

export type DateRangeOption =
  | 'today'
  | 'yesterday'
  | 'last7'
  | 'lastweek'
  | 'month'
  | 'lastmonth'
  | 'all'
  | 'custom';

export interface FilterState {
  dateRange: DateRangeOption;
  customFrom: string;
  customTo: string;
  shift: string;
  model: string;
  line: string;
}

export interface GroupedMetric {
  k: string;
  load: number;
  insp: number;
  ok: number;
  nok: number;
  rej: number;
  rw: number;
  n: number;
}

export interface ComputedData {
  b: ProductionRow[];
  cur: ProductionRow[];
  prev: ProductionRow[];
  trend: ProductionRow[];
  opt: DateRangeOption;
  lbl: string;
  lo: number;
  hi: number;
}

export type UserRole = 'admin' | 'operator' | 'viewer';

export interface UserSession {
  id: string;
  username: string;
  name: string;
  email?: string;
  role: UserRole;
  token: string;
  authenticated: boolean;
  mustChangePassword?: boolean;
  isPermanent?: boolean;
}

export interface UserAccount {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  mustChangePassword: boolean;
  isPermanent?: boolean;
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: string;
  actor: string;
  details: string;
  ip?: string;
}

export type QuestionType =
  | 'short_text'
  | 'long_text'
  | 'multiple_choice'
  | 'dropdown'
  | 'date'
  | 'number';

export interface FormQuestion {
  id: string;
  title: string;
  type: QuestionType;
  required: boolean;
  options?: string[];
  placeholder?: string;
  section?: 'core' | 'custom';
  stageCondition?: 'All' | 'Loading' | 'Unloading' | 'Quality Control';
  lineCondition?: 'All' | 'Powder Coating Line' | 'Liquid Coating Line';
}

export interface AppConfig {
  csvUrl: string;
  formQuestions: FormQuestion[];
  updatedAt: string;
  updatedBy: string;
}

