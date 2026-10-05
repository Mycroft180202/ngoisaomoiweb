import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api, { getApiOrigin, getSocketConfig } from '../../services/api';
import { formatDate, departmentNames, roleNames } from '../../utils/helpers';
import DatePickerVN from '../../components/ui/DatePickerVN';
import './AttendancePage.css';
import {
  Clock, CheckCircle, LogOut, Calendar, Users, AlertCircle, ShieldCheck, Download, Edit, Plus, X, ExternalLink, Paperclip, Trash2, Upload, UserX, FileText, Image as ImageIcon, Eye, Search, UserRound, BarChart3
} from 'lucide-react';

const getBaseUrl = getApiOrigin;

const calculateWorkHoursPreview = (checkIn, checkOut, rules, workDate = '') => {
  if (!checkIn || !checkOut) return null;
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return null;

  let hours = (end - start) / (1000 * 60 * 60);
  if (rules?.lunchBreakStart && rules?.lunchBreakEnd) {
    const lunchStart = new Date(start);
    const [startHour, startMinute] = rules.lunchBreakStart.split(':').map(Number);
    lunchStart.setHours(startHour, startMinute, 0, 0);
    const lunchEnd = new Date(start);
    const [endHour, endMinute] = rules.lunchBreakEnd.split(':').map(Number);
    lunchEnd.setHours(endHour, endMinute, 0, 0);
    const overlapStart = start > lunchStart ? start : lunchStart;
    const overlapEnd = end < lunchEnd ? end : lunchEnd;
    if (overlapStart < overlapEnd) hours -= (overlapEnd - overlapStart) / (1000 * 60 * 60);
  }
  const value = Math.max(0, Number(hours.toFixed(1)));
  const friendlyValue = value - Math.floor(value) >= 0.9 ? Math.ceil(value) : value;
  const [year, month, day] = String(workDate).split('-').map(Number);
  const saturday = Boolean(year && month && day) && new Date(Date.UTC(year, month - 1, day)).getUTCDay() === 6;
  return saturday && friendlyValue >= 3.8 && friendlyValue < 4 ? 4 : friendlyValue;
};

const getStatusBadgeStyle = (status) => {
  switch (status) {
    case 'present': return { bg: 'rgba(34, 197, 94, 0.15)', text: '#22C55E', border: '1px solid rgba(34, 197, 94, 0.3)', label: 'Đúng giờ' };
    case 'late': return { bg: 'rgba(245, 158, 11, 0.15)', text: '#F59E0B', border: '1px solid rgba(245, 158, 11, 0.3)', label: 'Đi muộn' };
    case 'half_day': return { bg: 'rgba(59, 130, 246, 0.15)', text: '#3B82F6', border: '1px solid rgba(59, 130, 246, 0.3)', label: 'Nghỉ nửa ngày' };
    case 'missing_checkout': return { bg: 'rgba(249, 115, 22, 0.15)', text: '#FB923C', border: '1px solid rgba(249, 115, 22, 0.3)', label: 'Quên chấm công ra về' };
    case 'leave': return { bg: 'rgba(236, 72, 153, 0.15)', text: '#EC4899', border: '1px solid rgba(236, 72, 153, 0.3)', label: 'Nghỉ phép' };
    case 'holiday': return { bg: 'rgba(6, 182, 212, 0.15)', text: '#06B6D4', border: '1px solid rgba(6, 182, 212, 0.3)', label: 'Nghỉ lễ' };
    case 'company_trip': return { bg: 'rgba(139, 92, 246, 0.15)', text: '#8B5CF6', border: '1px solid rgba(139, 92, 246, 0.3)', label: 'Du lịch công ty' };
    case 'off_day': return { bg: 'rgba(107, 114, 128, 0.15)', text: '#9CA3AF', border: '1px solid rgba(107, 114, 128, 0.3)', label: 'Ngày nghỉ tuần' };
    case 'absent': return { bg: 'rgba(239, 68, 68, 0.15)', text: '#EF4444', border: '1px solid rgba(239, 68, 68, 0.3)', label: 'Vắng không phép' };
    default: return { bg: 'rgba(107, 114, 128, 0.15)', text: '#9CA3AF', border: '1px solid rgba(107, 114, 128, 0.3)', label: 'Vắng' };
  }
};

