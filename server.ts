import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import https from 'https';
import querystring from 'querystring';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';

const PORT = 3000;
const app = express();

app.use(express.json());

/* ================= SECURE DATA STORAGE ================= */

const DATA_DIR = path.resolve('data');
const CONFIG_FILE = path.join(DATA_DIR, 'config-store.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const AUDIT_FILE = path.join(DATA_DIR, 'audit-log.json');
const PRODUCTION_LOGS_FILE = path.join(DATA_DIR, 'production-logs.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

/* ================= CRYPTOGRAPHIC HELPERS ================= */

function hashSecret(secret: string, saltHex?: string): string {
  const salt = saltHex ? Buffer.from(saltHex, 'hex') : crypto.randomBytes(16);
  const hash = crypto.scryptSync(secret, salt, 64);
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

function verifySecret(secret: string, combinedHash?: string): boolean {
  if (!secret || !combinedHash) return false;
  try {
    const parts = combinedHash.split(':');
    if (parts.length !== 2) return false;
    const [saltHex, hashHex] = parts;
    const salt = Buffer.from(saltHex, 'hex');
    const expectedHash = Buffer.from(hashHex, 'hex');
    const actualHash = crypto.scryptSync(secret, salt, 64);
    return crypto.timingSafeEqual(expectedHash, actualHash);
  } catch (err) {
    return false;
  }
}

function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/* ================= USER DATA STRUCTURES ================= */

export type UserRole = 'admin' | 'operator';

export interface StoredUser {
  id: string;
  username: string; // stored lowercase for comparison
  displayName: string;
  role: UserRole;
  passwordHash: string;
  recoveryCodeHash?: string;
  mustChangePassword: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
  failedLoginAttempts: number;
  lockoutUntil?: number | null;
  activeTokens: string[];
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: string;
  actor: string;
  details: string;
  ip?: string;
}

/* ================= AUDIT LOGGING ================= */

function getAuditLogs(): AuditLogEntry[] {
  try {
    if (fs.existsSync(AUDIT_FILE)) {
      const raw = fs.readFileSync(AUDIT_FILE, 'utf-8');
      const data = JSON.parse(raw);
      if (Array.isArray(data)) return data;
    }
  } catch (err) {
    console.warn('Could not read audit log file:', err);
  }
  return [];
}

function logAudit(action: string, actor: string, details: string, ip?: string) {
  try {
    const logs = getAuditLogs();
    const entry: AuditLogEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      action,
      actor,
      details,
      ip,
    };
    logs.unshift(entry);
    // Keep last 500 audit logs
    const trimmed = logs.slice(0, 500);
    fs.writeFileSync(AUDIT_FILE, JSON.stringify(trimmed, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to append audit log:', err);
  }
}

/* ================= PERSISTENT USER STORE ================= */

function loadUsers(): StoredUser[] {
  let list: StoredUser[] = [];
  try {
    if (fs.existsSync(USERS_FILE)) {
      const raw = fs.readFileSync(USERS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        list = parsed;
      }
    }
  } catch (err) {
    console.warn('Could not read users file, bootstrapping initial administrator:', err);
  }

  // Permanent Root Administrator Account:
  // Username: "admin1", Password: "Admin@123", Role: Administrator
  // This user is permanent and cannot be deleted by anyone.
  let admin1 = list.find((u) => u.username.toLowerCase() === 'admin1');
  if (!admin1) {
    admin1 = {
      id: `usr_admin_permanent`,
      username: 'admin1',
      displayName: 'Plant Administrator',
      role: 'admin',
      passwordHash: hashSecret('Admin@123'),
      recoveryCodeHash: hashSecret('BAXY2026'),
      mustChangePassword: false,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      failedLoginAttempts: 0,
      lockoutUntil: null,
      activeTokens: [],
    };
    list.unshift(admin1);
    saveUsers(list);
    logAudit(
      'SYSTEM_BOOTSTRAP',
      'System',
      'Permanent administrator account "admin1" configured with role Administrator.'
    );
  } else {
    // Ensure admin1 is permanently an active administrator
    let modified = false;
    if (admin1.role !== 'admin') {
      admin1.role = 'admin';
      modified = true;
    }
    if (!admin1.isActive) {
      admin1.isActive = true;
      modified = true;
    }
    // Ensure password Admin@123 is valid
    if (!verifySecret('Admin@123', admin1.passwordHash)) {
      admin1.passwordHash = hashSecret('Admin@123');
      admin1.failedLoginAttempts = 0;
      admin1.lockoutUntil = null;
      admin1.updatedAt = new Date().toISOString();
      modified = true;
    }
    if (modified) {
      saveUsers(list);
    }
  }

  return list;
}

function saveUsers(users: StoredUser[]) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write users file:', err);
  }
}

let storedUsers: StoredUser[] = loadUsers();

/* ================= DEFAULT CONFIG STORE ================= */

const DEFAULT_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vStOPoBnHm-C_F6quv4JItMXOk6DkeFnWd5anw1dUef76cCQt7fbOl8QjdfQcSukGsU_1auHWTQbaeU/pub?output=csv';

const DEFAULT_QUESTIONS = [
  {
    id: 'q_date',
    title: 'Date',
    type: 'date',
    required: true,
    section: 'core',
    stageCondition: 'All',
  },
  {
    id: 'q_shift',
    title: 'Shift',
    type: 'dropdown',
    required: true,
    options: ['Shift A', 'Shift B', 'Shift C'],
    section: 'core',
    stageCondition: 'All',
  },
  {
    id: 'q_line',
    title: 'Line',
    type: 'dropdown',
    required: true,
    options: ['Powder Coating Line', 'Liquid Coating Line'],
    section: 'core',
    stageCondition: 'All',
  },
  {
    id: 'q_model',
    title: 'Model / Part No',
    type: 'dropdown',
    required: true,
    options: [
      'H - 321',
      'H - 321 C',
      'H - 347/348',
      'H - 280',
      'H - 278',
      'H - 309',
      'H - 434',
      'H - 360',
      'H - 278 C',
    ],
    section: 'core',
    stageCondition: 'All',
  },
  {
    id: 'q_stage',
    title: 'Stage',
    type: 'dropdown',
    required: true,
    options: ['Loading', 'Unloading', 'Quality Control'],
    section: 'core',
    stageCondition: 'All',
  },
  {
    id: 'q_loading_qty',
    title: 'Loading Qty',
    type: 'number',
    required: false,
    placeholder: 'e.g. 200',
    section: 'core',
    stageCondition: 'Loading',
  },
  {
    id: 'q_insp_qty',
    title: 'Total Inspection Qty',
    type: 'number',
    required: false,
    placeholder: 'e.g. 200',
    section: 'core',
    stageCondition: 'Unloading',
  },
  {
    id: 'q_ok_qty',
    title: 'Ok Part Qty',
    type: 'number',
    required: false,
    placeholder: 'e.g. 195',
    section: 'core',
    stageCondition: 'Unloading',
  },
  {
    id: 'q_nok_qty',
    title: 'Not OK Part',
    type: 'number',
    required: false,
    placeholder: 'e.g. 5',
    section: 'core',
    stageCondition: 'Unloading',
  },
  {
    id: 'q_rework_qty',
    title: 'Total Rework Parts',
    type: 'number',
    required: false,
    placeholder: 'e.g. 5',
    section: 'core',
    stageCondition: 'Unloading',
  },
  {
    id: 'q_unloading_defects',
    title: 'Unloading Defect Type',
    type: 'multiple_choice',
    required: false,
    options: ['Flow', 'Dry/Uncover', 'Pinhole', 'Dust', 'Inside Paint'],
    section: 'core',
    stageCondition: 'Unloading',
  },
  {
    id: 'q_rej_qty',
    title: 'Rejected Part Qty',
    type: 'number',
    required: false,
    placeholder: 'e.g. 5',
    section: 'core',
    stageCondition: 'Quality Control',
  },
  {
    id: 'q_qc_defects',
    title: 'QC Defect Type',
    type: 'multiple_choice',
    required: false,
    options: [
      'Flow',
      'Dry/Uncover',
      'Pinhole',
      'Dust',
      'Inside Paint',
      'Casting Defect',
    ],
    section: 'core',
    stageCondition: 'Quality Control',
  },
];

interface StoredConfig {
  csvUrl: string;
  formQuestions: any[];
  updatedAt: string;
  updatedBy: string;
}

function loadConfig(): StoredConfig {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
      const data = JSON.parse(raw);
      if (data && data.csvUrl && Array.isArray(data.formQuestions)) {
        return data;
      }
    }
  } catch (err) {
    console.warn('Could not read config file, initializing defaults:', err);
  }

  const initialConfig: StoredConfig = {
    csvUrl: DEFAULT_CSV_URL,
    formQuestions: DEFAULT_QUESTIONS,
    updatedAt: new Date().toISOString(),
    updatedBy: 'System Default',
  };

  saveConfig(initialConfig);
  return initialConfig;
}

