const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const Document = require('../models/Document');
const User = require('../models/User');
const Notification = require('../models/Notification');
const uploadDocument = require('../middleware/documentUpload');

const isAdminUser = (user) => user?.role === 'director' || user?.role === 'it_manager' || user?.department === 'it';
const isManagerUser = (user) => Boolean(user?.role?.includes('manager')) || isAdminUser(user);
const isStaffUser = (user) => !isManagerUser(user);

const normalizeDepartments = (departments, fallback = 'all') => {
  const list = Array.isArray(departments) ? departments : String(departments || fallback).split(',');
  const cleaned = list.map(item => String(item || '').trim()).filter(Boolean);
  return cleaned.length ? [...new Set(cleaned)] : ['all'];
};

const parseBoolean = (value) => value === true || value === 'true' || value === '1';

const escapeRegExp = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

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

const expandFolderPaths = (folders = []) => {
  const expanded = new Set();
  folders.forEach(folder => {
    const parts = normalizeFolderPath(folder).split(' / ');
    parts.forEach((_, index) => {
      expanded.add(parts.slice(0, index + 1).join(' / '));
    });
  });
  return [...expanded].sort((a, b) => a.localeCompare(b, 'vi'));
};

const formatFileSize = (bytes = 0) => {
  if (!bytes) return '0 KB';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
};

const inferFileType = (file, fallback = 'other') => {
  const mime = file?.mimetype || '';
  const name = file?.originalname || '';
  const ext = path.extname(name).toLowerCase();
  if (mime.includes('pdf') || ext === '.pdf') return 'pdf';
  if (mime.includes('word') || ['.doc', '.docx'].includes(ext)) return 'doc';
  if (mime.includes('excel') || mime.includes('spreadsheet') || ['.xls', '.xlsx', '.csv'].includes(ext)) return 'excel';
  if (mime.includes('image')) return 'image';
  if (mime.includes('text') || ['.txt', '.md'].includes(ext)) return 'text';
  return fallback || 'other';
};

const canViewDocument = (user, doc) => {
  if (isAdminUser(user)) return true;
  const uploaderId = doc.uploadedBy?._id || doc.uploadedBy;
  const isUploader = uploaderId?.toString() === user._id.toString();
  if (isUploader) return true;
  if (doc.visibility === 'private') return false;
  if (doc.approvalStatus !== 'approved') {
    return user.role?.includes('manager') && doc.department === user.department;
  }
  const targets = normalizeDepartments(doc.departments, doc.department);
  return targets.includes('all') || targets.includes(user.department);
};

const canReviewDocument = (user, doc) => {
  if (isAdminUser(user)) return true;
  return Boolean(user.role?.includes('manager') && user.department === doc.department);
};

const getVisibilityFilter = (req) => {
  if (isAdminUser(req.user)) return {};
  return {
    $or: [
      { uploadedBy: req.user._id },
      {
        visibility: 'shared',
        approvalStatus: 'approved',
        $or: [
          { department: { $in: ['all', req.user.department] } },
          { departments: { $in: ['all', req.user.department] } }
        ]
      },
      {
        visibility: 'shared',
        approvalStatus: 'pending',
        department: req.user.department,
        ...(req.user.role?.includes('manager') ? {} : { _id: null })
      }
    ]
  };
};

const notifyReviewers = async (doc, actor) => {
  if (doc.visibility === 'private' || doc.approvalStatus !== 'pending') return;
  const reviewerFilter = {
    status: 'active',
    _id: { $ne: actor._id },
    $or: [
      { role: 'director' },
      { department: 'it' },
      { role: 'it_manager' },
      { department: doc.department, role: { $regex: 'manager' } }
    ]
  };
  const reviewers = await User.find(reviewerFilter).select('_id');
  if (!reviewers.length) return;
  await Notification.insertMany(reviewers.map(user => ({
    user: user._id,
    type: 'system',
    title: 'Tài liệu chờ duyệt',
    message: `${actor.fullName} vừa gửi tài liệu "${doc.name}" cần duyệt trước khi chia sẻ.`,
    link: '/documents'
  })));
};

