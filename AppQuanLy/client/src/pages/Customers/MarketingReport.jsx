import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useConfirm } from '../../contexts/ConfirmContext';
import { formatCurrency, formatDate } from '../../utils/helpers';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import {
  Upload, FileSpreadsheet, BarChart3, DollarSign, Eye, Users, Target,
  MessageSquare, ShoppingCart, TrendingUp, CalendarDays, Award, Compass, Activity, Percent,
  Lightbulb, AlertTriangle, CheckCircle2, ArrowRight, Gauge, PauseCircle, Archive, Trash2
} from 'lucide-react';

const COLORS = ['#F97316', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#06B6D4', '#EF4444'];

const FIELD_BY_HEADER = {
  'luot bat dau bao cao': 'reportStart',
  'luot ket thuc bao cao': 'reportEnd',
  'ten chien dich': 'campaignName',
  'luot phan phoi chien dich': 'delivery',
  'so tien da chi tieu (vnd)': 'spend',
  'nguoi tiep can': 'reach',
  'luot hien thi': 'impressions',
  'ket qua': 'results',
  'chi bao ket qua': 'resultIndicator',
  'chi phi tren moi ket qua': 'costPerResult',
  'luot bat dau cuoc tro chuyen qua tin nhan': 'messagingConversations',
  'chi phi tren moi luot bat dau cuoc tro chuyen qua tin nhan (vnd)': 'costPerMessagingConversation',
  'nguoi lien he nhan tin': 'messagingContacts',
  'nguoi lien he nhan tin moi': 'newMessagingContacts',
  'onsite_conversion_returning_messaging_connection': 'returningMessagingConnections',
  'luot mua': 'purchases',
  'chi phi tren moi luot mua (vnd)': 'costPerPurchase',
  'roas (loi nhuan tren chi tieu quang cao) cua luot mua': 'purchaseRoas'
};

const sourceNames = {
  facebook: 'Facebook',
  zalo: 'Zalo',
  website: 'Website',
  referral: 'Giới thiệu',
  direct: 'Trực tiếp',
  other: 'Khác'
};

const normalizeHeader = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/g, 'd')
  .replace(/Đ/g, 'D')
  .toLowerCase()
  .replace(/\s+/g, ' ')
  .trim();

const parseNumber = (value) => {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const raw = String(value).trim().replace(/\s/g, '');
  const normalized = raw.includes(',')
    ? raw.replace(/\./g, '').replace(',', '.')
    : raw.replace(/,/g, '');
  const parsed = Number(normalized.replace(/[^\d.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
};

const parseExcelDate = (value) => {
  if (!value) return '';
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
    }
  }
  const text = String(value).trim();
  const iso = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (iso) return `${iso[1]}-${String(iso[2]).padStart(2, '0')}-${String(iso[3]).padStart(2, '0')}`;
  const vi = text.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (vi) return `${vi[3]}-${String(vi[2]).padStart(2, '0')}-${String(vi[1]).padStart(2, '0')}`;
  return text;
};

const parseFacebookAdsWorkbook = async (file) => {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  const headerIndex = matrix.findIndex(row => row.some(cell => normalizeHeader(cell) === 'ten chien dich'));
  if (headerIndex === -1) {
    throw new Error('Không tìm thấy cột "Tên chiến dịch" trong file XLSX');
  }

  const headers = matrix[headerIndex].map(header => FIELD_BY_HEADER[normalizeHeader(header)] || null);
  const rows = matrix.slice(headerIndex + 1).map(row => {
    const item = {};
    headers.forEach((field, index) => {
      if (!field) return;
      const value = row[index];
      if (['reportStart', 'reportEnd'].includes(field)) item[field] = parseExcelDate(value);
      else if (field === 'campaignName' || field === 'delivery' || field === 'resultIndicator') item[field] = String(value || '').trim();
      else item[field] = parseNumber(value);
    });
    return item;
  }).filter(row => row.campaignName);

  if (rows.length === 0) {
    throw new Error('File không có dòng chiến dịch hợp lệ');
  }

  return rows;
};

const MetricCard = ({ icon: Icon, label, value, tone = '#3B82F6' }) => (
  <div className="card" style={{ border: `1px solid ${tone}33` }}>
    <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ width: 44, height: 44, borderRadius: 8, background: tone, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
        <Icon size={22} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>{label}</div>
        <div style={{ fontSize: '1.35rem', fontWeight: 800, marginTop: 3, overflowWrap: 'anywhere' }}>{value}</div>
      </div>
    </div>
  </div>
);

const StrategyCard = ({ icon: Icon, title, value, description, tone = '#3B82F6' }) => (
  <div className="card" style={{ borderLeft: `4px solid ${tone}` }}>
    <div className="card-body" style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
      <div style={{ width: 38, height: 38, borderRadius: 8, background: `${tone}22`, color: tone, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={20} />
      </div>
      <div>
        <div style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>{title}</div>
        <div style={{ fontSize: '1.05rem', fontWeight: 800, margin: '4px 0' }}>{value}</div>
        <div style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.45 }}>{description}</div>
      </div>
    </div>
  </div>
);

const FunnelStep = ({ label, value, sub }) => (
  <div style={{ minWidth: 150, flex: 1 }}>
    <div style={{ border: '1px solid var(--border-light)', borderRadius: 8, padding: 14, background: 'var(--bg-secondary)' }}>
      <div style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: '1.4rem', fontWeight: 900, marginTop: 4 }}>{value}</div>
      <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>{sub}</div>
    </div>
  </div>
);

