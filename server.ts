import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { GoogleGenAI, Type } from '@google/genai';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';

// Directories setup
const UPLOADS_DIR = path.resolve('uploads');
const PENDING_DIR = path.resolve('uploads', 'equipment', '_pending');
const EQUIPMENT_DIR = path.resolve('uploads', 'equipment');

[UPLOADS_DIR, PENDING_DIR, EQUIPMENT_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Persistent local storage files
const MASTER_DB_FILE = path.resolve('master_equipment.json');
const BATCHES_DB_FILE = path.resolve('pending_batches.json');
const EQUIPMENT_RECORDS_FILE = path.resolve('equipment_records.json');

if (!fs.existsSync(MASTER_DB_FILE)) {
  fs.writeFileSync(MASTER_DB_FILE, JSON.stringify([], null, 2), 'utf8');
}
if (!fs.existsSync(BATCHES_DB_FILE)) {
  fs.writeFileSync(BATCHES_DB_FILE, JSON.stringify([], null, 2), 'utf8');
}
if (!fs.existsSync(EQUIPMENT_RECORDS_FILE)) {
  fs.writeFileSync(EQUIPMENT_RECORDS_FILE, JSON.stringify({}, null, 2), 'utf8');
}

// Firebase configuration
let firebaseConfig: any = null;
try {
  const configFile = path.resolve('firebase-applet-config.json');
  if (fs.existsSync(configFile)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configFile, 'utf8'));
  }
} catch (err) {
  console.warn('Could not read firebase-applet-config.json:', err);
}

let firestoreDb: any = null;
if (firebaseConfig?.projectId) {
  try {
    if (!getApps().length) {
      initializeApp({
        projectId: firebaseConfig.projectId,
        storageBucket: firebaseConfig.storageBucket,
      });
    }
    try {
      const dbId = firebaseConfig.firestoreDatabaseId || firebaseConfig.databaseId;
      firestoreDb = dbId ? getFirestore(dbId) : getFirestore();
    } catch (e) {
      console.warn('Firestore admin client init warning:', e);
    }
  } catch (e) {
    console.warn('Firebase admin initialization warning:', e);
  }
}

// Default authorized inspectors
const DEFAULT_INSPECTORS = [
  { email: 'nguyen.van.huy@vard.com', display_name: 'Nguyễn Văn Huy', employee_id: '2995' },
  { email: 'ngo.thinh.duy@vard.com', display_name: 'Ngô Thịnh Duy', employee_id: '8000' },
  { email: 'lam.thi.thuy.trang@vard.com', display_name: 'Lâm Thị Thùy Trang', employee_id: '4006' },
  { email: 'pham.le.thanh.an@vard.com', display_name: 'Phạm Lê Thành An', employee_id: '8000' },
  { email: 'hoang.manh.thang@vard.com', display_name: 'Hoàng Mạnh Thắng', employee_id: '4426' },
  { email: 'tran.van.chuyen@vard.com', display_name: 'Trần Văn Chuyền', employee_id: '2742' },
  { email: 'nguyen.dong.hop@vard.com', display_name: 'Nguyễn Đồng Hợp', employee_id: '3750' },
  { email: 'nguyen.danh.duy@vard.com', display_name: 'Nguyễn Danh Duy', employee_id: '2511' },
  { email: 'dang.duy.hoang@vard.com', display_name: 'Đặng Duy Hoàng', employee_id: '4256' },
  { email: 'nguyen.huy.thinh@vard.com', display_name: 'Nguyễn Huy Thịnh', employee_id: '2524' },
  { email: 'tran.duc.huy@vard.com', display_name: 'Trần Đức Huy', employee_id: '4378' },
  { email: 'nguyen.tran.hung@vard.com', display_name: 'Nguyễn Trần Hưng', employee_id: '2107' },
  { email: 'to.my.bon@vard.com', display_name: 'Tô Mỹ Bồn', employee_id: '3809' },
  { email: 'phan.trong.khoi@vard.com', display_name: 'Phan Trọng Khôi', employee_id: '4614' },
  { email: 'nguyen.van.thao@vard.com', display_name: 'Nguyễn Văn Thảo', employee_id: '3436' },
  { email: 'nguyen.ba.xuan.ky@vard.com', display_name: 'Nguyễn Bá Xuân Kỳ', employee_id: '8000' },
  { email: 'tran.nguyen.phuoc@vard.com', display_name: 'Trần Nguyên Phước', employee_id: '4551' },
  { email: 'tran.quoc@vard.com', display_name: 'Trần Quốc', employee_id: '2861' },
  { email: 'ho.thanh.tuat@vard.com', display_name: 'Hồ Thanh Tuất', employee_id: '2698' },
  { email: 'le.chau@vard.com', display_name: 'Lê Châu', employee_id: '2982' },
  { email: 'nguyen.hung.phat@vard.com', display_name: 'Nguyễn Hưng Phát', employee_id: '8000' },
  { email: 'nguyen.van.anh@vard.com', display_name: 'Nguyễn Văn Ánh', employee_id: '2313' },
  { email: 'tran.thi.ngoc.bich@vard.com', display_name: 'Trần Thị Ngọc Bích', employee_id: '4455' },
];

const INSPECTORS_FILE = path.resolve('inspectors.json');
if (!fs.existsSync(INSPECTORS_FILE)) {
  fs.writeFileSync(INSPECTORS_FILE, JSON.stringify(DEFAULT_INSPECTORS, null, 2), 'utf8');
}

function readInspectors() {
  try {
    return JSON.parse(fs.readFileSync(INSPECTORS_FILE, 'utf8'));
  } catch {
    return DEFAULT_INSPECTORS;
  }
}

