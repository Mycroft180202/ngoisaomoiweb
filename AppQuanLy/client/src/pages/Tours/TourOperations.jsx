import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Bus, CalendarDays, CheckCircle2, ChevronRight, ClipboardCheck, Download, Edit3, Eye, FileText,
  MapPin, Navigation, Plus, Route, Trash2, Upload, UserRound, Users, X
} from 'lucide-react';
import api from '../../services/api';
import { useConfirm } from '../../contexts/ConfirmContext';
import TourRouteMap from './TourRouteMap';
import GooglePlaceInput from '../../components/ui/GooglePlaceInput';
import './TourOperations.css';

const departureStatus = {
  planning: 'Đang lập kế hoạch', open: 'Mở bán', confirmed: 'Đã xác nhận',
  departing: 'Đang khởi hành', completed: 'Hoàn thành', cancelled: 'Đã hủy'
};

const stopTypes = {
  departure: 'Khởi hành', pickup: 'Đón khách', dropoff: 'Trả khách',
  visit: 'Tham quan', rest: 'Nghỉ', hotel: 'Khách sạn', meal: 'Ăn uống'
};

const emptyCarrier = { name: '', contactName: '', phone: '', email: '', address: '', note: '' };
const emptyVehicle = { carrier: '', plateNumber: '', name: '', vehicleType: 'Xe du lịch', seatCapacity: 29, driverName: '', driverPhone: '', note: '' };
const emptyDeparture = { tour: '', startDate: '', endDate: '', departurePoint: '', manager: '', status: 'planning', note: '', assignedVehicles: [] };
const emptyPassenger = { sourceTour: '', fullName: '', phone: '', idNumber: '', passengerType: 'adult', vehicle: '', seatNumber: '', pickupStopId: '', dropoffStopId: '', pickupNote: '', dropoffNote: '', allocationStatus: 'confirmed', status: 'waiting' };
const newStop = () => ({ type: 'pickup', name: '', address: '', placeId: '', plannedTime: '', latitude: '', longitude: '', note: '' });
const emptyDay = () => ({ day: 1, date: '', title: '', description: '', stops: [newStop()] });

const dateInput = value => value ? new Date(value).toISOString().slice(0, 10) : '';
const displayDate = value => value ? new Intl.DateTimeFormat('vi-VN').format(new Date(value)) : '—';

