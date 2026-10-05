import toast from 'react-hot-toast';
import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useConfirm } from '../../contexts/ConfirmContext';
import api from '../../services/api';
import { departmentNames, formatDate } from '../../utils/helpers';
import {
  Folder, FolderOpen, Plus, Search, FileText, Trash2, X, ExternalLink,
  FileSpreadsheet, FileImage, FileArchive, Users, Layers, Upload, Lock,
  CheckCircle2, XCircle, Clock, ChevronDown, ChevronRight, Edit3, Eye, Download
} from 'lucide-react';

const defaultFolders = ['Văn bản nội bộ', 'HỒ SƠ NHÂN SỰ', 'Báo cáo Marketing', 'Thông báo công ty', 'Quy trình các Phòng/Ban', 'Biểu mẫu'];

const emptyForm = {
  name: '',
  fileUrl: '',
  file: null,
  fileType: 'text',
  fileSize: '0 KB',
  folder: 'Văn bản nội bộ',
  description: '',
  content: '',
  visibility: 'shared',
  departments: ['all']
};

const fileTypeConfig = {
  pdf: { label: 'PDF', icon: FileText, color: '#EF4444' },
  doc: { label: 'Word', icon: FileText, color: '#3B82F6' },
  excel: { label: 'Excel', icon: FileSpreadsheet, color: '#22C55E' },
  image: { label: 'Hình ảnh', icon: FileImage, color: '#A855F7' },
  marketing_report: { label: 'Marketing Report', icon: FileSpreadsheet, color: '#F97316' },
  text: { label: 'Văn bản', icon: FileText, color: '#06B6D4' },
  other: { label: 'Khác', icon: FileArchive, color: '#64748B' }
};

const normalizeDepartments = (doc) => {
  if (Array.isArray(doc.departments) && doc.departments.length) return doc.departments;
  return [doc.department || 'all'];
};

const folderAliases = {
  'Quy trình nội bộ': 'Văn bản nội bộ',
  'Tài liệu chung': 'Văn bản nội bộ'
};

const normalizeFolderPath = (folder = 'Văn bản nội bộ') => {
  const raw = folderAliases[String(folder || '').trim()] || folder || 'Văn bản nội bộ';
  const parts = String(raw)
    .split('/')
    .map(part => part.trim())
    .filter(Boolean);
  if (!parts.length) return 'Văn bản nội bộ';
  parts[0] = folderAliases[parts[0]] || parts[0];
  return parts.join(' / ');
};

const splitFolderPath = (folder = 'Văn bản nội bộ') => normalizeFolderPath(folder).split(' / ');

const splitFolderInputPath = (folder = 'Văn bản nội bộ') => {
  const parts = String(folder || 'Văn bản nội bộ').split('/');
  const root = (folderAliases[(parts[0] || '').trim()] || parts[0] || 'Văn bản nội bộ').replace(/^\s+/, '');
  const children = parts.slice(1).map(part => part.replace(/^\s+/, ''));
  return [root, ...children].filter((part, index) => index === 0 || part !== '');
};

const composeFolderInputPath = (root = 'Văn bản nội bộ', child = '') => {
  const nextRoot = folderAliases[String(root || '').trim()] || String(root || 'Văn bản nội bộ');
  const nextChild = String(child || '');
  return nextChild ? `${nextRoot} / ${nextChild}` : nextRoot;
};

const buildFolderTree = (folders = []) => {
  const root = [];
  const byPath = new Map();
  folders.forEach(folder => {
    const parts = splitFolderPath(folder);
    parts.forEach((part, index) => {
      const path = parts.slice(0, index + 1).join(' / ');
      if (!byPath.has(path)) {
        const node = { name: part, path, children: [] };
        byPath.set(path, node);
        if (index === 0) {
          root.push(node);
        } else {
          const parentPath = parts.slice(0, index).join(' / ');
          byPath.get(parentPath)?.children.push(node);
        }
      }
    });
  });
  const sortNodes = (nodes) => nodes
    .sort((a, b) => a.name.localeCompare(b.name, 'vi'))
    .map(node => ({ ...node, children: sortNodes(node.children) }));
  return sortNodes(root);
};

const findFolderNode = (nodes = [], path = '') => {
  for (const node of nodes) {
    if (node.path === path) return node;
    const child = findFolderNode(node.children, path);
    if (child) return child;
  }
  return null;
};