function saveConfig(cfg: StoredConfig) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write config store:', err);
  }
}

let appConfig = loadConfig();

/* ================= AUTHENTICATION & RBAC MIDDLEWARES ================= */

// Helper to sanitize user object for client transmission (no hashes)
function sanitizeUser(u: StoredUser) {
  return {
    id: u.id,
    username: u.username,
    name: u.displayName,
    role: u.role,
    isActive: u.isActive,
    isPermanent: u.username.toLowerCase() === 'admin1',
    mustChangePassword: u.mustChangePassword,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
    lastLogin: u.lastLogin,
  };
}

function findUserByToken(token: string): StoredUser | null {
  if (!token) return null;
  const found = storedUsers.find(
    (u) => u.isActive && Array.isArray(u.activeTokens) && u.activeTokens.includes(token)
  );
  return found || null;
}

// Require valid Bearer token for any active user
function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({
      success: false,
      error: 'Authentication Required: Please sign in.',
      code: 'UNAUTHENTICATED',
    });
  }

  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const user = findUserByToken(token);

  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'Session expired or invalidated. Please sign in again.',
      code: 'INVALID_SESSION',
    });
  }

  (req as any).user = user;
  (req as any).token = token;
  next();
}

// Strictly enforce Administrator role
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    const user = (req as any).user as StoredUser;
    if (user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error:
          'Access Denied: Only authorized administrators can perform this operation. Operator accounts have read-only access to system configuration.',
        code: 'FORBIDDEN',
      });
    }
    next();
  });
}