// Helpers for master equipment, pending batches, equipment records
function readMasterEquipment(): any[] {
  try {
    return JSON.parse(fs.readFileSync(MASTER_DB_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function writeMasterEquipment(items: any[]) {
  fs.writeFileSync(MASTER_DB_FILE, JSON.stringify(items, null, 2), 'utf8');
}

function readPendingBatches(): any[] {
  try {
    return JSON.parse(fs.readFileSync(BATCHES_DB_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function writePendingBatches(batches: any[]) {
  fs.writeFileSync(BATCHES_DB_FILE, JSON.stringify(batches, null, 2), 'utf8');
}

function readEquipmentRecords(): Record<string, any> {
  try {
    return JSON.parse(fs.readFileSync(EQUIPMENT_RECORDS_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function writeEquipmentRecords(records: Record<string, any>) {
  fs.writeFileSync(EQUIPMENT_RECORDS_FILE, JSON.stringify(records, null, 2), 'utf8');
}

// SFI Normalization Rule: "Chuẩn hóa SFI: bỏ khoảng trắng, viết hoa, đổi O->0, I/l->1 trước khi so sánh."
function normalizeSfi(sfi: string | null | undefined): string {
  if (!sfi) return '';
  return String(sfi)
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1');
}

// String similarity for equipment name comparison
function calculateNameSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  const clean1 = str1.toLowerCase().replace(/[^a-z0-9à-ỹ\s]/g, '').trim();
  const clean2 = str2.toLowerCase().replace(/[^a-z0-9à-ỹ\s]/g, '').trim();
  const words1 = new Set(clean1.split(/\s+/).filter(w => w.length > 1));
  const words2 = new Set(clean2.split(/\s+/).filter(w => w.length > 1));

  if (words1.size === 0 || words2.size === 0) {
    return clean1 === clean2 ? 1 : 0;
  }

  let intersection = 0;
  words1.forEach(w => {
    if (words2.has(w)) intersection++;
  });

  const union = new Set([...words1, ...words2]).size;
  return union === 0 ? 0 : intersection / union;
}

// Gemini AI client initialization
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: { 'User-Agent': 'aistudio-build' },
  },
});

// Model progression list for flexible fallback (from lightweight Lite models up to higher capability models)
const MODEL_FALLBACK_SEQUENCE = [
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash',
  'gemini-3.5-flash',
];

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    sfi: { type: Type.STRING, nullable: true, description: 'Mã SFI chính đọc được (chữ số và dấu chấm)' },
    equipment_name: { type: Type.STRING, nullable: true, description: 'Tên thiết bị đọc trên biển' },
    dry_weight: {
      type: Type.OBJECT,
      properties: {
        value: { type: Type.STRING, nullable: true },
        unit_on_plate: { type: Type.STRING, nullable: true },
        source_photo: { type: Type.STRING, nullable: true },
        confidence: { type: Type.STRING, enum: ['high', 'medium', 'low'] },
      },
      required: ['value', 'unit_on_plate', 'source_photo', 'confidence'],
    },
    wet_weight: {
      type: Type.OBJECT,
      properties: {
        value: { type: Type.STRING, nullable: true },
        unit_on_plate: { type: Type.STRING, nullable: true },
        source_photo: { type: Type.STRING, nullable: true },
        confidence: { type: Type.STRING, enum: ['high', 'medium', 'low'] },
      },
      required: ['value', 'unit_on_plate', 'source_photo', 'confidence'],
    },
    capacity: {
      type: Type.OBJECT,
      properties: {
        value: { type: Type.STRING, nullable: true },
        unit_on_plate: { type: Type.STRING, nullable: true },
        source_photo: { type: Type.STRING, nullable: true },
        confidence: { type: Type.STRING, enum: ['high', 'medium', 'low'] },
      },
      required: ['value', 'unit_on_plate', 'source_photo', 'confidence'],
    },
    dimension: {
      type: Type.OBJECT,
      properties: {
        value: { type: Type.STRING, nullable: true },
        unit_on_plate: { type: Type.STRING, nullable: true },
        source_photo: { type: Type.STRING, nullable: true },
        confidence: { type: Type.STRING, enum: ['high', 'medium', 'low'] },
      },
      required: ['value', 'unit_on_plate', 'source_photo', 'confidence'],
    },
    power: {
      type: Type.OBJECT,
      properties: {
        value: { type: Type.STRING, nullable: true },
        unit_on_plate: { type: Type.STRING, nullable: true },
        source_photo: { type: Type.STRING, nullable: true },
        confidence: { type: Type.STRING, enum: ['high', 'medium', 'low'] },
      },
      required: ['value', 'unit_on_plate', 'source_photo', 'confidence'],
    },
    pressure: {
      type: Type.OBJECT,
      properties: {
        value: { type: Type.STRING, nullable: true },
        unit_on_plate: { type: Type.STRING, nullable: true },
        source_photo: { type: Type.STRING, nullable: true },
        confidence: { type: Type.STRING, enum: ['high', 'medium', 'low'] },
      },
      required: ['value', 'unit_on_plate', 'source_photo', 'confidence'],
    },
    rpm: {
      type: Type.OBJECT,
      properties: {
        value: { type: Type.STRING, nullable: true },
        unit_on_plate: { type: Type.STRING, nullable: true },
        source_photo: { type: Type.STRING, nullable: true },
        confidence: { type: Type.STRING, enum: ['high', 'medium', 'low'] },
      },
      required: ['value', 'unit_on_plate', 'source_photo', 'confidence'],
    },
    voltage: {
      type: Type.OBJECT,
      properties: {
        value: { type: Type.STRING, nullable: true },
        unit_on_plate: { type: Type.STRING, nullable: true },
        source_photo: { type: Type.STRING, nullable: true },
        confidence: { type: Type.STRING, enum: ['high', 'medium', 'low'] },
      },
      required: ['value', 'unit_on_plate', 'source_photo', 'confidence'],
    },
    hertz: {
      type: Type.OBJECT,
      properties: {
        value: { type: Type.STRING, nullable: true },
        unit_on_plate: { type: Type.STRING, nullable: true },
        source_photo: { type: Type.STRING, nullable: true },
        confidence: { type: Type.STRING, enum: ['high', 'medium', 'low'] },
      },
      required: ['value', 'unit_on_plate', 'source_photo', 'confidence'],
    },
    ampere: {
      type: Type.OBJECT,
      properties: {
        value: { type: Type.STRING, nullable: true },
        unit_on_plate: { type: Type.STRING, nullable: true },
        source_photo: { type: Type.STRING, nullable: true },
        confidence: { type: Type.STRING, enum: ['high', 'medium', 'low'] },
      },
      required: ['value', 'unit_on_plate', 'source_photo', 'confidence'],
    },
    series_no: {
      type: Type.OBJECT,
      properties: {
        value: { type: Type.STRING, nullable: true },
        unit_on_plate: { type: Type.STRING, nullable: true },
        source_photo: { type: Type.STRING, nullable: true },
        confidence: { type: Type.STRING, enum: ['high', 'medium', 'low'] },
      },
      required: ['value', 'unit_on_plate', 'source_photo', 'confidence'],
    },
    other_sfi_seen: { type: Type.ARRAY, items: { type: Type.STRING } },
    notes: { type: Type.STRING, nullable: true },
  },
  required: [
    'sfi', 'equipment_name', 'dry_weight', 'wet_weight', 'capacity',
    'dimension', 'power', 'pressure', 'rpm', 'voltage', 'hertz',
    'ampere', 'series_no', 'other_sfi_seen',
  ],
};

// Unified Gemini extraction across ALL photos in a batch with multi-model fallback & 40s timeout
async function extractBatchWithModelFallback(imageParts: any[]): Promise<{ data: any; modelUsed: string }> {
  const promptText = `Bạn là kỹ sư hàng hải chuyên trích xuất thông tin thiết bị từ ảnh biển tên (nameplate) và nhãn SFI/giấy ghi chú.
TẤT CẢ CÁC ÂNH NÀY THUỘC VỀ CÙNG MỘT BỘ THIẾT BỊ HÀNG HẢI.
1. Mã SFI có thể xuất hiện ở bất kỳ ảnh nào (ví dụ ảnh 1, 2 hoặc 3). Chép nguyên văn SFI như thấy (SFI chỉ gồm chữ số và dấu chấm, ví dụ 701.01101.10). Nếu không thấy SFI thì sfi = null.
2. 11 thông số kỹ thuật (dry_weight, wet_weight, capacity, dimension, power, pressure, rpm, voltage, hertz, ampere, series_no) có thể nằm rải rác ở các ảnh khác nhau trong tập hợp này.
QUY TẮC ĐẶC BIỆT CHO SERIES NO (series_no):
- Tìm kỹ các nhãn "No.", "No", "Serial No", "Serial Number", "S/N", "Ser. No.", "Nr.", hoặc số sê-ri đóng trên biển tên (thường nằm ở góc hoặc gần cuối biển). Chú ý không bỏ sót trường này.
3. Hãy tổng hợp thông tin từ TẤT CẢ các ảnh để tạo ra DUY NHẤT 1 bảng thông số thiết bị hoàn chỉnh.
4. Với mỗi thông số đọc được, hãy chỉ rõ tên file ảnh nguồn (source_photo) chứa nó, đơn vị (unit_on_plate) và độ tin cậy confidence ('high' | 'medium' | 'low').`;

  for (let i = 0; i < MODEL_FALLBACK_SEQUENCE.length; i++) {
    const modelName = MODEL_FALLBACK_SEQUENCE[i];
    console.log(`[Gemini Extraction] Attempting with model: ${modelName} (${i + 1}/${MODEL_FALLBACK_SEQUENCE.length})`);
    try {
      // 40-second timeout promise
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout model ${modelName}`)), 40000)
      );

      const apiPromise = ai.models.generateContent({
        model: modelName,
        contents: { parts: [...imageParts, { text: promptText }] },
        config: {
          temperature: 0,
          responseMimeType: 'application/json',
          responseSchema,
        },
      });

      const result: any = await Promise.race([apiPromise, timeoutPromise]);
      const jsonText = result.text || '{}';
      const parsed = JSON.parse(jsonText);

      // Verify that parsed has valid structure
      if (parsed) {
        console.log(`[Gemini Extraction Success] Used model ${modelName}. SFI: ${parsed.sfi}`);
        return { data: parsed, modelUsed: modelName };
      }
    } catch (err: any) {
      console.warn(`[Gemini Extraction Warning] Model ${modelName} failed or timed out: ${err.message}. Trying next model...`);
    }
  }

  // Fallback default structure if all models fail
  return {
    modelUsed: 'Fallback Default',
    data: {
      sfi: null,
      equipment_name: null,
      dry_weight: { value: null, unit_on_plate: null, source_photo: null, confidence: 'low' },
      wet_weight: { value: null, unit_on_plate: null, source_photo: null, confidence: 'low' },
      capacity: { value: null, unit_on_plate: null, source_photo: null, confidence: 'low' },
      dimension: { value: null, unit_on_plate: null, source_photo: null, confidence: 'low' },
      power: { value: null, unit_on_plate: null, source_photo: null, confidence: 'low' },
      pressure: { value: null, unit_on_plate: null, source_photo: null, confidence: 'low' },
      rpm: { value: null, unit_on_plate: null, source_photo: null, confidence: 'low' },
      voltage: { value: null, unit_on_plate: null, source_photo: null, confidence: 'low' },
      hertz: { value: null, unit_on_plate: null, source_photo: null, confidence: 'low' },
      ampere: { value: null, unit_on_plate: null, source_photo: null, confidence: 'low' },
      series_no: { value: null, unit_on_plate: null, source_photo: null, confidence: 'low' },
      other_sfi_seen: [],
      notes: 'Hệ thống đang quá tải hoặc tạm thời không thể xử lý ảnh. Vui lòng thử lại sau.',
    },
  };
}

// Secret key for temporary tokens
const TOKEN_SECRET = process.env.TOKEN_SECRET || 'marinetag-ai-secret-signing-key-2026';

function generateSessionToken(payload: { email: string; uid: string; name: string; employee_id?: string }): string {
  const expires = Date.now() + 30 * 24 * 60 * 60 * 1000;
  const data = JSON.stringify({ ...payload, expires });
  const sig = crypto.createHmac('sha256', TOKEN_SECRET).update(data).digest('hex');
  return Buffer.from(JSON.stringify({ data, sig })).toString('base64url');
}

function verifySessionToken(token: string): any {
  try {
    const raw = Buffer.from(token, 'base64url').toString('utf8');
    const { data, sig } = JSON.parse(raw);
    const expectedSig = crypto.createHmac('sha256', TOKEN_SECRET).update(data).digest('hex');
    if (sig !== expectedSig) return null;
    const parsed = JSON.parse(data);
    if (Date.now() > parsed.expires) return null;
    return parsed;
  } catch {
    return null;
  }
}

function generateImageToken(filename: string): string {
  const expires = Date.now() + 2 * 60 * 60 * 1000;
  const payload = `${filename}:${expires}`;
  const hmac = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('hex');
  return Buffer.from(JSON.stringify({ filename, expires, hmac })).toString('base64url');
}

function verifyImageToken(token: string, filename: string): boolean {
  try {
    const raw = Buffer.from(token, 'base64url').toString('utf8');
    const { filename: f, expires, hmac } = JSON.parse(raw);
    if (f !== filename) return false;
    if (Date.now() > expires) return false;
    const expected = crypto.createHmac('sha256', TOKEN_SECRET).update(`${f}:${expires}`).digest('hex');
    return hmac === expected;
  } catch {
    return false;
  }
}

// Authentication middleware
interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email: string;
    name: string;
    employee_id?: string;
  };
}

async function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const devEmail = (req.headers['x-user-email'] as string) || (req.query.user_email as string);

  let email: string | undefined;
  let uid: string | undefined;
  let name: string | undefined;
  let employeeId: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split('Bearer ')[1];
    const session = verifySessionToken(token);
    if (session) {
      email = session.email;
      uid = session.uid;
      name = session.name;
      employeeId = session.employee_id;
    }
  }

  if (!email && devEmail) {
    email = devEmail;
    uid = `emp_dev_${crypto.createHash('md5').update(devEmail).digest('hex').slice(0, 6)}`;
  }

  if (!email) {
    return res.status(401).json({ error: 'Yêu cầu đăng nhập để truy cập tài nguyên này.' });
  }

  const inspectors = readInspectors();
  const inspector = inspectors.find((i: any) => i.email.toLowerCase() === email?.toLowerCase());
  const finalName = inspector?.display_name || name || email.split('@')[0];
  const finalEmpId = inspector?.employee_id || employeeId || '8000';
  const finalUid = uid || `emp_${finalEmpId}_${crypto.createHash('md5').update(email).digest('hex').slice(0, 6)}`;

  req.user = { uid: finalUid, email, name: finalName, employee_id: finalEmpId };
  next();
}

// Multer storage for batch photo uploads (up to 20 files)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
    if (allowedMimes.includes(file.mimetype.toLowerCase()) || file.originalname.match(/\.(jpe?g|png|webp|heic|heif)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận ảnh định dạng JPEG, PNG, WebP hoặc HEIC.'));
    }
  },
});

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// GET /api/inspectors
app.get('/api/inspectors', (_req: Request, res: Response) => {
  res.json({ inspectors: readInspectors() });
});

// POST /api/auth/login
app.post('/api/auth/login', (req: Request, res: Response) => {
  const email = (req.body.email || '').toString().trim().toLowerCase();
  if (!email) {
    return res.status(400).json({ error: 'Vui lòng cung cấp email.' });
  }
  const inspectors = readInspectors();
  const inspector = inspectors.find((i: any) => i.email.toLowerCase() === email);
  const displayName = inspector?.display_name || email.split('@')[0];
  const employeeId = inspector?.employee_id || '8000';
  const uid = `emp_${employeeId}_${crypto.createHash('md5').update(email).digest('hex').slice(0, 6)}`;

  const token = generateSessionToken({ email, uid, name: displayName, employee_id: employeeId });
  res.json({
    user: { uid, email, displayName, employee_id: employeeId, isAllowed: true },
    token,
    message: `Đăng nhập thành công với chức danh ${displayName} (MSNV: ${employeeId}).`,
  });
});

// GET /api/auth/me - Validate current session token
app.get('/api/auth/me', authenticate, (req: AuthenticatedRequest, res: Response) => {
  res.json({
    user: {
      uid: req.user!.uid,
      email: req.user!.email,
      displayName: req.user!.name,
      employee_id: req.user!.employee_id,
      isAllowed: true,
    },
  });
});

// GET /api/images/:filename - Image access helper
app.get('/api/images/:filename', (req: Request, res: Response) => {
  const filename = path.basename(req.params.filename);
  let filePath = path.join(PENDING_DIR, filename);
  if (!fs.existsSync(filePath)) {
    const searchRecursive = (dir: string): string | null => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          const found = searchRecursive(fullPath);
          if (found) return found;
        } else if (entry.name === filename) {
          return fullPath;
        }
      }
      return null;
    };
    const foundPath = searchRecursive(EQUIPMENT_DIR);
    if (foundPath) filePath = foundPath;
  }

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Không tìm thấy tệp ảnh.' });
  }

  const token = req.query.token as string;
  if (!token || !verifyImageToken(token, filename)) {
    return res.status(403).json({ error: 'Liên kết ảnh đã hết hạn hoặc không có quyền.' });
  }

  res.setHeader('Cache-Control', 'private, max-age=7200');
  res.sendFile(filePath);
});

// POST /api/master/import - Upload and parse master equipment Excel/CSV table
const excelUpload = multer({ storage: multer.memoryStorage() });
app.post('/api/master/import', authenticate, excelUpload.single('file'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Vui lòng tải lên tệp Excel (.xlsx, .xls) hoặc CSV.' });
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (rows.length === 0) {
      return res.status(400).json({ error: 'Tệp Excel không có dữ liệu.' });
    }

    const masterItems: any[] = [];
    for (const row of rows) {
      const keys = Object.keys(row);
      const findKey = (candidates: string[]) => keys.find(k => candidates.includes(k.toLowerCase().trim()));

      const sfiKey = findKey(['sfi', 'sfi_no', 'sfi code', 'mã sfi']);
      const nameKey = findKey(['description', 'equipment_name', 'name', 'tên thiết bị', 'mô tả']);
      const zoneKey = findKey(['zone', 'vùng', 'khu vực']);
      const compKey = findKey(['comp. location', 'comp_location', 'location', 'vị trí']);
      const sysKey = findKey(['system description', 'system_description', 'hệ thống']);
      const typeKey = findKey(['type', 'loại']);
      const certKey = findKey(['certificate', 'chứng chỉ', 'đăng kiểm']);
      const makerKey = findKey(['maker', 'nhà sản xuất']);
      const supplierKey = findKey(['supplier', 'nhà cung cấp']);
      const supplierAddKey = findKey(['supplier add.', 'supplier add', 'supplier_add', 'địa chỉ nhà cung cấp']);
      const telKey = findKey(['tel no.', 'tel no', 'tel_no', 'sđt', 'điện thoại']);
      const faxKey = findKey(['fax no.', 'fax no', 'fax_no', 'fax']);
      const emailKey = findKey(['email', 'hòm thư']);

      const rawSfi = sfiKey ? row[sfiKey] : Object.values(row)[0];
      const rawName = nameKey ? row[nameKey] : Object.values(row)[1] || '';

      if (rawSfi !== undefined && rawSfi !== null && String(rawSfi).trim() !== '') {
        masterItems.push({
          sfi: String(rawSfi).trim(),
          name: String(rawName).trim(),
          zone: zoneKey ? String(row[zoneKey]).trim() : '',
          comp_location: compKey ? String(row[compKey]).trim() : '',
          system_description: sysKey ? String(row[sysKey]).trim() : '',
          type: typeKey ? String(row[typeKey]).trim() : '',
          certificate: certKey ? String(row[certKey]).trim() : '',
          maker: makerKey ? String(row[makerKey]).trim() : '',
          supplier: supplierKey ? String(row[supplierKey]).trim() : '',
          supplier_add: supplierAddKey ? String(row[supplierAddKey]).trim() : '',
          tel_no: telKey ? String(row[telKey]).trim() : '',
          fax_no: faxKey ? String(row[faxKey]).trim() : '',
          email: emailKey ? String(row[emailKey]).trim() : '',
          raw_row: row,
        });
      }
    }

    writeMasterEquipment(masterItems);

    if (firestoreDb) {
      try {
        const batch = firestoreDb.batch();
        masterItems.forEach(item => {
          const docRef = firestoreDb.collection('master_equipment').doc(item.sfi.replace(/[^a-zA-Z0-9]/g, '_'));
          batch.set(docRef, item, { merge: true });
        });
        await batch.commit();
      } catch (fErr) {
        console.warn('Firestore master sync error:', fErr);
      }
    }

    res.json({
      message: `Đã nhập thành công ${masterItems.length} thiết bị vào danh mục SFI chuẩn.`,
      count: masterItems.length,
      sample: masterItems.slice(0, 5),
    });
  } catch (err: any) {
    console.error('Master import error:', err);
    res.status(500).json({ error: 'Lỗi khi phân tích tệp Excel: ' + err.message });
  }
});

// GET /api/master - Get master equipment list with search
app.get('/api/master', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const search = ((req.query.search as string) || '').trim().toLowerCase();
  let items = readMasterEquipment();
  if (search) {
    items = items.filter(
      i =>
        i.sfi.toLowerCase().includes(search) ||
        i.name.toLowerCase().includes(search) ||
        (i.zone && i.zone.toLowerCase().includes(search)) ||
        (i.comp_location && i.comp_location.toLowerCase().includes(search))
    );
  }
  res.json({ items, total: items.length });
});

// POST /api/batches/upload - Upload batch of photos for ONE single equipment set
app.post('/api/batches/upload', authenticate, upload.array('photos', 20), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'Vui lòng chọn từ 1 đến 20 ảnh thiết bị.' });
    }

    const batchId = `batch_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const batchPendingDir = path.join(PENDING_DIR, batchId);
    fs.mkdirSync(batchPendingDir, { recursive: true });

    const photoItems: any[] = [];
    const imageParts: any[] = [];
    const masterItems = readMasterEquipment();

    for (const file of files) {
      // Resize & optimize image using Sharp
      let imagePipeline = sharp(file.buffer).rotate();
      const metadata = await imagePipeline.metadata();
      const maxDim = Math.max(metadata.width || 0, metadata.height || 0);
      if (maxDim > 3500) {
        if ((metadata.width || 0) >= (metadata.height || 0)) {
          imagePipeline = imagePipeline.resize({ width: 3500, withoutEnlargement: true });
        } else {
          imagePipeline = imagePipeline.resize({ height: 3500, withoutEnlargement: true });
        }
      }

      const processedBuffer = await imagePipeline.jpeg({ quality: 90 }).toBuffer();
      const fileId = `${Date.now()}_${crypto.randomBytes(4).toString('hex')}.jpg`;
      const localFilePath = path.join(batchPendingDir, fileId);
      fs.writeFileSync(localFilePath, processedBuffer);

      const imageToken = generateImageToken(fileId);
      const imageUrl = `/api/images/${fileId}?token=${encodeURIComponent(imageToken)}`;

      photoItems.push({
        id: fileId,
        filename: fileId,
        original_name: file.originalname,
        url: imageUrl,
      });

      imageParts.push({
        inlineData: {
          data: processedBuffer.toString('base64'),
          mimeType: 'image/jpeg',
        },
      });
    }

    // Call Gemini with Multi-Model Fallback on all photos together for 1 equipment synthesis
    const { data: extractedData, modelUsed } = await extractBatchWithModelFallback(imageParts);

    // Matching against Master Equipment Table for the single extracted SFI
    const rawSfi = extractedData?.sfi;
    const normalizedAiSfi = normalizeSfi(rawSfi);
    let matchedMaster: any = null;
    let matchType: 'exact' | 'name_mismatch' | 'unknown' | 'no_sfi' = 'unknown';
    let suggestedMasters: any[] = [];

    if (!normalizedAiSfi) {
      matchType = 'no_sfi';
    } else {
      matchedMaster = masterItems.find(m => normalizeSfi(m.sfi) === normalizedAiSfi);
      if (matchedMaster) {
        const sim = calculateNameSimilarity(extractedData.equipment_name || '', matchedMaster.name);
        if (sim >= 0.6) {
          matchType = 'exact';
        } else {
          matchType = 'name_mismatch';
        }
      } else {
        matchType = 'unknown';
        suggestedMasters = masterItems
          .map(m => ({
            item: m,
            score: calculateNameSimilarity(extractedData.equipment_name || '', m.name) + (normalizeSfi(m.sfi).startsWith(normalizedAiSfi.slice(0, 4)) ? 0.5 : 0),
          }))
          .sort((a, b) => b.score - a.score)
          .slice(0, 3)
          .map(s => s.item);
      }
    }

    const newBatch = {
      batch_id: batchId,
      created_at: new Date().toISOString(),
      inspector: req.user!.name,
      photos: photoItems,
      extracted: extractedData,
      match_type: matchType,
      matched_master: matchedMaster || null,
      suggested_masters: suggestedMasters,
      assigned_sfi: matchedMaster ? matchedMaster.sfi : (rawSfi || null),
      model_used: modelUsed,
      status: 'pending_review',
    };

    const batches = readPendingBatches();
    batches.unshift(newBatch);
    writePendingBatches(batches);

    res.json({
      message: `Đã phân tích nhóm ${photoItems.length} ảnh thiết bị bằng mô hình AI ${modelUsed}.`,
      batch: newBatch,
    });
  } catch (err: any) {
    console.error('Batch upload error:', err);
    res.status(500).json({ error: 'Lỗi khi xử lý nhóm ảnh: ' + err.message });
  }
});

// GET /api/batches - List pending batches
app.get('/api/batches', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const batches = readPendingBatches();
  res.json({ batches });
});

// POST /api/batches/:batchId/confirm - Confirm SFI assignment for entire batch
app.post('/api/batches/:batchId/confirm', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { batchId } = req.params;
    const { sfi } = req.body;

    if (!sfi) {
      return res.status(400).json({ error: 'Vui lòng cung cấp mã SFI xác nhận cho lượt tải này.' });
    }

    const batches = readPendingBatches();
    const batchIndex = batches.findIndex(b => b.batch_id === batchId);
    if (batchIndex === -1) {
      return res.status(404).json({ error: 'Không tìm thấy lượt xử lý này.' });
    }

    const batch = batches[batchIndex];
    const masterItems = readMasterEquipment();
    const equipmentRecords = readEquipmentRecords();

    const targetSfi = String(sfi).trim();
    const masterItem = masterItems.find(m => normalizeSfi(m.sfi) === normalizeSfi(targetSfi));

    // Ensure target folder exists: equipment/{SFI}/photos/
    const sfiFolderName = targetSfi.replace(/[^a-zA-Z0-9.]/g, '_');
    const sfiFolder = path.join(EQUIPMENT_DIR, sfiFolderName);
    const photosFolder = path.join(sfiFolder, 'photos');
    fs.mkdirSync(photosFolder, { recursive: true });

    // Move all batch photos into equipment/{SFI}/photos/
    const movedPhotos: any[] = [];
    for (const photoItem of batch.photos) {
      const oldPath = path.join(PENDING_DIR, batchId, photoItem.filename);
      const newPath = path.join(photosFolder, photoItem.filename);
      if (fs.existsSync(oldPath)) {
        fs.renameSync(oldPath, newPath);
      }
      const newImageUrl = `/api/images/${photoItem.filename}?token=${encodeURIComponent(generateImageToken(photoItem.filename))}`;
      movedPhotos.push({
        filename: photoItem.filename,
        original_name: photoItem.original_name,
        url: newImageUrl,
        uploaded_at: new Date().toISOString(),
        batch_id: batchId,
      });
    }

    // Initialize equipment record if it doesn't exist yet
    if (!equipmentRecords[targetSfi]) {
      equipmentRecords[targetSfi] = {
        sfi: targetSfi,
        name: masterItem ? masterItem.name : (batch.extracted?.equipment_name || targetSfi),
        zone: masterItem ? (masterItem.zone || '') : '',
        comp_location: masterItem ? (masterItem.comp_location || '') : '',
        system_description: masterItem ? (masterItem.system_description || '') : '',
        type: masterItem ? (masterItem.type || '') : '',
        certificate: masterItem ? (masterItem.certificate || '') : '',
        maker: masterItem ? (masterItem.maker || '') : '',
        supplier: masterItem ? (masterItem.supplier || '') : '',
        supplier_add: masterItem ? (masterItem.supplier_add || '') : '',
        tel_no: masterItem ? (masterItem.tel_no || '') : '',
        fax_no: masterItem ? (masterItem.fax_no || '') : '',
        email: masterItem ? (masterItem.email || '') : '',
        raw_row: masterItem ? (masterItem.raw_row || {}) : {},
        photos: [],
        extracted_data: {},
        history: [],
        updated_at: new Date().toISOString(),
      };
    } else if (masterItem) {
      equipmentRecords[targetSfi].name = masterItem.name;
      equipmentRecords[targetSfi].zone = masterItem.zone || '';
      equipmentRecords[targetSfi].comp_location = masterItem.comp_location || '';
      equipmentRecords[targetSfi].system_description = masterItem.system_description || '';
      equipmentRecords[targetSfi].type = masterItem.type || '';
      equipmentRecords[targetSfi].certificate = masterItem.certificate || '';
      equipmentRecords[targetSfi].maker = masterItem.maker || '';
      equipmentRecords[targetSfi].supplier = masterItem.supplier || '';
      equipmentRecords[targetSfi].supplier_add = masterItem.supplier_add || '';
      equipmentRecords[targetSfi].tel_no = masterItem.tel_no || '';
      equipmentRecords[targetSfi].fax_no = masterItem.fax_no || '';
      equipmentRecords[targetSfi].email = masterItem.email || '';
      equipmentRecords[targetSfi].raw_row = masterItem.raw_row || {};
    }

    // Append new photos
    equipmentRecords[targetSfi].photos.push(...movedPhotos);

    // Merge extracted tech specs into equipment profile
    const currentExtracted = equipmentRecords[targetSfi].extracted_data || {};
    const newExtracted = batch.extracted || {};

    const techFields = [
      'dry_weight', 'wet_weight', 'capacity', 'dimension', 'power',
      'pressure', 'rpm', 'voltage', 'hertz', 'ampere', 'series_no',
    ];

    for (const field of techFields) {
      if (newExtracted[field]?.value) {
        // Update field if not already set or if new extraction has value
        currentExtracted[field] = newExtracted[field];
      }
    }

    equipmentRecords[targetSfi].extracted_data = currentExtracted;
    equipmentRecords[targetSfi].history.push({
      timestamp: new Date().toISOString(),
      inspector: req.user!.name,
      action: 'Xác nhận lượt tải ảnh',
      details: `Đã xếp ${movedPhotos.length} ảnh vào SFI ${targetSfi} (Dùng mô hình AI: ${batch.model_used || 'Gemini'})`,
    });
    equipmentRecords[targetSfi].updated_at = new Date().toISOString();

    batch.status = 'resolved';
    batch.assigned_sfi = targetSfi;

    writePendingBatches(batches);
    writeEquipmentRecords(equipmentRecords);

    // Sync equipment record to Firestore if enabled
    if (firestoreDb) {
      try {
        const docRef = firestoreDb.collection('equipment_records').doc(targetSfi.replace(/[^a-zA-Z0-9.]/g, '_'));
        await docRef.set(equipmentRecords[targetSfi], { merge: true });
      } catch (fErr) {
        console.warn('Firestore equipment record sync error:', fErr);
      }
    }

    res.json({
      message: `Đã xếp ${movedPhotos.length} ảnh và lưu thông số vào SFI ${targetSfi} thành công.`,
      batch,
      equipment: equipmentRecords[targetSfi],
    });
  } catch (err: any) {
    console.error('Batch confirm error:', err);
    res.status(500).json({ error: 'Lỗi khi xác nhận ảnh: ' + err.message });
  }
});

// DELETE /api/batches/:batchId - Delete a pending batch that cannot be processed
app.delete('/api/batches/:batchId', authenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { batchId } = req.params;
    let batches = readPendingBatches();
    const batchIndex = batches.findIndex(b => b.batch_id === batchId);

    if (batchIndex === -1) {
      return res.status(404).json({ error: 'Không tìm thấy lượt tải này.' });
    }

    // Remove pending folder for this batch
    const batchPendingDir = path.join(PENDING_DIR, batchId);
    if (fs.existsSync(batchPendingDir)) {
      fs.rmSync(batchPendingDir, { recursive: true, force: true });
    }

    // Remove batch from pending_batches.json
    batches.splice(batchIndex, 1);
    writePendingBatches(batches);

    res.json({ message: `Đã xóa lượt tải ${batchId} khỏi hệ thống.` });
  } catch (err: any) {
    console.error('Batch delete error:', err);
    res.status(500).json({ error: 'Lỗi khi xóa lượt tải: ' + err.message });
  }
});

// GET /api/equipment - Get all equipment records categorized by SFI
app.get('/api/equipment', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const records = readEquipmentRecords();
  const list = Object.values(records);
  res.json({ equipment: list, total: list.length });
});