const notifyUploader = async (doc, title, message) => {
  if (!doc.uploadedBy) return;
  await Notification.create({
    user: doc.uploadedBy,
    type: 'system',
    title,
    message,
    link: '/documents'
  });
};

const isCompanyDocumentFolder = (folder = '') => {
  const root = normalizeFolderPath(folder).split(' / ')[0];
  return ['Văn bản nội bộ', 'Thông báo công ty', 'Quy trình các Phòng/Ban'].includes(root);
};

const notifyDocumentAudience = async (doc, actor) => {
  if (doc.visibility !== 'shared' || doc.approvalStatus !== 'approved') return;
  if (!isCompanyDocumentFolder(doc.folder)) return;

  const targets = normalizeDepartments(doc.departments, doc.department);
  const userFilter = {
    status: 'active',
    _id: { $ne: actor?._id || actor },
    ...(targets.includes('all') ? {} : { department: { $in: targets } })
  };

  const users = await User.find(userFilter).select('_id');
  if (!users.length) return;

  await Notification.insertMany(users.map(user => ({
    user: user._id,
    type: 'system',
    title: 'Có văn bản nội bộ mới',
    message: `Tài liệu "${doc.name}" vừa được chia sẻ trong ${normalizeFolderPath(doc.folder)}.`,
    link: '/documents'
  })));
};

/**
 * GET /api/documents
 * Danh sách tài liệu thư viện nội bộ
 */