/* ================= AUTHENTICATION ROUTES ================= */

// 1. Session verification
app.get('/api/auth/me', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ success: false, error: 'No active session token' });
  }

  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const user = findUserByToken(token);

  if (!user) {
    return res.status(401).json({ success: false, error: 'Session token invalid or expired' });
  }

  return res.json({
    success: true,
    user: sanitizeUser(user),
    token,
  });
});

// 2. Login with rate limiting, lockout, and password verification
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { username, password } = req.body;
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';

  if (!username || typeof username !== 'string' || !password || typeof password !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Username and password are required.',
    });
  }

  const normalizedUsername = username.trim().toLowerCase();
  const user = storedUsers.find((u) => u.username === normalizedUsername);

  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'Invalid username or password.',
    });
  }

  // Check if account is locked due to too many failed attempts
  const now = Date.now();
  if (user.lockoutUntil && user.lockoutUntil > now) {
    const remainingMins = Math.ceil((user.lockoutUntil - now) / (60 * 1000));
    return res.status(429).json({
      success: false,
      error: `Account is temporarily locked due to multiple failed login attempts. Please try again in ${remainingMins} minute(s) or use account recovery.`,
      code: 'ACCOUNT_LOCKED',
    });
  }

  // Check if account is deactivated
  if (!user.isActive) {
    return res.status(403).json({
      success: false,
      error: 'This account has been deactivated. Please contact an authorized administrator.',
      code: 'ACCOUNT_DEACTIVATED',
    });
  }

  // Verify password using secure scrypt comparison
  const isValidPassword = verifySecret(password, user.passwordHash);

  if (!isValidPassword) {
    user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
    // Lock for 15 minutes after 5 consecutive failures
    if (user.failedLoginAttempts >= 5) {
      user.lockoutUntil = now + 15 * 60 * 1000;
      logAudit(
        'ACCOUNT_LOCKED',
        'System',
        `Account "${user.username}" locked for 15 minutes following 5 failed attempts from IP ${clientIp}`,
        clientIp
      );
    }
    saveUsers(storedUsers);

    return res.status(401).json({
      success: false,
      error:
        user.failedLoginAttempts >= 5
          ? 'Account has been temporarily locked for 15 minutes due to 5 failed attempts.'
          : 'Invalid username or password.',
    });
  }

  // Reset failed login tracking on success
  user.failedLoginAttempts = 0;
  user.lockoutUntil = null;
  user.lastLogin = new Date().toISOString();

  // Generate new secure session token
  const token = generateSecureToken();
  if (!Array.isArray(user.activeTokens)) user.activeTokens = [];
  user.activeTokens.push(token);

  // Keep maximum 5 concurrent active tokens per user
  if (user.activeTokens.length > 5) {
    user.activeTokens = user.activeTokens.slice(-5);
  }

  saveUsers(storedUsers);
  logAudit('USER_LOGIN', user.username, `Successful login (${user.role}) from IP ${clientIp}`, clientIp);

  return res.json({
    success: true,
    user: sanitizeUser(user),
    token,
    mustChangePassword: user.mustChangePassword,
  });
});

// 3. Mandatory First-Login Password Change
app.post('/api/auth/first-login-change-password', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as StoredUser;
  const { newPassword, confirmPassword } = req.body;

  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
    return res.status(400).json({
      success: false,
      error: 'New password must be at least 6 characters long.',
    });
  }

  if (confirmPassword && newPassword !== confirmPassword) {
    return res.status(400).json({
      success: false,
      error: 'New password and confirmation do not match.',
    });
  }

  // Hash new password and clear first-login requirement
  user.passwordHash = hashSecret(newPassword);
  user.mustChangePassword = false;
  user.updatedAt = new Date().toISOString();

  saveUsers(storedUsers);
  logAudit(
    'FIRST_LOGIN_PASSWORD_CHANGED',
    user.username,
    `Initial password changed on first login by user "${user.username}"`
  );

  return res.json({
    success: true,
    message: 'Password successfully updated. Welcome to Baxy Paintshop Dashboard!',
    user: sanitizeUser(user),
  });
});

