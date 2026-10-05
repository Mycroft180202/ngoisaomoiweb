import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useConfirm } from '../../contexts/ConfirmContext';
import { useUiVersion } from '../../contexts/UiVersionContext';
import api from '../../services/api';
import { User, Lock, Save, KeyRound, Volume2, VolumeX, Play, History, Wifi, Copy, Check, Clock, Calendar, Plus, Trash2, Monitor, ShieldCheck, RotateCcw, Sparkles, AlertTriangle } from 'lucide-react';
import { departmentNames, roleNames, formatDate } from '../../utils/helpers';
import DatePickerVN from '../../components/ui/DatePickerVN';
import toast from 'react-hot-toast';
import './Settings.css';

export default function Settings() {
  const { user, loadUser, getDepartmentName } = useAuth();
  const confirm = useConfirm();
  const { uiVersion, updatedAt: uiUpdatedAt, isSystemAdmin, updateUiVersion } = useUiVersion();
  const [activeTab, setActiveTab] = useState('profile');
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [savingUiVersion, setSavingUiVersion] = useState(false);

  const canViewLogs = user?.role === 'director' || user?.role === 'it_manager' || user?.role === 'hr_manager';

  const loadActivityLogs = async () => {
    try {
      setLoadingLogs(true);
      const res = await api.get('/activity');
      setLogs(res.logs || []);
    } catch (err) {
      console.error('Failed to load activity logs:', err);
    } finally {
      setLoadingLogs(false);
    }
  };
  
  // Profile Form State
  const [profileForm, setProfileForm] = useState({
    fullName: user?.fullName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    avatar: user?.avatar || ''
  });
  
  // Password Form State
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Sound Settings State
  const [soundEnabled, setSoundEnabled] = useState(
    localStorage.getItem('travelops_sound_enabled') !== 'false'
  );
  const [soundVolume, setSoundVolume] = useState(
    localStorage.getItem('travelops_sound_volume') !== null
      ? parseInt(localStorage.getItem('travelops_sound_volume'))
      : 50
  );

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null); // { type: 'success'|'error', text: '' }

  // Wi-Fi Config State
  const [wifiConfig, setWifiConfig] = useState({
    enabled: false,
    allowedIPs: '',
    allowedSSIDs: ''
  });
  const [currentIp, setCurrentIp] = useState('');
  const [loadingWifi, setLoadingWifi] = useState(false);
  const [copied, setCopied] = useState(false);

  // Attendance Rules State
  const [attendanceRules, setAttendanceRules] = useState({
    checkInTime: '08:30',
    checkOutTime: '17:30',
    allowedLateMinutes: 0,
    standardWorkHours: 8,
    allowOvertime: false,
    lunchBreakStart: '12:00',
    lunchBreakEnd: '13:00'
  });
  const [loadingRules, setLoadingRules] = useState(false);

  // Special Days State
  const [specialDays, setSpecialDays] = useState([]);
  const [newSpecialDay, setNewSpecialDay] = useState({
    date: new Date().toISOString().substring(0, 10),
    type: 'half_day',
    name: ''
  });
  const [addMode, setAddMode] = useState('single'); // 'single' | 'bulk'
  const [bulkConfig, setBulkConfig] = useState({
    startDate: new Date().toISOString().substring(0, 10),
    endDate: new Date(new Date().getFullYear(), 11, 31).toISOString().substring(0, 10),
    daysOfWeek: {
      0: true,  // CN
      1: false,
      2: false,
      3: false,
      4: false,
      5: false,
      6: false
    },
    type: 'off_day',
    name: 'Chủ Nhật'
  });

  const playTestSound = (volValue) => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      
      const playTone = (freq, startTime, duration) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        
        gain.gain.setValueAtTime(0.24 * (volValue / 100), startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        
        osc.start(startTime);
        osc.stop(startTime + duration);
      };

      const now = audioCtx.currentTime;
      playTone(587.33, now, 0.3);
      playTone(880.00, now + 0.1, 0.4);
    } catch (e) {
      console.error('Failed to play test sound:', e);
    }
  };

  const handleToggleSound = (val) => {
    setSoundEnabled(val);
    localStorage.setItem('travelops_sound_enabled', val ? 'true' : 'false');
  };

  const handleChangeVolume = (val) => {
    const vol = parseInt(val);
    setSoundVolume(vol);
    localStorage.setItem('travelops_sound_volume', vol.toString());
  };

  const handlePlayTest = () => {
    playTestSound(soundEnabled ? soundVolume : 0);
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      const res = await api.put('/auth/profile', profileForm);
      await loadUser(); // Refresh user details in AuthContext
      setMsg({ type: 'success', text: res.message || 'Cập nhật thông tin thành công!' });
    } catch (err) {
      setMsg({ type: 'error', text: err.message || 'Lỗi cập nhật thông tin cá nhân' });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMsg({ type: 'error', text: 'Mật khẩu mới và mật khẩu xác nhận không khớp!' });
      return;
    }
    setLoading(true);
    setMsg(null);
    try {
      const res = await api.put('/auth/password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setMsg({ type: 'success', text: res.message || 'Đổi mật khẩu thành công!' });
    } catch (err) {
      setMsg({ type: 'error', text: err.message || 'Lỗi đổi mật khẩu' });
    } finally {
      setLoading(false);
    }
  };

  const loadWifiConfig = async () => {
    try {
      setLoadingWifi(true);
      const res = await api.get('/attendance/wifi-config');
      setWifiConfig({
        enabled: res.config.enabled || false,
        allowedIPs: (res.config.allowedIPs || []).join(', '),
        allowedSSIDs: (res.config.allowedSSIDs || []).join(', ')
      });
      setCurrentIp(res.currentIp || '');
    } catch (err) {
      console.error('Failed to load wifi config:', err);
      setMsg({ type: 'error', text: err.message || 'Lỗi tải cấu hình Wi-Fi' });
    } finally {
      setLoadingWifi(false);
    }
  };

  const loadAttendanceRules = async () => {
    try {
      setLoadingRules(true);
      const res = await api.get('/attendance/rules');
      if (res.rules) {
        setAttendanceRules({
          checkInTime: res.rules.checkInTime || '08:30',
          checkOutTime: res.rules.checkOutTime || '17:30',
          allowedLateMinutes: res.rules.allowedLateMinutes || 0,
          standardWorkHours: res.rules.standardWorkHours || 8,
          allowOvertime: !!res.rules.allowOvertime,
          lunchBreakStart: res.rules.lunchBreakStart || '12:00',
          lunchBreakEnd: res.rules.lunchBreakEnd || '13:00'
        });
      }
    } catch (err) {
      console.error('Failed to load attendance rules:', err);
      setMsg({ type: 'error', text: err.message || 'Lỗi tải quy tắc chấm công' });
    } finally {
      setLoadingRules(false);
    }
  };

  const loadSpecialDays = async () => {
    try {
      const res = await api.get('/attendance/special-days');
      setSpecialDays(res.list || []);
    } catch (err) {
      console.error('Failed to load special days:', err);
    }
  };

  const handleAddSpecialDay = async (e) => {
    e.preventDefault();
    if (!newSpecialDay.name.trim()) {
      toast.error('Vui lòng điền tên ngày đặc biệt/ngày lễ');
      return;
    }
    if (specialDays.some(d => d.date === newSpecialDay.date)) {
      toast.error('Ngày này đã được cấu hình từ trước');
      return;
    }
    const updatedList = [...specialDays, newSpecialDay].sort((a, b) => a.date.localeCompare(b.date));
    try {
      setLoading(true);
      const res = await api.put('/attendance/special-days', { list: updatedList });
      setSpecialDays(res.list);
      setNewSpecialDay({
        date: new Date().toISOString().substring(0, 10),
        type: 'half_day',
        name: ''
      });
      toast.success('Thêm ngày đặc biệt thành công!');
    } catch (err) {
      toast.error(err.message || 'Lỗi thêm ngày đặc biệt');
    } finally {
      setLoading(false);
    }
  };

  const handleAutoAddSundays = async () => {
    // Parse "YYYY-MM-DD" local year
    const [y] = newSpecialDay.date.split('-').map(Number);
    const year = y || new Date().getFullYear();
    const ok = await confirm({
      title: 'Thêm Chủ Nhật hàng loạt',
      message: `Tất cả các ngày Chủ Nhật của năm ${year} sẽ được thêm làm ngày nghỉ.`,
      confirmText: 'Thêm',
      cancelText: 'Hủy',
      type: 'warning'
    });
    if (!ok) {
      return;
    }

    const getLocalYMD = (dateObj) => {
      const yy = dateObj.getFullYear();
      const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
      const dd = String(dateObj.getDate()).padStart(2, '0');
      return `${yy}-${mm}-${dd}`;
    };
    
    const sundays = [];
    const d = new Date(year, 0, 1); // Local time Jan 1
    while (d.getDay() !== 0) {
      d.setDate(d.getDate() + 1);
    }
    while (d.getFullYear() === year) {
      const dateStr = getLocalYMD(d);
      sundays.push({
        date: dateStr,
        type: 'off_day',
        name: 'Chủ Nhật'
      });
      d.setDate(d.getDate() + 7);
    }

    const existingDates = new Set(specialDays.map(item => item.date));
    const toAdd = sundays.filter(s => !existingDates.has(s.date));
    
    if (toAdd.length === 0) {
      toast.error(`Tất cả Chủ Nhật của năm ${year} đã được thêm từ trước.`);
      return;
    }

    const updatedList = [...specialDays, ...toAdd].sort((a, b) => a.date.localeCompare(b.date));
    try {
      setLoading(true);
      const res = await api.put('/attendance/special-days', { list: updatedList });
      setSpecialDays(res.list);
      toast.success(`Đã tự động thêm ${toAdd.length} ngày Chủ Nhật của năm ${year} thành công!`);
    } catch (err) {
      toast.error(err.message || 'Lỗi thêm ngày Chủ Nhật');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkAddSpecialDays = async (e) => {
    e.preventDefault();
    if (!bulkConfig.name.trim()) {
      toast.error('Vui lòng điền tên ngày đặc biệt/ngày lễ');
      return;
    }

    const parseLocalDate = (dateStr) => {
      const [yy, mm, dd] = dateStr.split('-').map(Number);
      return new Date(yy, mm - 1, dd);
    };

    const getLocalYMD = (dateObj) => {
      const yy = dateObj.getFullYear();
      const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
      const dd = String(dateObj.getDate()).padStart(2, '0');
      return `${yy}-${mm}-${dd}`;
    };

    const start = parseLocalDate(bulkConfig.startDate);
    const end = parseLocalDate(bulkConfig.endDate);
    if (start > end) {
      toast.error('Ngày bắt đầu không được lớn hơn ngày kết thúc');
      return;
    }

    const selectedDays = Object.keys(bulkConfig.daysOfWeek).filter(k => bulkConfig.daysOfWeek[k]);
    if (selectedDays.length === 0) {
      toast.error('Vui lòng chọn ít nhất một ngày trong tuần');
      return;
    }

    const newDays = [];
    const d = new Date(start);
    while (d <= end) {
      const dayOfWeek = d.getDay();
      if (bulkConfig.daysOfWeek[dayOfWeek]) {
        const dateStr = getLocalYMD(d);
        newDays.push({
          date: dateStr,
          type: bulkConfig.type,
          name: bulkConfig.name
        });
      }
      d.setDate(d.getDate() + 1);
    }

    if (newDays.length === 0) {
      toast.error('Không tìm thấy ngày phù hợp trong khoảng ngày đã chọn');
      return;
    }

    const existingDates = new Set(specialDays.map(item => item.date));
    const toAdd = newDays.filter(s => !existingDates.has(s.date));

    if (toAdd.length === 0) {
      toast.error('Tất cả các ngày trong khoảng này đã được thêm từ trước.');
      return;
    }

    const updatedList = [...specialDays, ...toAdd].sort((a, b) => a.date.localeCompare(b.date));
    try {
      setLoading(true);
      const res = await api.put('/attendance/special-days', { list: updatedList });
      setSpecialDays(res.list);
      toast.success(`Đã thêm hàng loạt ${toAdd.length} ngày thành công!`);
    } catch (err) {
      toast.error(err.message || 'Lỗi thêm ngày hàng loạt');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSpecialDay = async (dateToDelete) => {
    const ok = await confirm({
      title: 'Xóa ngày đặc biệt',
      message: 'Ngày đặc biệt này sẽ bị xóa khỏi cấu hình chấm công.',
      confirmText: 'Xóa',
      cancelText: 'Hủy',
      type: 'danger'
    });
    if (!ok) return;
    const updatedList = specialDays.filter(d => d.date !== dateToDelete);
    try {
      setLoading(true);
      const res = await api.put('/attendance/special-days', { list: updatedList });
      setSpecialDays(res.list);
      toast.success('Đã xóa ngày đặc biệt thành công!');
    } catch (err) {
      toast.error(err.message || 'Lỗi xóa ngày đặc biệt');
    } finally {
      setLoading(false);
    }
  };



  const handleUpdateWifiConfig = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      const allowedIPsArr = wifiConfig.allowedIPs
        .split(',')
        .map(ip => ip.trim())
        .filter(ip => ip !== '');
      const allowedSSIDsArr = wifiConfig.allowedSSIDs
        .split(',')
        .map(ssid => ssid.trim())
        .filter(ssid => ssid !== '');

      const res = await api.put('/attendance/wifi-config', {
        enabled: wifiConfig.enabled,
        allowedIPs: allowedIPsArr,
        allowedSSIDs: allowedSSIDsArr
      });
      setMsg({ type: 'success', text: res.message || 'Cập nhật cấu hình Wi-Fi thành công!' });
    } catch (err) {
      setMsg({ type: 'error', text: err.message || 'Lỗi cập nhật cấu hình Wi-Fi' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAttendanceRules = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      const res = await api.put('/attendance/rules', attendanceRules);
      setMsg({ type: 'success', text: res.message || 'Cập nhật quy tắc chấm công thành công!' });
    } catch (err) {
      setMsg({ type: 'error', text: err.message || 'Lỗi cập nhật quy tắc chấm công' });
    } finally {
      setLoading(false);
    }
  };

  const handleChangeUiVersion = async (nextVersion) => {
    if (!isSystemAdmin || nextVersion === uiVersion || savingUiVersion) return;

    const returningToLegacy = nextVersion === 'legacy';
    const accepted = await confirm({
      title: returningToLegacy ? 'Khôi phục giao diện cũ?' : 'Bật giao diện V2?',
      message: returningToLegacy
        ? 'Toàn bộ nhân viên đang sử dụng CRM sẽ được đưa về giao diện cũ. Dữ liệu nghiệp vụ không bị thay đổi.'
        : 'Giao diện V2 sẽ được áp dụng cho toàn bộ nhân viên. Desktop và mobile/tablet dùng hai layout riêng; admin có thể quay lại giao diện cũ bất cứ lúc nào.',
      confirmText: returningToLegacy ? 'Về giao diện cũ' : 'Bật giao diện V2',
      cancelText: 'Hủy',
      type: returningToLegacy ? 'warning' : 'info'
    });

    if (!accepted) return;

    try {
      setSavingUiVersion(true);
      const response = await updateUiVersion(nextVersion);
      toast.success(response?.message || 'Đã cập nhật phiên bản giao diện');
    } catch (error) {
      toast.error(error.message || 'Không thể cập nhật phiên bản giao diện');
    } finally {
      setSavingUiVersion(false);
    }
  };

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <h1>⚙️ Cài Đặt Tài Khoản</h1>
      </div>

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        {/* Left Card - User Overview */}
        <div className="card" style={{ flex: '1 1 300px', alignSelf: 'flex-start' }}>
          <div className="card-body text-center" style={{ padding: 24 }}>
            <div className="avatar" style={{ width: 80, height: 80, fontSize: '2rem', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--gradient-primary)', color: 'white', borderRadius: '50%' }}>
              {profileForm.fullName ? profileForm.fullName.split(' ').pop().charAt(0) : '?'}
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 4 }}>{user?.fullName}</h2>
            <p className="text-sm text-secondary" style={{ marginBottom: 16 }}>@{user?.username}</p>
            
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                <span className="text-muted">Phòng ban:</span>
                <span className="font-medium">{getDepartmentName(user?.department)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                <span className="text-muted">Vai trò:</span>
                <span className="font-medium">{roleNames[user?.role]}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                <span className="text-muted">Chức danh:</span>
                <span className="font-medium">{user?.position}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Card - Form Panels */}
        <div className="card" style={{ flex: '2 1 500px' }}>
          {/* Tab Headers */}
          <div className="tabs" style={{ marginBottom: 20 }}>
            <button 
              type="button"
              className={`tab-item ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => { setActiveTab('profile'); setMsg(null); }}
            >
              <User size={16} /> Thông tin cá nhân
            </button>
            <button 
              type="button"
              className={`tab-item ${activeTab === 'password' ? 'active' : ''}`}
              onClick={() => { setActiveTab('password'); setMsg(null); }}
            >
              <Lock size={16} /> Đổi mật khẩu
            </button>
            <button 
              type="button"
              className={`tab-item ${activeTab === 'sound' ? 'active' : ''}`}
              onClick={() => { setActiveTab('sound'); setMsg(null); }}
            >
              <Volume2 size={16} /> Âm thanh
            </button>
            {isSystemAdmin && (
              <button
                type="button"
                className={`tab-item ${activeTab === 'ui-version' ? 'active' : ''}`}
                onClick={() => { setActiveTab('ui-version'); setMsg(null); }}
              >
                <Monitor size={16} /> Phiên bản giao diện
              </button>
            )}
            {canViewLogs && (
              <>
                <button 
                  type="button"
                  className={`tab-item ${activeTab === 'wifi' ? 'active' : ''}`}
                  onClick={() => { setActiveTab('wifi'); setMsg(null); loadWifiConfig(); }}
                >
                  <Wifi size={16} /> Wi-Fi Chấm Công
                </button>
                <button 
                  type="button"
                  className={`tab-item ${activeTab === 'attendance-rules' ? 'active' : ''}`}
                  onClick={() => { setActiveTab('attendance-rules'); setMsg(null); loadAttendanceRules(); loadSpecialDays(); }}
                >
                  <Clock size={16} /> Quy tắc chấm công
                </button>
                <button 
                  type="button"
                  className={`tab-item ${activeTab === 'activity' ? 'active' : ''}`}
                  onClick={() => { setActiveTab('activity'); setMsg(null); loadActivityLogs(); }}
                >
                  <History size={16} /> Nhật ký hoạt động
                </button>
              </>
            )}
          </div>

          {/* Status Message */}
          {msg && (
            <div className={`badge badge-${msg.type === 'success' ? 'success' : 'danger'}`} style={{ width: '100%', padding: 12, marginBottom: 16, textAlign: 'center', fontSize: '0.875rem' }}>
              {msg.text}
            </div>
          )}

          {activeTab === 'profile' && (
            <form onSubmit={handleUpdateProfile}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-group">
                  <label>Họ và Tên *</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={profileForm.fullName} 
                    onChange={e => setProfileForm({...profileForm, fullName: e.target.value})} 
                    required 
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Email</label>
                    <input 
                      type="email" 
                      className="form-control" 
                      value={profileForm.email} 
                      onChange={e => setProfileForm({...profileForm, email: e.target.value})} 
                    />
                  </div>
                  <div className="form-group">
                    <label>Số điện thoại</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={profileForm.phone} 
                      onChange={e => setProfileForm({...profileForm, phone: e.target.value})} 
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Đường dẫn ảnh đại diện (Avatar URL)</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={profileForm.avatar} 
                    onChange={e => setProfileForm({...profileForm, avatar: e.target.value})} 
                    placeholder="https://example.com/avatar.jpg"
                  />
                </div>
                
                <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start', marginTop: 8 }} disabled={loading}>
                  <Save size={16} /> {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'password' && (
            <form onSubmit={handleChangePassword}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-group">
                  <label>Mật khẩu hiện tại *</label>
                  <input 
                    type="password" 
                    className="form-control" 
                    value={passwordForm.currentPassword} 
                    onChange={e => setPasswordForm({...passwordForm, currentPassword: e.target.value})} 
                    required 
                  />
                </div>
                <div className="form-group">
                  <label>Mật khẩu mới * (Ít nhất 6 ký tự)</label>
                  <input 
                    type="password" 
                    className="form-control" 
                    value={passwordForm.newPassword} 
                    onChange={e => setPasswordForm({...passwordForm, newPassword: e.target.value})} 
                    required 
                  />
                </div>
                <div className="form-group">
                  <label>Xác nhận mật khẩu mới *</label>
                  <input 
                    type="password" 
                    className="form-control" 
                    value={passwordForm.confirmPassword} 
                    onChange={e => setPasswordForm({...passwordForm, confirmPassword: e.target.value})} 
                    required 
                  />
                </div>
                
                <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start', marginTop: 8 }} disabled={loading}>
                  <KeyRound size={16} /> {loading ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'sound' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <input 
                  type="checkbox" 
                  id="sound-enabled"
                  checked={soundEnabled} 
                  onChange={e => handleToggleSound(e.target.checked)}
                  style={{ width: 18, height: 18, cursor: 'pointer' }}
                />
                <label htmlFor="sound-enabled" style={{ fontSize: '0.9375rem', fontWeight: 500, cursor: 'pointer' }}>
                  Bật âm thanh thông báo
                </label>
              </div>

              <div className="form-group" style={{ opacity: soundEnabled ? 1 : 0.5, transition: 'opacity 0.2s' }}>
                <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span>Âm lượng thông báo</span>
                  <span className="font-semibold">{soundVolume}%</span>
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {soundVolume === 0 || !soundEnabled ? <VolumeX size={20} style={{ color: 'var(--text-muted)' }} /> : <Volume2 size={20} style={{ color: 'var(--primary)' }} />}
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={soundVolume}
                    onChange={e => handleChangeVolume(e.target.value)}
                    disabled={!soundEnabled}
                    style={{ flex: 1, cursor: soundEnabled ? 'pointer' : 'not-allowed' }}
                  />
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20, marginTop: 8 }}>
                <button 
                  type="button" 
                  className="btn btn-ghost" 
                  onClick={handlePlayTest}
                  disabled={!soundEnabled}
                >
                  <Play size={16} /> Nghe thử âm thanh
                </button>
              </div>
            </div>
          )}

          {isSystemAdmin && activeTab === 'ui-version' && (
            <section className="ui-version-panel">
              <div className="ui-version-heading">
                <div className="ui-version-heading-icon"><Monitor size={24} /></div>
                <div>
                  <div className="ui-version-title-row">
                    <h2>Phiên bản giao diện toàn hệ thống</h2>
                    <span className="ui-version-admin-badge"><ShieldCheck size={13} /> Chỉ System Admin</span>
                  </div>
                  <p>Chọn giao diện áp dụng đồng bộ cho mọi nhân viên đang sử dụng CRM.</p>
                </div>
              </div>

              <div className="ui-version-warning" role="note">
                <AlertTriangle size={19} />
                <span>Đây là cấu hình chung của công ty. Nhân viên không có nút tự chuyển giao diện trên tài khoản cá nhân.</span>
              </div>

              <div className="ui-version-options">
                <button
                  type="button"
                  className={`ui-version-option ${uiVersion === 'legacy' ? 'selected' : ''}`}
                  onClick={() => handleChangeUiVersion('legacy')}
                  disabled={savingUiVersion}
                  aria-pressed={uiVersion === 'legacy'}
                >
                  <span className="ui-version-option-icon legacy"><RotateCcw size={21} /></span>
                  <span className="ui-version-option-copy">
                    <span className="ui-version-option-name">Giao diện cũ</span>
                    <span className="ui-version-option-description">Bản ổn định hiện tại, dùng làm phương án quay lại an toàn.</span>
                    <span className="ui-version-option-meta">Desktop và mobile dùng layout hiện có</span>
                  </span>
                  <span className="ui-version-radio" aria-hidden="true" />
                </button>

                <button
                  type="button"
                  className={`ui-version-option ${uiVersion === 'v2' ? 'selected' : ''}`}
                  onClick={() => handleChangeUiVersion('v2')}
                  disabled={savingUiVersion}
                  aria-pressed={uiVersion === 'v2'}
                >
                  <span className="ui-version-option-icon v2"><Sparkles size={21} /></span>
                  <span className="ui-version-option-copy">
                    <span className="ui-version-option-name">Giao diện V2 <small>Thử nghiệm</small></span>
                    <span className="ui-version-option-description">Kiến trúc mới, tách riêng shell Desktop và Touch cho mobile/tablet.</span>
                    <span className="ui-version-option-meta">Các màn hình sẽ được nâng cấp lần lượt</span>
                  </span>
                  <span className="ui-version-radio" aria-hidden="true" />
                </button>
              </div>

              <div className="ui-version-footer">
                <span>Đang áp dụng: <strong>{uiVersion === 'v2' ? 'Giao diện V2' : 'Giao diện cũ'}</strong></span>
                {uiUpdatedAt && (
                  <span>Cập nhật lúc {new Date(uiUpdatedAt).toLocaleString('vi-VN')}</span>
                )}
              </div>
            </section>
          )}

          {activeTab === 'activity' && (
            <div className="activity-log-section">
              <div className="activity-log-heading">
                <div><h3><History size={19} /> Nhật ký hoạt động</h3><p>100 hoạt động gần nhất trên hệ thống</p></div>
                <button className="btn btn-ghost btn-sm" onClick={loadActivityLogs} disabled={loadingLogs}>Làm mới</button>
              </div>
              {loadingLogs ? (
                <div style={{ padding: 32, textAlign: 'center' }}><div className="loading-spinner" /></div>
              ) : logs.length === 0 ? (
                <div className="text-muted text-center" style={{ padding: 24 }}>Chưa có ghi nhận nhật ký nào</div>
              ) : (
                <div className="activity-table-wrap">
                  <table className="activity-table">
                    <thead>
                      <tr>
                        <th>Thời gian</th>
                        <th>Thực hiện bởi</th>
                        <th>Phân loại</th>
                        <th>Hành động / Chi tiết</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map(log => (
                        <tr key={log._id}>
                          <td data-label="Thời gian"><div className="activity-time"><b>{new Date(log.createdAt).toLocaleDateString('vi-VN')}</b><span>{new Date(log.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span></div></td>
                          <td data-label="Thực hiện bởi"><div className="activity-actor"><span className="activity-avatar">{(log.user?.fullName || '?').split(' ').slice(-1)[0][0]}</span><div><b>{log.user?.fullName || 'Tài khoản đã xóa'}</b><small>{departmentNames[log.user?.department] || log.user?.department || 'Không xác định'}</small></div></div></td>
                          <td data-label="Phân loại"><span className={`activity-module module-${log.module}`}>{log.module === 'attendance' ? 'Chấm công' : log.module}</span></td>
                          <td data-label="Chi tiết"><div className="activity-description"><b>{log.action?.replaceAll('_', ' ')}</b><span>{log.description}</span></div></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'wifi' && (
            <div>
              {loadingWifi ? (
                <div style={{ padding: 32, textAlign: 'center' }}><div className="loading-spinner" /></div>
              ) : (
                <form onSubmit={handleUpdateWifiConfig}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div style={{
                      padding: '16px 20px',
                      borderRadius: 12,
                      background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.1), rgba(15, 23, 42, 0.2))',
                      border: '1px solid rgba(14, 165, 233, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 16
                    }}>
                      <div style={{
                        width: 48,
                        height: 48,
                        borderRadius: 10,
                        background: 'var(--primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        boxShadow: '0 0 20px rgba(14, 165, 233, 0.4)'
                      }}>
                        <Wifi size={24} />
                      </div>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Ràng buộc kết nối Wi-Fi Công ty</h4>
                        <p style={{ margin: '4px 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                          Chỉ cho phép nhân viên thực hiện Check-in / Check-out khi kết nối với mạng Wi-Fi được cấu hình của công ty.
                        </p>
                      </div>
                    </div>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 18px',
                      borderRadius: 10,
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--border)'
                    }}>
                      <div>
                        <label style={{ fontSize: '0.9375rem', fontWeight: 600, display: 'block', marginBottom: 2 }}>Kích hoạt tính năng</label>
                        <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Bật/tắt việc kiểm soát vị trí chấm công bằng Wi-Fi</span>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <button
                          type="button"
                          onClick={() => setWifiConfig({ ...wifiConfig, enabled: !wifiConfig.enabled })}
                          style={{
                            width: 52,
                            height: 28,
                            borderRadius: 14,
                            background: wifiConfig.enabled ? '#22C55E' : 'rgba(255,255,255,0.1)',
                            border: 'none',
                            cursor: 'pointer',
                            position: 'relative',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                          }}
                        >
                          <div style={{
                            width: 22,
                            height: 22,
                            borderRadius: '50%',
                            background: 'white',
                            position: 'absolute',
                            top: 3,
                            left: wifiConfig.enabled ? 27 : 3,
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                          }} />
                        </button>
                      </div>
                    </div>

                    <div style={{
                      padding: 16,
                      borderRadius: 10,
                      background: 'rgba(249, 115, 22, 0.05)',
                      border: '1px solid rgba(249, 115, 22, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 16
                    }}>
                      <div>
                        <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'block' }}>Địa chỉ IP mạng hiện tại của bạn:</span>
                        <strong style={{ fontSize: '1.05rem', color: 'var(--secondary)', letterSpacing: '0.5px' }}>{currentIp || 'Đang lấy...'}</strong>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(currentIp);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 6,
                          background: 'rgba(249, 115, 22, 0.1)',
                          color: 'var(--secondary)',
                          border: '1px solid rgba(249, 115, 22, 0.2)',
                          fontSize: '0.8125rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          fontWeight: 500
                        }}
                      >
                        {copied ? <Check size={14} /> : <Copy size={14} />}
                        {copied ? 'Đã sao chép' : 'Sao chép nhanh'}
                      </button>
                    </div>

                    <div className="form-group" style={{ opacity: wifiConfig.enabled ? 1 : 0.6 }}>
                      <label style={{ fontWeight: 600 }}>Danh sách IP Public được phép chấm công</label>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>
                        Nhập các địa chỉ IP Public của Router mạng Wi-Fi công ty, phân tách bằng dấu phẩy (,). Ví dụ: <code>116.108.45.12, 14.161.5.88</code>
                      </span>
                      <textarea
                        className="form-control"
                        rows="2"
                        value={wifiConfig.allowedIPs}
                        onChange={e => setWifiConfig({ ...wifiConfig, allowedIPs: e.target.value })}
                        disabled={!wifiConfig.enabled}
                        placeholder="Ví dụ: 116.108.45.12, 14.161.5.88"
                        style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}
                      />
                    </div>

                    <div className="form-group" style={{ opacity: wifiConfig.enabled ? 1 : 0.6 }}>
                      <label style={{ fontWeight: 600 }}>Danh sách tên mạng Wi-Fi (SSID) được phép</label>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>
                        Áp dụng khi nhân viên chấm công bằng Desktop App. Phân tách bằng dấu phẩy (,). Ví dụ: <code>NewStarTour_5G, NewStarTour_Main</code>
                      </span>
                      <textarea
                        className="form-control"
                        rows="2"
                        value={wifiConfig.allowedSSIDs}
                        onChange={e => setWifiConfig({ ...wifiConfig, allowedSSIDs: e.target.value })}
                        disabled={!wifiConfig.enabled}
                        placeholder="Ví dụ: NewStarTour_5G, NewStarTour_Main"
                        style={{ fontSize: '0.875rem' }}
                      />
                    </div>

                    <button
                      type="submit"
                      className="btn btn-primary"
                      style={{ alignSelf: 'flex-start', marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}
                      disabled={loading}
                    >
                      <Save size={16} />
                      {loading ? 'Đang lưu...' : 'Lưu cấu hình Wi-Fi'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {activeTab === 'attendance-rules' && (
            <div>
              {loadingRules ? (
                <div style={{ padding: 32, textAlign: 'center' }}><div className="loading-spinner" /></div>
              ) : (
                <>
                  <form onSubmit={handleUpdateAttendanceRules}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div style={{
                      padding: '16px 20px',
                      borderRadius: 12,
                      background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(15, 23, 42, 0.2))',
                      border: '1px solid rgba(139, 92, 246, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 16
                    }}>
                      <div style={{
                        width: 48,
                        height: 48,
                        borderRadius: 10,
                        background: 'var(--primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        boxShadow: '0 0 20px rgba(139, 92, 246, 0.4)'
                      }}>
                        <Clock size={24} />
                      </div>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Cấu hình Chấm công toàn công ty</h4>
                        <p style={{ margin: '4px 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                          Thiết lập giờ làm việc chung, quy tắc đi trễ và tăng ca cho tất cả nhân viên.
                        </p>
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Giờ vào ca *</label>
                        <input
                          type="time"
                          className="form-control"
                          value={attendanceRules.checkInTime}
                          onChange={e => setAttendanceRules({ ...attendanceRules, checkInTime: e.target.value })}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Giờ tan ca *</label>
                        <input
                          type="time"
                          className="form-control"
                          value={attendanceRules.checkOutTime}
                          onChange={e => setAttendanceRules({ ...attendanceRules, checkOutTime: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Giờ bắt đầu nghỉ trưa</label>
                        <input
                          type="time"
                          className="form-control"
                          value={attendanceRules.lunchBreakStart}
                          onChange={e => setAttendanceRules({ ...attendanceRules, lunchBreakStart: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label>Giờ kết thúc nghỉ trưa</label>
                        <input
                          type="time"
                          className="form-control"
                          value={attendanceRules.lunchBreakEnd}
                          onChange={e => setAttendanceRules({ ...attendanceRules, lunchBreakEnd: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Cho phép đi trễ (Phút)</label>
                        <input
                          type="number"
                          className="form-control"
                          value={attendanceRules.allowedLateMinutes}
                          onChange={e => setAttendanceRules({ ...attendanceRules, allowedLateMinutes: parseInt(e.target.value) })}
                          min="0"
                        />
                        <span className="text-muted text-xs mt-1">VD: 15 phút. Qua thời gian này sẽ tính đi muộn.</span>
                      </div>
                      <div className="form-group">
                        <label>Số giờ làm tiêu chuẩn (Giờ)</label>
                        <input
                          type="number"
                          className="form-control"
                          value={attendanceRules.standardWorkHours}
                          onChange={e => setAttendanceRules({ ...attendanceRules, standardWorkHours: parseFloat(e.target.value) })}
                          step="0.5"
                          min="1"
                        />
                      </div>
                    </div>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 18px',
                      borderRadius: 10,
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--border)'
                    }}>
                      <div>
                        <label style={{ fontSize: '0.9375rem', fontWeight: 600, display: 'block', marginBottom: 2 }}>Cho phép tính tăng ca</label>
                        <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Nếu tắt, số giờ làm sẽ không vượt quá Số giờ làm tiêu chuẩn dù nhân viên về trễ.</span>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <button
                          type="button"
                          onClick={() => setAttendanceRules({ ...attendanceRules, allowOvertime: !attendanceRules.allowOvertime })}
                          style={{
                            width: 52,
                            height: 28,
                            borderRadius: 14,
                            background: attendanceRules.allowOvertime ? '#22C55E' : 'rgba(255,255,255,0.1)',
                            border: 'none',
                            cursor: 'pointer',
                            position: 'relative',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                          }}
                        >
                          <div style={{
                            width: 22,
                            height: 22,
                            borderRadius: '50%',
                            background: 'white',
                            position: 'absolute',
                            top: 3,
                            left: attendanceRules.allowOvertime ? 27 : 3,
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                          }} />
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="btn btn-primary"
                      style={{ alignSelf: 'flex-start', marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}
                      disabled={loading}
                    >
                      <Save size={16} />
                      {loading ? 'Đang lưu...' : 'Lưu quy tắc chấm công'}
                    </button>
                  </div>
                </form>

                <div style={{ marginTop: 32, borderTop: '1px solid var(--border)', paddingTop: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <Calendar size={20} style={{ color: 'var(--primary)' }} />
                    <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Cấu hình Ngày đặc biệt / Ngày lễ / Ngày nghỉ</h4>
                  </div>
                  
                  {/* Sub-tabs for Add Mode */}
                  <div style={{ display: 'flex', gap: 6, background: 'var(--bg-secondary)', padding: 4, borderRadius: 'var(--radius-md)', width: 'fit-content', marginBottom: 16, border: '1px solid var(--border)' }}>
                    <button
                      type="button"
                      className={`tab-btn ${addMode === 'single' ? 'active' : ''}`}
                      onClick={() => setAddMode('single')}
                      style={{ padding: '6px 16px', fontSize: '0.8125rem' }}
                    >
                      Thêm một ngày
                    </button>
                    <button
                      type="button"
                      className={`tab-btn ${addMode === 'bulk' ? 'active' : ''}`}
                      onClick={() => setAddMode('bulk')}
                      style={{ padding: '6px 16px', fontSize: '0.8125rem' }}
                    >
                      Thêm hàng loạt
                    </button>
                  </div>

                  {/* Form thêm mới */}
                  {addMode === 'single' ? (
                    <form onSubmit={handleAddSpecialDay} style={{ background: 'var(--bg-secondary)', padding: 18, borderRadius: 10, border: '1px solid var(--border)', marginBottom: 20 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                        <h5 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600 }}>Thêm ngày đặc biệt mới</h5>
                        <button
                          type="button"
                          onClick={handleAutoAddSundays}
                          style={{
                            fontSize: '0.75rem',
                            color: 'var(--primary)',
                            background: 'var(--primary-ghost)',
                            border: '1px solid var(--primary-ghost)',
                            padding: '6px 12px',
                            borderRadius: 'var(--radius-sm)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'var(--primary)';
                            e.currentTarget.style.color = 'white';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'var(--primary-ghost)';
                            e.currentTarget.style.color = 'var(--primary)';
                          }}
                          disabled={loading}
                        >
                          <Calendar size={14} /> Tự động thêm tất cả Chủ Nhật trong năm
                        </button>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 12, alignItems: 'end' }}>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label style={{ fontSize: '0.8rem' }}>Chọn ngày</label>
                          <DatePickerVN value={newSpecialDay.date} onChange={e => setNewSpecialDay({...newSpecialDay, date: e.target.value})} required />
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label style={{ fontSize: '0.8rem' }}>Loại ngày</label>
                          <select className="form-control" value={newSpecialDay.type} onChange={e => setNewSpecialDay({...newSpecialDay, type: e.target.value})}>
                            <option value="half_day">Làm nửa ngày (Thứ 7)</option>
                            <option value="holiday">Nghỉ lễ (Có lương)</option>
                            <option value="company_trip">Du lịch công ty</option>
                            <option value="off_day">Ngày nghỉ khác</option>
                          </select>
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label style={{ fontSize: '0.8rem' }}>Tên ngày đặc biệt</label>
                          <input type="text" className="form-control" placeholder="Ví dụ: Tết dương lịch" value={newSpecialDay.name} onChange={e => setNewSpecialDay({...newSpecialDay, name: e.target.value})} required />
                        </div>
                        <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px' }} disabled={loading}>
                          <Plus size={16} /> Thêm ngày
                        </button>
                      </div>
                    </form>
                  ) : (
                    <form onSubmit={handleBulkAddSpecialDays} style={{ background: 'var(--bg-secondary)', padding: 18, borderRadius: 10, border: '1px solid var(--border)', marginBottom: 20 }}>
                      <h5 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', fontWeight: 600 }}>Thêm ngày hàng loạt theo chu kỳ</h5>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label style={{ fontSize: '0.8rem' }}>Từ ngày</label>
                          <DatePickerVN value={bulkConfig.startDate} onChange={e => setBulkConfig({...bulkConfig, startDate: e.target.value})} required />
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label style={{ fontSize: '0.8rem' }}>Đến ngày</label>
                          <DatePickerVN value={bulkConfig.endDate} onChange={e => setBulkConfig({...bulkConfig, endDate: e.target.value})} required />
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label style={{ fontSize: '0.8rem' }}>Loại ngày nghỉ</label>
                          <select className="form-control" value={bulkConfig.type} onChange={e => setBulkConfig({...bulkConfig, type: e.target.value})}>
                            <option value="off_day">Ngày nghỉ khác (Chủ Nhật, ngày nghỉ tuần...)</option>
                            <option value="half_day">Làm nửa ngày (Thứ 7)</option>
                            <option value="holiday">Nghỉ lễ (Có lương)</option>
                            <option value="company_trip">Du lịch công ty</option>
                          </select>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, alignItems: 'end' }}>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label style={{ fontSize: '0.8rem', marginBottom: 8, display: 'block' }}>Lặp lại vào thứ</label>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                            {['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'].map((dayName, index) => (
                              <label key={index} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', cursor: 'pointer', background: 'var(--bg-tertiary)', padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)' }}>
                                <input
                                  type="checkbox"
                                  checked={bulkConfig.daysOfWeek[index]}
                                  onChange={e => {
                                    const updatedDays = { ...bulkConfig.daysOfWeek, [index]: e.target.checked };
                                    let autoName = bulkConfig.name;
                                    if (index === 0 && e.target.checked) {
                                      const checkedCount = Object.values(updatedDays).filter(Boolean).length;
                                      if (checkedCount === 1) autoName = 'Chủ Nhật';
                                    }
                                    setBulkConfig({
                                      ...bulkConfig,
                                      daysOfWeek: updatedDays,
                                      name: autoName
                                    });
                                  }}
                                />
                                {dayName}
                              </label>
                            ))}
                          </div>
                        </div>

                        <div className="form-group" style={{ margin: 0 }}>
                          <label style={{ fontSize: '0.8rem' }}>Tên ngày hiển thị</label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Ví dụ: Ngày nghỉ cuối tuần"
                            value={bulkConfig.name}
                            onChange={e => setBulkConfig({...bulkConfig, name: e.target.value})}
                            required
                          />
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}>
                        <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px' }} disabled={loading}>
                          <Plus size={16} /> Thêm hàng loạt
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Danh sách ngày đặc biệt */}
                  <div className="table-responsive" style={{ border: '1px solid var(--border)', borderRadius: 10 }}>
                    <table className="data-table" style={{ margin: 0 }}>
                      <thead>
                        <tr style={{ background: 'var(--bg-secondary)' }}>
                          <th style={{ padding: '10px 12px', fontSize: '0.85rem' }}>Ngày</th>
                          <th style={{ padding: '10px 12px', fontSize: '0.85rem' }}>Tên ngày đặc biệt / Ngày lễ</th>
                          <th style={{ padding: '10px 12px', fontSize: '0.85rem' }}>Phân loại</th>
                          <th style={{ padding: '10px 12px', fontSize: '0.85rem', width: 60, textAlign: 'center' }}>Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {specialDays.length === 0 ? (
                          <tr>
                            <td colSpan="4" className="text-muted text-center" style={{ padding: 16, fontSize: '0.85rem' }}>Chưa cấu hình ngày đặc biệt nào</td>
                          </tr>
                        ) : (
                          specialDays.map(d => (
                            <tr key={d.date}>
                              <td style={{ padding: '10px 12px', fontSize: '0.85rem' }} className="font-semibold">{formatDate(d.date)}</td>
                              <td style={{ padding: '10px 12px', fontSize: '0.85rem' }}>{d.name}</td>
                              <td style={{ padding: '10px 12px', fontSize: '0.85rem' }}>
                                <span className={`badge badge-${d.type === 'half_day' ? 'warning' : d.type === 'holiday' ? 'info' : d.type === 'company_trip' ? 'primary' : 'secondary'}`}>
                                  {d.type === 'half_day' ? 'Làm nửa ngày' : d.type === 'holiday' ? 'Nghỉ lễ' : d.type === 'company_trip' ? 'Du lịch công ty' : 'Ngày nghỉ'}
                                </span>
                              </td>
                              <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                <button type="button" onClick={() => handleDeleteSpecialDay(d.date)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: 2 }}>
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