const PerformanceBadge = ({ status }) => {
  const config = {
    scale: { label: 'Nên tăng ngân sách', color: '#22C55E', icon: CheckCircle2 },
    optimize: { label: 'Cần tối ưu', color: '#F59E0B', icon: Gauge },
    pause: { label: 'Xem xét tạm dừng', color: '#EF4444', icon: PauseCircle }
  }[status] || { label: 'Theo dõi', color: '#3B82F6', icon: Activity };
  const Icon = config.icon;
  return (
    <span className="badge" style={{ color: config.color, border: `1px solid ${config.color}55`, background: `${config.color}18`, display: 'inline-flex', alignItems: 'center', gap: 5, textTransform: 'none' }}>
      <Icon size={13} /> {config.label}
    </span>
  );
};

const formatNumber = (value, digits = 0) => Number(value || 0).toLocaleString('vi-VN', {
  maximumFractionDigits: digits
});

const getResultLabel = (indicator) => {
  if (!indicator) return '--';
  if (indicator.includes('lead_grouped')) return 'Lead';
  if (indicator.includes('post_engagement')) return 'Tương tác';
  if (indicator.includes('messaging_conversation')) return 'Tin nhắn';
  if (indicator.includes('purchase')) return 'Mua hàng';
  return indicator.replace('actions:', '');
};

const safeDivide = (value, total) => total > 0 ? value / total : 0;

const inferSpend = (row) => {
  const spend = parseNumber(row.spend);
  if (spend > 0) return spend;

  const purchases = parseNumber(row.purchases);
  const costPerPurchase = parseNumber(row.costPerPurchase);
  if (costPerPurchase > 0 && purchases > 0) return costPerPurchase * purchases;

  const results = parseNumber(row.results);
  const costPerResult = parseNumber(row.costPerResult);
  if (costPerResult > 0 && results > 0) return costPerResult * results;

  const messageCount = parseNumber(row.messagingConversations) || parseNumber(row.messagingContacts);
  const costPerMessage = parseNumber(row.costPerMessagingConversation);
  if (costPerMessage > 0 && messageCount > 0) return costPerMessage * messageCount;

  return 0;
};

const normalizeReportRow = (row) => ({
  ...row,
  spend: inferSpend(row),
  reach: parseNumber(row.reach),
  impressions: parseNumber(row.impressions),
  results: parseNumber(row.results),
  costPerResult: parseNumber(row.costPerResult),
  messagingConversations: parseNumber(row.messagingConversations),
  costPerMessagingConversation: parseNumber(row.costPerMessagingConversation),
  messagingContacts: parseNumber(row.messagingContacts),
  newMessagingContacts: parseNumber(row.newMessagingContacts),
  purchases: parseNumber(row.purchases),
  costPerPurchase: parseNumber(row.costPerPurchase)
});

const calculateTotalsFromRows = (rows) => rows.reduce((acc, row) => ({
  spend: acc.spend + (row.spend || 0),
  reach: acc.reach + (row.reach || 0),
  impressions: acc.impressions + (row.impressions || 0),
  results: acc.results + (row.results || 0),
  messagingConversations: acc.messagingConversations + (row.messagingConversations || 0),
  messagingContacts: acc.messagingContacts + (row.messagingContacts || 0),
  newMessagingContacts: acc.newMessagingContacts + (row.newMessagingContacts || 0),
  purchases: acc.purchases + (row.purchases || 0)
}), {
  spend: 0,
  reach: 0,
  impressions: 0,
  results: 0,
  messagingConversations: 0,
  messagingContacts: 0,
  newMessagingContacts: 0,
  purchases: 0
});