// PUT /api/equipment/:sfi - Update specific equipment extracted data or specs
app.put('/api/equipment/:sfi', authenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const sfi = req.params.sfi;
    const { extracted_data, zone, comp_location } = req.body;
    const records = readEquipmentRecords();

    if (!records[sfi]) {
      return res.status(404).json({ error: 'Không tìm thấy thiết bị với SFI này.' });
    }

    if (zone !== undefined) records[sfi].zone = zone;
    if (comp_location !== undefined) records[sfi].comp_location = comp_location;
    if (extracted_data !== undefined) records[sfi].extracted_data = extracted_data;

    records[sfi].history.push({
      timestamp: new Date().toISOString(),
      inspector: req.user!.name,
      action: 'Cập nhật thủ công',
      details: 'Chỉnh sửa thông số kỹ thuật thiết bị',
    });
    records[sfi].updated_at = new Date().toISOString();

    writeEquipmentRecords(records);
    res.json({ message: 'Cập nhật thiết bị thành công.', equipment: records[sfi] });
  } catch (err: any) {
    res.status(500).json({ error: 'Lỗi khi cập nhật: ' + err.message });
  }
});

// DELETE /api/equipment/:sfi - Delete equipment record and its photo directory
app.delete('/api/equipment/:sfi', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const sfi = req.params.sfi;
    const records = readEquipmentRecords();

    if (!records[sfi]) {
      return res.status(404).json({ error: 'Không tìm thấy thiết bị với SFI này.' });
    }

    // Remove physical folder for this SFI: uploads/equipment/{sfiFolderName}
    const sfiFolderName = sfi.replace(/[^a-zA-Z0-9.]/g, '_');
    const sfiFolder = path.join(EQUIPMENT_DIR, sfiFolderName);
    if (fs.existsSync(sfiFolder)) {
      fs.rmSync(sfiFolder, { recursive: true, force: true });
    }

    // Remove record from equipment_records.json
    delete records[sfi];
    writeEquipmentRecords(records);

    // Sync deletion to Firestore if enabled
    if (firestoreDb) {
      try {
        const docRef = firestoreDb.collection('equipment_records').doc(sfi.replace(/[^a-zA-Z0-9.]/g, '_'));
        await docRef.delete();
      } catch (fErr) {
        console.warn('Firestore equipment deletion sync warning:', fErr);
      }
    }

    res.json({ message: `Đã xóa thành công thiết bị SFI ${sfi} khỏi hệ thống.` });
  } catch (err: any) {
    console.error('Equipment delete error:', err);
    res.status(500).json({ error: 'Lỗi khi xóa thiết bị: ' + err.message });
  }
});