export default function AttendancePage() {
  const { user, isDirector, canAccess } = useAuth();
  const isManagement = isDirector || canAccess('staff.manage') || user?.role?.includes('manager');
  const canExportAttendance = canAccess('attendance.export');

  const [todayAttendance, setTodayAttendance] = useState(null);
  const [history, setHistory] = useState([]);
  const [allAttendance, setAllAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('my'); // 'my' | 'all'
  const [attendanceRules, setAttendanceRules] = useState(null);
  const [workedTimeDisplay, setWorkedTimeDisplay] = useState('00:00:00');
  const [attendanceRequired, setAttendanceRequired] = useState(true);
  const [internalDocs, setInternalDocs] = useState([]);
  const [previewDocument, setPreviewDocument] = useState(null);

  const [filterType, setFilterType] = useState('today'); // 'today' | 'month'
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().substring(0, 10)); // 'YYYY-MM-DD'
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7)); // 'YYYY-MM'

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [staffs, setStaffs] = useState([]);
  const [formData, setFormData] = useState({
    targetUser: '',
    date: selectedDate,
    status: 'leave',
    checkIn: '',
    checkOut: '',
    workHours: 0,
    overtimeHours: 0,
    overtimeApproved: false,
    note: '',
    proofUrl: ''
  });

  const [confirmModal, setConfirmModal] = useState({ show: false, action: null, title: '', message: '' });

  // Evidence upload state
  const [evidenceFiles, setEvidenceFiles] = useState([]);
  const [uploadingEvidence, setUploadingEvidence] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');

  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedExportUsers, setSelectedExportUsers] = useState([]);
  const [exportUserSearch, setExportUserSearch] = useState('');
  const [attendanceDetail, setAttendanceDetail] = useState(null);
  const [detailMonth, setDetailMonth] = useState(new Date().toISOString().substring(0, 7));
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [exportColumns, setExportColumns] = useState({
    user: true,
    email: false,
    department: true,
    role: false,
    date: true,
    checkIn: true,
    checkOut: true,
    workHours: true,
    extraHours: true,
    overtimeHours: true,
    status: true,
    note: true,
    evidences: true
  });

  // Lưu bộ lọc hiện tại vào ref để tránh stale closure trong Socket.io listener
  const filtersRef = useRef({ filterType, selectedDate, selectedMonth });
  useEffect(() => {
    filtersRef.current = { filterType, selectedDate, selectedMonth };
  }, [filterType, selectedDate, selectedMonth]);

  // Kết nối Socket.io để cập nhật thời gian thực
  useEffect(() => {
    let socket;
    let isMounted = true;

    import('socket.io-client').then(({ io }) => {
      if (!isMounted) return;
      const { url, options } = getSocketConfig();

      socket = io(url, options);

      socket.on('connect', () => {
        console.log('🔌 Connected to socket server on AttendancePage');
        if (user?._id) {
          socket.emit('join', user._id);
        }
      });

      socket.on('attendance_update', (data) => {
        console.log('📡 Real-time attendance update received:', data);
        loadTodayAndHistory();
        if (isManagement) {
          const { filterType: fType, selectedDate: sDate, selectedMonth: sMonth } = filtersRef.current;
          loadAllAttendance(fType, sDate, sMonth);
        }
      });
    });

    return () => {
      isMounted = false;
      if (socket) {
        socket.disconnect();
      }
    };
  }, [isManagement, user]);

  useEffect(() => {
    loadTodayAndHistory();
    if (isManagement) {
      loadAllAttendance('today', new Date().toISOString().substring(0, 10));
    }
  }, [isManagement]);

  useEffect(() => {
    let interval = null;
    if (todayAttendance && !todayAttendance.checkOut) {
      interval = setInterval(() => {
        const now = new Date();
        const checkInTime = new Date(todayAttendance.checkIn);
        let diffMs = now - checkInTime;

        if (attendanceRules?.lunchBreakStart && attendanceRules?.lunchBreakEnd) {
          const lunchStart = new Date(now);
          const [lsH, lsM] = attendanceRules.lunchBreakStart.split(':').map(Number);
          lunchStart.setHours(lsH, lsM, 0, 0);

          const lunchEnd = new Date(now);
          const [leH, leM] = attendanceRules.lunchBreakEnd.split(':').map(Number);
          lunchEnd.setHours(leH, leM, 0, 0);

          const overlapStart = checkInTime > lunchStart ? checkInTime : lunchStart;
          const overlapEnd = now < lunchEnd ? now : lunchEnd;

          if (overlapStart < overlapEnd) {
            diffMs -= (overlapEnd - overlapStart);
          }
        }

        diffMs = Math.max(0, diffMs);
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

        const pad = (num) => String(num).padStart(2, '0');
        setWorkedTimeDisplay(`${pad(hours)}:${pad(minutes)}:${pad(seconds)}`);
      }, 1000);
    } else {
      setWorkedTimeDisplay('00:00:00');
    }
    return () => clearInterval(interval);
  }, [todayAttendance, attendanceRules]);

  const loadTodayAndHistory = async () => {
    try {
      const [todayRes, historyRes, rulesRes, docsRes] = await Promise.all([
        api.get('/attendance/today'),
        api.get('/attendance/my-history'),
        api.get('/attendance/rules'),
        Promise.all([
          api.get('/documents', { folder: 'Văn bản nội bộ' }),
          api.get('/documents', { folder: 'Thông báo công ty' }),
          api.get('/documents', { folder: 'Quy trình các Phòng/Ban' })
        ]).then(results => ({
          documents: results.flatMap(item => item.documents || [])
        })).catch(() => ({ documents: [] }))
      ]);
      setTodayAttendance(todayRes.attendance);
      setAttendanceRequired(todayRes.attendanceRequired !== false);
      setHistory(historyRes.history || []);
      setAttendanceRules(rulesRes.rules);
      const uniqueDocs = Array.from(new Map((docsRes.documents || []).map(doc => [doc._id, doc])).values());
      setInternalDocs(uniqueDocs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 3));
    } catch (err) {
      console.error('Failed to load attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAllAttendance = async (type = filterType, dateVal = selectedDate, monthVal = selectedMonth) => {
    try {
      setLoading(true);
      let url = '/attendance/list';
      if (type === 'today') {
        url += `?date=${dateVal}`;
      } else {
        url += `?month=${monthVal}`;
      }
      const res = await api.get(url);
      setAllAttendance(res.list || []);
    } catch (err) {
      console.error('Failed to load all attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadStaffs = async () => {
    try {
      const res = await api.get('/users');
      setStaffs(res.users || []);
    } catch (err) {
      console.error('Failed to load staffs', err);
    }
  };

  const formatLocalTime = (isoString) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const handleEdit = (record) => {
    setEditingRecord(record);
    setFormData({
      targetUser: record.user?._id || '',
      date: record.date || selectedDate,
      status: record.status === 'absent' ? 'leave' : record.status,
      checkIn: formatLocalTime(record.checkIn),
      checkOut: formatLocalTime(record.checkOut),
      workHours: record.workHours || 0,
      overtimeHours: record.overtimeHours || 0,
      overtimeApproved: record.overtimeApproved === true,
      note: record.note || '',
      proofUrl: record.proofUrl || ''
    });
    setEvidenceFiles([]);
    setShowModal(true);
  };

  const handleAddManual = () => {
    setEditingRecord(null);
    setFormData({
      targetUser: '',
      date: selectedDate,
      status: 'leave',
      checkIn: '',
      checkOut: '',
      workHours: 0,
      overtimeHours: 0,
      overtimeApproved: false,
      note: '',
      proofUrl: ''
    });
    loadStaffs();
    setShowModal(true);
  };

  const handleSaveModal = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);

      const submitData = { ...formData };
      const workedStatuses = ['present', 'late', 'half_day', 'missing_checkout'];
      if (workedStatuses.includes(submitData.status) && !submitData.checkIn) {
        toast.error('Vui lòng nhập giờ vào thực tế');
        return;
      }
      if (submitData.checkIn) submitData.checkIn = new Date(submitData.checkIn).toISOString();
      if (submitData.checkOut) submitData.checkOut = new Date(submitData.checkOut).toISOString();

      if (editingRecord && editingRecord._id) {
        await api.put(`/attendance/${editingRecord._id}`, submitData);
        toast.success('Cập nhật thành công');
      } else {
        const payload = {
          ...submitData,
          targetUser: submitData.targetUser || (editingRecord ? editingRecord.user?._id : ''),
          date: submitData.date || (editingRecord ? editingRecord.date : selectedDate)
        };
        await api.post('/attendance/manual', payload);
        toast.success('Thêm mới thành công');
      }
      setShowModal(false);
      loadAllAttendance();
      loadTodayAndHistory();
    } catch (err) {
      toast.error(err.message || 'Có lỗi xảy ra');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUploadEvidence = async () => {
    if (!editingRecord?._id || evidenceFiles.length === 0) return;
    try {
      setUploadingEvidence(true);
      const formData = new FormData();
      evidenceFiles.forEach(f => formData.append('files', f));

      const data = await api.upload(`/attendance/${editingRecord._id}/evidence`, formData);

      toast.success(data.message);
      setEvidenceFiles([]);
      setEditingRecord(data.attendance);
    } catch (err) {
      toast.error(err.message || 'Lỗi tải lên');
    } finally {
      setUploadingEvidence(false);
    }
  };

  const handleDeleteEvidence = async (evidenceId) => {
    if (!editingRecord?._id) return;
    try {
      const res = await api.delete(`/attendance/${editingRecord._id}/evidence/${evidenceId}`);
      toast.success('Đã xóa bằng chứng');
      setEditingRecord(res.attendance);
    } catch (err) {
      toast.error(err.message || 'Lỗi xóa');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (fileType) => {
    if (fileType === 'image') return <ImageIcon size={16} />;
    if (fileType === 'pdf') return <FileText size={16} style={{ color: '#ef4444' }} />;
    if (fileType === 'doc') return <FileText size={16} style={{ color: '#3b82f6' }} />;
    return <Paperclip size={16} />;
  };

  const handleExportExcel = async () => {
    if (!canExportAttendance) {
      toast.error('Bạn chưa được cấp quyền xuất báo cáo chấm công');
      return;
    }
    const exportRows = selectedExportUsers.length
      ? allAttendance.filter(item => selectedExportUsers.includes(item.user?._id))
      : allAttendance;
    if (exportRows.length === 0) {
      toast('Không có dữ liệu để xuất');
      return;
    }

    try {
      toast.loading('Đang khởi tạo tệp Excel...');
      await api.post('/attendance/authorize-export');
      const { default: ExcelJS } = await import('exceljs');
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Báo Cáo Chấm Công');

      // Định nghĩa các cột
      const columns = [];
      if (exportColumns.user) columns.push({ header: 'Nhân viên', key: 'user', width: 25 });
      if (exportColumns.email) columns.push({ header: 'Email', key: 'email', width: 25 });
      if (exportColumns.department) columns.push({ header: 'Phòng ban', key: 'department', width: 20 });
      if (exportColumns.role) columns.push({ header: 'Chức vụ', key: 'role', width: 20 });
      if (exportColumns.date) columns.push({ header: 'Ngày', key: 'date', width: 15 });
      if (exportColumns.checkIn) columns.push({ header: 'Giờ vào', key: 'checkIn', width: 12 });
      if (exportColumns.checkOut) columns.push({ header: 'Giờ ra', key: 'checkOut', width: 12 });
      if (exportColumns.workHours) columns.push({ header: 'Số giờ làm', key: 'workHours', width: 12 });
      if (exportColumns.extraHours) columns.push({ header: 'Giờ làm thêm (> 8h)', key: 'extraHours', width: 18 });
      if (exportColumns.overtimeHours) columns.push({ header: 'Tăng ca được công nhận', key: 'overtimeHours', width: 22 });
      if (exportColumns.status) columns.push({ header: 'Trạng thái', key: 'status', width: 15 });
      if (exportColumns.note) columns.push({ header: 'Lý do / Ghi chú', key: 'note', width: 35 });
      if (exportColumns.evidences) columns.push({ header: 'Bằng chứng', key: 'evidences', width: 28 });

      worksheet.columns = columns;

      // Định dạng dòng Header
      const headerRow = worksheet.getRow(1);
      headerRow.height = 28;
      headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF0284C7' } // Màu xanh primary
        };
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      });

      const imagePromises = [];

      exportRows.forEach((item, rowIndex) => {
        const rowData = {};
        if (exportColumns.user) rowData.user = item.user?.fullName || '';
        if (exportColumns.email) rowData.email = item.user?.email || '';
        if (exportColumns.department) rowData.department = departmentNames[item.user?.department] || item.user?.department || '';
        if (exportColumns.role) rowData.role = roleNames[item.user?.role] || item.user?.role || '';
        if (exportColumns.date) rowData.date = formatDate(item.date);
        if (exportColumns.checkIn) rowData.checkIn = formatTime(item.checkIn);
        if (exportColumns.checkOut) rowData.checkOut = formatTime(item.checkOut);
        if (exportColumns.workHours) rowData.workHours = item.workHours || 0;
        if (exportColumns.extraHours) rowData.extraHours = Math.max(0, Math.ceil(((Number(item.workHours) || 0) - 8) * 10) / 10);
        if (exportColumns.overtimeHours) rowData.overtimeHours = item.overtimeApproved ? (item.overtimeHours || 0) : 0;
        if (exportColumns.status) {
          const style = getStatusBadgeStyle(item.status);
          rowData.status = style ? style.label : 'Vắng';
        }
        if (exportColumns.note) rowData.note = item.note || '';

        const newRow = worksheet.addRow(rowData);
        newRow.height = exportColumns.evidences ? 65 : 24;
        newRow.eachCell((cell) => {
          cell.alignment = { vertical: 'middle' };
        });

        // Xử lý chèn ảnh hoặc file đính kèm
        if (exportColumns.evidences) {
          let imageUrl = null;

          if (item.evidences && item.evidences.length > 0) {
            const firstImage = item.evidences.find(ev => ev.fileType === 'image');
            if (firstImage) {
              imageUrl = `${getBaseUrl()}${firstImage.fileUrl}`;
            } else {
              const firstFile = item.evidences[0];
              newRow.getCell('evidences').value = {
                text: firstFile.fileName,
                hyperlink: `${getBaseUrl()}${firstFile.fileUrl}`
              };
            }
          } else if (item.proofUrl) {
            if (item.proofUrl.match(/\.(jpeg|jpg|gif|png|webp)/i)) {
              imageUrl = item.proofUrl;
            } else {
              newRow.getCell('evidences').value = {
                text: 'Xem bằng chứng',
                hyperlink: item.proofUrl
              };
            }
          }

          if (imageUrl) {
            const excelRowIndex = rowIndex + 2; // header là 1, data bắt đầu từ 2
            const colIndex = columns.findIndex(col => col.key === 'evidences') + 1; // 1-indexed

            imagePromises.push(
              fetch(imageUrl, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('travelops_token')}` }
              })
                .then((res) => {
                  if (!res.ok) throw new Error('Fetch image failed');
                  return res.blob();
                })
                .then((blob) => blob.arrayBuffer())
                .then((buffer) => {
                  const extension = imageUrl.split('.').pop().toLowerCase() || 'png';
                  const imgId = workbook.addImage({
                    buffer: buffer,
                    extension: extension === 'jpg' ? 'jpeg' : extension
                  });
                  worksheet.addImage(imgId, {
                    tl: { col: colIndex - 1, row: excelRowIndex - 1 },
                    ext: { width: 150, height: 75 },
                    editAs: 'oneCell'
                  });
                })
                .catch((err) => {
                  console.error('Failed to embed image:', err);
                  newRow.getCell('evidences').value = {
                    text: 'Xem ảnh (Lỗi nhúng)',
                    hyperlink: imageUrl
                  };
                })
            );
          }
        }
      });

      if (imagePromises.length > 0) {
        toast.dismiss();
        toast.loading(`Đang tải xuống và nhúng ${imagePromises.length} ảnh bằng chứng...`);
        await Promise.all(imagePromises);
      }

      toast.dismiss();
      toast.success('Khởi tạo Excel thành công!');

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `Báo_cáo_chấm_công_${filterType === 'today' ? selectedDate : selectedMonth}.xlsx`;
      anchor.click();
      window.URL.revokeObjectURL(url);
      setShowExportModal(false);
    } catch (error) {
      toast.dismiss();
      console.error('Export error:', error);
      toast.error('Lỗi khi xuất tệp tin Excel');
    }
  };

  const openExportModal = async () => {
    if (!staffs.length) await loadStaffs();
    setExportUserSearch('');
    setSelectedExportUsers([]);
    setShowExportModal(true);
  };

  const loadUserAttendanceDetail = async (employee, month = detailMonth) => {
    if (!employee?._id) return;
    try {
      setLoadingDetail(true);
      const res = await api.get(`/attendance/list?month=${month}&user=${employee._id}`);
      setAttendanceDetail({ user: employee, records: res.list || [] });
    } catch (err) {
      toast.error(err.message || 'Không thể tải chi tiết chấm công');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleCheckIn = async () => {
    try {
      setSubmitting(true);
      let wifiSSID = null;
      if (window.electron && typeof window.electron.getWifiSSID === 'function') {
        wifiSSID = await window.electron.getWifiSSID();
      }
      const res = await api.post('/attendance/check-in', { wifiSSID });
      toast(res.message);
      loadTodayAndHistory();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckOut = async () => {
    try {
      setSubmitting(true);
      let wifiSSID = null;
      if (window.electron && typeof window.electron.getWifiSSID === 'function') {
        wifiSSID = await window.electron.getWifiSSID();
      }
      const res = await api.post('/attendance/check-out', { wifiSSID });
      toast(res.message);
      loadTodayAndHistory();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="loading-overlay"><div className="loading-spinner" /></div>;
  }

  const formatTime = (isoStr) => {
    if (!isoStr) return '--:--';
    return new Date(isoStr).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
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

  const handleDownloadDocument = (doc) => {
    const url = getDocumentViewUrl(doc, 'attachment');
    if (!url) {
      toast.error('Không tìm thấy link tải tài liệu');
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="animate-fadeIn attendance-page">
      <div className="page-header">
        <h1>
          <Clock size={24} /> Chấm Công & Điểm Danh
        </h1>
        <span className="text-secondary text-sm">
          {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </span>
      </div>

      {/* Tabs if management */}
      {isManagement && (
        <div className="tabs attendance-tabs" style={{ marginBottom: 20 }}>
          <button
            className={`tab-item ${activeTab === 'my' ? 'active' : ''}`}
            onClick={() => setActiveTab('my')}
          >
            Chấm công cá nhân
          </button>
          <button
            className={`tab-item ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            Báo cáo toàn công ty
          </button>
        </div>
      )}

      {activeTab === 'my' ? (
        <>
          {internalDocs.length > 0 && (
            <div className="card" style={{
              marginBottom: 16,
              padding: 16,
              border: '1px solid rgba(14, 165, 233, 0.28)',
              background: 'rgba(14, 165, 233, 0.08)'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <span style={{ width: 38, height: 38, borderRadius: 8, background: 'rgba(14, 165, 233, 0.16)', color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <FileText size={20} />
                </span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="font-semibold" style={{ marginBottom: 4 }}>Văn bản nội bộ mới</div>
                  <div className="text-sm text-muted" style={{ display: 'grid', gap: 4 }}>
                    {internalDocs.map(doc => (
                      <span key={doc._id} className="truncate">
                        {doc.name} <span style={{ opacity: 0.75 }}>• {doc.folder}</span>
                      </span>
                    ))}
                  </div>
                </div>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPreviewDocument(internalDocs[0])}>
                  <Eye size={14} /> Xem
                </button>
              </div>
            </div>
          )}

          {/* Check-in / Check-out Action Box */}
          <div className="card attendance-check-card" style={{
            marginBottom: 24,
            padding: 24,
            background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.15), rgba(34, 197, 94, 0.15))',
            border: '1px solid rgba(14, 165, 233, 0.3)',
            boxShadow: '0 4px 20px rgba(14, 165, 233, 0.1)'
          }}>
            <div className="attendance-check-layout" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
              <div className="attendance-check-copy">
                <h3 style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: 6, color: 'var(--text-primary)' }}>
                  {!attendanceRequired
                    ? 'Tài khoản này không yêu cầu chấm công'
                    : todayAttendance?.checkOut
                      ? '🎉 Bạn đã hoàn thành ngày làm việc!'
                      : todayAttendance
                        ? (
                          <div className="attendance-running-title" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <span>⏱️ Bạn đang trong ca làm việc</span>
                            <span style={{
                              fontFamily: 'monospace',
                              background: 'rgba(0,0,0,0.1)',
                              padding: '4px 10px',
                              borderRadius: 6,
                              fontSize: '1.15rem'
                            }}>{workedTimeDisplay}</span>
                          </div>
                        )
                        : '👋 Chào buổi sáng! Hãy điểm danh vào ca'}
                </h3>
                <p style={{ color: 'var(--text-primary)', opacity: 0.9, fontSize: '0.95rem', fontWeight: 500 }}>
                  {!attendanceRequired
                    ? 'Bạn vẫn có thể xem lịch sử và văn bản nội bộ, nhưng không bị tính vắng/đi muộn.'
                    : todayAttendance
                      ? `Giờ vào: ${formatTime(todayAttendance.checkIn)} ${todayAttendance.checkOut ? `• Giờ ra: ${formatTime(todayAttendance.checkOut)} (${todayAttendance.workHours} giờ)` : ''}`
                      : 'Vui lòng nhấn nút "Điểm Danh Vào Ca" để ghi nhận thời gian làm việc hôm nay.'}
                </p>
              </div>

              <div className="attendance-primary-action" style={{ display: 'flex', gap: 12 }}>
                {!attendanceRequired ? (
                  <span className="badge badge-ghost" style={{ padding: '8px 16px', fontSize: '0.875rem' }}>
                    Không bắt buộc
                  </span>
                ) : !todayAttendance ? (
                  <button
                    className="btn btn-primary btn-lg"
                    onClick={() => setConfirmModal({ show: true, action: 'check-in', title: 'Xác nhận Điểm Danh Vào Ca', message: 'Bạn có chắc chắn muốn điểm danh vào ca lúc này?' })}
                    disabled={submitting}
                    style={{ padding: '12px 24px', fontSize: '1rem', background: '#22C55E' }}
                  >
                    <CheckCircle size={20} /> Điểm Danh Vào Ca
                  </button>
                ) : !todayAttendance.checkOut ? (
                  <button
                    className="btn btn-lg"
                    onClick={() => setConfirmModal({ show: true, action: 'check-out', title: 'Xác nhận Điểm Danh Ra Ca', message: 'Bạn có chắc chắn muốn điểm danh ra ca lúc này?' })}
                    disabled={submitting}
                    style={{ padding: '12px 24px', fontSize: '1rem', background: '#F59E0B', color: '#FFFFFF', border: 'none' }}
                  >
                    <LogOut size={20} /> Điểm Danh Ra Ca
                  </button>
                ) : (
                  <span className="badge badge-success" style={{ padding: '8px 16px', fontSize: '0.875rem' }}>
                    <ShieldCheck size={16} style={{ marginRight: 6 }} /> Đã Hoàn Thành Ca
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Personal History */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                <Calendar size={18} style={{ color: 'var(--primary)' }} />
                Lịch sử chấm công gần đây (30 ngày)
              </div>
            </div>
            <div className="card-body">
              {history.length === 0 ? (
                <div className="text-muted text-center" style={{ padding: 24 }}>Chưa có dữ liệu chấm công nào</div>
              ) : (
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th style={{ padding: '12px 16px', textAlign: 'left', whiteSpace: 'nowrap' }}>Ngày</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', whiteSpace: 'nowrap' }}>Giờ vào</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', whiteSpace: 'nowrap' }}>Giờ ra</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', whiteSpace: 'nowrap' }}>Số giờ</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', whiteSpace: 'nowrap' }}>Giờ làm thêm</th>
                        {attendanceRules?.allowOvertime && <th style={{ padding: '12px 16px', textAlign: 'left', whiteSpace: 'nowrap' }}>Tăng ca công nhận</th>}
                        <th style={{ padding: '12px 16px', textAlign: 'left', whiteSpace: 'nowrap' }}>Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map(item => (
                        <tr key={item._id}>
                          <td className="font-medium" style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)' }}>{formatDate(item.date)}</td>
                          <td className="text-success" style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)' }}>{formatTime(item.checkIn)}</td>
                          <td className="text-warning" style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)' }}>{formatTime(item.checkOut)}</td>
                          <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)' }}>{item.checkOut || item.workHours > 0 ? `${item.workHours}h` : '--'}</td>
                          <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)', color: Number(item.workHours) > 8 ? '#f59e0b' : 'var(--text-muted)' }}>{Number(item.workHours) > 8 ? `${Math.ceil((Number(item.workHours) - 8) * 10) / 10}h` : '--'}</td>
                          {attendanceRules?.allowOvertime && (
                            <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)' }}>
                              {item.overtimeHours > 0 ? `${item.overtimeHours}h` : '--'}
                            </td>
                          )}
                          <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)' }}>
                            {(() => {
                              const style = getStatusBadgeStyle(item.status);
                              return (
                                <span
                                  className="badge"
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    background: style.bg,
                                    color: style.text,
                                    border: style.border
                                  }}
                                >
                                  {style.label}
                                  {item.status === 'leave' && item.proofUrl && (
                                    <a href={item.proofUrl} target="_blank" rel="noreferrer" title="Xem bằng chứng" style={{ color: 'var(--primary)', display: 'inline-flex' }}>
                                      <ExternalLink size={14} />
                                    </a>
                                  )}
                                </span>
                              );
                            })()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        /* Management All Staff Attendance View */
        <div className="card attendance-company-card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, borderBottom: '1px solid var(--border-light)', paddingBottom: 16 }}>
            <div className="card-title">
              <Users size={18} style={{ color: 'var(--info)' }} />
              Báo cáo chấm công {filterType === 'today' ? 'hôm nay' : 'theo tháng'}
            </div>
            <div className="attendance-filters" style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <select
                value={filterType}
                onChange={(e) => {
                  setFilterType(e.target.value);
                  loadAllAttendance(e.target.value, selectedDate, selectedMonth);
                }}
                className="form-control"
                style={{ padding: '6px 12px', borderRadius: 'var(--radius-sm)', width: 'auto', background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              >
                <option value="today">Xem theo ngày</option>
                <option value="month">Xem theo tháng</option>
              </select>

              {filterType === 'today' ? (
                <div style={{ display: 'inline-block' }}>
                  <DatePickerVN
                    value={selectedDate}
                    onChange={(e) => {
                      setSelectedDate(e.target.value);
                      loadAllAttendance('today', e.target.value, selectedMonth);
                    }}
                    className="form-control"
                  />
                </div>
              ) : (
                <div style={{ display: 'inline-block' }}>
                  <DatePickerVN
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => {
                      setSelectedMonth(e.target.value);
                      loadAllAttendance('month', selectedDate, e.target.value);
                    }}
                    className="form-control"
                  />
                </div>
              )}

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="form-control"
                style={{ padding: '6px 12px', borderRadius: 'var(--radius-sm)', width: 'auto', background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="present">Đúng giờ</option>
                <option value="late">Đi muộn</option>
                <option value="leave">Nghỉ phép</option>
                <option value="half_day">Nghỉ nửa ngày</option>
                <option value="missing_checkout">Quên chấm công ra về</option>
                <option value="absent">Vắng không phép</option>
                <option value="holiday">Nghỉ lễ</option>
                <option value="company_trip">Du lịch công ty</option>
                <option value="off_day">Ngày nghỉ tuần</option>
              </select>

              {canExportAttendance && <button
                onClick={openExportModal}
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'var(--primary)', color: '#fff', borderRadius: 'var(--radius-sm)' }}
              >
                <Download size={16} /> Xuất Báo Cáo
              </button>}

              <button
                onClick={handleAddManual}
                className="btn"
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#22C55E', color: '#fff', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer' }}
              >
                <Plus size={16} /> Thêm vắng mặt/Nghỉ phép
              </button>
            </div>
          </div>
          <div className="card-body">
            {allAttendance.filter(item => statusFilter === 'all' || item.status === statusFilter).length === 0 ? (
              <div className="text-muted text-center" style={{ padding: 24 }}>Không có dữ liệu chấm công phù hợp</div>
            ) : (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      {filterType === 'month' && <th style={{ padding: '12px 16px', textAlign: 'left', whiteSpace: 'nowrap' }}>Ngày</th>}
                      <th style={{ padding: '12px 16px', textAlign: 'left', whiteSpace: 'nowrap' }}>Nhân viên</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', whiteSpace: 'nowrap' }}>Phòng ban</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', whiteSpace: 'nowrap' }}>Giờ vào</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', whiteSpace: 'nowrap' }}>Giờ ra</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', whiteSpace: 'nowrap' }}>Số giờ</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', whiteSpace: 'nowrap' }}>Giờ làm thêm</th>
                      {attendanceRules?.allowOvertime && <th style={{ padding: '12px 16px', textAlign: 'left', whiteSpace: 'nowrap' }}>Tăng ca công nhận</th>}
                      <th style={{ padding: '12px 16px', textAlign: 'left', whiteSpace: 'nowrap' }}>Trạng thái</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', whiteSpace: 'nowrap' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allAttendance
                      .filter(item => statusFilter === 'all' || item.status === statusFilter)
                      .map(item => (
                        <tr key={item._id || `${item.user?._id}-${item.date}`}>
                          {filterType === 'month' && <td className="font-medium" style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)' }}>{formatDate(item.date)}</td>}
                          <td className="font-semibold" style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)' }}>{item.user?.fullName}</td>
                          <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)' }}><span className="badge badge-ghost">{departmentNames[item.user?.department] || item.user?.department || ''}</span></td>
                          <td className="text-success" style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)' }}>{formatTime(item.checkIn)}</td>
                          <td className="text-warning" style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)' }}>{formatTime(item.checkOut)}</td>
                          <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)' }}>{item.checkOut || item.workHours > 0 ? `${item.workHours}h` : '--'}</td>
                          <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)', color: Number(item.workHours) > 8 ? '#f59e0b' : 'var(--text-muted)' }}>{Number(item.workHours) > 8 ? `${Math.ceil((Number(item.workHours) - 8) * 10) / 10}h` : '--'}</td>
                          {attendanceRules?.allowOvertime && (
                            <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)' }}>
                              {item.overtimeHours > 0 ? `${item.overtimeHours}h` : '--'}
                            </td>
                          )}
                          <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)' }}>
                            {(() => {
                              const style = getStatusBadgeStyle(item.status);
                              return (
                                <span
                                  className="badge"
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    background: style.bg,
                                    color: style.text,
                                    border: style.border
                                  }}
                                >
                                  {style.label}
                                  {item.status === 'leave' && item.proofUrl && (
                                    <a href={item.proofUrl} target="_blank" rel="noreferrer" title="Xem bằng chứng" style={{ color: 'var(--primary)', display: 'inline-flex' }}>
                                      <ExternalLink size={14} />
                                    </a>
                                  )}
                                  {item.evidences && item.evidences.map((ev, idx) => (
                                    <a
                                      key={ev._id || idx}
                                      href={`${getBaseUrl()}${ev.fileUrl}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      title={`Xem bằng chứng: ${ev.fileName}`}
                                      style={{ color: style.text, display: 'inline-flex', marginLeft: 4 }}
                                    >
                                      <Paperclip size={14} />
                                    </a>
                                  ))}
                                </span>
                              );
                            })()}
                          </td>
                          <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)' }}>
                            <button
                              onClick={() => {
                                setDetailMonth(filterType === 'month' ? selectedMonth : item.date.substring(0, 7));
                                loadUserAttendanceDetail(item.user, filterType === 'month' ? selectedMonth : item.date.substring(0, 7));
                              }}
                              style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: '4px 8px' }}
                              title={`Xem chi tiết chấm công của ${item.user?.fullName}`}
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              onClick={() => handleEdit(item)}
                              style={{ background: 'transparent', border: 'none', color: 'var(--info)', cursor: 'pointer', padding: '4px 8px' }}
                              title="Chỉnh sửa"
                            >
                              <Edit size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Chỉnh sửa / Thêm mới */}
      {showModal && (
        <div className="modal-overlay attendance-modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-content animate-scale attendance-edit-modal" style={{ background: 'var(--bg-primary)', padding: 24, borderRadius: 12, width: '100%', maxWidth: 500, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem' }}>{editingRecord ? 'Chỉnh sửa chấm công' : 'Thêm vắng mặt/Nghỉ phép'}</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleSaveModal}>
              {editingRecord ? (
                <div style={{ marginBottom: 16, padding: 12, background: 'var(--bg-secondary)', borderRadius: 8, fontSize: '0.9rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ color: 'var(--text-muted)' }}>Nhân viên:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{editingRecord.user?.fullName}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Ngày:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{formatDate(editingRecord.date)}</strong>
                  </div>
                </div>
              ) : (
                <>
                  <div className="form-group">
                    <label>Ngày</label>
                    <DatePickerVN value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label>Nhân viên</label>
                    <select className="form-control" value={formData.targetUser} onChange={e => setFormData({ ...formData, targetUser: e.target.value })} required>
                      <option value="">-- Chọn nhân viên --</option>
                      {staffs.map(staff => (
                        <option key={staff._id} value={staff._id}>{staff.fullName} ({staff.department})</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <div className="form-group">
                <label>Trạng thái</label>
                <select className="form-control" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                  <option value="present">Đúng giờ (Có mặt)</option>
                  <option value="late">Đi muộn</option>
                  <option value="leave">Nghỉ phép (Cả ngày)</option>
                  <option value="half_day">Nghỉ nửa ngày</option>
                  <option value="missing_checkout">Quên chấm công ra về</option>
                </select>
              </div>

              {(formData.status === 'present' || formData.status === 'late' || formData.status === 'half_day' || formData.status === 'missing_checkout') && (
                <>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Giờ vào thực tế *</label>
                      <DatePickerVN type="datetime" value={formData.checkIn} onChange={e => setFormData({ ...formData, checkIn: e.target.value })} required />
                    </div>
                    <div className="form-group">
                      <label>Giờ ra (Tùy chọn)</label>
                      <DatePickerVN type="datetime" value={formData.checkOut} onChange={e => setFormData({ ...formData, checkOut: e.target.value })} />
                    </div>
                  </div>
                  {formData.checkIn && formData.checkOut && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '11px 13px', marginTop: -4, marginBottom: 14, borderRadius: 10, border: '1px solid rgba(14, 165, 233, 0.28)', background: 'var(--primary-ghost)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--text-secondary)', fontSize: '0.82rem' }}><Clock size={16} style={{ color: 'var(--primary)' }} /> Thời gian làm dự kiến <small>(đã trừ nghỉ trưa)</small></span>
                      <strong style={{ color: 'var(--primary)', fontSize: '1rem' }}>{calculateWorkHoursPreview(formData.checkIn, formData.checkOut, attendanceRules, formData.date) ?? 0} giờ</strong>
                    </div>
                  )}
                </>
              )}

              {attendanceRules?.allowOvertime && <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer' }}>
                  <input type="checkbox" checked={formData.overtimeApproved} onChange={e => setFormData({ ...formData, overtimeApproved: e.target.checked })} />
                  Xác nhận tính tăng ca cho ngày này
                </label>
                <small className="text-muted">Chỉ khi bật, thời gian làm vượt giờ tiêu chuẩn mới được ghi nhận là tăng ca.</small>
              </div>}

              {formData.status === 'leave' && user?.role === 'hr_manager' && (
                <div className="form-group">
                  <label>Link bằng chứng duyệt nghỉ phép (URL - Legacy)</label>
                  <input type="url" className="form-control" placeholder="https://drive.google.com/..." value={formData.proofUrl} onChange={e => setFormData({ ...formData, proofUrl: e.target.value })} />
                </div>
              )}

              <div className="form-group">
                <label>Ghi chú</label>
                <textarea className="form-control" rows="2" value={formData.note} onChange={e => setFormData({ ...formData, note: e.target.value })}></textarea>
              </div>

              {/* Evidence Upload Section */}
              {editingRecord && editingRecord._id && (
                <div className="form-group" style={{ borderTop: '1px solid var(--border-light)', paddingTop: 16, marginTop: 16 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                    <Paperclip size={16} /> Bằng chứng đi kèm (ảnh, pdf, doc)
                  </label>

                  {editingRecord.evidences && editingRecord.evidences.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                      {editingRecord.evidences.map(ev => (
                        <div key={ev._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 6, fontSize: '0.85rem' }}>
                          <a href={`${getBaseUrl()}${ev.fileUrl}`} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)', textDecoration: 'none' }}>
                            {getFileIcon(ev.fileType)}
                            <span style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={ev.fileName}>{ev.fileName}</span>
                            <span style={{ color: 'var(--text-muted)' }}>({formatFileSize(ev.fileSize)})</span>
                          </a>
                          <button type="button" onClick={() => handleDeleteEvidence(ev._id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: 2 }}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      type="file"
                      id="evidence-upload"
                      multiple
                      style={{ display: 'none' }}
                      onChange={e => setEvidenceFiles(Array.from(e.target.files))}
                    />
                    <label htmlFor="evidence-upload" className="btn btn-ghost" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', margin: 0, padding: '8px 12px' }}>
                      <Upload size={16} /> Chọn File
                    </label>
                    {evidenceFiles.length > 0 && (
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Đã chọn {evidenceFiles.length} file</span>
                    )}
                    {evidenceFiles.length > 0 && (
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleUploadEvidence}
                        disabled={uploadingEvidence}
                        style={{ padding: '8px 12px' }}
                      >
                        {uploadingEvidence ? 'Đang tải lên...' : 'Tải lên'}
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Đang lưu...' : 'Lưu lại'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Xác nhận */}
      {confirmModal.show && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-content animate-scale" style={{ background: 'var(--bg-primary)', padding: 24, borderRadius: 12, width: '100%', maxWidth: 400, border: '1px solid var(--border)', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--accent-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
                <AlertCircle size={24} />
              </div>
            </div>
            <h3 style={{ margin: '0 0 12px', fontSize: '1.25rem', color: 'var(--text-h)' }}>{confirmModal.title}</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: 24, lineHeight: 1.5 }}>{confirmModal.message}</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setConfirmModal({ show: false, action: null, title: '', message: '' })}>Hủy bỏ</button>
              <button type="button" className="btn btn-primary" onClick={() => {
                if (confirmModal.action === 'check-in') handleCheckIn();
                else if (confirmModal.action === 'check-out') handleCheckOut();
                setConfirmModal({ show: false, action: null, title: '', message: '' });
              }}>Xác nhận</button>
            </div>
          </div>
        </div>
      )}
      {/* Modal Xuất Excel */}
      {showExportModal && canExportAttendance && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-content animate-scale attendance-export-modal" style={{ background: 'var(--bg-primary)', padding: 24, borderRadius: 12, width: '100%', maxWidth: 620, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div><h3 style={{ margin: 0, fontSize: '1.25rem' }}>Xuất báo cáo chấm công</h3><div className="text-xs text-muted">Chọn nhân viên và các trường muốn đưa vào Excel</div></div>
              <button onClick={() => setShowExportModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <div className="attendance-export-users">
              <div className="attendance-export-section-title"><UserRound size={16} /><b>Nhân viên cần xuất</b><span>{selectedExportUsers.length ? `Đã chọn ${selectedExportUsers.length}` : 'Tất cả nhân viên'}</span></div>
              <div className="attendance-user-search"><Search size={16} /><input value={exportUserSearch} onChange={(e) => setExportUserSearch(e.target.value)} placeholder="Tìm theo tên, email hoặc phòng ban..." /></div>
              <label className="attendance-user-option select-all">
                <input type="checkbox" checked={selectedExportUsers.length === 0} onChange={() => setSelectedExportUsers([])} />
                <span><b>Xuất tất cả nhân viên</b><small>Mặc định bao gồm toàn bộ dữ liệu trong kỳ đang xem</small></span>
              </label>
              <div className="attendance-user-list">
                {staffs
                  .filter(staff => {
                    const keyword = exportUserSearch.trim().toLowerCase();
                    return !keyword || `${staff.fullName} ${staff.email || ''} ${departmentNames[staff.department] || staff.department || ''}`.toLowerCase().includes(keyword);
                  })
                  .map(staff => (
                    <label className="attendance-user-option" key={staff._id}>
                      <input type="checkbox" checked={selectedExportUsers.includes(staff._id)} onChange={(e) => {
                        setSelectedExportUsers(current => e.target.checked ? [...current, staff._id] : current.filter(id => id !== staff._id));
                      }} />
                      <span><b>{staff.fullName}</b><small>{departmentNames[staff.department] || staff.department} {staff.email ? `• ${staff.email}` : ''}</small></span>
                    </label>
                  ))}
              </div>
            </div>

            <div className="attendance-export-section-title" style={{ marginTop: 18 }}><BarChart3 size={16} /><b>Cột dữ liệu</b></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px', marginBottom: 24 }}>
              {Object.keys(exportColumns).map(key => {
                const labels = {
                  user: 'Tên nhân viên', email: 'Email', department: 'Phòng ban', role: 'Chức vụ',
                  date: 'Ngày', checkIn: 'Giờ vào', checkOut: 'Giờ ra', workHours: 'Số giờ làm', extraHours: 'Giờ làm thêm (> 8h)', overtimeHours: 'Tăng ca được công nhận', status: 'Trạng thái',
                  note: 'Lý do / Ghi chú',
                  evidences: 'Bằng chứng kèm theo'
                };
                return (
                  <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: 'var(--text-primary)' }}>
                    <input type="checkbox" checked={exportColumns[key]} onChange={(e) => setExportColumns({ ...exportColumns, [key]: e.target.checked })} style={{ width: 18, height: 18, accentColor: 'var(--primary)' }} />
                    {labels[key]}
                  </label>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setShowExportModal(false)}>Hủy</button>
              <button type="button" className="btn btn-primary" onClick={handleExportExcel}><Download size={18} /> Xác nhận xuất</button>
            </div>
          </div>
        </div>
      )}

      {attendanceDetail && (
        <div className="modal-overlay attendance-detail-overlay" onClick={() => setAttendanceDetail(null)}>
          <div className="modal-content modal-lg attendance-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div><h2><UserRound size={20} /> Chi tiết chấm công</h2><div className="text-sm text-muted">{attendanceDetail.user.fullName} · {departmentNames[attendanceDetail.user.department] || attendanceDetail.user.department}</div></div>
              <button className="modal-close" onClick={() => setAttendanceDetail(null)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="attendance-detail-toolbar">
                <label>Tháng xem<DatePickerVN type="month" value={detailMonth} onChange={(e) => {
                  setDetailMonth(e.target.value);
                  loadUserAttendanceDetail(attendanceDetail.user, e.target.value);
                }} /></label>
                <button className="btn btn-ghost" onClick={() => loadUserAttendanceDetail(attendanceDetail.user, detailMonth)} disabled={loadingDetail}>Làm mới</button>
              </div>
              {loadingDetail ? <div style={{ minHeight: 240, display: 'grid', placeItems: 'center' }}><div className="loading-spinner" /></div> : (() => {
                const records = attendanceDetail.records || [];
                const totalHours = Number(records.reduce((sum, item) => sum + (Number(item.workHours) || 0), 0).toFixed(1));
                const presentDays = records.filter(item => ['present', 'late'].includes(item.status)).length;
                const lateDays = records.filter(item => item.status === 'late').length;
                const missingDays = records.filter(item => item.status === 'missing_checkout').length;
                return <>
                  <div className="attendance-detail-stats">
                    <div><small>Ngày có mặt</small><b>{presentDays}</b></div>
                    <div><small>Tổng giờ làm</small><b>{totalHours}h</b></div>
                    <div><small>Đi muộn</small><b>{lateDays}</b></div>
                    <div><small>Quên chấm ra</small><b>{missingDays}</b></div>
                  </div>
                  <div className="table-responsive">
                    <table className="data-table">
                      <thead><tr><th>Ngày</th><th>Giờ vào</th><th>Giờ ra</th><th>Số giờ</th><th>Trạng thái</th><th></th></tr></thead>
                      <tbody>{records.map(item => {
                        const badge = getStatusBadgeStyle(item.status);
                        return <tr key={item._id}><td>{formatDate(item.date)}</td><td className="text-success">{formatTime(item.checkIn)}</td><td className="text-warning">{formatTime(item.checkOut)}</td><td>{item.workHours || 0}h</td><td><span className="badge" style={{ background: badge.bg, color: badge.text, border: badge.border }}>{badge.label}</span></td><td><button className="btn btn-ghost btn-sm" onClick={() => { setAttendanceDetail(null); handleEdit(item); }}><Edit size={14} /> Sửa</button></td></tr>;
                      })}{!records.length && <tr><td colSpan="6" className="text-center text-muted" style={{ padding: 30 }}>Không có dữ liệu trong tháng này</td></tr>}</tbody>
                    </table>
                  </div>
                </>;
              })()}
            </div>
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
                <div className="text-sm text-muted">{previewDocument.folder} • {previewDocument.fileSize || '0 KB'}</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => handleDownloadDocument(previewDocument)}>
                    <Download size={14} /> Tải xuống
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setPreviewDocument(null); window.location.href = '/quanly/documents'; }}>
                    <ExternalLink size={14} /> Thư viện
                  </button>
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