router.get('/', async (req, res) => {
  try {
    const { department, search, folder, status, scope } = req.query;
    const filter = { ...getVisibilityFilter(req) };

    const andFilters = [];
    if (search) {
      andFilters.push({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { content: { $regex: search, $options: 'i' } }
        ]
      });
    }
    if (folder) {
      const normalizedFolder = normalizeFolderPath(folder);
      andFilters.push({ folder: { $regex: `^${escapeRegExp(normalizedFolder)}(?: / |$)`, $options: 'i' } });
    }
    if (status) andFilters.push({ approvalStatus: status });
    if (scope === 'mine') andFilters.push({ uploadedBy: req.user._id });
    if (department) {
      andFilters.push({
        $or: [
          { department: { $in: ['all', department] } },
          { departments: { $in: ['all', department] } }
        ]
      });
    }
    if (andFilters.length) filter.$and = andFilters;

    const documents = await Document.find(filter)
      .populate('uploadedBy', 'fullName department role')
      .populate('approvedBy', 'fullName department role')
      .sort({ createdAt: -1 });

    const visibleDocuments = documents
      .filter(doc => canViewDocument(req.user, doc))
      .map(doc => {
        const item = doc.toObject();
        item.departments = normalizeDepartments(item.departments, item.department);
        item.canReview = canReviewDocument(req.user, doc) && doc.approvalStatus === 'pending';
        return item;
      });

    const folderDocuments = await Document.find(getVisibilityFilter(req)).select('folder department departments visibility approvalStatus uploadedBy');
    const folderPaths = [...new Set(folderDocuments
      .filter(doc => canViewDocument(req.user, doc))
      .map(doc => normalizeFolderPath(doc.folder || 'Văn bản nội bộ')))];
    const folders = expandFolderPaths(folderPaths);
    res.json({ documents: visibleDocuments, folders });
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * POST /api/documents
 * Tải lên/đăng ký tài liệu mới
 */
router.post('/', uploadDocument.single('file'), async (req, res) => {
  try {
    const {
      name,
      fileUrl,
      fileType,
      department,
      departments,
      folder,
      description,
      content,
      visibility
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Vui lòng cung cấp tên tài liệu' });
    }

    const isPrivate = visibility === 'private' || parseBoolean(req.body.private);
    if (!req.file && !fileUrl && !content) {
      return res.status(400).json({ error: 'Vui lòng upload file, nhập link file hoặc nội dung/ghi chú tài liệu' });
    }

    const targetDepartments = isPrivate
      ? [req.user.department]
      : normalizeDepartments(departments, department || 'all');
    const needsApproval = isStaffUser(req.user) && !isPrivate;
    const approvalStatus = isPrivate ? 'draft_private' : needsApproval ? 'pending' : 'approved';

    const doc = new Document({
      name: String(name).trim(),
      fileUrl: req.file ? '' : String(fileUrl || '').trim(),
      fileType: req.file ? inferFileType(req.file, fileType) : (fileType || 'other'),
      fileSize: req.file ? formatFileSize(req.file.size) : (req.body.fileSize || '0 KB'),
      originalName: req.file?.originalname || '',
      storagePath: req.file?.path || '',
      mimeType: req.file?.mimetype || '',
      folder: normalizeFolderPath(folder),
      description: String(description || '').trim(),
      content: String(content || '').trim(),
      department: targetDepartments[0] || req.user.department,
      departments: targetDepartments,
      visibility: isPrivate ? 'private' : 'shared',
      approvalStatus,
      approvedBy: approvalStatus === 'approved' ? req.user._id : undefined,
      reviewedAt: approvalStatus === 'approved' ? new Date() : undefined,
      uploadedBy: req.user._id
    });

    await doc.save();
    await notifyReviewers(doc, req.user);
    await notifyDocumentAudience(doc, req.user);

    const populated = await Document.findById(doc._id)
      .populate('uploadedBy', 'fullName department role')
      .populate('approvedBy', 'fullName department role');
    res.status(201).json({
      document: populated,
      message: approvalStatus === 'pending'
        ? 'Tài liệu đã gửi và đang chờ trưởng phòng/ban quản trị duyệt'
        : 'Thêm tài liệu thành công'
    });
  } catch (error) {
    console.error('Create document error:', error);
    res.status(500).json({ error: error.message || 'Lỗi server' });
  }
});

/**
 * GET /api/documents/:id/download
 * Tải file đã upload sau khi kiểm tra quyền
 */
router.get('/:id/download', async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id).populate('uploadedBy', 'fullName department role');
    if (!doc) return res.status(404).json({ error: 'Không tìm thấy tài liệu' });
    if (!canViewDocument(req.user, doc)) return res.status(403).json({ error: 'Bạn không có quyền tải tài liệu này' });
    if (!doc.storagePath || !fs.existsSync(doc.storagePath)) {
      return res.status(404).json({ error: 'File không tồn tại trên server' });
    }

    const fileName = doc.originalName || doc.name || 'document';
    const encodedName = encodeURIComponent(fileName).replace(/['()]/g, escape).replace(/\*/g, '%2A');
    const disposition = req.query.disposition === 'attachment' ? 'attachment' : 'inline';
    res.setHeader('Content-Type', doc.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `${disposition}; filename="document"; filename*=UTF-8''${encodedName}`);
    res.setHeader('Cache-Control', 'private, max-age=300');
    fs.createReadStream(doc.storagePath).pipe(res);
  } catch (error) {
    console.error('Download document error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * PUT /api/documents/:id
 * Cập nhật thông tin tài liệu: tên, thư mục, mô tả, ghi chú, phạm vi xem
 */
router.put('/:id', async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Không tìm thấy tài liệu' });

    const isUploader = doc.uploadedBy.toString() === req.user._id.toString();
    if (!isAdminUser(req.user) && !isUploader) {
      return res.status(403).json({ error: 'Bạn không có quyền sửa tài liệu này' });
    }

    const {
      name,
      fileUrl,
      fileType,
      department,
      departments,
      folder,
      description,
      content,
      visibility
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Vui lòng cung cấp tên tài liệu' });
    }

    const isPrivate = visibility === 'private' || parseBoolean(req.body.private);
    const targetDepartments = isPrivate
      ? [req.user.department]
      : normalizeDepartments(departments, department || doc.department || 'all');
    const needsApproval = isStaffUser(req.user) && !isPrivate;

    doc.name = String(name).trim();
    doc.fileUrl = doc.storagePath ? doc.fileUrl : String(fileUrl || '').trim();
    doc.fileType = fileType || doc.fileType || 'other';
    doc.folder = normalizeFolderPath(folder || doc.folder);
    doc.description = String(description || '').trim();
    doc.content = String(content || '').trim();
    doc.department = targetDepartments[0] || req.user.department;
    doc.departments = targetDepartments;
    doc.visibility = isPrivate ? 'private' : 'shared';
    doc.approvalStatus = isPrivate ? 'draft_private' : needsApproval ? 'pending' : 'approved';
    doc.approvedBy = doc.approvalStatus === 'approved' ? req.user._id : undefined;
    doc.reviewedAt = doc.approvalStatus === 'approved' ? new Date() : undefined;
    doc.rejectionReason = '';

    await doc.save();
    await notifyReviewers(doc, req.user);
    await notifyDocumentAudience(doc, req.user);

    const populated = await Document.findById(doc._id)
      .populate('uploadedBy', 'fullName department role')
      .populate('approvedBy', 'fullName department role');

    res.json({
      document: populated,
      message: doc.approvalStatus === 'pending'
        ? 'Đã cập nhật tài liệu và gửi duyệt lại'
        : 'Đã cập nhật tài liệu'
    });
  } catch (error) {
    console.error('Update document error:', error);
    res.status(500).json({ error: error.message || 'Lỗi server' });
  }
});

/**
 * PATCH /api/documents/:id/review
 * Duyệt hoặc từ chối tài liệu chờ duyệt
 */
router.patch('/:id/review', async (req, res) => {
  try {
    const { action, reason = '' } = req.body;
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Không tìm thấy tài liệu' });
    if (!canReviewDocument(req.user, doc)) {
      return res.status(403).json({ error: 'Bạn không có quyền duyệt tài liệu này' });
    }
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Hành động duyệt không hợp lệ' });
    }

    doc.approvalStatus = action === 'approve' ? 'approved' : 'rejected';
    doc.approvedBy = req.user._id;
    doc.reviewedAt = new Date();
    doc.rejectionReason = action === 'reject' ? String(reason || '').trim() : '';
    await doc.save();

    await notifyUploader(
      doc,
      action === 'approve' ? 'Tài liệu đã được duyệt' : 'Tài liệu bị từ chối',
      action === 'approve'
        ? `Tài liệu "${doc.name}" đã được duyệt và chia sẻ.`
        : `Tài liệu "${doc.name}" bị từ chối${doc.rejectionReason ? `: ${doc.rejectionReason}` : '.'}`
    );
    if (action === 'approve') {
      await notifyDocumentAudience(doc, req.user);
    }

    const populated = await Document.findById(doc._id)
      .populate('uploadedBy', 'fullName department role')
      .populate('approvedBy', 'fullName department role');

    res.json({ document: populated, message: action === 'approve' ? 'Đã duyệt tài liệu' : 'Đã từ chối tài liệu' });
  } catch (error) {
    console.error('Review document error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * DELETE /api/documents/:id
 * Xóa tài liệu
 */
router.delete('/:id', async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ error: 'Không tìm thấy tài liệu' });
    }

    const isUploader = doc.uploadedBy.toString() === req.user._id.toString();
    if (!isAdminUser(req.user) && !isUploader) {
      return res.status(403).json({ error: 'Bạn không có quyền xóa tài liệu của người khác' });
    }

    const storagePath = doc.storagePath;
    await Document.findByIdAndDelete(req.params.id);
    if (storagePath && fs.existsSync(storagePath)) {
      fs.unlink(storagePath, () => {});
    }
    res.json({ message: 'Đã xóa tài liệu' });
  } catch (error) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

module.exports = router;