// POST /api/equipment/transfer-photo - Move photo to another SFI ("Chuyển sang thiết bị khác")
app.post('/api/equipment/transfer-photo', authenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { filename, from_sfi, to_sfi } = req.body;
    if (!filename || !from_sfi || !to_sfi) {
      return res.status(400).json({ error: 'Thiếu thông tin tên file hoặc mã SFI.' });
    }

    const records = readEquipmentRecords();
    if (!records[from_sfi]) {
      return res.status(404).json({ error: 'Không tìm thấy SFI nguồn.' });
    }

    const masterItems = readMasterEquipment();
    const toMaster = masterItems.find(m => normalizeSfi(m.sfi) === normalizeSfi(to_sfi));

    if (!records[to_sfi]) {
      records[to_sfi] = {
        sfi: to_sfi,
        name: toMaster ? toMaster.name : to_sfi,
        zone: toMaster ? (toMaster.zone || '') : '',
        comp_location: toMaster ? (toMaster.comp_location || '') : '',
        photos: [],
        extracted_data: {},
        history: [],
        updated_at: new Date().toISOString(),
      };
    }

    const photoIndex = records[from_sfi].photos.findIndex((p: any) => p.filename === filename);
    if (photoIndex === -1) {
      return res.status(404).json({ error: 'Không tìm thấy ảnh trong SFI nguồn.' });
    }

    const [photoItem] = records[from_sfi].photos.splice(photoIndex, 1);

    // Move physical file
    const oldFolder = path.join(EQUIPMENT_DIR, from_sfi.replace(/[^a-zA-Z0-9.]/g, '_'), 'photos');
    const newFolder = path.join(EQUIPMENT_DIR, to_sfi.replace(/[^a-zA-Z0-9.]/g, '_'), 'photos');
    fs.mkdirSync(newFolder, { recursive: true });

    const oldPath = path.join(oldFolder, filename);
    const newPath = path.join(newFolder, filename);
    if (fs.existsSync(oldPath)) {
      fs.renameSync(oldPath, newPath);
    }

    records[to_sfi].photos.push(photoItem);

    records[from_sfi].history.push({
      timestamp: new Date().toISOString(),
      inspector: req.user!.name,
      action: 'Chuyển ảnh sang SFI khác',
      details: `Chuyển ảnh ${filename} sang SFI ${to_sfi}`,
    });

    records[to_sfi].history.push({
      timestamp: new Date().toISOString(),
      inspector: req.user!.name,
      action: 'Nhận ảnh từ SFI khác',
      details: `Nhận ảnh ${filename} từ SFI ${from_sfi}`,
    });

    writeEquipmentRecords(records);
    res.json({ message: `Đã chuyển ảnh ${filename} sang SFI ${to_sfi} thành công.` });
  } catch (err: any) {
    res.status(500).json({ error: 'Lỗi khi chuyển ảnh: ' + err.message });
  }
});