export default function TourOperations() {
  const confirm = useConfirm();
  const [tab, setTab] = useState('departures');
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState({ carriers: [], vehicles: [], departures: [], canManage: false });
  const [tours, setTours] = useState([]);
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState(null);
  const [editing, setEditing] = useState(null);
  const [carrierForm, setCarrierForm] = useState(emptyCarrier);
  const [vehicleForm, setVehicleForm] = useState(emptyVehicle);
  const [departureForm, setDepartureForm] = useState(emptyDeparture);
  const [passengerForm, setPassengerForm] = useState(emptyPassenger);
  const [dayForm, setDayForm] = useState(emptyDay());
  const [pdfViewer, setPdfViewer] = useState(null);
  const [modalDepartureId, setModalDepartureId] = useState('');
  const [submittingDay, setSubmittingDay] = useState(false);
  const [editingDay, setEditingDay] = useState(null);
  const [editingPassenger, setEditingPassenger] = useState(null);

  const loadData = async (keepSelectedId) => {
    try {
      const [ops, tourData, userData] = await Promise.all([
        api.get('/tour-operations/overview'),
        api.get('/tours', { limit: 200 }),
        api.get('/users', { limit: 200 })
      ]);
      setOverview(ops);
      setTours(tourData.tours || []);
      setUsers(userData.users || []);
      if (keepSelectedId) setSelected(ops.departures.find(item => item._id === keepSelectedId) || null);
    } catch (error) {
      toast.error(error.message || 'Không thể tải dữ liệu điều hành');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const activeVehicles = overview.vehicles.filter(item => item.status === 'active');
  const availableStops = useMemo(() => (
    selected?.itineraryDays?.flatMap(day => day.stops.map(stop => ({ ...stop, day: day.day }))) || []
  ), [selected]);

  const openDepartureForm = (departure = null) => {
    setEditing(departure);
    setDepartureForm(departure ? {
      tour: departure.tour?._id || departure.tour,
      startDate: dateInput(departure.startDate), endDate: dateInput(departure.endDate),
      departurePoint: departure.departurePoint || '', manager: departure.manager?._id || '',
      status: departure.status, note: departure.note || '',
      assignedVehicles: (departure.assignedVehicles || []).map(item => ({
        vehicle: item.vehicle?._id || item.vehicle,
        driverName: item.driverName || item.vehicle?.driverName || '',
        driverPhone: item.driverPhone || item.vehicle?.driverPhone || ''
      }))
    } : emptyDeparture);
    setModal('departure');
  };

  const toggleVehicle = vehicle => {
    setDepartureForm(current => {
      const exists = current.assignedVehicles.some(item => item.vehicle === vehicle._id);
      return {
        ...current,
        assignedVehicles: exists
          ? current.assignedVehicles.filter(item => item.vehicle !== vehicle._id)
          : [...current.assignedVehicles, { vehicle: vehicle._id, driverName: vehicle.driverName || '', driverPhone: vehicle.driverPhone || '' }]
      };
    });
  };

  const saveCarrier = async event => {
    event.preventDefault();
    try {
      if (editing) await api.put(`/tour-operations/carriers/${editing._id}`, carrierForm);
      else await api.post('/tour-operations/carriers', carrierForm);
      toast.success(editing ? 'Đã cập nhật nhà xe' : 'Đã thêm nhà xe');
      setModal(null); setEditing(null); setCarrierForm(emptyCarrier); await loadData();
    } catch (error) { toast.error(error.message); }
  };

  const saveVehicle = async event => {
    event.preventDefault();
    try {
      const payload = { ...vehicleForm, seatCapacity: Number(vehicleForm.seatCapacity) };
      if (editing) await api.put(`/tour-operations/vehicles/${editing._id}`, payload);
      else await api.post('/tour-operations/vehicles', payload);
      toast.success(editing ? 'Đã cập nhật phương tiện' : 'Đã thêm phương tiện');
      setModal(null); setEditing(null); setVehicleForm(emptyVehicle); await loadData();
    } catch (error) { toast.error(error.message); }
  };

  const saveDeparture = async event => {
    event.preventDefault();
    try {
      const payload = { ...departureForm, manager: departureForm.manager || null };
      const result = editing
        ? await api.put(`/tour-operations/departures/${editing._id}`, payload)
        : await api.post('/tour-operations/departures', payload);
      toast.success(editing ? 'Đã cập nhật chuyến' : 'Đã tạo chuyến khởi hành');
      setModal(null); setEditing(null); setDepartureForm(emptyDeparture);
      await loadData(result.departure?._id || selected?._id);
    } catch (error) { toast.error(error.message); }
  };

  const saveItineraryDay = async event => {
    event.preventDefault();
    if (submittingDay) return;
    const departureId = modalDepartureId || selected?._id;
    if (!departureId) {
      toast.error('Không xác định được chuyến cần thêm lịch trình. Hãy đóng form và mở lại chuyến.');
      return;
    }
    try {
      setSubmittingDay(true);
      const payload = {
        ...dayForm, day: Number(dayForm.day),
        stops: dayForm.stops.filter(stop => stop.name.trim()).map((stop, index) => ({
          ...stop, order: index, placeId: stop.placeId || '',
          latitude: stop.latitude === '' ? undefined : Number(stop.latitude),
          longitude: stop.longitude === '' ? undefined : Number(stop.longitude)
        }))
      };
      const result = editingDay
        ? await api.put(`/tour-operations/departures/${departureId}/itinerary-days/${editingDay._id}`, payload)
        : await api.post(`/tour-operations/departures/${departureId}/itinerary-days`, payload);
      setSelected(result.departure); setDayForm(emptyDay()); setModal(null);
      setEditingDay(null);
      setModalDepartureId('');
      await loadData(departureId); toast.success(editingDay ? 'Đã cập nhật lịch trình ngày' : 'Đã thêm lịch trình ngày');
    } catch (error) { toast.error(error.message); }
    finally { setSubmittingDay(false); }
  };

  const openEditDay = day => {
    setEditingDay(day);
    setModalDepartureId(selected._id);
    setDayForm({
      day: day.day,
      date: dateInput(day.date),
      title: day.title || '',
      description: day.description || '',
      stops: (day.stops || []).map(stop => ({
        _id: stop._id, type: stop.type, name: stop.name || '', address: stop.address || '',
        placeId: stop.placeId || '', plannedTime: stop.plannedTime || '',
        latitude: stop.latitude ?? '', longitude: stop.longitude ?? '', note: stop.note || ''
      }))
    });
    setModal('day');
  };

  const removeItineraryDay = async day => {
    const ok = await confirm({ title: `Xóa ngày ${day.day}`, message: `Xóa “${day.title}” và toàn bộ địa điểm trong ngày này?`, confirmText: 'Xóa ngày', cancelText: 'Hủy', type: 'danger' });
    if (!ok) return;
    try {
      const result = await api.delete(`/tour-operations/departures/${selected._id}/itinerary-days/${day._id}`);
      setSelected(result.departure); await loadData(selected._id); toast.success('Đã xóa ngày lịch trình');
    } catch (error) { toast.error(error.message); }
  };

  const savePassenger = async event => {
    event.preventDefault();
    try {
      const payload = { ...passengerForm, pickupStopId: passengerForm.pickupStopId || null, dropoffStopId: passengerForm.dropoffStopId || null };
      const result = editingPassenger
        ? await api.put(`/tour-operations/departures/${selected._id}/passengers/${editingPassenger._id}`, payload)
        : await api.post(`/tour-operations/departures/${selected._id}/passengers`, payload);
      setSelected(result.departure); setPassengerForm(emptyPassenger); setModal(null);
      setEditingPassenger(null);
      await loadData(selected._id); toast.success(editingPassenger ? 'Đã cập nhật hành khách' : 'Đã xếp khách lên xe');
    } catch (error) { toast.error(error.message); }
  };

  const openEditPassenger = passenger => {
    setEditingPassenger(passenger);
    setPassengerForm({ sourceTour: passenger.sourceTour?._id || passenger.sourceTour || selected.tour?._id || '', fullName: passenger.fullName, phone: passenger.phone || '', idNumber: passenger.idNumber || '', passengerType: passenger.passengerType || 'adult', vehicle: passenger.vehicle?._id || passenger.vehicle || '', seatNumber: passenger.seatNumber || '', pickupStopId: passenger.pickupStopId || '', dropoffStopId: passenger.dropoffStopId || '', pickupNote: passenger.pickupNote || '', dropoffNote: passenger.dropoffNote || '', allocationStatus: passenger.allocationStatus || 'confirmed', status: passenger.status || 'waiting' });
    setModal('passenger');
  };

  const removePassenger = async passenger => {
    const ok = await confirm({ title: 'Gỡ hành khách', message: `Gỡ ${passenger.fullName} khỏi chuyến này?`, confirmText: 'Gỡ khách', cancelText: 'Hủy', type: 'danger' });
    if (!ok) return;
    try {
      const result = await api.delete(`/tour-operations/departures/${selected._id}/passengers/${passenger._id}`);
      setSelected(result.departure); await loadData(selected._id); toast.success('Đã gỡ hành khách');
    } catch (error) { toast.error(error.message); }
  };

  const removeDeparture = async departure => {
    const ok = await confirm({ title: 'Xóa chuyến', message: `Xóa chuyến ${departure.code}?`, confirmText: 'Xóa chuyến', cancelText: 'Hủy', type: 'danger' });
    if (!ok) return;
    try { await api.delete(`/tour-operations/departures/${departure._id}`); await loadData(); toast.success('Đã xóa chuyến'); }
    catch (error) { toast.error(error.message); }
  };

  const uploadProgram = async (file, title) => {
    if (!file || !selected) return;
    try {
      const payload = new FormData();
      payload.append('file', file);
      payload.append('title', title || file.name.replace(/\.pdf$/i, ''));
      const result = await api.upload(`/tour-operations/departures/${selected._id}/documents`, payload);
      setSelected(result.departure); await loadData(selected._id); toast.success('Đã tải lên chương trình Tour');
    } catch (error) { toast.error(error.message); }
  };

  const viewProgram = async document => {
    const mobileWindow = window.innerWidth <= 700 ? window.open('', '_blank') : null;
    try {
      const blob = await api.getBlob(`/tour-operations/departures/${selected._id}/documents/${document._id}/view`);
      const url = URL.createObjectURL(blob);
      if (mobileWindow) {
        mobileWindow.location.href = url;
        setTimeout(() => URL.revokeObjectURL(url), 5 * 60 * 1000);
      } else setPdfViewer({ url, name: document.title || document.originalName });
    } catch (error) { mobileWindow?.close(); toast.error(error.message); }
  };

  const downloadProgram = async document => {
    try {
      const blob = await api.getBlob(`/tour-operations/departures/${selected._id}/documents/${document._id}/view`);
      const url = URL.createObjectURL(blob);
      const anchor = window.document.createElement('a');
      anchor.href = url; anchor.download = document.originalName; anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) { toast.error(error.message); }
  };

  const removeProgram = async document => {
    const ok = await confirm({ title: 'Xóa file chương trình', message: `Xóa “${document.title}” khỏi chuyến này?`, confirmText: 'Xóa file', cancelText: 'Hủy', type: 'danger' });
    if (!ok) return;
    try {
      const result = await api.delete(`/tour-operations/departures/${selected._id}/documents/${document._id}`);
      setSelected(result.departure); await loadData(selected._id); toast.success('Đã xóa file');
    } catch (error) { toast.error(error.message); }
  };

  const openEditCarrier = item => {
    setEditing(item); setCarrierForm({ name: item.name, contactName: item.contactName || '', phone: item.phone || '', email: item.email || '', address: item.address || '', note: item.note || '', status: item.status }); setModal('carrier');
  };
  const openEditVehicle = item => {
    setEditing(item); setVehicleForm({ carrier: item.carrier?._id || '', plateNumber: item.plateNumber, name: item.name || '', vehicleType: item.vehicleType || '', seatCapacity: item.seatCapacity, driverName: item.driverName || '', driverPhone: item.driverPhone || '', note: item.note || '', status: item.status }); setModal('vehicle');
  };

  if (loading) return <div className="loading-overlay"><div className="loading-spinner" /></div>;

  return (
    <div className="tour-ops animate-fadeIn">
      <div className="tour-ops-header">
        <div>
          <Link to="/tours" className="tour-ops-back"><ArrowLeft size={15} /> Quản lý Tour</Link>
          <h1><Route size={26} /> Điều Hành Chuyến</h1>
          <p>Quản lý chuyến khởi hành, phương tiện, lịch trình, điểm đón và hành khách.</p>
        </div>
        {overview.canManage && tab === 'departures' && <button className="btn btn-primary" onClick={() => openDepartureForm()}><Plus size={17} /> Tạo chuyến</button>}
      </div>

      <div className="ops-summary">
        <div><CalendarDays /><span><b>{overview.departures.length}</b> chuyến khởi hành</span></div>
        <div><Bus /><span><b>{overview.vehicles.length}</b> phương tiện</span></div>
        <div><Users /><span><b>{overview.departures.reduce((sum, item) => sum + (item.passengers?.length || 0), 0)}</b> khách đã xếp xe</span></div>
      </div>

      <div className="ops-tabs">
        <button className={tab === 'departures' ? 'active' : ''} onClick={() => setTab('departures')}><Route size={17} /> Chuyến khởi hành</button>
        <button className={tab === 'fleet' ? 'active' : ''} onClick={() => setTab('fleet')}><Bus size={17} /> Nhà xe & phương tiện</button>
      </div>

      {tab === 'departures' ? (
        <div className="departure-grid">
          {overview.departures.map(item => (
            <article className="departure-card" key={item._id}>
              <div className="departure-card-top">
                <span className={`ops-status ${item.status}`}>{departureStatus[item.status]}</span>
                <span className="trip-code">{item.code}</span>
              </div>
              <h3>{item.tour?.name}</h3>
              <p><MapPin size={14} /> {item.departurePoint || item.tour?.destination || 'Chưa có điểm khởi hành'}</p>
              <div className="departure-dates">
                <div><small>Ngày đi</small><b>{displayDate(item.startDate)}</b></div>
                <ChevronRight size={18} />
                <div><small>Ngày về</small><b>{displayDate(item.endDate)}</b></div>
              </div>
              <div className="departure-counts">
                <span><Bus size={15} /> {item.assignedVehicles?.length || 0} xe</span>
                <span><UserRound size={15} /> {item.passengers?.length || 0} khách</span>
                <span><Route size={15} /> {item.itineraryDays?.length || 0} ngày lịch trình</span>
              </div>
              <div className="departure-actions">
                <button className="btn btn-secondary btn-sm" onClick={() => setSelected(item)}>Điều hành</button>
                {overview.canManage && <>
                  <button className="btn btn-icon btn-ghost btn-sm" title="Sửa" onClick={() => openDepartureForm(item)}><Edit3 size={16} /></button>
                  <button className="btn btn-icon btn-ghost btn-sm text-danger" title="Xóa" onClick={() => removeDeparture(item)}><Trash2 size={16} /></button>
                </>}
              </div>
            </article>
          ))}
          {!overview.departures.length && <div className="ops-empty"><Route size={42} /><h3>Chưa có chuyến khởi hành</h3><p>Tạo chuyến đầu tiên từ một Tour mẫu đang có.</p></div>}
        </div>
      ) : (
        <div className="fleet-layout">
          <section className="ops-panel">
            <div className="ops-panel-title"><div><h2>Nhà xe</h2><p>Đơn vị cung cấp phương tiện</p></div>{overview.canManage && <button className="btn btn-secondary btn-sm" onClick={() => { setEditing(null); setCarrierForm(emptyCarrier); setModal('carrier'); }}><Plus size={15} /> Thêm</button>}</div>
            <div className="fleet-list">{overview.carriers.map(item => <div className="fleet-row" key={item._id}><div><b>{item.name}</b><small>{item.contactName || 'Chưa có người liên hệ'} · {item.phone || 'Chưa có SĐT'}</small></div><span className={`fleet-state ${item.status}`}>{item.status === 'active' ? 'Hoạt động' : 'Tạm ngừng'}</span>{overview.canManage && <button className="btn btn-icon btn-ghost btn-sm" onClick={() => openEditCarrier(item)}><Edit3 size={15} /></button>}</div>)}</div>
          </section>
          <section className="ops-panel">
            <div className="ops-panel-title"><div><h2>Phương tiện</h2><p>Xe, sức chứa và tài xế mặc định</p></div>{overview.canManage && <button className="btn btn-secondary btn-sm" disabled={!overview.carriers.length} onClick={() => { setEditing(null); setVehicleForm({ ...emptyVehicle, carrier: overview.carriers[0]?._id || '' }); setModal('vehicle'); }}><Plus size={15} /> Thêm</button>}</div>
            <div className="fleet-list">{overview.vehicles.map(item => <div className="vehicle-row" key={item._id}><div className="vehicle-icon"><Bus size={20} /></div><div><b>{item.plateNumber} {item.name && `· ${item.name}`}</b><small>{item.carrier?.name} · {item.seatCapacity} chỗ · {item.driverName || 'Chưa gán tài xế'}</small></div><span className={`fleet-state ${item.status}`}>{item.status === 'active' ? 'Sẵn sàng' : item.status === 'maintenance' ? 'Bảo trì' : 'Tạm ngừng'}</span>{overview.canManage && <button className="btn btn-icon btn-ghost btn-sm" onClick={() => openEditVehicle(item)}><Edit3 size={15} /></button>}</div>)}</div>
          </section>
        </div>
      )}

      {selected && <DepartureDetail departure={selected} canManage={overview.canManage} onDepartureChange={setSelected} onClose={() => setSelected(null)} onAddDay={() => { setEditingDay(null); setModalDepartureId(selected._id); setDayForm({ ...emptyDay(), day: Math.max(0, ...(selected.itineraryDays || []).map(day => day.day)) + 1 }); setModal('day'); }} onEditDay={openEditDay} onRemoveDay={removeItineraryDay} onAddPassenger={() => { const stops = availableStops; setEditingPassenger(null); setModalDepartureId(selected._id); setPassengerForm({ ...emptyPassenger, sourceTour: selected.tour?._id || '', vehicle: selected.assignedVehicles?.[0]?.vehicle?._id || '', pickupStopId: stops[0]?._id || '', dropoffStopId: stops.at(-1)?._id || '' }); setModal('passenger'); }} onEditPassenger={openEditPassenger} onRemovePassenger={removePassenger} onUploadProgram={uploadProgram} onViewProgram={viewProgram} onDownloadProgram={downloadProgram} onRemoveProgram={removeProgram} />}

      {pdfViewer && <div className="pdf-viewer-overlay" onClick={() => { URL.revokeObjectURL(pdfViewer.url); setPdfViewer(null); }}><div className="pdf-viewer-modal" onClick={e => e.stopPropagation()}><header><div><FileText size={18} /><b>{pdfViewer.name}</b></div><div className="pdf-viewer-actions"><button className="btn btn-secondary btn-sm" onClick={() => window.open(pdfViewer.url, '_blank')}>Mở toàn màn hình</button><button className="modal-close" onClick={() => { URL.revokeObjectURL(pdfViewer.url); setPdfViewer(null); }}><X size={20} /></button></div></header><object data={pdfViewer.url} type="application/pdf" aria-label={pdfViewer.name}><iframe src={pdfViewer.url} title={pdfViewer.name} /></object></div></div>}

      {modal && <div className="modal-overlay" onClick={() => setModal(null)}><div className="modal-content modal-lg ops-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><h2>{modal === 'carrier' ? (editing ? 'Sửa nhà xe' : 'Thêm nhà xe') : modal === 'vehicle' ? (editing ? 'Sửa phương tiện' : 'Thêm phương tiện') : modal === 'departure' ? (editing ? 'Sửa chuyến khởi hành' : 'Tạo chuyến khởi hành') : modal === 'day' ? (editingDay ? 'Sửa lịch trình ngày' : 'Thêm lịch trình ngày') : 'Xếp khách lên xe'}</h2><button className="modal-close" onClick={() => setModal(null)}><X size={20} /></button></div>
        {modal === 'carrier' && <CarrierForm form={carrierForm} setForm={setCarrierForm} onSubmit={saveCarrier} editing={editing} />}
        {modal === 'vehicle' && <VehicleForm form={vehicleForm} setForm={setVehicleForm} carriers={overview.carriers} onSubmit={saveVehicle} editing={editing} />}
        {modal === 'departure' && <DepartureForm form={departureForm} setForm={setDepartureForm} tours={tours} users={users} vehicles={activeVehicles} onToggleVehicle={toggleVehicle} onSubmit={saveDeparture} editing={editing} />}
        {modal === 'day' && <DayForm form={dayForm} setForm={setDayForm} onSubmit={saveItineraryDay} submitting={submittingDay} editing={Boolean(editingDay)} />}
        {modal === 'passenger' && <PassengerForm form={passengerForm} setForm={setPassengerForm} departure={selected} tours={tours} stops={availableStops} onSubmit={savePassenger} editing={Boolean(editingPassenger)} />}
      </div></div>}
    </div>
  );
}

function FormFooter({ label, disabled = false }) { return <div className="modal-footer"><button type="submit" className="btn btn-primary" disabled={disabled}>{disabled ? 'Đang lưu…' : label}</button></div>; }

function CarrierForm({ form, setForm, onSubmit, editing }) { return <form onSubmit={onSubmit}><div className="modal-body ops-form"><label>Tên nhà xe *<input className="form-control" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label><div className="form-row"><label>Người liên hệ<input className="form-control" value={form.contactName} onChange={e => setForm({ ...form, contactName: e.target.value })} /></label><label>Số điện thoại<input className="form-control" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></label></div><div className="form-row"><label>Email<input type="email" className="form-control" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></label><label>Địa chỉ<input className="form-control" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></label></div>{editing && <label>Trạng thái<select className="form-control" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}><option value="active">Hoạt động</option><option value="inactive">Tạm ngừng</option></select></label>}<label>Ghi chú<textarea className="form-control" rows="2" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} /></label></div><FormFooter label={editing ? 'Lưu thay đổi' : 'Thêm nhà xe'} /></form>; }

