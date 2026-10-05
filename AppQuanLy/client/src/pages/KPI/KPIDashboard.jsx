import toast from 'react-hot-toast';
import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import {
  Award, TrendingUp, Star, CheckCircle, Edit, X, Save
} from 'lucide-react';
import DatePickerVN from '../../components/ui/DatePickerVN';

export default function KPIDashboard() {
  const { user, isDirector, canAccess } = useAuth();
  const isManagement = isDirector || canAccess('staff.manage') || user?.role?.includes('manager');

  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedKpi, setSelectedKpi] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const [evalForm, setEvalForm] = useState({
    taskScore: 80, revenueScore: 80, disciplineScore: 100, managerReview: ''
  });

  useEffect(() => {
    loadKpis();
  }, [month]);

  const loadKpis = async () => {
    try {
      setLoading(true);
      const res = await api.get('/kpi/summary', { month });
      setResults(res.results || []);
    } catch (err) {
      console.error('Failed to load KPIs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEvaluate = (item) => {
    setSelectedKpi(item);
    setEvalForm({
      taskScore: item.taskScore || 80,
      revenueScore: item.revenueScore || 80,
      disciplineScore: item.disciplineScore || 100,
      managerReview: item.managerReview || ''
    });
    setShowModal(true);
  };

  const handleSaveEvaluation = async (e) => {
    e.preventDefault();
    try {
      await api.post('/kpi/evaluate', {
        userId: selectedKpi.userInfo._id,
        month,
        ...evalForm
      });
      toast.success('Cập nhật đánh giá KPI thành công!');
      setShowModal(false);
      loadKpis();
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) {
    return <div className="loading-overlay"><div className="loading-spinner" /></div>;
  }

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <h1>
          <Award size={24} /> Bảng Đánh Giá Hiệu Suất KPI
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="text-sm font-medium">Tháng:</span>
          <div style={{ width: 160 }}>
            <DatePickerVN
              type="month"
              value={month}
              onChange={e => setMonth(e.target.value)}
              className="form-control form-control-sm"
            />
          </div>
        </div>
      </div>

      <div className="grid-4 stagger-children" style={{ marginBottom: 24 }}>
        {results.map(item => (
          <div key={item.userInfo._id} className="card" style={{ position: 'relative', textAlign: 'center' }}>
            <div className="avatar avatar-lg" style={{ margin: '8px auto 12px', background: 'var(--gradient-primary)' }}>
              {item.userInfo.fullName?.split(' ').pop().charAt(0)}
            </div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 2 }}>{item.userInfo.fullName}</h3>
            <div className="text-xs text-muted" style={{ marginBottom: 8 }}>
              {item.userInfo.position} • Phòng {item.userInfo.department?.toUpperCase()}
            </div>

            <div style={{ background: 'var(--bg-tertiary)', padding: 12, borderRadius: 8, marginBottom: 12 }}>
              <div className="text-xs text-muted" style={{ marginBottom: 2 }}>Điểm KPI Tổng hợp</div>
              <div className="font-bold text-xl" style={{ color: item.overallScore >= 80 ? '#22C55E' : '#EAB308' }}>
                {item.overallScore} / 100
              </div>
              <span className="badge badge-ghost" style={{ fontSize: '0.6875rem', marginTop: 4 }}>
                {item.grade}
              </span>
            </div>

            <div style={{ textAlign: 'left', fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="text-muted">Hoàn thành Task:</span>
                <span className="font-semibold">{item.taskScore} điểm</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="text-muted">Doanh số/Hỗ trợ:</span>
                <span className="font-semibold">{item.revenueScore} điểm</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="text-muted">Chuyên cần:</span>
                <span className="font-semibold">{item.disciplineScore} điểm</span>
              </div>
            </div>

            {isManagement && (
              <button
                className="btn btn-ghost btn-sm"
                style={{ width: '100%' }}
                onClick={() => handleOpenEvaluate(item)}
              >
                <Edit size={14} /> Đánh giá / Sửa điểm
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Modal Evaluate */}
      {showModal && selectedKpi && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>⭐ Đánh Giá KPI: {selectedKpi.userInfo.fullName} ({month})</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveEvaluation}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Điểm hoàn thành công việc (0 - 100)</label>
                  <input type="number" className="form-control" min={0} max={100} value={evalForm.taskScore} onChange={e => setEvalForm({ ...evalForm, taskScore: parseInt(e.target.value) || 0 })} required />
                </div>

                <div className="form-group">
                  <label className="form-label">Điểm doanh số / hỗ trợ (0 - 100)</label>
                  <input type="number" className="form-control" min={0} max={100} value={evalForm.revenueScore} onChange={e => setEvalForm({ ...evalForm, revenueScore: parseInt(e.target.value) || 0 })} required />
                </div>

                <div className="form-group">
                  <label className="form-label">Điểm kỷ luật / chuyên cần (0 - 100)</label>
                  <input type="number" className="form-control" min={0} max={100} value={evalForm.disciplineScore} onChange={e => setEvalForm({ ...evalForm, disciplineScore: parseInt(e.target.value) || 0 })} required />
                </div>

                <div className="form-group">
                  <label className="form-label">Nhận xét của Quản lý</label>
                  <textarea className="form-control" rows={3} value={evalForm.managerReview} onChange={e => setEvalForm({ ...evalForm, managerReview: e.target.value })} placeholder="Nhập nhận xét thái độ, hiệu suất làm việc..." />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary"><Save size={16} /> Lưu Đánh Giá</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