const getCampaignStatus = (row, averages) => {
  const cpr = row.costPerResult || safeDivide(row.spend, row.results);
  if ((row.purchases || 0) > 0 || ((row.results || 0) >= averages.results && cpr > 0 && cpr <= averages.cpr)) {
    return 'scale';
  }
  if ((row.spend || 0) >= averages.spend && (row.results || 0) <= averages.results * 0.4) {
    return 'pause';
  }
  return 'optimize';
};

export default function MarketingReport() {
  const { user } = useAuth();
  const confirm = useConfirm();
  const [searchParams, setSearchParams] = useSearchParams();
  const [customerStats, setCustomerStats] = useState(null);
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const canUpload = user?.department === 'marketing' || user?.role === 'director';
  const canManageReports = user?.role === 'director' || user?.role === 'it_manager' || user?.department === 'it';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsRes, reportsRes] = await Promise.all([
        api.get('/customers/marketing-stats'),
        api.get('/customers/marketing-campaign-reports')
      ]);
      setCustomerStats(statsRes);
      setReports(reportsRes.reports || []);
      const reportId = searchParams.get('reportId');
      const targetId = reportId || reportsRes.reports?.[0]?._id;
      if (targetId) {
        const detail = await api.get(`/customers/marketing-campaign-reports/${targetId}`);
        setSelectedReport(detail.report);
      } else {
        setSelectedReport(null);
      }
    } catch (err) {
      toast.error(err.message || 'Không thể tải báo cáo Marketing');
    } finally {
      setLoading(false);
    }
  };

  const loadReportDetail = async (id) => {
    try {
      const res = await api.get(`/customers/marketing-campaign-reports/${id}`);
      setSelectedReport(res.report);
      setSearchParams(id ? { reportId: id } : {});
    } catch (err) {
      toast.error(err.message || 'Không thể tải chi tiết báo cáo');
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      toast.error('Vui lòng chọn file .xlsx xuất từ Facebook Ads');
      return;
    }

    try {
      setUploading(true);
      const rows = await parseFacebookAdsWorkbook(file);
      const res = await api.post('/customers/marketing-campaign-reports', {
        fileName: file.name,
        rows
      });
      toast.success(res.message || 'Đã upload báo cáo');
      setSelectedReport(res.report);
      setSearchParams({ reportId: res.report._id });
      await loadData();
    } catch (err) {
      toast.error(err.message || 'Không thể xử lý file XLSX');
    } finally {
      setUploading(false);
    }
  };

  const handleArchiveReport = async () => {
    if (!selectedReport?._id) return;
    try {
      const res = await api.post(`/customers/marketing-campaign-reports/${selectedReport._id}/archive-document`, {
        folder: 'Báo cáo Marketing',
        departments: ['marketing', 'it', 'director']
      });
      toast.success(res.message || 'Đã lưu báo cáo vào tài liệu');
    } catch (err) {
      toast.error(err.message || 'Không thể lưu báo cáo vào tài liệu');
    }
  };

  const handleDeleteReport = async () => {
    if (!selectedReport?._id) return;
    const ok = await confirm({
      title: 'Gỡ báo cáo Marketing',
      message: 'Báo cáo này và tài liệu liên kết với nó sẽ bị gỡ khỏi hệ thống.',
      confirmText: 'Gỡ báo cáo',
      cancelText: 'Hủy',
      type: 'danger'
    });
    if (!ok) return;
    try {
      await api.delete(`/customers/marketing-campaign-reports/${selectedReport._id}`);
      toast.success('Đã gỡ báo cáo Marketing');
      setSelectedReport(null);
      setSearchParams({});
      await loadData();
    } catch (err) {
      toast.error(err.message || 'Không thể gỡ báo cáo');
    }
  };

  const reportRows = useMemo(() => (selectedReport?.rows || [])
    .filter(row => row.campaignName)
    .map(normalizeReportRow), [selectedReport]);
  const totals = useMemo(() => calculateTotalsFromRows(reportRows), [reportRows]);
  const costPerResult = totals.results > 0 ? totals.spend / totals.results : 0;
  const primaryMessages = totals.messagingContacts || totals.messagingConversations || 0;
  const costPerMessage = primaryMessages > 0 ? totals.spend / primaryMessages : 0;
  const costPerPurchase = totals.purchases > 0 ? totals.spend / totals.purchases : 0;
  const cpm = totals.impressions > 0 ? (totals.spend / totals.impressions) * 1000 : 0;
  const ctr = totals.impressions > 0 ? (totals.results / totals.impressions) * 100 : 0;
  const frequency = totals.reach > 0 ? totals.impressions / totals.reach : 0;
  const messageRate = totals.reach > 0 ? (primaryMessages / totals.reach) * 100 : 0;
  const purchaseRate = totals.results > 0 ? (totals.purchases / totals.results) * 100 : 0;
  const impressionRate = totals.reach > 0 ? (totals.impressions / totals.reach) * 100 : 0;
  const resultToMessageRate = totals.results > 0 ? (primaryMessages / totals.results) * 100 : 0;

  const activeRows = reportRows.filter(row => (row.spend || 0) > 0 || (row.results || 0) > 0);
  const averages = {
    spend: activeRows.length ? totals.spend / activeRows.length : 0,
    results: activeRows.length ? totals.results / activeRows.length : 0,
    cpr: totals.results > 0 ? totals.spend / totals.results : 0
  };

  const rankedCampaigns = useMemo(() => activeRows.map(row => {
    const cprValue = row.costPerResult || safeDivide(row.spend, row.results);
    const primaryRowMessages = row.messagingContacts || row.messagingConversations || 0;
    const cpMessage = row.costPerMessagingConversation || safeDivide(row.spend, primaryRowMessages);
    return {
      ...row,
      primaryMessages: primaryRowMessages,
      cprValue,
      cpMessage,
      status: getCampaignStatus(row, averages),
      resultRate: row.impressions > 0 ? (row.results / row.impressions) * 100 : 0
    };
  }).sort((a, b) => {
    const statusWeight = { scale: 0, optimize: 1, pause: 2 };
    return statusWeight[a.status] - statusWeight[b.status] || (b.spend || 0) - (a.spend || 0);
  }), [activeRows, averages.cpr, averages.results, averages.spend]);

  const bestLeadCampaign = rankedCampaigns
    .filter(row => row.results > 0 && row.cprValue > 0)
    .sort((a, b) => a.cprValue - b.cprValue)[0];

  const bestPurchaseCampaign = rankedCampaigns
    .filter(row => row.purchases > 0)
    .sort((a, b) => (a.costPerPurchase || safeDivide(a.spend, a.purchases)) - (b.costPerPurchase || safeDivide(b.spend, b.purchases)))[0];

  const attentionCampaigns = rankedCampaigns
    .filter(row => row.status === 'pause' || row.status === 'optimize')
    .slice(0, 3);

  const campaignActions = {
    scale: rankedCampaigns.filter(row => row.status === 'scale').length,
    optimize: rankedCampaigns.filter(row => row.status === 'optimize').length,
    pause: rankedCampaigns.filter(row => row.status === 'pause').length
  };

  const campaignChartData = useMemo(() => [...reportRows]
    .sort((a, b) => (b.spend || 0) - (a.spend || 0))
    .slice(0, 10)
    .map(row => ({
      name: row.campaignName?.length > 28 ? `${row.campaignName.slice(0, 28)}...` : row.campaignName,
      spend: row.spend || 0,
      results: row.results || 0,
      messages: row.messagingContacts || row.messagingConversations || 0,
      purchases: row.purchases || 0
    })), [reportRows]);

  const deliveryData = useMemo(() => {
    const grouped = {};
    reportRows.forEach(row => {
      const key = row.delivery || 'unknown';
      grouped[key] = (grouped[key] || 0) + 1;
    });
    return Object.keys(grouped).map(key => ({ name: key, value: grouped[key] }));
  }, [reportRows]);

  const customerTotalLeads = customerStats?.sourceStats?.reduce((sum, s) => sum + s.count, 0) || 0;
  const bookedCount = customerStats?.statusStats?.find(s => s.status === 'booked')?.count || 0;
  const vipCount = customerStats?.statusStats?.find(s => s.status === 'vip')?.count || 0;
  const convertedCount = bookedCount + vipCount;
  const conversionRate = customerTotalLeads > 0 ? ((convertedCount / customerTotalLeads) * 100).toFixed(1) : '0';
  const sourcePieData = (customerStats?.sourceStats || []).map(s => ({
    name: sourceNames[s.source] || s.source,
    value: s.count
  })).filter(s => s.value > 0);
  const canDeleteSelectedReport = canManageReports || selectedReport?.uploadedBy?._id === user?._id;

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <div className="animate-fadeIn">
      <div className="page-header" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1>
            <BarChart3 size={24} style={{ color: 'var(--primary)' }} /> Báo Cáo Marketing
          </h1>
          <p className="text-muted" style={{ margin: '4px 0 0' }}>
            Upload báo cáo Facebook Ads dạng XLSX, trích xuất chỉ số chiến dịch và theo dõi hiệu quả quảng cáo.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {canManageReports && selectedReport && (
            <button className="btn btn-secondary" onClick={handleArchiveReport}>
              <Archive size={18} /> Lưu vào tài liệu
            </button>
          )}
          {canDeleteSelectedReport && selectedReport && (
            <button className="btn btn-ghost text-danger" onClick={handleDeleteReport}>
              <Trash2 size={18} /> Gỡ báo cáo
            </button>
          )}
          {canUpload && (
            <label className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: uploading ? 'not-allowed' : 'pointer' }}>
              <Upload size={18} />
              {uploading ? 'Đang xử lý...' : 'Upload XLSX'}
              <input type="file" accept=".xlsx" onChange={handleFileUpload} disabled={uploading} style={{ display: 'none' }} />
            </label>
          )}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body" style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 1fr) minmax(240px, 2fr)', gap: 16, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <FileSpreadsheet size={32} style={{ color: 'var(--success)' }} />
            <div>
              <div style={{ fontWeight: 800 }}>Báo cáo Facebook Ads</div>
              <div className="text-muted" style={{ fontSize: 13 }}>
                {reports.length} file đã upload. IT Manager và Giám đốc xem được toàn bộ.
              </div>
            </div>
          </div>
          <select
            className="form-control"
            value={selectedReport?._id || ''}
            onChange={e => e.target.value && loadReportDetail(e.target.value)}
          >
            <option value="">-- Chọn báo cáo --</option>
            {selectedReport && !reports.some(report => report._id === selectedReport._id) && (
              <option value={selectedReport._id}>{selectedReport.fileName} - {selectedReport.rowCount} chiến dịch</option>
            )}
            {reports.map(report => (
              <option key={report._id} value={report._id}>
                {report.fileName} - {report.rowCount} chiến dịch - {formatDate(report.createdAt)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedReport ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 20 }}>
            <StrategyCard
              icon={Lightbulb}
              title="Kết luận nhanh"
              value={`${campaignActions.scale} chiến dịch nên tăng ngân sách`}
              description={`${campaignActions.optimize} chiến dịch cần tối ưu nội dung/tệp khách, ${campaignActions.pause} chiến dịch nên xem xét giảm hoặc tạm dừng.`}
              tone="#22C55E"
            />
            <StrategyCard
              icon={Award}
              title="Lead rẻ nhất"
              value={bestLeadCampaign ? bestLeadCampaign.campaignName : 'Chưa có dữ liệu'}
              description={bestLeadCampaign ? `CPR ${formatCurrency(bestLeadCampaign.cprValue)} với ${formatNumber(bestLeadCampaign.results)} kết quả.` : 'Upload báo cáo có kết quả để hệ thống tự xếp hạng.'}
              tone="#F59E0B"
            />
            <StrategyCard
              icon={ShoppingCart}
              title="Có tín hiệu mua"
              value={bestPurchaseCampaign ? bestPurchaseCampaign.campaignName : 'Chưa có lượt mua'}
              description={bestPurchaseCampaign ? `${formatNumber(bestPurchaseCampaign.purchases)} lượt mua, chi phí/mua ${formatCurrency(bestPurchaseCampaign.costPerPurchase || safeDivide(bestPurchaseCampaign.spend, bestPurchaseCampaign.purchases))}.` : 'Nên theo dõi thêm hoặc kiểm tra pixel/conversion nếu thực tế có đơn.'}
              tone="#EF4444"
            />
          </div>

          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header">
              <h3 className="card-title"><Target size={18} style={{ color: 'var(--primary)' }} /> Phễu hiệu quả quảng cáo</h3>
            </div>
            <div className="card-body">
              <div style={{ display: 'flex', gap: 10, alignItems: 'stretch', overflowX: 'auto', paddingBottom: 4 }}>
                <FunnelStep label="Tiếp cận" value={formatNumber(totals.reach)} sub="người đã thấy quảng cáo" />
                <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}><ArrowRight size={18} /></div>
                <FunnelStep label="Hiển thị" value={formatNumber(totals.impressions)} sub={`tần suất ${formatNumber(frequency, 2)} lần`} />
                <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}><ArrowRight size={18} /></div>
                <FunnelStep label="Kết quả" value={formatNumber(totals.results)} sub={`${formatNumber(ctr, 2)}% trên hiển thị`} />
                <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}><ArrowRight size={18} /></div>
                <FunnelStep label="Người nhắn tin" value={formatNumber(primaryMessages)} sub={`${formatNumber(resultToMessageRate, 2)}% trên kết quả`} />
                <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}><ArrowRight size={18} /></div>
                <FunnelStep label="Mua" value={formatNumber(totals.purchases)} sub={`${formatNumber(purchaseRate, 2)}% trên kết quả`} />
              </div>
            </div>
          </div>

          {attentionCampaigns.length > 0 && (
            <div className="card" style={{ marginBottom: 20, border: '1px solid rgba(245, 158, 11, 0.35)' }}>
              <div className="card-header">
                <h3 className="card-title"><AlertTriangle size={18} style={{ color: '#F59E0B' }} /> Chiến dịch cần chú ý</h3>
              </div>
              <div className="card-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
                {attentionCampaigns.map(row => (
                  <div key={row.campaignName} style={{ border: '1px solid var(--border-light)', borderRadius: 8, padding: 14, background: 'var(--bg-secondary)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
                      <div style={{ fontWeight: 800, lineHeight: 1.35 }}>{row.campaignName}</div>
                      <PerformanceBadge status={row.status} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12, color: 'var(--text-muted)', fontSize: 13 }}>
                      <span>Chi tiêu: <b style={{ color: 'var(--text-primary)' }}>{formatCurrency(row.spend)}</b></span>
                      <span>Kết quả: <b style={{ color: 'var(--text-primary)' }}>{formatNumber(row.results)}</b></span>
                      <span>CPR: <b style={{ color: 'var(--text-primary)' }}>{formatCurrency(row.cprValue)}</b></span>
                      <span>Mua: <b style={{ color: 'var(--text-primary)' }}>{formatNumber(row.purchases)}</b></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 16, marginBottom: 20 }}>
            <MetricCard icon={DollarSign} label="Chi tiêu" value={formatCurrency(totals.spend || 0)} tone="#F97316" />
            <MetricCard icon={Users} label="Người tiếp cận" value={(totals.reach || 0).toLocaleString('vi-VN')} tone="#3B82F6" />
            <MetricCard icon={Eye} label="Lượt hiển thị" value={(totals.impressions || 0).toLocaleString('vi-VN')} tone="#06B6D4" />
            <MetricCard icon={Target} label="Kết quả" value={(totals.results || 0).toLocaleString('vi-VN')} tone="#10B981" />
            <MetricCard icon={MessageSquare} label="Người liên hệ nhắn tin" value={formatNumber(primaryMessages)} tone="#8B5CF6" />
            <MetricCard icon={Users} label="Liên hệ nhắn tin mới" value={formatNumber(totals.newMessagingContacts || 0)} tone="#0EA5E9" />
            <MetricCard icon={ShoppingCart} label="Lượt mua" value={(totals.purchases || 0).toLocaleString('vi-VN')} tone="#EF4444" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 16, marginBottom: 24 }}>
            <MetricCard icon={TrendingUp} label="CPM" value={formatCurrency(cpm)} tone="#64748B" />
            <MetricCard icon={Award} label="Chi phí/kết quả" value={formatCurrency(costPerResult)} tone="#F59E0B" />
            <MetricCard icon={MessageSquare} label="Chi phí/người nhắn tin" value={formatCurrency(costPerMessage)} tone="#14B8A6" />
            <MetricCard icon={ShoppingCart} label="Chi phí/lượt mua" value={formatCurrency(costPerPurchase)} tone="#DC2626" />
            <MetricCard icon={Percent} label="Tỉ lệ kết quả/hiển thị" value={`${formatNumber(ctr, 2)}%`} tone="#0EA5E9" />
            <MetricCard icon={Eye} label="Tần suất hiển thị" value={`${formatNumber(frequency, 2)} lần`} tone="#A855F7" />
            <MetricCard icon={MessageSquare} label="Tỉ lệ tin nhắn/reach" value={`${formatNumber(messageRate, 2)}%`} tone="#22C55E" />
            <MetricCard icon={Target} label="Tỉ lệ mua/kết quả" value={`${formatNumber(purchaseRate, 2)}%`} tone="#F43F5E" />
            <MetricCard icon={CalendarDays} label="Khoảng báo cáo" value={`${selectedReport.reportStart ? formatDate(selectedReport.reportStart) : '--'} - ${selectedReport.reportEnd ? formatDate(selectedReport.reportEnd) : '--'}`} tone="#6366F1" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(300px, 1fr)', gap: 24, marginBottom: 24 }}>
            <div className="card">
              <div className="card-header">
                <h3 className="card-title"><BarChart3 size={18} style={{ color: 'var(--primary)' }} /> Top chiến dịch theo chi tiêu</h3>
              </div>
              <div className="card-body">
                <div style={{ width: '100%', height: 330 }}>
                  <ResponsiveContainer>
                    <BarChart data={campaignChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} interval={0} angle={-15} textAnchor="end" height={70} />
                      <YAxis yAxisId="left" stroke="var(--text-muted)" fontSize={12} tickFormatter={(val) => `${Math.round(val / 1000000)}M`} />
                      <YAxis yAxisId="right" orientation="right" stroke="var(--text-muted)" fontSize={12} allowDecimals={false} />
                      <Tooltip
                        formatter={(value, name) => name === 'spend' ? [formatCurrency(value), 'Chi tiêu'] : [value, name]}
                        contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', borderRadius: 8 }}
                      />
                      <Legend />
                      <Bar yAxisId="left" dataKey="spend" name="Chi tiêu" fill="#F97316" radius={[4, 4, 0, 0]} />
                      <Bar yAxisId="right" dataKey="results" name="Kết quả" fill="#10B981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h3 className="card-title"><Compass size={18} style={{ color: 'var(--primary)' }} /> Trạng thái phân phối</h3>
              </div>
              <div className="card-body">
                <div style={{ width: '100%', height: 300 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={deliveryData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={54} outerRadius={86} paddingAngle={3}>
                        {deliveryData.map((entry, index) => (
                          <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', borderRadius: 8 }} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header">
              <h3 className="card-title"><Gauge size={18} style={{ color: 'var(--primary)' }} /> Bảng quyết định ngân sách</h3>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              <div style={{ overflowX: 'auto', width: '100%' }}>
                <table className="table" style={{ margin: 0, minWidth: 980, tableLayout: 'fixed' }}>
                  <thead>
                    <tr>
                      <th style={{ width: 300 }}>Chiến dịch</th>
                      <th style={{ width: 150 }}>Khuyến nghị</th>
                      <th style={{ width: 130, textAlign: 'right' }}>Chi tiêu</th>
                      <th style={{ width: 100, textAlign: 'right' }}>Kết quả</th>
                      <th style={{ width: 130, textAlign: 'right' }}>CPR</th>
                      <th style={{ width: 130, textAlign: 'right' }}>Người nhắn tin</th>
                      <th style={{ width: 90, textAlign: 'right' }}>Mua</th>
                      <th style={{ width: 170 }}>Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rankedCampaigns.slice(0, 12).map(row => {
                      const actionText = row.status === 'scale'
                        ? 'Tăng ngân sách hoặc nhân bản nhóm quảng cáo.'
                        : row.status === 'pause'
                          ? 'Giảm ngân sách, kiểm tra tệp/creative.'
                          : 'Đổi nội dung, CTA hoặc tối ưu tệp.';
                      return (
                        <tr key={`rank-${row.campaignName}`}>
                          <td style={{ fontWeight: 800, whiteSpace: 'normal', lineHeight: 1.35 }}>{row.campaignName}</td>
                          <td><PerformanceBadge status={row.status} /></td>
                          <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{formatCurrency(row.spend)}</td>
                          <td style={{ textAlign: 'right' }}>{formatNumber(row.results)}</td>
                          <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{formatCurrency(row.cprValue)}</td>
                          <td style={{ textAlign: 'right' }}>{formatNumber(row.primaryMessages)}</td>
                          <td style={{ textAlign: 'right' }}>{formatNumber(row.purchases)}</td>
                          <td style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.4 }}>{actionText}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header">
              <h3 className="card-title"><FileSpreadsheet size={18} style={{ color: 'var(--primary)' }} /> Chi tiết chiến dịch</h3>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              <div style={{ overflowX: 'auto', width: '100%' }}>
                <table className="table" style={{ margin: 0, minWidth: 1600, tableLayout: 'fixed' }}>
                  <thead>
                    <tr>
                      <th style={{ width: 300 }}>Chiến dịch</th>
                      <th style={{ width: 120 }}>Phân phối</th>
                      <th style={{ width: 130, textAlign: 'right' }}>Chi tiêu</th>
                      <th style={{ width: 110, textAlign: 'right' }}>Tiếp cận</th>
                      <th style={{ width: 110, textAlign: 'right' }}>Hiển thị</th>
                      <th style={{ width: 90, textAlign: 'right' }}>Kết quả</th>
                      <th style={{ width: 140, textAlign: 'right' }}>CPR</th>
                      <th style={{ width: 150 }}>Loại kết quả</th>
                      <th style={{ width: 130, textAlign: 'right' }}>Người nhắn tin</th>
                      <th style={{ width: 120, textAlign: 'right' }}>Bắt đầu chat</th>
                      <th style={{ width: 160, textAlign: 'right' }}>Chi phí/người nhắn</th>
                      <th style={{ width: 120, textAlign: 'right' }}>Liên hệ mới</th>
                      <th style={{ width: 90, textAlign: 'right' }}>Mua</th>
                      <th style={{ width: 140, textAlign: 'right' }}>Chi phí/mua</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportRows.map((row, index) => (
                      <tr key={`${row.campaignName}-${index}`}>
                        <td style={{ fontWeight: 700, whiteSpace: 'normal', lineHeight: 1.35 }}>{row.campaignName || '--'}</td>
                        <td>
                          <span className="badge" style={{ textTransform: 'none' }}>{row.delivery || 'unknown'}</span>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700, whiteSpace: 'nowrap' }}>{formatCurrency(row.spend || 0)}</td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{formatNumber(row.reach)}</td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{formatNumber(row.impressions)}</td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{formatNumber(row.results)}</td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{formatCurrency(row.costPerResult || 0)}</td>
                        <td title={row.resultIndicator || ''}>
                          <span style={{ display: 'inline-flex', maxWidth: 132, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {getResultLabel(row.resultIndicator)}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{formatNumber(row.messagingContacts || row.messagingConversations)}</td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{formatNumber(row.messagingConversations)}</td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{formatCurrency(row.costPerMessagingConversation || safeDivide(row.spend, row.messagingContacts || row.messagingConversations))}</td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{formatNumber(row.newMessagingContacts)}</td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{formatNumber(row.purchases)}</td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{formatCurrency(row.costPerPurchase || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-body" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 36 }}>
            Chưa có báo cáo Facebook Ads. Nhân viên Marketing upload file XLSX để bắt đầu xem biểu đồ.
          </div>
        </div>
      )}

      {customerStats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24 }}>
          <div className="card">
            <div className="card-header">
              <h3 className="card-title"><Activity size={18} style={{ color: 'var(--primary)' }} /> Khách hàng mới theo tháng</h3>
            </div>
            <div className="card-body">
              <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer>
                  <AreaChart data={customerStats.newCustomersMonthly || []}>
                    <defs>
                      <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={12} />
                    <YAxis stroke="var(--text-muted)" fontSize={12} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', borderRadius: 8 }} />
                    <Area type="monotone" dataKey="count" name="Khách hàng mới" stroke="var(--primary)" fillOpacity={1} fill="url(#colorCount)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title"><Users size={18} style={{ color: 'var(--primary)' }} /> Nguồn leads CRM</h3>
            </div>
            <div className="card-body">
              <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={sourcePieData} cx="50%" cy="50%" innerRadius={52} outerRadius={86} paddingAngle={3} dataKey="value">
                      {sourcePieData.map((entry, index) => (
                        <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', borderRadius: 8 }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="text-muted" style={{ textAlign: 'center', marginTop: 8 }}>
                Tỉ lệ chuyển đổi CRM: {conversionRate}% ({convertedCount}/{customerTotalLeads})
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
