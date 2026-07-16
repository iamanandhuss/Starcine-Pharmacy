import React, { useState, useMemo } from 'react';
import {
  FolderOpen, Search, Upload, Eye, Download, Trash2,
  AlertTriangle, Shield, ShieldAlert, Globe, Lock,
  FileText, FileSpreadsheet, FileImage, File,
  CalendarDays, User, Tag, LayoutGrid, List, AlertCircle,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Toast } from '../../components/ui/Toast';

// ─── Types ────────────────────────────────────────────────────────────────────

type DocCategory =
  | 'All Documents'
  | 'Licenses & Certifications'
  | 'Prescriptions'
  | 'Insurance & Claims'
  | 'Staff Records'
  | 'Compliance & Audits'
  | 'Supplier Contracts';

type Permission = 'Public' | 'Admin Only' | 'Restricted';
type FileType = 'pdf' | 'xlsx' | 'docx' | 'jpg' | 'png' | 'other';

interface Document {
  id: string;
  name: string;
  category: Exclude<DocCategory, 'All Documents'>;
  fileType: FileType;
  size: string;
  uploadedBy: string;
  uploadDate: string;
  expiryDate: string | null;
  permission: Permission;
  tags: string[];
  description: string;
}

// ─── Seed Data ────────────────────────────────────────────────────────────────

const SEED_DOCUMENTS: Document[] = [
  {
    id: 'd1', name: 'Pharmacist License — Alex Mercer.pdf', category: 'Licenses & Certifications',
    fileType: 'pdf', size: '512 KB', uploadedBy: 'Alex Mercer', uploadDate: '2026-01-15',
    expiryDate: '2026-07-31', permission: 'Admin Only', tags: ['license', 'pharmacist'],
    description: 'State Board of Pharmacy individual practitioner license for Alex Mercer, valid until July 2026.',
  },
  {
    id: 'd2', name: 'Pharmacy Operating License 2026.pdf', category: 'Licenses & Certifications',
    fileType: 'pdf', size: '1.2 MB', uploadedBy: 'Admin', uploadDate: '2026-01-02',
    expiryDate: '2026-12-31', permission: 'Admin Only', tags: ['license', 'operating', 'DEA'],
    description: 'Annual pharmacy operating license issued by the State Board of Pharmacy.',
  },
  {
    id: 'd3', name: 'DEA Schedule II Permit.pdf', category: 'Licenses & Certifications',
    fileType: 'pdf', size: '320 KB', uploadedBy: 'Admin', uploadDate: '2025-06-01',
    expiryDate: '2026-07-15', permission: 'Admin Only', tags: ['DEA', 'controlled substances'],
    description: 'DEA registration permit for handling Schedule II controlled substances.',
  },
  {
    id: 'd4', name: 'Controlled Substances Audit Report — July 2026.xlsx', category: 'Compliance & Audits',
    fileType: 'xlsx', size: '88 KB', uploadedBy: 'Jessica K.', uploadDate: '2026-07-10',
    expiryDate: null, permission: 'Admin Only', tags: ['audit', 'DEA', 'compliance'],
    description: 'Monthly DEA-mandated audit of all Schedule II-V medication counts for July 2026.',
  },
  {
    id: 'd5', name: 'Insurance Claim Batch — June 2026.csv', category: 'Insurance & Claims',
    fileType: 'xlsx', size: '54 KB', uploadedBy: 'Sarah Thomas', uploadDate: '2026-07-01',
    expiryDate: null, permission: 'Restricted', tags: ['insurance', 'claims', 'billing'],
    description: 'Exported rejected insurance claim records from June 2026 billing cycle.',
  },
  {
    id: 'd6', name: 'Supplier Agreement — MedSupply Co.docx', category: 'Supplier Contracts',
    fileType: 'docx', size: '224 KB', uploadedBy: 'Admin', uploadDate: '2025-10-01',
    expiryDate: '2026-09-30', permission: 'Admin Only', tags: ['supplier', 'contract', 'MedSupply'],
    description: 'Annual supply agreement with MedSupply Co. covering generic medications and consumables.',
  },
  {
    id: 'd7', name: 'Staff Training Completion Records — Q2 2026.xlsx', category: 'Staff Records',
    fileType: 'xlsx', size: '140 KB', uploadedBy: 'Alex Mercer', uploadDate: '2026-06-30',
    expiryDate: null, permission: 'Public', tags: ['training', 'staff', 'OSHA'],
    description: 'Q2 OSHA and pharmacy safety training completion records for all staff members.',
  },
  {
    id: 'd8', name: 'Cold Chain Temperature Log — June 2026.xlsx', category: 'Compliance & Audits',
    fileType: 'xlsx', size: '76 KB', uploadedBy: 'David Lee', uploadDate: '2026-07-01',
    expiryDate: null, permission: 'Restricted', tags: ['cold chain', 'insulin', 'temperature'],
    description: 'Refrigeration temperature logs for all insulin and biologics stored in June 2026.',
  },
  {
    id: 'd9', name: 'Patient Counseling Session Notes — July 9.pdf', category: 'Prescriptions',
    fileType: 'pdf', size: '210 KB', uploadedBy: 'Jessica K.', uploadDate: '2026-07-09',
    expiryDate: null, permission: 'Restricted', tags: ['counseling', 'diabetes', 'patient'],
    description: 'Group counseling session notes for newly diagnosed diabetes patients. Follow-up July 23.',
  },
  {
    id: 'd10', name: 'Pharmacy Floor Layout Plan.jpg', category: 'Compliance & Audits',
    fileType: 'jpg', size: '3.4 MB', uploadedBy: 'Admin', uploadDate: '2025-03-15',
    expiryDate: null, permission: 'Public', tags: ['layout', 'floor plan', 'safety'],
    description: 'Updated pharmacy floor layout including emergency exit markings and storage zones.',
  },
  {
    id: 'd11', name: 'Technician Certification — Sarah Thomas.pdf', category: 'Licenses & Certifications',
    fileType: 'pdf', size: '390 KB', uploadedBy: 'Sarah Thomas', uploadDate: '2025-09-10',
    expiryDate: '2027-09-10', permission: 'Admin Only', tags: ['certification', 'technician'],
    description: 'National Pharmacy Technician Certification Board (PTCB) certificate for Sarah Thomas.',
  },
  {
    id: 'd12', name: 'Supplier Invoice — PharmWholesale July.pdf', category: 'Supplier Contracts',
    fileType: 'pdf', size: '188 KB', uploadedBy: 'Admin', uploadDate: '2026-07-05',
    expiryDate: null, permission: 'Admin Only', tags: ['invoice', 'supplier', 'billing'],
    description: 'Monthly wholesale purchase invoice from PharmWholesale Inc. for July 2026.',
  },
];