// GET /api/equipment/export.xlsx - Export complete equipment data table with all 24 columns ("N/A" for empty values)
app.get('/api/equipment/export.xlsx', authenticate, (_req: Request, res: Response) => {
  try {
    const masterItems = readMasterEquipment();
    const records = readEquipmentRecords();

    // Map all master items or confirmed equipment records to the 24 columns
    const allSfis = Array.from(new Set([...masterItems.map(m => m.sfi), ...Object.keys(records)]));

    const rows = allSfis.map(sfi => {
      const master = masterItems.find(m => normalizeSfi(m.sfi) === normalizeSfi(sfi));
      const record = records[sfi] || {};
      const ext = record.extracted_data || {};

      const getValue = (val: any) => (val !== undefined && val !== null && String(val).trim() !== '' ? String(val).trim() : 'N/A');

      const formatField = (fieldKey: string) => {
        const item = ext[fieldKey];
        if (!item || item.value === null || item.value === undefined || String(item.value).trim() === '') return 'N/A';
        return `${item.value}${item.unit_on_plate ? ' ' + item.unit_on_plate : ''}`;
      };

      return {
        'SFI': sfi || 'N/A',
        'DESCRIPTION': getValue(record.name || master?.name),
        'ZONE': getValue(record.zone || master?.zone),
        'COMP. LOCATION': getValue(record.comp_location || master?.comp_location),
        'SYSTEM DESCRIPTION': getValue(record.system_description || master?.system_description),
        'TYPE': getValue(record.type || master?.type),
        'DRY WEIGHT (kg)': formatField('dry_weight'),
        'WET WEIGHT (kg)': formatField('wet_weight'),
        'CAPACITY (m³/h)': formatField('capacity'),
        'DIMENSION (LxWxH)': formatField('dimension'),
        'POWER (Kw)': formatField('power'),
        'PRESSURE (Bar)': formatField('pressure'),
        'RPM (1/min)': formatField('rpm'),
        'VOLTAGE (V)': formatField('voltage'),
        'HERTZ (Hz)': formatField('hertz'),
        'AMPERE (A)': formatField('ampere'),
        'SERIES NO.': formatField('series_no'),
        'CERTIFICATE': getValue(record.certificate || master?.certificate),
        'MAKER': getValue(record.maker || master?.maker),
        'SUPPLIER': getValue(record.supplier || master?.supplier),
        'Supplier Add.': getValue(record.supplier_add || master?.supplier_add),
        'Tel No.': getValue(record.tel_no || master?.tel_no),
        'Fax No.': getValue(record.fax_no || master?.fax_no),
        'Email': getValue(record.email || master?.email),
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Master Equipment Data');

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="MarineTag_AI_Full_Equipment_${timestamp}.xlsx"`);
    res.send(excelBuffer);
  } catch (err: any) {
    res.status(500).json({ error: 'Lỗi khi xuất tệp Excel: ' + err.message });
  }
});

// GET /api/equipment/export-databook.zip - Export databook folder structure: databook/{ZONE}/{SFI}/{photos}
app.get('/api/equipment/export-databook.zip', authenticate, async (_req: Request, res: Response) => {
  try {
    const masterItems = readMasterEquipment();
    const records = readEquipmentRecords();
    const zip = new JSZip();
    const rootFolder = zip.folder('databook');

    if (!rootFolder) {
      throw new Error('Lỗi tạo thư mục gốc databook trong ZIP.');
    }

    const allSfis = Array.from(new Set([...masterItems.map(m => m.sfi), ...Object.keys(records)]));

    for (const sfi of allSfis) {
      const master = masterItems.find(m => normalizeSfi(m.sfi) === normalizeSfi(sfi));
      const record = records[sfi] || {};

      const rawZone = (record.zone || master?.zone || 'Unassigned_Zone').trim();
      const cleanZone = rawZone ? rawZone.replace(/[^a-zA-Z0-9_-]/g, '_') : 'Unassigned_Zone';
      const cleanSfi = sfi.replace(/[^a-zA-Z0-9.-]/g, '_');

      const sfiFolderInZip = rootFolder.folder(cleanZone)?.folder(cleanSfi);

      // Read physical photo files on disk for this SFI
      const sfiFolderNameOnDisk = sfi.replace(/[^a-zA-Z0-9.]/g, '_');
      const photosFolderOnDisk = path.join(EQUIPMENT_DIR, sfiFolderNameOnDisk, 'photos');

      if (fs.existsSync(photosFolderOnDisk) && sfiFolderInZip) {
        const filesOnDisk = fs.readdirSync(photosFolderOnDisk);
        for (const filename of filesOnDisk) {
          const filePath = path.join(photosFolderOnDisk, filename);
          if (fs.statSync(filePath).isFile()) {
            const fileBuffer = fs.readFileSync(filePath);
            sfiFolderInZip.file(filename, fileBuffer);
          }
        }
      }
    }

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="databook_folder_${timestamp}.zip"`);
    res.send(zipBuffer);
  } catch (err: any) {
    console.error('DataBook export error:', err);
    res.status(500).json({ error: 'Lỗi khi tạo thư mục DataBook ZIP: ' + err.message });
  }
});

// API 404 Catch-All Fallback to prevent Vite static middleware from returning 405 Method Not Allowed HTML
app.all('/api/*', (_req: Request, res: Response) => {
  res.status(404).json({ error: 'API endpoint không tồn tại hoặc phương thức không hợp lệ.' });
});

// Start Server
async function startServer() {
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve('dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MarineTag AI SFI server running on port ${PORT}`);
  });
}

startServer();