function VehicleForm({ form, setForm, carriers, onSubmit, editing }) { return <form onSubmit={onSubmit}><div className="modal-body ops-form"><div className="form-row"><label>Nhà xe *<select className="form-control" required value={form.carrier} onChange={e => setForm({ ...form, carrier: e.target.value })}><option value="">Chọn nhà xe</option>{carriers.map(item => <option key={item._id} value={item._id}>{item.name}</option>)}</select></label><label>Biển số *<input className="form-control" required value={form.plateNumber} onChange={e => setForm({ ...form, plateNumber: e.target.value.toUpperCase() })} /></label></div><div className="form-row-3"><label>Tên xe<input className="form-control" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label><label>Loại xe<input className="form-control" value={form.vehicleType} onChange={e => setForm({ ...form, vehicleType: e.target.value })} /></label><label>Số chỗ *<input type="number" min="1" className="form-control" required value={form.seatCapacity} onChange={e => setForm({ ...form, seatCapacity: e.target.value })} /></label></div><div className="form-row"><label>Tài xế mặc định<input className="form-control" value={form.driverName} onChange={e => setForm({ ...form, driverName: e.target.value })} /></label><label>SĐT tài xế<input className="form-control" value={form.driverPhone} onChange={e => setForm({ ...form, driverPhone: e.target.value })} /></label></div>{editing && <label>Trạng thái<select className="form-control" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}><option value="active">Sẵn sàng</option><option value="maintenance">Bảo trì</option><option value="inactive">Tạm ngừng</option></select></label>}<label>Ghi chú<textarea className="form-control" rows="2" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} /></label></div><FormFooter label={editing ? 'Lưu thay đổi' : 'Thêm phương tiện'} /></form>; }

