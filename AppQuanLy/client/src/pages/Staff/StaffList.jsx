import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useConfirm } from '../../contexts/ConfirmContext';
import api from '../../services/api';
import { departmentNames, roleNames, getInitials } from '../../utils/helpers';
import {
  Users, Plus, Search, Edit, Trash2, X, Mail, Key, Download, Clock
} from 'lucide-react';

export default function StaffList() {
  const { user, isDirector, canAccess } = useAuth();
  const confirm = useConfirm();
  const isIT = user?.department === 'it';
  const isHR = canAccess('staff.manage');
  const hasStaffManagePermission = isDirector || isIT || isHR;
  const hasDeptManagePermission = isDirector || isIT;

  const [activeTab, setActiveTab] = useState('staff'); // 'staff' | 'departments'
  
  // Staff states
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [showStaffForm, setShowStaffForm] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [viewStaff, setViewStaff] = useState(null);

  const [staffForm, setStaffForm] = useState({
    username: '', password: '123456', fullName: '', email: '', phone: '',
    department: '', role: '', position: '', attendanceRequired: true, permissions: []
  });

  // Department states
  const [departments, setDepartments] = useState([]);
  const [showDeptForm, setShowDeptForm] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [deptForm, setDeptForm] = useState({
    key: '', name: '', description: ''
  });

  useEffect(() => {
    loadDepartments();
  }, []);

  useEffect(() => {
    if (activeTab === 'staff') {
      loadStaff();
    } else {
      loadDepartments();
    }
  }, [activeTab, search, deptFilter]);

  const loadDepartments = async () => {
    try {
      const data = await api.get('/departments');
      setDepartments(data.departments || []);
    } catch (err) {
      console.error('Failed to load departments:', err);
    }
  };

  const loadStaff = async () => {
    try {
      const params = { limit: 50 };
      if (search) params.search = search;
      if (deptFilter) params.department = deptFilter;
      const data = await api.get('/users', params);
      setStaffList(data.users || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // User Form Submission
  const handleStaffSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingStaff) {
        await api.put(`/users/${editingStaff._id}`, staffForm);
        toast.success('Cập nhật nhân viên thành công!');
      } else {
        await api.post('/users', { ...staffForm, password: staffForm.password || '123456' });
        toast.success('Thêm nhân viên thành công! Nhân viên sẽ bắt buộc đổi mật khẩu ở lần đăng nhập đầu tiên.');
      }
      setShowStaffForm(false);
      setEditingStaff(null);
      loadStaff();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleStaffEdit = (staff) => {
    setEditingStaff(staff);
    setStaffForm({
      username: staff.username, password: '', fullName: staff.fullName,
      email: staff.email || '', phone: staff.phone || '',
      department: staff.department, role: staff.role, position: staff.position,
      attendanceRequired: staff.attendanceRequired !== false,
      permissions: staff.permissions || []
    });
    setShowStaffForm(true);
  };
  const handleResetPassword = async (staff) => {
    const isConfirmed = await confirm({
      title: 'Đặt lại mật khẩu',
      message: `Bạn có chắc muốn đặt lại mật khẩu của nhân viên "${staff.fullName}" về mặc định "123456" không?`,
      confirmText: 'Đặt lại',
      cancelText: 'Hủy',
      type: 'warning'
    });
    if (!isConfirmed) return;
    try {
      const res = await api.patch(`/users/${staff._id}/reset-password`);
      toast.success(res.message || 'Đặt lại mật khẩu thành công.');
    } catch (err) {
      toast.error(err.message);
    }
  };
  const handleStaffDelete = async (id) => {
    const staff = staffList.find(s => s._id === id);
    const isConfirmed = await confirm({
      title: 'Xóa nhân sự',
      message: `Bạn có chắc muốn xóa nhân viên "${staff?.fullName || ''}" khỏi hệ thống?`,
      confirmText: 'Xóa',
      cancelText: 'Hủy',
      type: 'danger'
    });
    if (!isConfirmed) return;
    try {
      await api.delete(`/users/${id}`);
      toast.success('Đã xóa nhân viên thành công');
      loadStaff();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const exportToExcel = () => {
    if (staffList.length === 0) {
      toast('Không có dữ liệu để xuất');
      return;
    }

    const headers = ['Mã/Username', 'Họ Và Tên', 'Phòng Ban', 'Chức Vụ', 'Vai Trò', 'Email', 'Số Điện Thoại', 'Chấm Công', 'Trạng Thái'];
    const rows = staffList.map(u => [
      u.username,
      u.fullName,
      departmentNames[u.department] || u.department,
      u.position,
      roleNames[u.role] || u.role,
      u.email || '',
      u.phone || '',
      u.attendanceRequired === false ? 'Không yêu cầu' : 'Bắt buộc',
      u.status === 'active' ? 'Đang làm việc' : 'Đã nghỉ'
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Danh Sách Nhân Sự');
    
    // Customize column widths
    const colWidths = [
      { wch: 15 }, // Username
      { wch: 25 }, // Tên
      { wch: 20 }, // Phòng ban
      { wch: 20 }, // Chức vụ
      { wch: 20 }, // Vai trò
      { wch: 25 }, // Email
      { wch: 15 }, // SĐT
      { wch: 15 }  // Trạng thái
    ];
    worksheet['!cols'] = colWidths;

    XLSX.writeFile(workbook, `Danh_Sach_Nhan_Su.xlsx`);
  };

  // Department Form Submission
  const handleDeptSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingDept) {
        await api.put(`/departments/${editingDept._id}`, {
          name: deptForm.name,
          description: deptForm.description
        });
        toast.success('Cập nhật phòng ban thành công!');
      } else {
        await api.post('/departments', deptForm);
        toast.success('Thêm phòng ban mới thành công!');
      }
      setShowDeptForm(false);
      setEditingDept(null);
      loadDepartments();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDeptEdit = (dept) => {
    setEditingDept(dept);
    setDeptForm({
      key: dept.key,
      name: dept.name,
      description: dept.description || ''
    });
    setShowDeptForm(true);
  };

  const handleDeptDelete = async (id) => {
    const dept = departments.find(d => d._id === id);
    const isConfirmed = await confirm({
      title: 'Xóa phòng ban',
      message: `Bạn có chắc muốn xóa phòng ban "${dept?.name || ''}"?`,
      confirmText: 'Xóa',
      cancelText: 'Hủy',
      type: 'danger'
    });
    if (!isConfirmed) return;
    try {
      await api.delete(`/departments/${id}`);
      toast.success('Đã xóa phòng ban thành công');
      loadDepartments();
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Dynamic roles helper
  const getRoleOptions = (deptKey) => {
    if (!deptKey) return [];
    if (deptKey === 'director') {
      return [{ value: 'director', label: 'Giám Đốc' }];
    }
    return [
      { value: `${deptKey}_manager`, label: 'Trưởng Phòng' },
      { value: `${deptKey}_staff`, label: 'Nhân Viên' }
    ];
  };

  // Dynamic names resolver
  const getDepartmentName = (deptKey) => {
    const dept = departments.find(d => d.key === deptKey);
    return dept ? dept.name : (departmentNames[deptKey] || deptKey);
  };

  const getRoleName = (roleKey) => {
    if (roleNames[roleKey]) return roleNames[roleKey];
    if (roleKey.endsWith('_manager')) return 'Trưởng Phòng';
    if (roleKey.endsWith('_staff')) return 'Nhân Viên';
    return roleKey;
  };

  const deptColors = {
    director: '#8B5CF6', hr: '#EC4899', sale: '#0EA5E9', marketing: '#F97316', it: '#22C55E', vp_luong_tai: '#14B8A6'
  };

  const getDeptColor = (deptKey) => {
    return deptColors[deptKey] || 'var(--accent)';
  };

  if (loading && activeTab === 'staff') {
    return <div className="loading-overlay"><div className="loading-spinner" /></div>;
  }

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <h1>
          <Users size={24} /> {hasDeptManagePermission ? 'Tổ Chức & Nhân Sự' : 'Nhân Sự'}
        </h1>
        <div className="page-header-actions">
          {activeTab === 'staff' && (
            <button className="btn btn-ghost" onClick={exportToExcel} title="Xuất báo cáo Excel">
              <Download size={18} /> Xuất Excel
            </button>
          )}
          {activeTab === 'staff' && hasStaffManagePermission && (
            <button className="btn btn-primary" onClick={() => {
              setEditingStaff(null);
              setStaffForm({ username: '', password: '123456', fullName: '', email: '', phone: '', department: '', role: '', position: '', attendanceRequired: true, permissions: [] });
              setShowStaffForm(true);
            }}>
              <Plus size={18} /> Thêm Nhân Viên
            </button>
          )}

          {activeTab === 'departments' && hasDeptManagePermission && (
            <button className="btn btn-primary" onClick={() => {
              setEditingDept(null);
              setDeptForm({ key: '', name: '', description: '' });
              setShowDeptForm(true);
            }}>
              <Plus size={18} /> Thêm Phòng Ban
            </button>
          )}
        </div>
      </div>

      {/* Tabs Layout for IT & Director */}
      {hasDeptManagePermission && (
        <div className="tabs" style={{ marginBottom: 20 }}>
          <button 
            className={`tab-btn ${activeTab === 'staff' ? 'active' : ''}`}
            onClick={() => setActiveTab('staff')}
          >
            Danh sách nhân sự
          </button>
          <button 
            className={`tab-btn ${activeTab === 'departments' ? 'active' : ''}`}
            onClick={() => setActiveTab('departments')}
          >
            Quản lý phòng ban
          </button>
        </div>
      )}

      {activeTab === 'staff' ? (
        <>
          {/* Filters */}
          <div className="filter-bar">
            <div className="header-search" style={{ width: 250 }}>
              <Search size={18} />
              <input type="text" placeholder="Tìm nhân viên..." value={search}
                onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="form-control form-control-sm" value={deptFilter}
              onChange={e => setDeptFilter(e.target.value)} style={{ width: 160 }}>
              <option value="">Tất cả phòng ban</option>
              {departments.map(d => (
                <option key={d.key} value={d.key}>{d.name}</option>
              ))}
            </select>
            <span className="text-sm text-muted" style={{ marginLeft: 'auto' }}>
              Tổng: {staffList.length} nhân viên
            </span>
          </div>

          {/* Staff Grid */}
          <div className="grid-4 stagger-children">
            {staffList.map(staff => (
              <div key={staff._id} className="card" style={{ textAlign: 'center', position: 'relative' }}>
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                  background: getDeptColor(staff.department),
                  borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0'
                }} />

                <div className="avatar avatar-lg" style={{ margin: '8px auto 12px', background: `linear-gradient(135deg, ${getDeptColor(staff.department)}, ${getDeptColor(staff.department)}88)` }}>
                  {getInitials(staff.fullName)}
                </div>
                <div className="font-semibold" style={{ marginBottom: 2 }}>{staff.fullName}</div>
                <div className="text-xs text-muted" style={{ marginBottom: 4 }}>@{staff.username}</div>
                <div className="text-xs text-muted" style={{ marginBottom: 8 }}>{staff.position}</div>
                <span className="badge badge-ghost" style={{ borderColor: getDeptColor(staff.department), color: getDeptColor(staff.department) }}>
                  {getDepartmentName(staff.department)}
                </span>
                <div style={{ marginTop: 8 }}>
                  <span className="badge" style={{
                    textTransform: 'none',
                    background: staff.attendanceRequired === false ? 'rgba(148, 163, 184, 0.14)' : 'rgba(34, 197, 94, 0.14)',
                    color: staff.attendanceRequired === false ? 'var(--text-muted)' : '#22C55E',
                    border: `1px solid ${staff.attendanceRequired === false ? 'var(--border-light)' : 'rgba(34, 197, 94, 0.32)'}`
                  }}>
                    <Clock size={12} /> {staff.attendanceRequired === false ? 'Không cần chấm công' : 'Cần chấm công'}
                  </span>
                </div>

                <div style={{ marginTop: 12, display: 'flex', gap: 6, justifyContent: 'center' }}>
                  {staff.email && (
                    <span className="text-xs text-muted" style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <Mail size={11} /> {staff.email}
                    </span>
                  )}
                </div>

                {hasStaffManagePermission && (
                  <div style={{
                    display: 'flex', gap: 4, justifyContent: 'center', marginTop: 12,
                    paddingTop: 12, borderTop: '1px solid var(--border-light)'
                  }}>
                    <button className="btn btn-icon btn-ghost btn-sm" onClick={() => handleStaffEdit(staff)} title="Sửa">
                      <Edit size={14} />
                    </button>
                    {staff._id !== user?._id && (
                      <button className="btn btn-icon btn-ghost btn-sm" onClick={() => handleResetPassword(staff)}
                        title="Đặt lại mật khẩu" style={{ color: 'var(--warning)' }}>
                        <Key size={14} />
                      </button>
                    )}
                    {(isDirector || isIT) && staff._id !== user?._id && (
                      <button className="btn btn-icon btn-ghost btn-sm" onClick={() => handleStaffDelete(staff._id)}
                        title="Xóa" style={{ color: 'var(--danger)' }}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Create/Edit Staff Modal */}
          {showStaffForm && (
            <div className="modal-overlay" onClick={() => { setShowStaffForm(false); setEditingStaff(null); }}>
              <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>{editingStaff ? '✏️ Sửa Nhân Viên' : '➕ Thêm Nhân Viên'}</h2>
                  <button className="modal-close" onClick={() => { setShowStaffForm(false); setEditingStaff(null); }}><X size={20} /></button>
                </div>
                <form onSubmit={handleStaffSubmit}>
                  <div className="modal-body">
                    {editingStaff ? (
                      <div className="form-group">
                        <label>Tên đăng nhập *</label>
                        <input type="text" className="form-control" value={staffForm.username}
                          onChange={e => setStaffForm({...staffForm, username: e.target.value})} required />
                      </div>
                    ) : (
                      <div className="form-row">
                        <div className="form-group">
                          <label>Tên đăng nhập *</label>
                          <input type="text" className="form-control" value={staffForm.username}
                            onChange={e => setStaffForm({...staffForm, username: e.target.value})} required />
                        </div>
                        <div className="form-group">
                          <label>Mật khẩu mặc định *</label>
                          <input type="text" className="form-control" value={staffForm.password}
                            onChange={e => setStaffForm({...staffForm, password: e.target.value})} required />
                        </div>
                      </div>
                    )}
                    <div className="form-group">
                      <label>Họ tên *</label>
                      <input type="text" className="form-control" value={staffForm.fullName}
                        onChange={e => setStaffForm({...staffForm, fullName: e.target.value})} required />
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Email</label>
                        <input type="email" className="form-control" value={staffForm.email}
                          onChange={e => setStaffForm({...staffForm, email: e.target.value})} />
                      </div>
                      <div className="form-group">
                        <label>Số điện thoại</label>
                        <input type="text" className="form-control" value={staffForm.phone}
                          onChange={e => setStaffForm({...staffForm, phone: e.target.value})} />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Phòng ban *</label>
                        <select className="form-control" value={staffForm.department}
                          onChange={e => setStaffForm({...staffForm, department: e.target.value, role: ''})} required>
                          <option value="">Chọn phòng ban</option>
                          {departments.map(d => (
                            <option key={d.key} value={d.key}>{d.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Vai trò *</label>
                        <select className="form-control" value={staffForm.role}
                          onChange={e => setStaffForm({...staffForm, role: e.target.value})} required>
                          <option value="">Chọn vai trò</option>
                          {staffForm.department && getRoleOptions(staffForm.department).map(r => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Chức vụ *</label>
                      <input type="text" className="form-control" value={staffForm.position}
                        onChange={e => setStaffForm({...staffForm, position: e.target.value})} required
                        placeholder="VD: Nhân Viên Kinh Doanh" />
                    </div>
                    <div className="form-group">
                      <label>Quy định chấm công</label>
                      <button
                        type="button"
                        className={`btn ${staffForm.attendanceRequired ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => setStaffForm({ ...staffForm, attendanceRequired: !staffForm.attendanceRequired })}
                        style={{ justifyContent: 'flex-start', width: '100%' }}
                      >
                        <Clock size={18} />
                        {staffForm.attendanceRequired ? 'Bắt buộc chấm công' : 'Không yêu cầu chấm công'}
                      </button>
                      <small className="text-muted">Tắt mục này cho tài khoản không cần xuất hiện trong danh sách vắng/đi muộn.</small>
                    </div>
                    {hasDeptManagePermission && <div className="form-group">
                      <label>Quyền riêng của nhân viên</label>
                      <label className="attendance-user-option" style={{ alignItems: 'center' }}>
                        <input
                          type="checkbox"
                          checked={staffForm.permissions?.includes('attendance.export') || false}
                          onChange={e => setStaffForm({
                            ...staffForm,
                            permissions: e.target.checked
                              ? [...new Set([...(staffForm.permissions || []), 'attendance.export'])]
                              : (staffForm.permissions || []).filter(item => item !== 'attendance.export')
                          })}
                        />
                        <span><b>Xuất Excel chấm công</b><small>Cho phép tải báo cáo chấm công của công ty ra tệp Excel.</small></span>
                      </label>
                    </div>}
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-ghost" onClick={() => { setShowStaffForm(false); setEditingStaff(null); }}>Hủy</button>
                    <button type="submit" className="btn btn-primary">{editingStaff ? 'Cập Nhật' : 'Tạo Tài Khoản'}</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Department List Table */}
          <div className="card" style={{ padding: 20 }}>
            <table className="table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Mã phòng ban</th>
                  <th>Tên phòng ban</th>
                  <th>Mô tả</th>
                  <th style={{ width: 100, textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {departments.map(dept => {
                  const isCore = ['director', 'hr', 'sale', 'marketing', 'it'].includes(dept.key);
                  return (
                    <tr key={dept._id}>
                      <td><code style={{ fontSize: '0.8125rem' }}>{dept.key}</code></td>
                      <td style={{ fontWeight: 600 }}>{dept.name}</td>
                      <td className="text-muted text-sm">{dept.description || 'Không có mô tả'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                          <button className="btn btn-icon btn-ghost btn-sm" onClick={() => handleDeptEdit(dept)} title="Sửa">
                            <Edit size={14} />
                          </button>
                          {!isCore && (
                            <button className="btn btn-icon btn-ghost btn-sm" onClick={() => handleDeptDelete(dept._id)}
                              title="Xóa" style={{ color: 'var(--danger)' }}>
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Department Form Modal */}
          {showDeptForm && (
            <div className="modal-overlay" onClick={() => { setShowDeptForm(false); setEditingDept(null); }}>
              <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>{editingDept ? '✏️ Sửa Phòng Ban' : '🏢 Thêm Phòng Ban Mới'}</h2>
                  <button className="modal-close" onClick={() => { setShowDeptForm(false); setEditingDept(null); }}><X size={20} /></button>
                </div>
                <form onSubmit={handleDeptSubmit}>
                  <div className="modal-body">
                    <div className="form-group">
                      <label>Mã phòng ban (ID) *</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={deptForm.key}
                        onChange={e => setDeptForm({...deptForm, key: e.target.value})} 
                        placeholder="Ví dụ: accounting"
                        disabled={!!editingDept}
                        required 
                      />
                      <small className="text-muted">Viết liền không dấu, không viết hoa. Ví dụ: customercare</small>
                    </div>
                    <div className="form-group">
                      <label>Tên phòng ban *</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={deptForm.name}
                        onChange={e => setDeptForm({...deptForm, name: e.target.value})} 
                        placeholder="Ví dụ: Phòng Chăm Sóc Khách Hàng"
                        required 
                      />
                    </div>
                    <div className="form-group">
                      <label>Mô tả</label>
                      <textarea 
                        className="form-control" 
                        value={deptForm.description}
                        onChange={e => setDeptForm({...deptForm, description: e.target.value})} 
                        rows={3} 
                      />
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-ghost" onClick={() => { setShowDeptForm(false); setEditingDept(null); }}>Hủy</button>
                    <button type="submit" className="btn btn-primary">{editingDept ? 'Cập Nhật' : 'Thêm'}</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
