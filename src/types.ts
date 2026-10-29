export interface FieldExtraction {
  value: string | null;
  unit_on_plate: string | null;
  source_photo: string | null;
  confidence: 'high' | 'medium' | 'low';
}

export interface EquipmentMasterItem {
  sfi: string; // Stored strictly as string
  name: string; // DESCRIPTION in master table
  zone?: string;
  comp_location?: string;
  system_description?: string;
  type?: string;
  certificate?: string;
  maker?: string;
  supplier?: string;
  supplier_add?: string;
  tel_no?: string;
  fax_no?: string;
  email?: string;
  raw_row?: Record<string, any>;
  [key: string]: any;
}

export interface NameplateExtractedData {
  sfi: string | null;
  equipment_name: string | null;
  dry_weight: FieldExtraction;
  wet_weight: FieldExtraction;
  capacity: FieldExtraction;
  dimension: FieldExtraction;
  power: FieldExtraction;
  pressure: FieldExtraction;
  rpm: FieldExtraction;
  voltage: FieldExtraction;
  hertz: FieldExtraction;
  ampere: FieldExtraction;
  series_no: FieldExtraction;
  other_sfi_seen: string[];
  notes: string | null;
}

export interface BatchPhotoItem {
  id: string;
  filename: string;
  original_name: string;
  url: string;
}

export interface PendingBatch {
  batch_id: string;
  created_at: string;
  inspector: string;
  photos: BatchPhotoItem[];
  extracted: NameplateExtractedData; // 1 single unified extraction result for the whole batch
  status: 'pending_review' | 'resolved';
  match_type: 'exact' | 'name_mismatch' | 'unknown' | 'no_sfi';
  matched_master?: EquipmentMasterItem | null;
  suggested_masters?: EquipmentMasterItem[];
  assigned_sfi?: string;
  model_used?: string;
}

export interface MasterEquipmentRecord {
  sfi: string;
  name: string;
  zone: string;
  comp_location: string;
  system_description?: string;
  type?: string;
  certificate?: string;
  maker?: string;
  supplier?: string;
  supplier_add?: string;
  tel_no?: string;
  fax_no?: string;
  email?: string;
  photos: {
    filename: string;
    url: string;
    uploaded_at: string;
    batch_id: string;
  }[];
  extracted_data: Partial<NameplateExtractedData>;
  history: {
    timestamp: string;
    inspector: string;
    action: string;
    details: string;
  }[];
  updated_at: string;
}

export interface AuthorizedInspector {
  email: string;
  display_name: string;
  employee_id: string;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  employee_id?: string | null;
  photoURL: string | null;
  isAllowed: boolean;
}