function DepartureForm({ form, setForm, tours, users, vehicles, onToggleVehicle, onSubmit, editing }) { return <form onSubmit={onSubmit}><div className="modal-body ops-form"><label>Tour mẫu *<select className="form-control" required value={form.tour} onChange={e => setForm({ ...form, tour: e.target.value })}><option value="">Chọn Tour</option>{tours.map(item => <option key={item._id} value={item._id}>{item.code} · {item.name}</option>)}</select></label><div className="form-row"><label>Ngày khởi hành *<input type="date" className="form-control" required value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} /></label><label>Ngày kết thúc *<input type="date" className="form-control" required value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} /></label></div><div className="form-row"><label>Điểm khởi hành<input className="form-control" placeholder="VD: Văn phòng Hà Nội" value={form.departurePoint} onChange={e => setForm({ ...form, departurePoint: e.target.value })} /></label><label>Người điều hành<select className="form-control" value={form.manager} onChange={e => setForm({ ...form, manager: e.target.value })}><option value="">Chưa phân công</option>{users.map(item => <option key={item._id} value={item._id}>{item.fullName}</option>)}</select></label></div><label>Trạng thái<select className="form-control" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>{Object.entries(departureStatus).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><div><span className="ops-label">Phân công xe</span><div className="vehicle-picker">{vehicles.map(vehicle => { const checked = form.assignedVehicles.some(item => item.vehicle === vehicle._id); return <button type="button" key={vehicle._id} className={checked ? 'selected' : ''} onClick={() => onToggleVehicle(vehicle)}><Bus size={17} /><span><b>{vehicle.plateNumber}</b><small>{vehicle.carrier?.name} · {vehicle.seatCapacity} chỗ</small></span>{checked && <span className="vehicle-check">✓</span>}</button>; })}{!vehicles.length && <p className="text-muted text-sm">Hãy thêm phương tiện trước khi phân công.</p>}</div></div><label>Ghi chú<textarea className="form-control" rows="2" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} /></label></div><FormFooter label={editing ? 'Lưu chuyến' : 'Tạo chuyến'} /></form>; }