// 4. Secure Account Recovery via Recovery Code
app.post('/api/auth/recover-password', (req: Request, res: Response) => {
  const { username, recoveryCode, newPassword } = req.body;
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';

  if (!username || !recoveryCode || !newPassword) {
    return res.status(400).json({
      success: false,
      error: 'Username, recovery code, and new password are required.',
    });
  }

  if (typeof newPassword !== 'string' || newPassword.length < 6) {
    return res.status(400).json({
      success: false,
      error: 'New password must be at least 6 characters long.',
    });
  }

  const normalizedUsername = username.trim().toLowerCase();
  const user = storedUsers.find((u) => u.username === normalizedUsername);

  if (!user) {
    return res.status(400).json({
      success: false,
      error: 'Account recovery failed. Please verify your username and recovery code.',
    });
  }

  if (!user.isActive) {
    return res.status(403).json({
      success: false,
      error: 'Deactivated accounts cannot be recovered. Please contact a plant administrator.',
    });
  }

  if (!user.recoveryCodeHash) {
    return res.status(400).json({
      success: false,
      error:
        'This account does not have a recovery code configured. Please contact an administrator to reset your password.',
    });
  }

  const isCodeValid = verifySecret(recoveryCode.trim(), user.recoveryCodeHash);

  if (!isCodeValid) {
    user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
    saveUsers(storedUsers);
    logAudit(
      'RECOVERY_FAILED',
      user.username,
      `Failed recovery code attempt for user "${user.username}" from IP ${clientIp}`,
      clientIp
    );
    return res.status(400).json({
      success: false,
      error: 'Invalid recovery code. Please check your credentials.',
    });
  }

  // Successful verification -> Update password, invalidate all existing sessions
  user.passwordHash = hashSecret(newPassword);
  user.mustChangePassword = false;
  user.failedLoginAttempts = 0;
  user.lockoutUntil = null;
  user.activeTokens = []; // Invalidate all prior sessions
  user.updatedAt = new Date().toISOString();

  saveUsers(storedUsers);
  logAudit(
    'ACCOUNT_RECOVERED',
    user.username,
    `Password successfully recovered via recovery code for "${user.username}". Existing sessions invalidated.`,
    clientIp
  );

  return res.json({
    success: true,
    message: 'Account successfully recovered! You can now log in with your new password.',
  });
});

/* ================= USER MANAGEMENT ROUTES (ADMIN ONLY) ================= */

// 5. Get list of all registered users
app.get('/api/users', requireAdmin, (_req: Request, res: Response) => {
  const users = storedUsers.map(sanitizeUser);
  return res.json({
    success: true,
    users,
    total: users.length,
  });
});