const ToggleTile = ({ checked, disabled, onChange, title, description, type = 'checkbox' }) => (
  <button
    type="button"
    onClick={() => !disabled && onChange()}
    disabled={disabled}
    style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 12,
      width: '100%',
      minHeight: 48,
      padding: 12,
      borderRadius: 8,
      border: `1px solid ${checked ? 'var(--primary)' : 'var(--border-light)'}`,
      background: checked ? 'rgba(14, 165, 233, 0.12)' : 'var(--bg-secondary)',
      color: checked ? 'var(--text-primary)' : 'var(--text-secondary)',
      textAlign: 'left',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.55 : 1
    }}
  >
    <span
      style={{
        width: 22,
        height: 22,
        borderRadius: type === 'radio' ? '50%' : 6,
        border: `2px solid ${checked ? 'var(--primary)' : 'var(--text-muted)'}`,
        background: checked ? 'var(--primary)' : 'transparent',
        color: '#fff',
        flexShrink: 0,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 14,
        fontWeight: 900,
        marginTop: 1
      }}
    >
      {checked ? '✓' : ''}
    </span>
    <span style={{ minWidth: 0 }}>
      <span style={{ display: 'block', fontWeight: 800, color: checked ? 'var(--text-primary)' : 'inherit', lineHeight: 1.3 }}>{title}</span>
      {description && <span className="text-xs text-muted" style={{ display: 'block', marginTop: 3, lineHeight: 1.4 }}>{description}</span>}
    </span>
  </button>
);