function DayForm({ form, setForm, onSubmit, submitting, editing }) {
  const updateStop = (index, changes) => setForm({
    ...form,
    stops: form.stops.map((stop, currentIndex) => currentIndex === index ? { ...stop, ...changes } : stop)
  });

  return <form onSubmit={onSubmit}>
    <div className="modal-body ops-form">
      <div className="form-row-3">
        <label>Ngày số *<input type="number" min="1" className="form-control" required value={form.day} onChange={event => setForm({ ...form, day: event.target.value })} /></label>
        <label>Ngày thực tế<input type="date" lang="vi-VN" className="form-control" value={form.date} onChange={event => setForm({ ...form, date: event.target.value })} /></label>
        <label>Tiêu đề *<input className="form-control" required value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} /></label>
      </div>
      <label>Mô tả<textarea className="form-control" rows="2" value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} /></label>
      <div className="stop-editor-title"><span>Các điểm trong ngày</span><button type="button" className="btn btn-ghost btn-sm" onClick={() => setForm({ ...form, stops: [...form.stops, newStop()] })}><Plus size={15} /> Thêm điểm</button></div>
      <div className="stop-editor google-stop-editor">
        {form.stops.map((stop, index) => <div className="google-stop-row" key={index}>
          <span className="stop-order">{index + 1}</span>
          <div className="google-stop-fields">
            <div className="google-stop-main">
              <select className="form-control" value={stop.type} onChange={event => updateStop(index, { type: event.target.value })}>{Object.entries(stopTypes).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
              <input className="form-control" placeholder="Tên hiển thị, VD: Điểm đón Hà Nội" value={stop.name} onChange={event => updateStop(index, { name: event.target.value })} />
              <input type="time" lang="vi-VN" step="300" className="form-control stop-time-input" aria-label="Giờ dự kiến" value={stop.plannedTime} onChange={event => updateStop(index, { plannedTime: event.target.value })} />
            </div>
            <GooglePlaceInput value={stop} onChange={nextStop => updateStop(index, nextStop)} />
            {stop.placeId && <small className="place-selected">✓ Đã chọn địa điểm và lưu tọa độ</small>}
          </div>
          {form.stops.length > 1 && <button type="button" className="btn btn-icon btn-ghost" onClick={() => setForm({ ...form, stops: form.stops.filter((_, currentIndex) => currentIndex !== index) })}><X size={15} /></button>}
        </div>)}
      </div>
      <p className="coordinate-help">Nhập tên địa điểm hoặc địa chỉ rồi chọn một kết quả; hệ thống sẽ tự lưu vị trí.</p>
    </div>
    <FormFooter label={editing ? 'Lưu lịch trình' : 'Thêm lịch trình'} disabled={submitting} />
  </form>;
}

function PassengerForm({ form, setForm, departure, tours, stops, onSubmit, editing }) {
  const pickupIndex = stops.findIndex(stop => String(stop._id) === String(form.pickupStopId));
  return <form onSubmit={onSubmit}><div className="modal-body ops-form">
    <div className="ops-form-note"><Route size={17} /><span><b>Xếp khách theo chặng</b><small>Khách có thể thuộc Tour khác và chỉ chiếm ghế từ điểm lên đến điểm xuống.</small></span></div>
    <div className="form-row"><label>Tour nguồn *<select className="form-control" required value={form.sourceTour} onChange={e => setForm({ ...form, sourceTour: e.target.value })}><option value="">Chọn Tour khách đã đặt</option>{tours.map(tour => <option value={tour._id} key={tour._id}>{tour.code ? `${tour.code} · ` : ''}{tour.name}</option>)}</select></label><label>Trạng thái giữ chỗ<select className="form-control" value={form.allocationStatus} onChange={e => setForm({ ...form, allocationStatus: e.target.value })}><option value="confirmed">Đã xác nhận</option><option value="hold">Giữ chỗ 15 phút</option><option value="cancelled">Đã hủy chỗ</option></select></label></div>
    <div className="form-row"><label>Họ tên khách *<input className="form-control" required value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} /></label><label>Số điện thoại<input className="form-control" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></label></div>
    <div className="form-row-3"><label>CCCD/Hộ chiếu<input className="form-control" value={form.idNumber} onChange={e => setForm({ ...form, idNumber: e.target.value })} /></label><label>Loại khách<select className="form-control" value={form.passengerType} onChange={e => setForm({ ...form, passengerType: e.target.value })}><option value="adult">Người lớn</option><option value="child">Trẻ em</option></select></label><label>Số ghế<input className="form-control" placeholder="VD: A01" value={form.seatNumber} onChange={e => setForm({ ...form, seatNumber: e.target.value.toUpperCase() })} /></label></div>
    <label>Xe *<select className="form-control" required value={form.vehicle} onChange={e => setForm({ ...form, vehicle: e.target.value })}><option value="">Chọn xe</option>{departure.assignedVehicles?.map(item => <option key={item.vehicle?._id} value={item.vehicle?._id}>{item.vehicle?.plateNumber} · {item.vehicle?.seatCapacity} chỗ</option>)}</select></label>
    <div className="form-row"><label>Điểm lên xe *<select className="form-control" required value={form.pickupStopId} onChange={e => setForm({ ...form, pickupStopId: e.target.value, dropoffStopId: '' })}><option value="">Chọn điểm lên</option>{stops.slice(0, -1).map(stop => <option key={stop._id} value={stop._id}>Ngày {stop.day} · {stop.plannedTime || '--:--'} · {stop.name}</option>)}</select></label><label>Điểm xuống xe *<select className="form-control" required value={form.dropoffStopId} onChange={e => setForm({ ...form, dropoffStopId: e.target.value })}><option value="">Chọn điểm xuống</option>{stops.filter((_, index) => index > pickupIndex).map(stop => <option key={stop._id} value={stop._id}>Ngày {stop.day} · {stop.plannedTime || '--:--'} · {stop.name}</option>)}</select></label></div>
    <div className="form-row"><label>Ghi chú điểm lên<textarea className="form-control" rows="2" value={form.pickupNote} onChange={e => setForm({ ...form, pickupNote: e.target.value })} /></label><label>Ghi chú điểm xuống<textarea className="form-control" rows="2" value={form.dropoffNote} onChange={e => setForm({ ...form, dropoffNote: e.target.value })} /></label></div>
  </div><FormFooter label={editing ? 'Lưu phân bổ khách' : 'Xếp khách vào chặng'} /></form>;
}