// 6. Manually create new Administrator or Operator account
app.post('/api/users', requireAdmin, (req: Request, res: Response) => {
  const actor = (req as any).user as StoredUser;
  const { username, displayName, role, temporaryPassword } = req.body;

  if (!username || typeof username !== 'string' || !username.trim()) {
    return res.status(400).json({ success: false, error: 'Username is required.' });
  }

  const normalized = username.trim().toLowerCase();

  // Validate username format (alphanumeric and underscore, 3-20 characters)
  if (!/^[a-z0-9_]{3,20}$/.test(normalized)) {
    return res.status(400).json({
      success: false,
      error:
        'Username must be between 3 and 20 characters and contain only letters, numbers, and underscores.',
    });
  }

  // Prevent duplicate usernames
  if (storedUsers.some((u) => u.username === normalized)) {
    return res.status(400).json({
      success: false,
      error: `Username "${normalized}" is already registered. Please choose another username.`,
    });
  }

  if (role !== 'admin' && role !== 'operator') {
    return res.status(400).json({
      success: false,
      error: 'Role must be either "admin" (Administrator) or "operator" (Operator).',
    });
  }

  if (!temporaryPassword || typeof temporaryPassword !== 'string' || temporaryPassword.length < 6) {
    return res.status(400).json({
      success: false,
      error: 'Temporary password is required and must be at least 6 characters long.',
    });
  }

  // If new account is an admin, generate a secure recovery code
  let recoveryCodePlain: string | undefined = undefined;
  let recoveryCodeHash: string | undefined = undefined;

  if (role === 'admin') {
    // Generate an 8-character uppercase recovery code
    recoveryCodePlain = `RC-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    recoveryCodeHash = hashSecret(recoveryCodePlain);
  }

  const newUser: StoredUser = {
    id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    username: normalized,
    displayName: (displayName && typeof displayName === 'string' && displayName.trim()) || normalized,
    role: role as UserRole,
    passwordHash: hashSecret(temporaryPassword),
    recoveryCodeHash,
    mustChangePassword: true,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    failedLoginAttempts: 0,
    lockoutUntil: null,
    activeTokens: [],
  };

  storedUsers.push(newUser);
  saveUsers(storedUsers);

  logAudit(
    'USER_CREATED',
    actor.username,
    `New account "${newUser.username}" (${newUser.role}) created by admin "${actor.username}"`
  );

  return res.json({
    success: true,
    message: `Account "${newUser.username}" (${newUser.role}) successfully created.`,
    user: sanitizeUser(newUser),
    generatedRecoveryCode: recoveryCodePlain, // Returned once upon creation for admin accounts
  });
});

// 7. Toggle account active / inactive status
app.put('/api/users/:id/status', requireAdmin, (req: Request, res: Response) => {
  const actor = (req as any).user as StoredUser;
  const { id } = req.params;
  const { isActive } = req.body;

  if (typeof isActive !== 'boolean') {
    return res.status(400).json({ success: false, error: 'isActive must be a boolean.' });
  }

  const targetUser = storedUsers.find((u) => u.id === id);
  if (!targetUser) {
    return res.status(404).json({ success: false, error: 'User not found.' });
  }

  // Permanent admin protection: "admin1" cannot be deactivated
  if (targetUser.username.toLowerCase() === 'admin1' && !isActive) {
    return res.status(400).json({
      success: false,
      error: 'Cannot deactivate account "admin1". This is the permanent root administrator account.',
    });
  }

  // Security rule: Prevent deactivating the last active administrator
  if (!isActive && targetUser.role === 'admin') {
    const activeAdmins = storedUsers.filter((u) => u.role === 'admin' && u.isActive && u.id !== id);
    if (activeAdmins.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot deactivate this account. At least one active administrator must remain in the system.',
      });
    }
  }

  targetUser.isActive = isActive;
  targetUser.updatedAt = new Date().toISOString();

  // If deactivating, invalidate all active sessions immediately
  if (!isActive) {
    targetUser.activeTokens = [];
  }

  saveUsers(storedUsers);
  logAudit(
    'USER_STATUS_CHANGE',
    actor.username,
    `Account "${targetUser.username}" ${isActive ? 'activated' : 'deactivated'} by "${actor.username}"`
  );

  return res.json({
    success: true,
    message: `User "${targetUser.username}" is now ${isActive ? 'Active' : 'Deactivated'}.`,
    user: sanitizeUser(targetUser),
  });
});

// 8. Admin Reset User Password
app.put('/api/users/:id/reset-password', requireAdmin, (req: Request, res: Response) => {
  const actor = (req as any).user as StoredUser;
  const { id } = req.params;
  const { temporaryPassword } = req.body;

  if (!temporaryPassword || typeof temporaryPassword !== 'string' || temporaryPassword.length < 6) {
    return res.status(400).json({
      success: false,
      error: 'Temporary password must be at least 6 characters long.',
    });
  }

  const targetUser = storedUsers.find((u) => u.id === id);
  if (!targetUser) {
    return res.status(404).json({ success: false, error: 'User not found.' });
  }

  // Update password and invalidate all existing active sessions
  targetUser.passwordHash = hashSecret(temporaryPassword);
  targetUser.mustChangePassword = true;
  targetUser.activeTokens = []; // Force re-login
  targetUser.failedLoginAttempts = 0;
  targetUser.lockoutUntil = null;
  targetUser.updatedAt = new Date().toISOString();

  saveUsers(storedUsers);
  logAudit(
    'USER_PASSWORD_RESET',
    actor.username,
    `Password for user "${targetUser.username}" was reset by administrator "${actor.username}". All existing sessions invalidated.`
  );

  return res.json({
    success: true,
    message: `Temporary password set for "${targetUser.username}". User will be required to change password at next sign-in.`,
    user: sanitizeUser(targetUser),
  });
});

// 9. Delete / Remove User Account (Self or by Administrator)
app.delete('/api/users/me', requireAuth, (req: Request, res: Response) => {
  const actor = (req as any).user as StoredUser;

  // Permanent admin protection: "admin1" cannot be deleted
  if (actor.username.toLowerCase() === 'admin1') {
    return res.status(400).json({
      success: false,
      error: 'Cannot delete account "admin1". This is the permanent root administrator account and cannot be deleted by anyone.',
    });
  }

  // Security rule: Prevent deleting the last active administrator
  if (actor.role === 'admin') {
    const remainingAdmins = storedUsers.filter((u) => u.role === 'admin' && u.isActive && u.id !== actor.id);
    if (remainingAdmins.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot remove this account. At least one active administrator must remain in the system.',
      });
    }
  }

  storedUsers = storedUsers.filter((u) => u.id !== actor.id);
  saveUsers(storedUsers);

  logAudit(
    'USER_REMOVED',
    actor.username,
    `User "${actor.username}" (${actor.role}) removed their own account.`
  );

  return res.json({
    success: true,
    message: `Account "${actor.username}" was successfully removed.`,
  });
});

app.delete('/api/users/:id', requireAuth, (req: Request, res: Response) => {
  const actor = (req as any).user as StoredUser;
  const { id } = req.params;

  const targetUser = storedUsers.find((u) => u.id === id || u.username === id.toLowerCase());
  if (!targetUser) {
    return res.status(404).json({ success: false, error: 'User not found.' });
  }

  // Permanent admin protection: "admin1" cannot be deleted by anyone
  if (targetUser.username.toLowerCase() === 'admin1') {
    return res.status(400).json({
      success: false,
      error: 'Cannot delete account "admin1". This is the permanent root administrator account and cannot be deleted by anyone.',
    });
  }

  // Authorization: Only admin can delete other accounts, or a user can delete their own account
  if (actor.role !== 'admin' && actor.id !== targetUser.id) {
    return res.status(403).json({
      success: false,
      error: 'Access Denied: Only administrators can remove other accounts.',
    });
  }

  // Security rule: Prevent deleting the last active administrator
  if (targetUser.role === 'admin') {
    const remainingAdmins = storedUsers.filter((u) => u.role === 'admin' && u.isActive && u.id !== targetUser.id);
    if (remainingAdmins.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot remove this account. At least one active administrator must remain in the system.',
      });
    }
  }

  storedUsers = storedUsers.filter((u) => u.id !== targetUser.id);
  saveUsers(storedUsers);

  logAudit(
    'USER_REMOVED',
    actor.username,
    actor.id === targetUser.id
      ? `User "${targetUser.username}" (${targetUser.role}) removed their own account.`
      : `User account "${targetUser.username}" (${targetUser.role}) was removed by administrator "${actor.username}".`
  );

  return res.json({
    success: true,
    message: `Account "${targetUser.username}" was successfully removed.`,
  });
});

// 10. Audit Logs endpoint (Admin only)
app.get('/api/audit-logs', requireAdmin, (_req: Request, res: Response) => {
  const logs = getAuditLogs();
  return res.json({
    success: true,
    logs,
  });
});

/* ================= CONFIGURATION ROUTES ================= */

// 11. Get Configuration (Available to all users)
app.get('/api/config', (_req: Request, res: Response) => {
  res.json({
    success: true,
    csvUrl: appConfig.csvUrl,
    formQuestions: appConfig.formQuestions,
    updatedAt: appConfig.updatedAt,
    updatedBy: appConfig.updatedBy,
  });
});

// 12. Update CSV URL (Strictly Administrator Protected)
app.put('/api/config/csv-url', requireAdmin, (req: Request, res: Response) => {
  const user = (req as any).user as StoredUser;
  const { csvUrl } = req.body;

  if (!csvUrl || typeof csvUrl !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'CSV URL is required and must be a valid string.',
    });
  }

  const trimmed = csvUrl.trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid URL format. The CSV link must start with https:// or http://.',
    });
  }

  appConfig.csvUrl = trimmed;
  appConfig.updatedAt = new Date().toISOString();
  appConfig.updatedBy = `${user.displayName} (@${user.username})`;

  saveConfig(appConfig);
  logAudit(
    'CONFIG_CSV_UPDATED',
    user.username,
    `Published CSV URL updated to "${trimmed}" by ${user.displayName}`
  );

  return res.json({
    success: true,
    message: 'CSV URL successfully updated & persisted to backend.',
    csvUrl: appConfig.csvUrl,
    updatedAt: appConfig.updatedAt,
    updatedBy: appConfig.updatedBy,
  });
});

// 13. Update Form Questions (Strictly Administrator Protected)
app.put('/api/config/form-questions', requireAdmin, (req: Request, res: Response) => {
  const user = (req as any).user as StoredUser;
  const { formQuestions } = req.body;

  if (!Array.isArray(formQuestions)) {
    return res.status(400).json({
      success: false,
      error: 'formQuestions must be an array of questions.',
    });
  }

  // Validate questions
  for (const q of formQuestions) {
    if (!q.id || !q.title || !q.type) {
      return res.status(400).json({
        success: false,
        error: `Question ${q.id || 'unknown'} is missing required title or type.`,
      });
    }

    const validTypes = [
      'short_text',
      'long_text',
      'multiple_choice',
      'dropdown',
      'date',
      'number',
    ];
    if (!validTypes.includes(q.type)) {
      return res.status(400).json({
        success: false,
        error: `Invalid question type "${q.type}". Allowed: ${validTypes.join(', ')}`,
      });
    }

    if (
      (q.type === 'dropdown' || q.type === 'multiple_choice') &&
      (!Array.isArray(q.options) || q.options.length === 0)
    ) {
      return res.status(400).json({
        success: false,
        error: `Question "${q.title}" of type ${q.type} must have at least one answer option.`,
      });
    }
  }

  appConfig.formQuestions = formQuestions;
  appConfig.updatedAt = new Date().toISOString();
  appConfig.updatedBy = `${user.displayName} (@${user.username})`;

  saveConfig(appConfig);
  logAudit(
    'CONFIG_QUESTIONS_UPDATED',
    user.username,
    `Form questions updated (${formQuestions.length} fields) by ${user.displayName}`
  );

  return res.json({
    success: true,
    message: 'Form questions successfully updated & saved to backend.',
    formQuestions: appConfig.formQuestions,
    count: appConfig.formQuestions.length,
    updatedAt: appConfig.updatedAt,
    updatedBy: appConfig.updatedBy,
  });
});

// 14. Reset Form Questions to Factory Default (Administrator Protected)
app.post('/api/config/form-questions/reset', requireAdmin, (req: Request, res: Response) => {
  const user = (req as any).user as StoredUser;
  appConfig.formQuestions = DEFAULT_QUESTIONS;
  appConfig.updatedAt = new Date().toISOString();
  appConfig.updatedBy = `${user.displayName} (Factory Reset)`;

  saveConfig(appConfig);
  logAudit(
    'CONFIG_QUESTIONS_RESET',
    user.username,
    `Form questions reset to factory defaults by ${user.displayName}`
  );

  return res.json({
    success: true,
    message: 'Form questions successfully reset to factory defaults.',
    formQuestions: appConfig.formQuestions,
    updatedAt: appConfig.updatedAt,
  });
});

/* ================= GOOGLE FORM & PRODUCTION LOG ROUTES ================= */

const GOOGLE_FORM_RESPONSE_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLSfyPcHPd2YO1pWsyTre-nkQw7zqwvV5qZ_FjoAhEAMduK36Uw/formResponse';

interface ProductionLogPayload {
  date: string;
  shift: string;
  line: string;
  model: string;
  stage: 'Loading' | 'Unloading' | 'Quality Control';
  loadingQty?: string | number;
  totalInspQty?: string | number;
  okPartQty?: string | number;
  notOkPartQty?: string | number;
  totalReworkParts?: string | number;
  unloadingDefects?: string[];
  rejectedQty?: string | number;
  qcDefects?: string[];
  customResponses?: Record<string, any>;
}

function submitToGoogleForm(
  data: ProductionLogPayload
): Promise<{ success: boolean; error?: string; statusCode?: number }> {
  return new Promise((resolve) => {
    try {
      const dateStr = (data.date || '').trim();
      let year = '';
      let month = '';
      let day = '';
      if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(dateStr)) {
        const parts = dateStr.split('-');
        year = parts[0];
        month = parts[1];
        day = parts[2];
      } else {
        const d = new Date();
        year = String(d.getFullYear());
        month = String(d.getMonth() + 1).padStart(2, '0');
        day = String(d.getDate()).padStart(2, '0');
      }

      const formPayload: Record<string, any> = {
        'entry.1863782578': `${year}-${month}-${day}`,
        'entry.1863782578_year': year,
        'entry.1863782578_month': month,
        'entry.1863782578_day': day,
        'entry.796304648': data.shift,
        'entry.715269699': data.line,
        fvv: '1',
        draftResponse: '[]',
      };

      const isPowder = data.line === 'Powder Coating Line';
      if (isPowder) {
        formPayload['entry.278734141'] = data.model;
      } else {
        formPayload['entry.258090292'] = data.model;
      }

      formPayload['entry.1146679347'] = data.stage;

      if (data.stage === 'Loading') {
        formPayload['entry.2124998600'] = String(data.loadingQty ?? '0');
        formPayload['pageHistory'] = isPowder ? '0,1,3,4' : '0,2,3,4';
      } else if (data.stage === 'Unloading') {
        formPayload['entry.1996904256'] = String(data.totalInspQty ?? '0');
        formPayload['entry.156278116'] = String(data.okPartQty ?? '0');
        formPayload['entry.890888061'] = String(data.notOkPartQty ?? '0');
        if (Array.isArray(data.unloadingDefects) && data.unloadingDefects.length > 0) {
          formPayload['entry.2002269015'] = data.unloadingDefects;
        }
        formPayload['entry.2057836962'] = String(data.totalReworkParts ?? '0');
        formPayload['pageHistory'] = isPowder ? '0,1,3,5' : '0,2,3,5';
      } else if (data.stage === 'Quality Control') {
        formPayload['entry.1194107134'] = String(data.rejectedQty ?? '0');
        if (Array.isArray(data.qcDefects) && data.qcDefects.length > 0) {
          formPayload['entry.828188584'] = data.qcDefects;
        }
        formPayload['pageHistory'] = isPowder ? '0,1,3,6' : '0,2,3,6';
      }

      const encodedBody = querystring.stringify(formPayload);

      const req = https.request(
        GOOGLE_FORM_RESPONSE_URL,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(encodedBody),
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
          timeout: 12000,
        },
        (res) => {
          let body = '';
          res.on('data', (chunk) => (body += chunk));
          res.on('end', () => {
            const isSuccess =
              res.statusCode === 200 ||
              body.includes('Your response has been recorded') ||
              body.includes('formResponse');
            resolve({
              success: isSuccess,
              statusCode: res.statusCode,
              error: isSuccess ? undefined : `Google Form returned HTTP ${res.statusCode}`,
            });
          });
        }
      );

      req.on('error', (err) => {
        console.error('Failed to transmit to Google Form:', err);
        resolve({ success: false, error: err.message });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({ success: false, error: 'Request to Google Form timed out' });
      });

      req.write(encodedBody);
      req.end();
    } catch (e: any) {
      resolve({ success: false, error: e.message });
    }
  });
}

// Submit production record to Google Sheet via Google Form & persist locally
app.post('/api/production/log', async (req: Request, res: Response) => {
  const payload = req.body as ProductionLogPayload;
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';

  if (!payload || !payload.date || !payload.shift || !payload.line || !payload.model || !payload.stage) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: date, shift, line, model, and stage are required.',
    });
  }

  // Forward submission to Google Form response endpoint
  const googleResult = await submitToGoogleForm(payload);

  // Convert to synchronized dashboard row
  const shiftLetter = payload.shift.replace(/shift\s*/i, '').trim() || 'A';
  let loadNum = 0;
  let inspNum = 0;
  let okNum = 0;
  let nokNum = 0;
  let rwNum = 0;
  let rejNum = 0;
  let defectsList: string[] = [];

  if (payload.stage === 'Loading') {
    loadNum = Number(payload.loadingQty) || 0;
  } else if (payload.stage === 'Unloading') {
    inspNum = Number(payload.totalInspQty) || 0;
    okNum = Number(payload.okPartQty) || 0;
    nokNum = Number(payload.notOkPartQty) || 0;
    rwNum = Number(payload.totalReworkParts) || 0;
    defectsList = payload.unloadingDefects || [];
  } else if (payload.stage === 'Quality Control') {
    rejNum = Number(payload.rejectedQty) || 0;
    inspNum = rejNum;
    defectsList = payload.qcDefects || [];
  }

  const newRow = {
    ID: Math.floor(1000 + Math.random() * 9000),
    DateKey: payload.date,
    Shift: shiftLetter,
    Line: payload.line,
    Part: payload.model,
    Stage: payload.stage,
    Load: loadNum,
    Insp: inspNum,
    OK: okNum,
    NOK: nokNum,
    Rework: rwNum,
    Rej: rejNum,
    Defect: defectsList.length ? defectsList.join('; ') + ';' : '',
    Timestamp: new Date().toISOString(),
    CreatedAt: new Date().toISOString(),
  };

  // Persist row in production-logs.json
  try {
    let logs: any[] = [];
    if (fs.existsSync(PRODUCTION_LOGS_FILE)) {
      const raw = fs.readFileSync(PRODUCTION_LOGS_FILE, 'utf-8');
      logs = JSON.parse(raw);
      if (!Array.isArray(logs)) logs = [];
    }
    logs.unshift(newRow);
    fs.writeFileSync(PRODUCTION_LOGS_FILE, JSON.stringify(logs.slice(0, 1000), null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving to production-logs.json:', err);
  }

  logAudit(
    'PRODUCTION_LOG_SUBMITTED',
    'Operator/User',
    `Log entry recorded for ${payload.line} - ${payload.model} (${payload.stage}). Google Form transmission status: ${
      googleResult.success ? 'Success (200 OK)' : 'Warning: ' + (googleResult.error || 'Check network')
    }`,
    clientIp
  );

  return res.json({
    success: true,
    googleFormTransmitted: googleResult.success,
    googleFormError: googleResult.error,
    message: googleResult.success
      ? 'Record successfully saved and response recorded into Google Sheet!'
      : 'Record saved locally, but Google Form responded with: ' + (googleResult.error || 'Unknown status'),
    row: newRow,
  });
});

// Retrieve recent production logs
app.get('/api/production/logs', (_req: Request, res: Response) => {
  try {
    if (fs.existsSync(PRODUCTION_LOGS_FILE)) {
      const raw = fs.readFileSync(PRODUCTION_LOGS_FILE, 'utf-8');
      const data = JSON.parse(raw);
      return res.json({ success: true, logs: Array.isArray(data) ? data : [] });
    }
  } catch (err) {
    console.warn('Could not read production logs:', err);
  }
  return res.json({ success: true, logs: [] });
});

/* ================= VITE / STATIC SERVING ================= */

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  const httpServer = http.createServer(app);

  if (!isProd) {
    const isHmrDisabled = process.env.DISABLE_HMR === 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: isHmrDisabled ? false : { server: httpServer },
        watch: isHmrDisabled ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve('dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Baxy Paintshop Fullstack Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