export default function DocumentList() {
  const { user, isDirector, departments, getDepartmentName } = useAuth();
  const confirm = useConfirm();
  const [documents, setDocuments] = useState([]);
  const [folders, setFolders] = useState(defaultFolders);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [folderFilter, setFolderFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingDocument, setEditingDocument] = useState(null);
  const [formData, setFormData] = useState({ ...emptyForm, departments: [...emptyForm.departments] });
  const [folderMode, setFolderMode] = useState('existing');
  const [subfolderMode, setSubfolderMode] = useState('none');
  const [folderRootInput, setFolderRootInput] = useState(emptyForm.folder);
  const [folderChildInput, setFolderChildInput] = useState('');
  const [expandedFolders, setExpandedFolders] = useState(() => new Set());
  const [previewDocument, setPreviewDocument] = useState(null);

  const canManageAll = isDirector || user?.department === 'it' || user?.role === 'it_manager';
  const departmentOptions = useMemo(() => {
    const dynamic = (departments || []).map(dept => ({ key: dept.key, name: dept.name }));
    const fallback = Object.keys(departmentNames).map(key => ({ key, name: departmentNames[key] }));
    const merged = [...dynamic, ...fallback].filter(item => item.key);
    return Array.from(new Map(merged.map(item => [item.key, item])).values());
  }, [departments]);
  const folderTree = useMemo(() => buildFolderTree(folders), [folders]);
  const rootFolders = useMemo(() => folderTree.map(node => node.path), [folderTree]);
  const activeFolderNode = useMemo(() => folderFilter ? findFolderNode(folderTree, folderFilter) : null, [folderTree, folderFilter]);
  const visibleFolderNodes = folderFilter ? (activeFolderNode?.children || []) : folderTree;
  const showFolderBrowser = !search && !deptFilter && !statusFilter && visibleFolderNodes.length > 0;
  const selectedRootFolder = folderRootInput || 'Văn bản nội bộ';
  const selectedChildFolder = folderChildInput;
  const childFolders = useMemo(() => {
    const parentPath = selectedRootFolder;
    return folders
      .filter(folder => folder.startsWith(`${parentPath} / `))
      .map(folder => folder.slice(parentPath.length + 3).split(' / ')[0])
      .filter(Boolean)
      .filter((value, index, arr) => arr.indexOf(value) === index)
      .sort((a, b) => a.localeCompare(b, 'vi'));
  }, [folders, selectedRootFolder]);

  useEffect(() => {
    loadDocuments();
  }, [search, deptFilter, folderFilter, statusFilter]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (deptFilter) params.department = deptFilter;
      if (folderFilter) params.folder = folderFilter;
      if (statusFilter) params.status = statusFilter;
      const res = await api.get('/documents', params);
      setDocuments(res.documents || []);
      setFolders(Array.from(new Set([...defaultFolders, ...(res.folders || [])])).sort());
    } catch (err) {
      toast.error(err.message || 'Không thể tải thư viện tài liệu');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ ...emptyForm, departments: [...emptyForm.departments] });
    setFolderMode('existing');
    setSubfolderMode('none');
    setFolderRootInput(emptyForm.folder);
    setFolderChildInput('');
    setEditingDocument(null);
  };

  const openCreateModal = () => {
    resetForm();
    if (folderFilter) {
      const parts = splitFolderPath(folderFilter);
      setFormData({ ...emptyForm, folder: folderFilter, departments: [...emptyForm.departments] });
      setFolderRootInput(parts[0] || emptyForm.folder);
      setFolderChildInput(parts.slice(1).join(' / '));
      setSubfolderMode(parts.length > 1 ? 'existing' : 'none');
    }
    setShowModal(true);
  };

  const openEditModal = (doc) => {
    const departments = normalizeDepartments(doc);
    const folderParts = splitFolderPath(doc.folder || 'Văn bản nội bộ');
    const nextFolder = normalizeFolderPath(doc.folder || 'Văn bản nội bộ');
    setEditingDocument(doc);
    setFormData({
      name: doc.name || '',
      fileUrl: doc.fileUrl || '',
      file: null,
      fileType: doc.fileType || 'other',
      fileSize: doc.fileSize || '0 KB',
      folder: nextFolder,
      description: doc.description || '',
      content: doc.content || '',
      visibility: doc.visibility || 'shared',
      departments
    });
    setFolderRootInput(folderParts[0] || emptyForm.folder);
    setFolderChildInput(folderParts.slice(1).join(' / '));
    setFolderMode('existing');
    setSubfolderMode(folderParts.length > 1 ? 'existing' : 'none');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  const setFolderFromParts = (root, child = '') => {
    const nextRoot = folderAliases[String(root || '').trim()] || root || 'Văn bản nội bộ';
    const nextChild = String(child || '');
    setFolderRootInput(nextRoot);
    setFolderChildInput(nextChild);
    setFormData(prev => ({
      ...prev,
      folder: composeFolderInputPath(nextRoot, nextChild)
    }));
  };

  const toggleFolderExpanded = (path) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const toggleDepartment = (key) => {
    setFormData(prev => {
      if (key === 'all') {
        return { ...prev, departments: prev.departments.includes('all') ? [] : ['all'] };
      }
      const current = prev.departments.includes('all') ? [] : prev.departments;
      const next = current.includes(key)
        ? current.filter(item => item !== key)
        : [...current, key];
      return { ...prev, departments: next.length ? next : ['all'] };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.visibility === 'shared' && formData.departments.length === 0) {
      toast.error('Vui lòng chọn ít nhất một phòng ban được xem');
      return;
    }
    try {
      const normalizedFolder = normalizeFolderPath(formData.folder);
      let res;
      if (editingDocument) {
        res = await api.put(`/documents/${editingDocument._id}`, {
          name: formData.name,
          fileUrl: formData.fileUrl,
          fileType: formData.fileType,
          folder: normalizedFolder,
          description: formData.description,
          content: formData.content,
          visibility: formData.visibility,
          departments: formData.departments
        });
      } else {
        const payload = new FormData();
        payload.append('name', formData.name);
        payload.append('fileUrl', formData.fileUrl);
        payload.append('fileType', formData.fileType);
        payload.append('fileSize', formData.fileSize);
        payload.append('folder', normalizedFolder);
        payload.append('description', formData.description);
        payload.append('content', formData.content);
        payload.append('visibility', formData.visibility);
        formData.departments.forEach(dept => payload.append('departments', dept));
        if (formData.file) payload.append('file', formData.file);
        res = await api.upload('/documents', payload);
      }
      toast.success(res.message || (editingDocument ? 'Đã cập nhật tài liệu' : 'Thêm tài liệu thành công'));
      setShowModal(false);
      resetForm();
      loadDocuments();
    } catch (err) {
      toast.error(err.message || (editingDocument ? 'Không thể cập nhật tài liệu' : 'Không thể lưu tài liệu'));
    }
  };

  const getDocumentViewUrl = (doc, disposition = 'inline') => {
    if (!doc?.storagePath) return doc?.fileUrl || '';
    const token = api.getToken();
    if (!token) return '';
    return `${api.baseUrl}/documents/${doc._id}/download?token=${encodeURIComponent(token)}&disposition=${disposition}`;
  };

  const getDocumentPreviewUrl = (doc) => {
    const directUrl = getDocumentViewUrl(doc, 'inline');
    if (!directUrl) return '';
    if (['doc', 'excel'].includes(doc.fileType)) {
      return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(directUrl)}`;
    }
    return directUrl;
  };

  const handleOpenDocument = async (doc) => {
    if (!doc.storagePath) {
      if (!doc.fileUrl) {
        toast.error('Tài liệu này chưa có file hoặc link đính kèm');
        return;
      }
      setPreviewDocument(doc);
      return;
    }

    try {
      const token = api.getToken();
      if (!token) {
        toast.error('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại');
        return;
      }
      setPreviewDocument(doc);
    } catch (err) {
      toast.error(err.message || 'Không thể mở tài liệu');
    }
  };

  const handleDownloadDocument = (doc) => {
    const url = getDocumentViewUrl(doc, 'attachment');
    if (!url) {
      toast.error('Không tìm thấy link tải tài liệu');
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleReview = async (doc, action) => {
    let reason = '';
    if (action === 'reject') {
      const input = await confirm({
        title: 'Từ chối tài liệu',
        message: `Nhập lý do từ chối tài liệu "${doc.name}".`,
        confirmText: 'Từ chối',
        cancelText: 'Hủy',
        type: 'danger',
        input: true,
        inputLabel: 'Lý do từ chối',
        inputPlaceholder: 'VD: File chưa đúng mẫu, thiếu thông tin...',
        inputRequired: true
      });
      if (input === false) return;
      reason = input;
    } else {
      const ok = await confirm({
        title: 'Duyệt tài liệu',
        message: `Tài liệu "${doc.name}" sẽ được chia sẻ cho phạm vi đã chọn.`,
        confirmText: 'Duyệt',
        cancelText: 'Hủy',
        type: 'success'
      });
      if (!ok) return;
    }
    try {
      const res = await api.patch(`/documents/${doc._id}/review`, { action, reason });
      toast.success(res.message || 'Đã cập nhật trạng thái tài liệu');
      loadDocuments();
    } catch (err) {
      toast.error(err.message || 'Không thể duyệt tài liệu');
    }
  };

  const handleDelete = async (id) => {
    const ok = await confirm({
      title: 'Xóa tài liệu',
      message: 'Tài liệu và file đã upload trên server sẽ bị xóa. Bạn có chắc muốn tiếp tục?',
      confirmText: 'Xóa',
      cancelText: 'Hủy',
      type: 'danger'
    });
    if (!ok) return;
    try {
      await api.delete(`/documents/${id}`);
      toast.success('Đã xóa tài liệu');
      loadDocuments();
    } catch (err) {
      toast.error(err.message || 'Không thể xóa tài liệu');
    }
  };

  const renderDepartmentScope = (doc) => {
    if (doc.visibility === 'private') return 'Chỉ mình tôi';
    const targets = normalizeDepartments(doc);
    if (targets.includes('all')) return 'Toàn công ty';
    return targets.map(key => getDepartmentName(key)).join(', ');
  };

  const renderStatusBadge = (doc) => {
    const config = {
      draft_private: { label: 'Riêng tư', color: '#8B5CF6', icon: Lock },
      pending: { label: 'Chờ duyệt', color: '#F59E0B', icon: Clock },
      approved: { label: 'Đã duyệt', color: '#22C55E', icon: CheckCircle2 },
      rejected: { label: 'Từ chối', color: '#EF4444', icon: XCircle }
    }[doc.approvalStatus] || { label: doc.approvalStatus || 'Đã duyệt', color: '#64748B', icon: FileText };
    const Icon = config.icon;
    return (
      <span className="badge" style={{ color: config.color, background: `${config.color}18`, border: `1px solid ${config.color}44`, display: 'inline-flex', gap: 5, alignItems: 'center', textTransform: 'none' }}>
        <Icon size={13} /> {config.label}
      </span>
    );
  };

  const getFolderDocumentCount = (path) => {
    const prefix = `${path} / `;
    return documents.filter(doc => doc.folder === path || String(doc.folder || '').startsWith(prefix)).length;
  };

  const getDirectDocumentCount = (path) => documents.filter(doc => doc.folder === path).length;

  const openFolder = (path) => {
    setFolderFilter(path);
    setExpandedFolders(prev => {
      const next = new Set(prev);
      const parts = splitFolderPath(path);
      parts.forEach((_, index) => next.add(parts.slice(0, index + 1).join(' / ')));
      return next;
    });
  };

  const renderFolderCard = (node) => (
    <button
      key={node.path}
      type="button"
      onClick={() => openFolder(node.path)}
      className="card"
      style={{
        textAlign: 'left',
        cursor: 'pointer',
        minHeight: 146,
        border: '1px solid var(--border-light)',
        background: 'var(--bg-secondary)',
        color: 'var(--text-primary)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: 'border-color 150ms ease, transform 150ms ease, background 150ms ease'
      }}
      title={node.path}
    >
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 14 }}>
          <span style={{ width: 46, height: 46, borderRadius: 10, background: 'rgba(14, 165, 233, 0.14)', color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(14, 165, 233, 0.28)' }}>
            <FolderOpen size={25} />
          </span>
          <span className="badge" style={{ textTransform: 'none', background: 'rgba(148, 163, 184, 0.14)', color: 'var(--text-secondary)', border: '1px solid var(--border-light)' }}>
            {node.children.length} thư mục con
          </span>
        </div>
        <h3 style={{ fontSize: '1rem', fontWeight: 900, marginBottom: 7, lineHeight: 1.35, color: 'var(--text-primary)' }}>{node.name}</h3>
        <div className="text-xs text-muted" style={{ lineHeight: 1.45, wordBreak: 'break-word' }}>{node.path}</div>
      </div>
      <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: 12, marginTop: 14, display: 'flex', justifyContent: 'space-between', gap: 10, color: 'var(--text-muted)' }}>
        <span className="text-sm">{getDirectDocumentCount(node.path)} file trực tiếp</span>
        <span className="text-sm">{getFolderDocumentCount(node.path)} tổng file</span>
      </div>
    </button>
  );

  const renderFolderNode = (node, depth = 0) => {
    const isActive = folderFilter === node.path;
    const hasChildren = node.children.length > 0;
    const isExpanded = expandedFolders.has(node.path);
    const showSidebarChildren = false;
    return (
      <div key={node.path}>
        <button
          className={`btn ${isActive ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => {
            if (showSidebarChildren && hasChildren && isActive) {
              toggleFolderExpanded(node.path);
              return;
            }
            openFolder(node.path);
          }}
          style={{
            justifyContent: 'flex-start',
            width: '100%',
            paddingLeft: 12 + depth * 16,
            minHeight: depth === 0 ? 38 : 34,
            gap: 7,
            borderRadius: 8,
            fontSize: depth === 0 ? '0.875rem' : '0.8125rem',
            background: isActive
              ? 'var(--primary)'
              : depth > 0
                ? 'rgba(148, 163, 184, 0.08)'
                : 'var(--bg-tertiary)',
            color: isActive ? '#fff' : 'var(--text-secondary)'
          }}
          title={node.path}
        >
          {showSidebarChildren && hasChildren ? (
            <span
              onClick={(e) => {
                e.stopPropagation();
                toggleFolderExpanded(node.path);
              }}
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18, flexShrink: 0 }}
            >
              {isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
            </span>
          ) : (
            <span style={{ width: 18, flexShrink: 0 }} />
          )}
          {isActive ? <FolderOpen size={16} /> : <Folder size={16} />}
          <span className="truncate" style={{ minWidth: 0 }}>{node.name}</span>
        </button>
        {showSidebarChildren && hasChildren && isExpanded && (
          <div style={{ display: 'grid', gap: 6, marginTop: 6 }}>
            {node.children.map(child => renderFolderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return <div className="loading-overlay"><div className="loading-spinner" /></div>;
  }

  return (
    <div className="animate-fadeIn">
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1>
            <Folder size={24} /> Thư Viện Tài Liệu Nội Bộ
          </h1>
          <p className="text-muted" style={{ margin: '4px 0 0' }}>
            Lưu trữ văn bản, thông báo, quy trình và báo cáo đã duyệt theo thư mục và phạm vi phòng ban.
          </p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}>
          <Plus size={18} /> Thêm Tài Liệu
        </button>
      </div>

      <div className="filter-bar" style={{ marginBottom: 20, alignItems: 'center', gap: 10 }}>
        <div className="header-search" style={{ width: 280 }}>
          <Search size={18} />
          <input type="text" placeholder="Tìm tên, mô tả tài liệu..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-control form-control-sm" value={folderFilter} onChange={e => setFolderFilter(e.target.value)} style={{ width: 190 }}>
          <option value="">Tất cả thư mục</option>
            {folders.map(folder => (
              <option key={folder} value={folder}>{folder}</option>
            ))}
        </select>
        <select className="form-control form-control-sm" value={deptFilter} onChange={e => setDeptFilter(e.target.value)} style={{ width: 190 }}>
          <option value="">Tất cả phạm vi</option>
          <option value="all">Toàn công ty</option>
          {departmentOptions.map(dept => (
            <option key={dept.key} value={dept.key}>{dept.name}</option>
          ))}
        </select>
        <select className="form-control form-control-sm" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ width: 160 }}>
          <option value="">Tất cả trạng thái</option>
          <option value="approved">Đã duyệt</option>
          <option value="pending">Chờ duyệt</option>
          <option value="rejected">Từ chối</option>
          <option value="draft_private">Riêng tư</option>
        </select>
        <span className="text-sm text-muted" style={{ marginLeft: 'auto' }}>
          {showFolderBrowser ? `${visibleFolderNodes.length} thư mục` : `Tổng: ${documents.length} tài liệu`}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '260px minmax(0, 1fr)', gap: 18 }}>
        <div className="card" style={{ alignSelf: 'start' }}>
          <div className="card-header">
            <h3 className="card-title"><Layers size={18} /> Thư mục</h3>
          </div>
          <div className="card-body" style={{ display: 'grid', gap: 6 }}>
            <button className={`btn ${folderFilter === '' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFolderFilter('')} style={{ justifyContent: 'flex-start' }}>
              <FolderOpen size={16} /> Tất cả
            </button>
            {folderTree.map(node => renderFolderNode(node))}
          </div>
        </div>

        <div className="grid-3 stagger-children">
          {showFolderBrowser ? (
            visibleFolderNodes.map(node => renderFolderCard(node))
          ) : documents.length === 0 ? (
            <div className="card text-center text-muted" style={{ gridColumn: '1 / -1', padding: 32 }}>Chưa có tài liệu nào trong thư viện</div>
          ) : (
            documents.map(doc => {
              const config = fileTypeConfig[doc.fileType] || fileTypeConfig.other;
              const Icon = config.icon;
              const canDelete = canManageAll || doc.uploadedBy?._id === user?._id;
              const canEdit = canDelete;
              return (
                <div key={doc._id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <span className="badge" style={{ color: config.color, background: `${config.color}18`, border: `1px solid ${config.color}44`, display: 'inline-flex', gap: 6, alignItems: 'center', textTransform: 'none' }}>
                        <Icon size={14} /> {config.label}
                      </span>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        {renderStatusBadge(doc)}
                        <span className="text-xs text-muted">{doc.fileSize || '0 KB'}</span>
                      </div>
                    </div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: 6, lineHeight: 1.35 }}>{doc.name}</h3>
                    {doc.description && (
                      <div className="text-sm text-muted" style={{ marginBottom: 10, lineHeight: 1.45 }}>{doc.description}</div>
                    )}
                    {doc.content && (
                      <div style={{ border: '1px solid var(--border-light)', borderRadius: 8, padding: 10, background: 'var(--bg-secondary)', color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.45, maxHeight: 92, overflow: 'hidden', whiteSpace: 'pre-line', marginBottom: 10 }}>
                        {doc.content}
                      </div>
                    )}
                    <div className="text-xs text-muted" style={{ display: 'grid', gap: 4 }}>
                      <span><Folder size={12} /> {normalizeFolderPath(doc.folder || 'Văn bản nội bộ')}</span>
                      <span><Users size={12} /> {renderDepartmentScope(doc)}</span>
                      <span>Tạo bởi: {doc.uploadedBy?.fullName || '--'} • {formatDate(doc.createdAt)}</span>
                      {doc.approvedBy && doc.approvalStatus === 'approved' && (
                        <span>Duyệt bởi: {doc.approvedBy.fullName} • {formatDate(doc.reviewedAt)}</span>
                      )}
                      {doc.approvalStatus === 'rejected' && doc.rejectionReason && (
                        <span style={{ color: '#EF4444' }}>Lý do từ chối: {doc.rejectionReason}</span>
                      )}
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: 12, marginTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    {(doc.fileUrl || doc.storagePath) ? (
                      <button className="btn btn-ghost btn-sm" onClick={() => handleOpenDocument(doc)} title="Mở tài liệu">
                        <Eye size={14} /> Xem
                      </button>
                    ) : (
                      <span className="text-xs text-muted">Tài liệu nội dung</span>
                    )}
                    <div style={{ display: 'flex', gap: 6 }}>
                      {doc.canReview && (
                        <>
                          <button className="btn btn-icon btn-ghost btn-sm text-success" onClick={() => handleReview(doc, 'approve')} title="Duyệt">
                            <CheckCircle2 size={14} />
                          </button>
                          <button className="btn btn-icon btn-ghost btn-sm text-danger" onClick={() => handleReview(doc, 'reject')} title="Từ chối">
                            <XCircle size={14} />
                          </button>
                        </>
                      )}
                      {canEdit && (
                        <button className="btn btn-icon btn-ghost btn-sm" onClick={() => openEditModal(doc)} title="Sửa thông tin">
                          <Edit3 size={14} />
                        </button>
                      )}
                      {canDelete && (
                        <button className="btn btn-icon btn-ghost btn-sm text-danger" onClick={() => handleDelete(doc._id)} title="Xóa">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 760 }}>
            <div className="modal-header">
              <h2>{editingDocument ? 'Sửa Thông Tin Tài Liệu' : 'Thêm Tài Liệu Mới'}</h2>
              <button className="modal-close" onClick={closeModal}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label required">Tên tài liệu *</label>
                  <input type="text" className="form-control" placeholder="VD: Thông báo chính sách chăm sóc khách hàng tháng 7" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Thư mục</label>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                      <button type="button" className={`btn btn-sm ${folderMode === 'existing' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFolderMode('existing')}>Chọn thư mục</button>
                      <button type="button" className={`btn btn-sm ${folderMode === 'new' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFolderMode('new')}>Tạo mới</button>
                    </div>
                    {folderMode === 'existing' ? (
                      <div style={{ display: 'grid', gap: 8 }}>
                        <select className="form-control" value={selectedRootFolder} onChange={e => { setFolderFromParts(e.target.value); setSubfolderMode('none'); }}>
                          {!rootFolders.includes(selectedRootFolder) && (
                            <option value={selectedRootFolder}>{selectedRootFolder}</option>
                          )}
                          {rootFolders.map(folder => (
                            <option key={folder} value={folder}>{folder}</option>
                          ))}
                        </select>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <button type="button" className={`btn btn-sm ${subfolderMode === 'none' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => { setSubfolderMode('none'); setFolderFromParts(selectedRootFolder); }}>Không có thư mục con</button>
                          <button type="button" className={`btn btn-sm ${subfolderMode === 'existing' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setSubfolderMode('existing')} disabled={childFolders.length === 0}>Chọn thư mục con</button>
                          <button type="button" className={`btn btn-sm ${subfolderMode === 'new' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setSubfolderMode('new')}>Tạo thư mục con</button>
                        </div>
                        {subfolderMode === 'existing' && (
                          <select className="form-control" value={selectedChildFolder} onChange={e => setFolderFromParts(selectedRootFolder, e.target.value)}>
                            <option value="">-- Chọn thư mục con --</option>
                            {childFolders.map(folder => (
                              <option key={folder} value={folder}>{folder}</option>
                            ))}
                          </select>
                        )}
                        {subfolderMode === 'new' && (
                          <input
                            className="form-control"
                            placeholder={selectedRootFolder === 'HỒ SƠ NHÂN SỰ' ? 'Nhập tên nhân viên, VD: Trần Thị Yến Châu' : 'Nhập tên thư mục con'}
                            value={selectedChildFolder}
                            onChange={e => setFolderFromParts(selectedRootFolder, e.target.value)}
                          />
                        )}
                        <div className="text-xs text-muted">
                          Sẽ lưu vào: <strong style={{ color: 'var(--text-primary)' }}>{formData.folder}</strong>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gap: 8 }}>
                        <input className="form-control" placeholder="Nhập tên thư mục cha mới" value={selectedRootFolder} onChange={e => setFolderFromParts(e.target.value, selectedChildFolder)} />
                        <input
                          className="form-control"
                          placeholder="Thư mục con nếu có, VD: Tên nhân viên"
                          value={selectedChildFolder}
                          onChange={e => setFolderFromParts(selectedRootFolder, e.target.value)}
                        />
                        <div className="text-xs text-muted">
                          Có thể tạo nhiều cấp bằng dấu `/`, ví dụ: <strong>HỒ SƠ NHÂN SỰ / Nguyễn Văn A</strong>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Loại tài liệu</label>
                    <select className="form-control" value={formData.fileType} onChange={e => setFormData({ ...formData, fileType: e.target.value })}>
                      <option value="text">Văn bản/Thông báo</option>
                      <option value="pdf">PDF</option>
                      <option value="doc">Word</option>
                      <option value="excel">Excel</option>
                      <option value="image">Hình ảnh</option>
                      <option value="other">Khác</option>
                    </select>
                  </div>
                </div>

                {selectedRootFolder === 'HỒ SƠ NHÂN SỰ' && (
                  <div className="form-group" style={{ marginTop: -8 }}>
                    <div style={{ border: '1px solid var(--border-light)', borderRadius: 8, padding: 12, background: 'var(--bg-secondary)', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                      Gợi ý: trong `HỒ SƠ NHÂN SỰ`, hãy tạo thư mục con theo tên nhân viên. Sau đó lưu các file như `CCCD`, `Bằng đại học`, `Sơ yếu lý lịch`, `Hợp đồng lao động` vào đúng thư mục nhân viên đó.
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Chế độ lưu trữ</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
                    <ToggleTile
                      type="radio"
                      checked={formData.visibility === 'private'}
                      onChange={() => setFormData({ ...formData, visibility: 'private', departments: [user?.department || 'all'] })}
                      title="Chỉ mình tôi"
                      description="Lưu cá nhân, không cần duyệt."
                    />
                    <ToggleTile
                      type="radio"
                      checked={formData.visibility === 'shared'}
                      onChange={() => setFormData({ ...formData, visibility: 'shared', departments: ['all'] })}
                      title="Chia sẻ nội bộ"
                      description="Nhân viên cần trưởng phòng/admin duyệt."
                    />
                  </div>
                </div>

                {!editingDocument && (
                  <div className="form-group">
                    <label className="form-label">Upload file từ máy tính</label>
                    <label className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', background: 'var(--primary)', color: '#fff', fontWeight: 800 }}>
                      <Upload size={16} />
                      {formData.file ? formData.file.name : 'Chọn file'}
                      <input
                        type="file"
                        style={{ display: 'none' }}
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp,.txt,.zip"
                        onChange={e => setFormData({ ...formData, file: e.target.files?.[0] || null })}
                      />
                    </label>
                    {formData.file && (
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setFormData({ ...formData, file: null })} style={{ marginLeft: 8 }}>
                        Bỏ file
                      </button>
                    )}
                    <div className="text-xs text-muted" style={{ marginTop: 6 }}>
                      Hỗ trợ PDF, Word, Excel, PowerPoint, ảnh, TXT, CSV, ZIP. Tối đa 100MB.
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Link file ngoài</label>
                  <input type="url" className="form-control" placeholder="https://drive.google.com/... hoặc link tài liệu" value={formData.fileUrl} onChange={e => setFormData({ ...formData, fileUrl: e.target.value })} disabled={Boolean(formData.file) || Boolean(editingDocument?.storagePath)} />
                  {editingDocument?.storagePath && (
                    <div className="text-xs text-muted" style={{ marginTop: 6 }}>
                      File đã upload lên server. Màn hình sửa chỉ cập nhật thông tin, thư mục và phạm vi xem.
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Mô tả ngắn</label>
                  <input type="text" className="form-control" placeholder="Tóm tắt nội dung để nhân sự dễ tìm" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                </div>

                <div className="form-group">
                  <label className="form-label">Nội dung/ghi chú</label>
                  <textarea className="form-control" rows={5} placeholder="Nhập nội dung thông báo, quy trình hoặc ghi chú lưu trữ..." value={formData.content} onChange={e => setFormData({ ...formData, content: e.target.value })} />
                </div>

                <div className="form-group">
                  <label className="form-label">Phòng ban được xem</label>
                  {formData.visibility === 'private' ? (
                    <div style={{ border: '1px solid var(--border-light)', borderRadius: 8, padding: 14, background: 'var(--bg-secondary)', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                      Tài liệu này chỉ hiển thị trong kho cá nhân của bạn. Không chia sẻ cho phòng ban nào và không cần duyệt.
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10 }}>
                      <ToggleTile
                        checked={formData.departments.includes('all')}
                        onChange={() => toggleDepartment('all')}
                        title="Toàn công ty"
                      />
                      {departmentOptions.map(dept => (
                        <ToggleTile
                          key={dept.key}
                          checked={formData.departments.includes(dept.key)}
                          onChange={() => toggleDepartment(dept.key)}
                          title={dept.name}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={closeModal}>Hủy</button>
                <button type="submit" className="btn btn-primary">{editingDocument ? 'Cập Nhật' : 'Lưu Tài Liệu'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {previewDocument && (
        <div className="modal-overlay" onClick={() => setPreviewDocument(null)}>
          <div className="modal-content modal-lg" onClick={e => e.stopPropagation()} style={{ width: 'min(1100px, 94vw)' }}>
            <div className="modal-header">
              <h2><Eye size={20} /> {previewDocument.name}</h2>
              <button className="modal-close" onClick={() => setPreviewDocument(null)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div className="text-sm text-muted">
                  {normalizeFolderPath(previewDocument.folder || 'Văn bản nội bộ')} • {previewDocument.fileSize || '0 KB'}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => handleDownloadDocument(previewDocument)}>
                    <Download size={14} /> Tải xuống
                  </button>
                  {!previewDocument.storagePath && previewDocument.fileUrl && (
                    <button className="btn btn-ghost btn-sm" onClick={() => window.open(previewDocument.fileUrl, '_blank', 'noopener,noreferrer')}>
                      <ExternalLink size={14} /> Mở tab mới
                    </button>
                  )}
                </div>
              </div>

              {previewDocument.content && (
                <div style={{ border: '1px solid var(--border-light)', borderRadius: 8, padding: 12, background: 'var(--bg-secondary)', whiteSpace: 'pre-line', lineHeight: 1.6, marginBottom: 12 }}>
                  {previewDocument.content}
                </div>
              )}

              {previewDocument.fileType === 'image' ? (
                <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border-light)', padding: 12, textAlign: 'center' }}>
                  <img src={getDocumentPreviewUrl(previewDocument)} alt={previewDocument.name} style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }} />
                </div>
              ) : ['pdf', 'doc', 'excel', 'text', 'marketing_report'].includes(previewDocument.fileType) || previewDocument.fileUrl ? (
                <iframe
                  title={previewDocument.name}
                  src={getDocumentPreviewUrl(previewDocument)}
                  style={{ width: '100%', height: '72vh', border: '1px solid var(--border-light)', borderRadius: 8, background: '#fff' }}
                />
              ) : (
                <div className="card text-center text-muted" style={{ padding: 28 }}>
                  Định dạng này không hỗ trợ xem trước trong trình duyệt. Vui lòng dùng nút tải xuống.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