const CATEGORIES: DocCategory[] = [
  'All Documents', 'Licenses & Certifications', 'Prescriptions',
  'Insurance & Claims', 'Staff Records', 'Compliance & Audits', 'Supplier Contracts',
];

const CATEGORY_ICONS: Record<DocCategory, React.ReactNode> = {
  'All Documents':           <FolderOpen className="h-4 w-4" />,
  'Licenses & Certifications': <Shield className="h-4 w-4" />,
  'Prescriptions':           <FileText className="h-4 w-4" />,
  'Insurance & Claims':      <FileSpreadsheet className="h-4 w-4" />,
  'Staff Records':           <User className="h-4 w-4" />,
  'Compliance & Audits':     <ShieldAlert className="h-4 w-4" />,
  'Supplier Contracts':      <File className="h-4 w-4" />,
};

const PERMISSION_CONFIG: Record<Permission, { icon: React.ReactNode; color: string }> = {
  'Public':     { icon: <Globe className="h-3 w-3" />,      color: 'bg-green-500/10 text-green-600 border-green-500/20' },
  'Admin Only': { icon: <Lock className="h-3 w-3" />,       color: 'bg-red-500/10 text-red-600 border-red-500/20' },
  'Restricted': { icon: <ShieldAlert className="h-3 w-3" />, color: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
};

const FILE_ICON: Record<FileType, React.ReactNode> = {
  pdf:   <FileText className="h-8 w-8 text-red-500" />,
  xlsx:  <FileSpreadsheet className="h-8 w-8 text-green-600" />,
  docx:  <FileText className="h-8 w-8 text-brand-500" />,
  jpg:   <FileImage className="h-8 w-8 text-purple-500" />,
  png:   <FileImage className="h-8 w-8 text-purple-500" />,
  other: <File className="h-8 w-8 text-dark-400" />,
};

const FILE_BG: Record<FileType, string> = {
  pdf: 'bg-red-50 dark:bg-red-950/20', xlsx: 'bg-green-50 dark:bg-green-950/20',
  docx: 'bg-brand-50 dark:bg-brand-950/20', jpg: 'bg-purple-50 dark:bg-purple-950/20',
  png: 'bg-purple-50 dark:bg-purple-950/20', other: 'bg-dark-100 dark:bg-dark-800',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getDaysUntilExpiry = (expiryDate: string | null): number | null => {
  if (!expiryDate) return null;
  const diff = new Date(expiryDate).getTime() - new Date().getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

const getExpiryLabel = (days: number | null) => {
  if (days === null) return null;
  if (days < 0) return { text: 'Expired', color: 'text-red-600 bg-red-500/10 border-red-500/20' };
  if (days <= 30) return { text: `Expires in ${days}d`, color: 'text-yellow-600 bg-yellow-500/10 border-yellow-500/20' };
  return { text: `Expires ${new Date(new Date().setDate(new Date().getDate() + days)).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`, color: 'text-dark-500 bg-dark-100 dark:bg-dark-800 border-dark-200 dark:border-dark-700' };
};

// ─── Upload Zod Schema ────────────────────────────────────────────────────────

const uploadSchema = z.object({
  name: z.string().min(3, 'Document name must be at least 3 characters'),
  category: z.enum([
    'Licenses & Certifications', 'Prescriptions', 'Insurance & Claims',
    'Staff Records', 'Compliance & Audits', 'Supplier Contracts',
  ]),
  permission: z.enum(['Public', 'Admin Only', 'Restricted']),
  description: z.string().optional(),
  expiryDate: z.string().optional(),
  tags: z.string().optional(),
});
type UploadFormValues = z.infer<typeof uploadSchema>;

// ─── Main Component ───────────────────────────────────────────────────────────

export const DocumentManager: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>(SEED_DOCUMENTS);
  const [activeCategory, setActiveCategory] = useState<DocCategory>('All Documents');
  const [search, setSearch] = useState('');
  const [filterPermission, setFilterPermission] = useState<string>('All');
  const [filterExpiry, setFilterExpiry] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
  const [deleteDoc, setDeleteDoc] = useState<Document | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const [toasts, setToasts] = useState<{ id: number; message: string; type: 'success' | 'info' }[]>([]);

  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    const id = Date.now();
    setToasts((p) => [...p, { id, message, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3500);
  };

  // Upload form
  const { register, handleSubmit, formState: { errors }, reset } = useForm<UploadFormValues>({
    resolver: zodResolver(uploadSchema),
    defaultValues: { category: 'Compliance & Audits', permission: 'Public' },
  });

  const onUpload = (values: UploadFormValues) => {
    const ext = values.name.split('.').pop()?.toLowerCase() as FileType || 'other';
    const validExts: FileType[] = ['pdf', 'xlsx', 'docx', 'jpg', 'png'];
    const newDoc: Document = {
      id: `d${Date.now()}`,
      name: values.name,
      category: values.category as Exclude<DocCategory, 'All Documents'>,
      fileType: validExts.includes(ext) ? ext : 'other',
      size: `${(Math.random() * 900 + 100).toFixed(0)} KB`,
      uploadedBy: 'You',
      uploadDate: new Date().toISOString().split('T')[0],
      expiryDate: values.expiryDate || null,
      permission: values.permission,
      tags: values.tags ? values.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      description: values.description || '',
    };
    setDocuments((p) => [newDoc, ...p]);
    showToast(`"${values.name}" uploaded successfully.`);
    reset();
    setIsUploadOpen(false);
  };

  const handleDelete = () => {
    if (!deleteDoc) return;
    setDocuments((p) => p.filter((d) => d.id !== deleteDoc.id));
    showToast(`"${deleteDoc.name}" deleted.`, 'info');
    setDeleteDoc(null);
  };

  const handleDownload = (doc: Document) => {
    showToast(`Downloading "${doc.name}"...`, 'info');
  };

  // Expiry reminder docs (expiring within 30 days or already expired)
  const expiryAlerts = useMemo(() =>
    documents.filter((d) => {
      const days = getDaysUntilExpiry(d.expiryDate);
      return days !== null && days <= 30;
    }),
    [documents]
  );

  // Filtered documents
  const filtered = useMemo(() => {
    return documents.filter((doc) => {
      const matchCat = activeCategory === 'All Documents' || doc.category === activeCategory;
      const q = search.toLowerCase();
      const matchSearch = doc.name.toLowerCase().includes(q) ||
        doc.uploadedBy.toLowerCase().includes(q) ||
        doc.tags.some((t) => t.toLowerCase().includes(q));
      const matchPerm = filterPermission === 'All' || doc.permission === filterPermission;
      const days = getDaysUntilExpiry(doc.expiryDate);
      const matchExpiry =
        filterExpiry === 'All' ||
        (filterExpiry === 'Expiring Soon' && days !== null && days >= 0 && days <= 30) ||
        (filterExpiry === 'Expired' && days !== null && days < 0) ||
        (filterExpiry === 'No Expiry' && days === null);
      return matchCat && matchSearch && matchPerm && matchExpiry;
    });
  }, [documents, activeCategory, search, filterPermission, filterExpiry]);

  // Category counts
  const catCount = (cat: DocCategory) =>
    cat === 'All Documents' ? documents.length : documents.filter((d) => d.category === cat).length;

  // ─── Document Card ──────────────────────────────────────────────────────────

  const DocCard: React.FC<{ doc: Document }> = ({ doc }) => {
    const days = getDaysUntilExpiry(doc.expiryDate);
    const expLabel = getExpiryLabel(days);
    const pCfg = PERMISSION_CONFIG[doc.permission];

    return (
      <div className="group bg-white dark:bg-dark-900 border border-dark-100 dark:border-dark-800 rounded-xl overflow-hidden hover:border-brand-400 dark:hover:border-brand-600 hover:shadow-lg transition-all duration-200 flex flex-col">
        {/* File type header */}
        <div className={`flex items-center justify-center py-6 ${FILE_BG[doc.fileType]}`}>
          {FILE_ICON[doc.fileType]}
        </div>

        {/* Content */}
        <div className="p-4 flex flex-col gap-2 flex-1">
          <p className="text-xs font-extrabold text-dark-900 dark:text-white leading-snug line-clamp-2" title={doc.name}>
            {doc.name}
          </p>

          {/* Permission + Expiry */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border ${pCfg.color}`}>
              {pCfg.icon} {doc.permission}
            </span>
            {expLabel && (
              <span className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border ${expLabel.color}`}>
                {expLabel.text}
              </span>
            )}
          </div>

          {/* Meta info */}
          <div className="flex items-center gap-3 text-[10px] text-dark-400 dark:text-dark-500 font-semibold">
            <span>{doc.size}</span>
            <span>•</span>
            <span>{doc.uploadedBy.split(' ')[0]}</span>
            <span>•</span>
            <span>{new Date(doc.uploadDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
          </div>

          {/* Tags */}
          {doc.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-auto pt-1">
              {doc.tags.slice(0, 3).map((tag) => (
                <span key={tag} className="text-[8px] font-bold uppercase tracking-wide bg-dark-100 dark:bg-dark-800 text-dark-500 dark:text-dark-400 px-1.5 py-0.5 rounded">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-4 pb-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="outline" size="sm" className="flex-1 text-[10px]"
            onClick={() => setPreviewDoc(doc)}
            leftIcon={<Eye className="h-3.5 w-3.5" />}>
            Preview
          </Button>
          <Button variant="primary" size="sm" className="flex-1 text-[10px]"
            onClick={() => handleDownload(doc)}
            leftIcon={<Download className="h-3.5 w-3.5" />}>
            Download
          </Button>
          <Button variant="ghost" size="sm"
            onClick={() => setDeleteDoc(doc)}
            className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded"
            leftIcon={<Trash2 className="h-3.5 w-3.5" />} />
        </div>
      </div>
    );
  };

  // ─── Document List Row ──────────────────────────────────────────────────────

  const DocRow: React.FC<{ doc: Document }> = ({ doc }) => {
    const days = getDaysUntilExpiry(doc.expiryDate);
    const expLabel = getExpiryLabel(days);
    const pCfg = PERMISSION_CONFIG[doc.permission];

    return (
      <tr className="hover:bg-dark-50/20 dark:hover:bg-dark-900/20 transition-colors">
        {/* Name + icon */}
        <td className="py-3.5 px-5">
          <div className="flex items-center gap-3">
            <div className={`p-1.5 rounded-lg ${FILE_BG[doc.fileType]}`}>
              <span className="[&>svg]:h-4 [&>svg]:w-4">{FILE_ICON[doc.fileType]}</span>
            </div>
            <div>
              <p className="text-xs font-bold text-dark-900 dark:text-white max-w-xs truncate">{doc.name}</p>
              <p className="text-[9px] text-dark-400 font-semibold">{doc.category}</p>
            </div>
          </div>
        </td>
        {/* Permission */}
        <td className="py-3.5 px-4">
          <span className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${pCfg.color}`}>
            {pCfg.icon} {doc.permission}
          </span>
        </td>
        {/* Expiry */}
        <td className="py-3.5 px-4">
          {expLabel ? (
            <span className={`inline-flex items-center text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${expLabel.color}`}>
              {expLabel.text}
            </span>
          ) : (
            <span className="text-[10px] text-dark-400">No Expiry</span>
          )}
        </td>
        {/* Uploaded by + Date */}
        <td className="py-3.5 px-4">
          <p className="text-xs font-semibold text-dark-700 dark:text-dark-200">{doc.uploadedBy}</p>
          <p className="text-[10px] text-dark-400">{new Date(doc.uploadDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
        </td>
        {/* Size */}
        <td className="py-3.5 px-4 text-[10px] font-mono font-bold text-dark-500 dark:text-dark-400">{doc.size}</td>
        {/* Actions */}
        <td className="py-3.5 px-5 text-right">
          <div className="flex items-center justify-end gap-1">
            <Button variant="ghost" size="sm" onClick={() => setPreviewDoc(doc)}
              className="p-1.5 text-dark-500 hover:bg-dark-50 rounded" leftIcon={<Eye className="h-3.5 w-3.5" />} />
            <Button variant="ghost" size="sm" onClick={() => handleDownload(doc)}
              className="p-1.5 text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/20 rounded" leftIcon={<Download className="h-3.5 w-3.5" />} />
            <Button variant="ghost" size="sm" onClick={() => setDeleteDoc(doc)}
              className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded" leftIcon={<Trash2 className="h-3.5 w-3.5" />} />
          </div>
        </td>
      </tr>
    );
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 pb-10">
      {/* Toasts */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm">
        {toasts.map((t) => (
          <Toast key={t.id} message={t.message} type={t.type} onClose={() => setToasts((p) => p.filter((x) => x.id !== t.id))} />
        ))}
      </div>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-brand-600 p-2.5 rounded-xl text-white">
            <FolderOpen className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-dark-900 dark:text-white">Document Management</h2>
            <p className="text-xs text-dark-500 dark:text-dark-400">
              Store, manage, and control access to all pharmacy documents.
            </p>
          </div>
        </div>
        <Button variant="primary" size="sm" onClick={() => setIsUploadOpen(true)} leftIcon={<Upload className="h-4 w-4" />}>
          Upload Document
        </Button>
      </div>

      {/* Expiry Alert Banner */}
      {expiryAlerts.length > 0 && (
        <div className="flex items-start gap-3 p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-300 dark:border-yellow-800 rounded-xl">
          <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-yellow-800 dark:text-yellow-400">
              {expiryAlerts.length} document{expiryAlerts.length > 1 ? 's' : ''} expiring soon or already expired
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              {expiryAlerts.map((d) => {
                const days = getDaysUntilExpiry(d.expiryDate);
                return (
                  <button
                    key={d.id}
                    onClick={() => setPreviewDoc(d)}
                    className="text-[10px] font-bold bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border border-yellow-300 dark:border-yellow-700 px-2 py-0.5 rounded-full hover:bg-yellow-200 dark:hover:bg-yellow-900/50 transition-colors"
                  >
                    {d.name.split('.')[0].slice(0, 28)}… ({days !== null && days < 0 ? 'Expired' : `${days}d left`})
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Main layout: sidebar + content */}
      <div className="flex flex-col lg:flex-row gap-6">

        {/* Left: Folder Sidebar */}
        <div className="lg:w-60 shrink-0">
          <Card>
            <Card.Content className="p-3">
              <p className="text-[10px] font-extrabold text-dark-400 uppercase tracking-widest px-2 py-1.5">Folders</p>
              <div className="space-y-0.5">
                {CATEGORIES.map((cat) => {
                  const isActive = activeCategory === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-lg text-left transition-all duration-150 text-xs font-semibold ${
                        isActive
                          ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400'
                          : 'text-dark-600 dark:text-dark-400 hover:bg-dark-50 dark:hover:bg-dark-800 hover:text-dark-900 dark:hover:text-white'
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <span className={isActive ? 'text-brand-500' : 'text-dark-400'}>{CATEGORY_ICONS[cat]}</span>
                        <span className="leading-tight">{cat}</span>
                      </span>
                      <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full min-w-[20px] text-center ${
                        isActive
                          ? 'bg-brand-500/20 text-brand-600 dark:text-brand-400'
                          : 'bg-dark-100 dark:bg-dark-800 text-dark-500'
                      }`}>
                        {catCount(cat)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </Card.Content>
          </Card>

          {/* Storage summary */}
          <Card className="mt-4">
            <Card.Content className="p-4 space-y-3">
              <p className="text-[10px] font-extrabold text-dark-400 uppercase tracking-widest">Storage Usage</p>
              <div>
                <div className="flex justify-between text-xs font-bold mb-1.5">
                  <span className="text-dark-700 dark:text-dark-200">Used</span>
                  <span className="text-brand-600">6.2 GB / 20 GB</span>
                </div>
                <div className="h-2 bg-dark-100 dark:bg-dark-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-brand-500 to-purple-500 rounded-full" style={{ width: '31%' }} />
                </div>
                <p className="text-[10px] text-dark-400 mt-1.5">31% of total quota used</p>
              </div>
            </Card.Content>
          </Card>
        </div>

        {/* Right: Content area */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* Search + filters bar */}
          <div className="flex flex-col md:flex-row gap-3 items-center">
            <div className="w-full md:flex-1 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-dark-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search documents, tags, uploader..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full text-xs py-2.5 pl-10 pr-4 bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-800 rounded-full text-dark-900 dark:text-dark-50 focus:outline-none focus:ring-1 focus:ring-brand-500 transition-all"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Permission filter */}
              <select
                value={filterPermission}
                onChange={(e) => setFilterPermission(e.target.value)}
                className="text-xs py-2 px-3 bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-800 rounded-lg text-dark-700 dark:text-dark-200 focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer"
              >
                <option value="All">All Permissions</option>
                <option value="Public">Public</option>
                <option value="Admin Only">Admin Only</option>
                <option value="Restricted">Restricted</option>
              </select>

              {/* Expiry filter */}
              <select
                value={filterExpiry}
                onChange={(e) => setFilterExpiry(e.target.value)}
                className="text-xs py-2 px-3 bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-800 rounded-lg text-dark-700 dark:text-dark-200 focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer"
              >
                <option value="All">All Expiry</option>
                <option value="Expiring Soon">Expiring Soon</option>
                <option value="Expired">Expired</option>
                <option value="No Expiry">No Expiry</option>
              </select>

              {/* View toggle */}
              <div className="flex gap-1 bg-dark-100 dark:bg-dark-800 rounded-lg p-0.5">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-dark-700 shadow text-brand-600' : 'text-dark-400'}`}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded transition-all ${viewMode === 'list' ? 'bg-white dark:bg-dark-700 shadow text-brand-600' : 'text-dark-400'}`}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Result count */}
          <p className="text-xs text-dark-400 font-semibold">
            {filtered.length} document{filtered.length !== 1 ? 's' : ''} in{' '}
            <span className="text-dark-700 dark:text-dark-200 font-bold">{activeCategory}</span>
          </p>

          {/* Grid View */}
          {viewMode === 'grid' && (
            filtered.length === 0 ? (
              <div className="text-center py-16 text-dark-400">
                <FolderOpen className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-bold">No documents found</p>
                <p className="text-xs mt-1">Try adjusting the search or filters.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {filtered.map((doc) => <DocCard key={doc.id} doc={doc} />)}
              </div>
            )
          )}

          {/* List View */}
          {viewMode === 'list' && (
            <Card>
              <Card.Content className="p-0 overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-dark-50/50 dark:bg-dark-900/50 border-b border-dark-100 dark:border-dark-800 text-[10px] font-bold text-dark-500 uppercase tracking-wider">
                      <th className="py-3 px-5">Document</th>
                      <th className="py-3 px-4">Permission</th>
                      <th className="py-3 px-4">Expiry</th>
                      <th className="py-3 px-4">Uploaded By</th>
                      <th className="py-3 px-4">Size</th>
                      <th className="py-3 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-100 dark:divide-dark-800 text-xs">
                    {filtered.length === 0 ? (
                      <tr><td colSpan={6} className="py-8 text-center text-dark-400">No documents match the current filters.</td></tr>
                    ) : (
                      filtered.map((doc) => <DocRow key={doc.id} doc={doc} />)
                    )}
                  </tbody>
                </table>
              </Card.Content>
            </Card>
          )}
        </div>
      </div>

      {/* ── Upload Modal ─────────────────────────────────────────────────────── */}
      <Modal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        title="Upload New Document"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsUploadOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSubmit(onUpload)} leftIcon={<Upload className="h-4 w-4" />}>
              Upload Document
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit(onUpload)} className="space-y-4" noValidate>
          {/* Simulated file picker */}
          <div className="border-2 border-dashed border-brand-300 dark:border-brand-800 rounded-xl p-6 text-center bg-brand-50/30 dark:bg-brand-950/10 cursor-pointer hover:bg-brand-50/60 transition-colors">
            <Upload className="h-8 w-8 text-brand-400 mx-auto mb-2" />
            <p className="text-xs font-bold text-dark-700 dark:text-dark-200">Click to select a file</p>
            <p className="text-[10px] text-dark-400 mt-1">PDF, XLSX, DOCX, JPG, PNG — max 50 MB</p>
          </div>

          <Input
            label="Document Name (with extension)"
            placeholder="e.g. Staff_License_2026.pdf"
            error={errors.name?.message}
            {...register('name')}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-dark-500 uppercase tracking-wide">Category</label>
              <select className="w-full text-sm py-2.5 px-4 bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-800 rounded-lg text-dark-900 dark:text-dark-50 focus:outline-none focus:ring-2 focus:ring-brand-500/20" {...register('category')}>
                {CATEGORIES.filter((c) => c !== 'All Documents').map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-dark-500 uppercase tracking-wide">Access Permission</label>
              <select className="w-full text-sm py-2.5 px-4 bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-800 rounded-lg text-dark-900 dark:text-dark-50 focus:outline-none focus:ring-2 focus:ring-brand-500/20" {...register('permission')}>
                <option>Public</option>
                <option>Admin Only</option>
                <option>Restricted</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-dark-500 uppercase tracking-wide">
              Expiry Date <span className="text-dark-400 normal-case font-normal">(optional)</span>
            </label>
            <input
              type="date"
              className="w-full text-sm py-2.5 px-4 bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-800 rounded-lg text-dark-900 dark:text-dark-50 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              {...register('expiryDate')}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-dark-500 uppercase tracking-wide">
              Tags <span className="text-dark-400 normal-case font-normal">(comma separated)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. license, DEA, compliance"
              className="w-full text-sm py-2.5 px-4 bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-800 rounded-lg text-dark-900 dark:text-dark-50 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              {...register('tags')}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-dark-500 uppercase tracking-wide">
              Description <span className="text-dark-400 normal-case font-normal">(optional)</span>
            </label>
            <textarea
              rows={2}
              placeholder="Brief document description..."
              className="w-full text-sm py-2.5 px-4 bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-800 rounded-lg text-dark-900 dark:text-dark-50 focus:outline-none focus:ring-2 focus:ring-brand-500/20 resize-none"
              {...register('description')}
            />
          </div>
        </form>
      </Modal>

      {/* ── Preview Modal ─────────────────────────────────────────────────────── */}
      <Modal
        isOpen={!!previewDoc}
        onClose={() => setPreviewDoc(null)}
        title="Document Preview"
        footer={
          <>
            <Button variant="outline" onClick={() => setPreviewDoc(null)}>Close</Button>
            <Button variant="primary" onClick={() => { if (previewDoc) handleDownload(previewDoc); setPreviewDoc(null); }}
              leftIcon={<Download className="h-4 w-4" />}>
              Download
            </Button>
          </>
        }
      >
        {previewDoc && (() => {
          const days = getDaysUntilExpiry(previewDoc.expiryDate);
          const expLabel = getExpiryLabel(days);
          const pCfg = PERMISSION_CONFIG[previewDoc.permission];
          return (
            <div className="space-y-5">
              {/* Preview area */}
              <div className={`flex flex-col items-center justify-center py-10 rounded-xl ${FILE_BG[previewDoc.fileType]}`}>
                {FILE_ICON[previewDoc.fileType]}
                <p className="text-xs font-bold text-dark-600 dark:text-dark-300 mt-3 text-center px-4">{previewDoc.name}</p>
                <p className="text-[10px] text-dark-400 mt-1">Preview not available — download to view</p>
              </div>

              {/* Metadata grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                {[
                  { label: 'Category', value: previewDoc.category },
                  { label: 'File Size', value: previewDoc.size },
                  { label: 'Uploaded By', value: previewDoc.uploadedBy },
                  { label: 'Upload Date', value: new Date(previewDoc.uploadDate).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) },
                ].map(({ label, value }) => (
                  <div key={label} className="p-3 bg-dark-50 dark:bg-dark-800 rounded-lg border border-dark-150 dark:border-dark-700">
                    <p className="text-[9px] font-bold text-dark-400 uppercase tracking-wide pb-1">{label}</p>
                    <p className="font-bold text-dark-800 dark:text-dark-200">{value}</p>
                  </div>
                ))}
              </div>

              {/* Expiry + permission row */}
              <div className="flex flex-wrap gap-2">
                <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border ${pCfg.color}`}>
                  {pCfg.icon} {previewDoc.permission}
                </span>
                {expLabel && (
                  <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border ${expLabel.color}`}>
                    <CalendarDays className="h-3.5 w-3.5" /> {previewDoc.expiryDate}
                  </span>
                )}
              </div>

              {/* Description */}
              {previewDoc.description && (
                <div className="p-3 bg-dark-50 dark:bg-dark-800 rounded-lg border border-dark-150 dark:border-dark-700">
                  <p className="text-[9px] font-bold text-dark-400 uppercase tracking-wide pb-1">Description</p>
                  <p className="text-xs text-dark-600 dark:text-dark-350 leading-relaxed">{previewDoc.description}</p>
                </div>
              )}

              {/* Tags */}
              {previewDoc.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {previewDoc.tags.map((tag) => (
                    <span key={tag} className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide bg-dark-100 dark:bg-dark-800 text-dark-500 dark:text-dark-400 px-2 py-0.5 rounded">
                      <Tag className="h-2.5 w-2.5" />{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })()}
      </Modal>

      {/* ── Delete Confirmation ───────────────────────────────────────────────── */}
      <Modal
        isOpen={!!deleteDoc}
        onClose={() => setDeleteDoc(null)}
        title="Delete Document"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteDoc(null)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete} leftIcon={<Trash2 className="h-4 w-4" />}>
              Delete Permanently
            </Button>
          </>
        }
      >
        <div className="flex items-start gap-3">
          <div className="p-2 bg-red-100 dark:bg-red-950/30 text-red-600 rounded-lg shrink-0">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div className="space-y-1.5">
            <p className="text-sm font-bold text-dark-900 dark:text-white">Are you sure?</p>
            <p className="text-xs text-dark-500 leading-relaxed">
              You are about to permanently delete{' '}
              <span className="font-extrabold text-dark-800 dark:text-dark-200">"{deleteDoc?.name}"</span>.
              This action cannot be undone.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
};