function DepartureDetail({ departure, canManage, onDepartureChange, onClose, onAddDay, onEditDay, onRemoveDay, onAddPassenger, onEditPassenger, onRemovePassenger, onUploadProgram, onViewProgram, onDownloadProgram, onRemoveProgram }) {
  const [mapDay, setMapDay] = useState('all');
  const [publicToken, setPublicToken] = useState(departure.publicAccess?.token || '');
  const [tracking, setTracking] = useState(false);
  const [attendanceForm, setAttendanceForm] = useState(null);
  const [openAttendance, setOpenAttendance] = useState('');
  const [expandedVehicles, setExpandedVehicles] = useState(() => new Set());
  const [capacity, setCapacity] = useState([]);
  const lastGpsSentAt = useRef(0);
  const stopMap = new Map(departure.itineraryDays?.flatMap(day => day.stops.map(stop => [String(stop._id), stop])) || []);
  const passengersForVehicle = vehicleId => departure.passengers?.filter(item => String(item.vehicle?._id || item.vehicle) === String(vehicleId)) || [];

  useEffect(() => {
    let active = true;
    api.get(`/tour-operations/departures/${departure._id}/capacity`)
      .then(result => { if (active) setCapacity(result.vehicles || []); })
      .catch(() => { if (active) setCapacity([]); });
    return () => { active = false; };
  }, [departure._id, departure.passengers, departure.itineraryDays, departure.assignedVehicles]);

  const movePassenger = async (passenger, action) => {
    try {
      const result = await api.put(`/tour-operations/departures/${departure._id}/passengers/${passenger._id}/movement`, { action });
      onDepartureChange(result.departure); toast.success(result.message);
    } catch (error) { toast.error(error.message); }
  };

  const passengerRow = passenger => <div className="passenger-row" key={passenger._id}>
    <span className="passenger-avatar">{passenger.fullName.charAt(0)}</span>
    <div><b>{passenger.fullName}</b><small>{passenger.phone || 'Chưa có SĐT'} · {passenger.passengerType === 'child' ? 'Trẻ em' : 'Người lớn'}</small></div>
    <div><b>Ghế {passenger.seatNumber || 'chưa xếp'}</b><small>{stopMap.get(String(passenger.pickupStopId))?.name || 'Chưa chọn'} → {stopMap.get(String(passenger.dropoffStopId))?.name || 'Cuối tuyến'}</small><small className="passenger-source">{passenger.sourceTour?.code || 'Tour chính'} · {passenger.sourceTour?.name || departure.tour?.name}</small><span className={`passenger-status ${passenger.status || 'waiting'}`}>{({ waiting: 'Đang chờ', boarded: 'Đã lên xe', absent: 'Vắng mặt', completed: 'Đã xuống xe' })[passenger.status || 'waiting']}</span></div>
    {canManage && <span className="passenger-actions">{passenger.status !== 'boarded' && passenger.status !== 'completed' && <button className="btn btn-success btn-sm" title="Xác nhận lên xe" onClick={() => movePassenger(passenger, 'board')}>Lên xe</button>}{passenger.status === 'boarded' && <button className="btn btn-secondary btn-sm" title="Xác nhận xuống xe" onClick={() => movePassenger(passenger, 'dropoff')}>Xuống xe</button>}<button className="btn btn-icon btn-ghost btn-sm" onClick={() => onEditPassenger(passenger)}><Edit3 size={15} /></button><button className="btn btn-icon btn-ghost btn-sm text-danger" onClick={() => onRemovePassenger(passenger)}><Trash2 size={15} /></button></span>}
  </div>;

  const publicUrl = publicToken ? `${window.location.origin}/quanly/tour/${publicToken}` : '';
  const createPublicLink = async () => {
    try { const result = await api.post(`/tour-operations/departures/${departure._id}/public-access`, { enabled: true }); setPublicToken(result.token); toast.success('Đã tạo liên kết cho hành khách'); } catch (error) { toast.error(error.message); }
  };
  useEffect(() => {
    if (!tracking) return undefined;
    if (!navigator.geolocation) { toast.error('Thiết bị không hỗ trợ GPS'); setTracking(false); return undefined; }
    const watcher = navigator.geolocation.watchPosition(async position => {
      if (Date.now() - lastGpsSentAt.current < 10000) return;
      lastGpsSentAt.current = Date.now();
      try {
        await api.put(`/tour-operations/departures/${departure._id}/live-location`, { latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy });
      } catch (error) { toast.error(error.message); setTracking(false); }
    }, error => { toast.error(error.message || 'Không lấy được vị trí GPS'); setTracking(false); }, { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 });
    return () => navigator.geolocation.clearWatch(watcher);
  }, [tracking, departure._id]);

  const toggleTracking = () => {
    if (!tracking) toast.success('Đã bật chia sẻ vị trí trực tiếp');
    setTracking(value => !value);
  };

  const attendanceTypes = { departure: 'Lên xe tại khởi hành', after_stop: 'Lên xe sau điểm dừng', segment: 'Trước khi đi chặng tiếp theo', arrival: 'Điểm danh khi đến', custom: 'Điểm danh khác' };
  const allStops = departure.itineraryDays?.flatMap(day => day.stops.map(stop => ({ ...stop, day: day.day }))) || [];
  const newAttendance = vehicle => setAttendanceForm({ _id: '', title: 'Điểm danh lên xe', type: 'departure', vehicle: vehicle?._id || departure.assignedVehicles?.[0]?.vehicle?._id || '', day: mapDay === 'all' ? '' : mapDay, stopId: '', fromStopId: '', toStopId: '', scheduledAt: new Date().toISOString().slice(0, 16), note: '' });
  const saveAttendance = async event => {
    event.preventDefault();
    try {
      const path = `/tour-operations/departures/${departure._id}/attendance-sessions${attendanceForm._id ? `/${attendanceForm._id}` : ''}`;
      const result = attendanceForm._id ? await api.put(path, attendanceForm) : await api.post(path, attendanceForm);
      onDepartureChange(result.departure); setOpenAttendance(result.departure.attendanceSessions?.at(-1)?._id || attendanceForm._id); setAttendanceForm(null); toast.success(result.message);
    } catch (error) { toast.error(error.message); }
  };
  const editAttendance = session => setAttendanceForm({ _id: session._id, title: session.title, type: session.type, vehicle: session.vehicle?._id || session.vehicle, day: session.day || '', stopId: session.stopId || '', fromStopId: session.fromStopId || '', toStopId: session.toStopId || '', scheduledAt: session.scheduledAt ? new Date(session.scheduledAt).toISOString().slice(0, 16) : '', note: session.note || '' });
  const deleteAttendance = async session => {
    if (!window.confirm(`Xóa bảng điểm danh “${session.title}”?`)) return;
    try { const result = await api.delete(`/tour-operations/departures/${departure._id}/attendance-sessions/${session._id}`); onDepartureChange(result.departure); toast.success(result.message); } catch (error) { toast.error(error.message); }
  };
  const markAttendance = async (session, record, status) => {
    try { const result = await api.put(`/tour-operations/departures/${departure._id}/attendance-sessions/${session._id}/records/${record._id}`, { status }); onDepartureChange(result.departure); } catch (error) { toast.error(error.message); }
  };
  const updatePublicProgress = async changes => {
    try { const result = await api.put(`/tour-operations/departures/${departure._id}/public-progress`, { currentDay: departure.publicProgress?.currentDay || '', nextStopId: departure.publicProgress?.nextStopId || '', ...changes }); onDepartureChange(result.departure); toast.success(result.message); } catch (error) { toast.error(error.message); }
  };
  const toggleVehiclePassengers = vehicleId => setExpandedVehicles(current => { const next = new Set(current); if (next.has(vehicleId)) next.delete(vehicleId); else next.add(vehicleId); return next; });

  return <div className="ops-detail-overlay"><main className="ops-detail ops-detail-page">
    <header><div><button className="ops-detail-back" onClick={onClose}><ArrowLeft size={16} /> Danh sách chuyến</button><span>{departure.code}</span><h2>{departure.tour?.name}</h2><p>{displayDate(departure.startDate)} – {displayDate(departure.endDate)}</p></div></header>
    <div className="ops-detail-grid">
      <div className="ops-detail-column">
        <section className="ops-detail-section ops-map-section"><div className="ops-detail-title"><h3><MapPin size={17} /> Bản đồ hành trình</h3></div><TourRouteMap itineraryDays={departure.itineraryDays || []} selectedDay={mapDay} onSelectedDayChange={setMapDay} /></section>
        <section className="ops-detail-section"><div className="ops-detail-title"><h3><Route size={17} /> Lịch trình & điểm đón</h3>{canManage && <button className="btn btn-primary btn-sm" onClick={onAddDay}><Plus size={15} /> Thêm ngày</button>}</div>
          <div className="day-timeline">{departure.itineraryDays?.map(day => <div className={`day-block ${mapDay === String(day.day) ? 'active' : ''}`} key={day._id} onClick={() => setMapDay(String(day.day))} role="button" tabIndex="0">
            <span className="day-number">N{day.day}</span><div className="day-content"><div className="day-heading"><span><b>{day.title}</b><small>{displayDate(day.date)} · {day.stops?.length || 0} địa điểm</small></span>{canManage && <span className="day-actions"><button className="btn btn-icon btn-ghost btn-sm" title="Sửa ngày" onClick={event => { event.stopPropagation(); onEditDay(day); }}><Edit3 size={14} /></button><button className="btn btn-icon btn-ghost btn-sm text-danger" title="Xóa ngày" onClick={event => { event.stopPropagation(); onRemoveDay(day); }}><Trash2 size={14} /></button></span>}</div>
            {day.stops?.map(stop => <div className="timeline-stop" key={stop._id}><span>{stop.plannedTime || '--:--'}</span><i className={stop.type} /><p><b>{stop.name}</b><small>{stopTypes[stop.type]}{stop.address ? ` · ${stop.address}` : ''}</small></p></div>)}</div>
          </div>)}{!departure.itineraryDays?.length && <p className="text-muted text-sm">Chưa có lịch trình ngày.</p>}</div>
        </section>
      </div>
      <div className="ops-detail-column">
        <section className="ops-detail-section"><div className="ops-detail-title"><h3><Navigation size={17} /> Link theo dõi cho hành khách</h3></div>{publicUrl ? <div className="public-share-box"><img src={`https://quickchart.io/qr?size=180&text=${encodeURIComponent(publicUrl)}`} alt="QR theo dõi chuyến" /><div><input className="form-control" readOnly value={publicUrl} /><label className="public-day-control">Ngày đoàn đang thực hiện<select className="form-control" value={departure.publicProgress?.currentDay || ''} onChange={event => updatePublicProgress({ currentDay: event.target.value, nextStopId: '' })}><option value="">Tự động theo ngày thực tế</option>{departure.itineraryDays?.map(day => <option value={day.day} key={day._id}>Ngày {day.day} · {day.title}</option>)}</select></label><label className="public-day-control">Điểm tiếp theo<select className="form-control" value={departure.publicProgress?.nextStopId || ''} onChange={event => updatePublicProgress({ nextStopId: event.target.value })}><option value="">Tự động theo thời gian</option>{departure.itineraryDays?.filter(day => !departure.publicProgress?.currentDay || day.day === departure.publicProgress.currentDay).flatMap(day => day.stops.map(stop => <option value={stop._id} key={stop._id}>Ngày {day.day} · {stop.name}</option>))}</select></label><div><button className="btn btn-secondary btn-sm" onClick={() => navigator.clipboard.writeText(publicUrl).then(() => toast.success('Đã sao chép link'))}>Sao chép link</button><button className={`btn btn-sm ${tracking ? 'btn-danger' : 'btn-primary'}`} onClick={toggleTracking}><MapPin size={14} /> {tracking ? 'Dừng chia sẻ GPS' : 'Theo dõi GPS trực tiếp'}</button></div><small>{tracking ? 'GPS đang tự động cập nhật khoảng 10 giây/lần. Giữ trang này mở trong suốt hành trình.' : departure.publicProgress?.currentDay ? 'Ngày hiện tại đang được người quản lý chọn thủ công.' : 'Ngày hiện tại tự động khớp theo ngày thực tế; có thể chọn thủ công phía trên.'}</small></div></div> : <button className="btn btn-primary" onClick={createPublicLink}>Tạo link & QR cho chuyến</button>}</section>
        <section className="ops-detail-section"><div className="ops-detail-title"><h3><FileText size={17} /> PDF chương trình Tour</h3>{canManage && <label className="btn btn-primary btn-sm pdf-upload-button"><Upload size={15} /> Tải PDF<input type="file" accept="application/pdf,.pdf" onChange={event => { const file = event.target.files?.[0]; if (file) onUploadProgram(file); event.target.value = ''; }} /></label>}</div><div className="program-documents">{departure.programDocuments?.map(document => <div key={document._id}><span className="pdf-icon"><FileText size={19} /></span><div><b>{document.title}</b><small>{document.originalName} · {(document.size / 1024 / 1024).toFixed(1)} MB</small></div><button className="btn btn-icon btn-ghost btn-sm" onClick={() => onViewProgram(document)}><Eye size={16} /></button><button className="btn btn-icon btn-ghost btn-sm" onClick={() => onDownloadProgram(document)}><Download size={16} /></button>{canManage && <button className="btn btn-icon btn-ghost btn-sm text-danger" onClick={() => onRemoveProgram(document)}><Trash2 size={15} /></button>}</div>)}{!departure.programDocuments?.length && <p className="text-muted text-sm">Chưa tải lên file chương trình Tour.</p>}</div></section>
        <section className="ops-detail-section"><div className="ops-detail-title"><h3><Bus size={17} /> Xe và hành khách ({departure.passengers?.length || 0})</h3>{canManage && !!departure.assignedVehicles?.length && <button className="btn btn-primary btn-sm" onClick={onAddPassenger}><Plus size={15} /> Thêm khách</button>}</div>
          <div className="vehicle-passenger-groups">{departure.assignedVehicles?.map(assignment => { const vehicle = assignment.vehicle; const vehicleId = String(vehicle?._id); const passengers = passengersForVehicle(vehicle?._id); const expanded = expandedVehicles.has(vehicleId); return <details open key={assignment._id}><summary><Bus size={18} /><span><b>{vehicle?.plateNumber}</b><small>{vehicle?.carrier?.name} · {assignment.driverName || vehicle?.driverName || 'Chưa có tài xế'}</small></span><strong>{passengers.length}/{vehicle?.seatCapacity}</strong></summary><div className="passenger-list">{passengers.slice(0, expanded ? passengers.length : 3).map(passengerRow)}{passengers.length > 3 && <button type="button" className="passenger-expand" onClick={() => toggleVehiclePassengers(vehicleId)}>{expanded ? 'Thu gọn danh sách' : `Xem thêm ${passengers.length - 3} hành khách`}</button>}{!passengers.length && <p className="text-muted text-sm">Xe này chưa có hành khách.</p>}</div></details>; })}{!departure.assignedVehicles?.length && <p className="text-muted text-sm">Chưa phân công xe.</p>}</div>
        </section>
        <section className="ops-detail-section capacity-section"><div className="ops-detail-title"><h3><Users size={17} /> Sức chứa theo từng chặng</h3></div><div className="capacity-vehicles">{capacity.map(item => <article key={item.vehicle._id}><header><b>{item.vehicle.plateNumber}</b><span>Còn ít nhất <strong>{item.minimumAvailable}</strong>/{item.vehicle.seatCapacity} ghế</span></header><div>{item.segments.map(segment => <div className={segment.available === 0 ? 'capacity-segment full' : segment.available <= 3 ? 'capacity-segment warning' : 'capacity-segment'} key={`${segment.fromStopId}-${segment.toStopId}`}><span>Ngày {segment.fromDay} · {segment.fromName} → {segment.toName}</span><b>{segment.occupied}/{segment.capacity}</b><small>{segment.available ? `Còn ${segment.available} ghế` : 'Đã hết chỗ'}</small></div>)}</div></article>)}{!capacity.length && <p className="text-muted text-sm">Thêm ít nhất hai điểm hành trình để tính sức chứa theo chặng.</p>}</div></section>
        <section className="ops-detail-section attendance-section"><div className="ops-detail-title"><h3><ClipboardCheck size={17} /> Bảng điểm danh ({departure.attendanceSessions?.length || 0})</h3>{canManage && !!departure.passengers?.length && <button className="btn btn-primary btn-sm" onClick={() => newAttendance()}><Plus size={15} /> Tạo bảng</button>}</div>
          <div className="attendance-session-list">{departure.attendanceSessions?.map(session => { const present = session.records.filter(record => record.status === 'present').length; const missing = session.records.filter(record => record.status === 'missing').length; const isOpen = openAttendance === session._id; return <article className="attendance-session" key={session._id}><header onClick={() => setOpenAttendance(isOpen ? '' : session._id)}><ClipboardCheck size={18} /><span><b>{session.title}</b><small>{session.vehicle?.plateNumber} · {attendanceTypes[session.type]}{session.day ? ` · Ngày ${session.day}` : ''}</small></span><strong>{present}/{session.records.length}</strong>{canManage && <span className="attendance-actions"><button className="btn btn-icon btn-ghost btn-sm" onClick={event => { event.stopPropagation(); editAttendance(session); }}><Edit3 size={14} /></button><button className="btn btn-icon btn-ghost btn-sm text-danger" onClick={event => { event.stopPropagation(); deleteAttendance(session); }}><Trash2 size={14} /></button></span>}</header>{isOpen && <div className="attendance-records"><div className="attendance-progress"><span><CheckCircle2 size={14} /> Có mặt {present}</span><span>Vắng {missing}</span><span>Chưa điểm danh {session.records.filter(record => record.status === 'pending').length}</span></div>{session.records.map(record => <div className="attendance-record" key={record._id}><span className="passenger-avatar">{record.fullName.charAt(0)}</span><div><b>{record.fullName}</b><small>Ghế {record.seatNumber || 'chưa xếp'}</small></div><div className="attendance-status-buttons">{[['present', 'Có mặt'], ['missing', 'Vắng'], ['excused', 'Có phép']].map(([value, label]) => <button type="button" className={record.status === value ? `active ${value}` : ''} onClick={() => markAttendance(session, record, record.status === value ? 'pending' : value)} key={value}>{label}</button>)}</div></div>)}</div>}</article>; })}{!departure.attendanceSessions?.length && <p className="text-muted text-sm">Chưa có bảng điểm danh. Có thể tạo tại điểm khởi hành, sau mỗi điểm nghỉ hoặc trước từng chặng.</p>}</div>
        </section>
      </div>
    </div>
    {attendanceForm && <div className="modal-overlay attendance-modal-overlay" onClick={() => setAttendanceForm(null)}><div className="modal-content ops-modal" onClick={event => event.stopPropagation()}><div className="modal-header"><h2>{attendanceForm._id ? 'Sửa bảng điểm danh' : 'Tạo bảng điểm danh'}</h2><button className="modal-close" onClick={() => setAttendanceForm(null)}><X size={20} /></button></div><form onSubmit={saveAttendance}><div className="modal-body ops-form"><label>Tên bảng *<input required className="form-control" value={attendanceForm.title} onChange={event => setAttendanceForm({ ...attendanceForm, title: event.target.value })} /></label><div className="form-row"><label>Xe *<select required disabled={Boolean(attendanceForm._id)} className="form-control" value={attendanceForm.vehicle} onChange={event => setAttendanceForm({ ...attendanceForm, vehicle: event.target.value })}>{departure.assignedVehicles?.map(item => <option value={item.vehicle?._id} key={item.vehicle?._id}>{item.vehicle?.plateNumber}</option>)}</select></label><label>Loại điểm danh<select className="form-control" value={attendanceForm.type} onChange={event => setAttendanceForm({ ...attendanceForm, type: event.target.value })}>{Object.entries(attendanceTypes).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label></div><div className="form-row"><label>Ngày hành trình<select className="form-control" value={attendanceForm.day} onChange={event => setAttendanceForm({ ...attendanceForm, day: event.target.value })}><option value="">Không chọn ngày</option>{departure.itineraryDays?.map(day => <option value={day.day} key={day._id}>Ngày {day.day} · {day.title}</option>)}</select></label><label>Thời gian dự kiến<input type="datetime-local" className="form-control" value={attendanceForm.scheduledAt} onChange={event => setAttendanceForm({ ...attendanceForm, scheduledAt: event.target.value })} /></label></div><label>Điểm liên quan<select className="form-control" value={attendanceForm.stopId} onChange={event => setAttendanceForm({ ...attendanceForm, stopId: event.target.value })}><option value="">Không chọn điểm</option>{allStops.map(stop => <option value={stop._id} key={stop._id}>Ngày {stop.day} · {stop.name}</option>)}</select></label>{attendanceForm.type === 'segment' && <div className="form-row"><label>Từ điểm<select className="form-control" value={attendanceForm.fromStopId} onChange={event => setAttendanceForm({ ...attendanceForm, fromStopId: event.target.value })}><option value="">Chọn điểm đi</option>{allStops.map(stop => <option value={stop._id} key={stop._id}>{stop.name}</option>)}</select></label><label>Đến điểm<select className="form-control" value={attendanceForm.toStopId} onChange={event => setAttendanceForm({ ...attendanceForm, toStopId: event.target.value })}><option value="">Chọn điểm đến</option>{allStops.map(stop => <option value={stop._id} key={stop._id}>{stop.name}</option>)}</select></label></div>}<label>Ghi chú<textarea rows="2" className="form-control" value={attendanceForm.note} onChange={event => setAttendanceForm({ ...attendanceForm, note: event.target.value })} /></label></div><FormFooter label={attendanceForm._id ? 'Lưu bảng điểm danh' : 'Tạo và lấy danh sách khách'} /></form></div></div>}
  </main></div>;
}
