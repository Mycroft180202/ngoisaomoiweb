import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { CheckCircle2, ChevronRight, Search, Wand2 } from 'lucide-react';
import api from '../../services/api';

const today = new Date().toISOString().slice(0, 10);

export default function BookingJourneyPanel({ vehicles }) {
  const [bookings, setBookings] = useState([]);
  const [bookingId, setBookingId] = useState('');
  const [schedules, setSchedules] = useState([]);
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [travelDate, setTravelDate] = useState(today);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [assignedVehicles, setAssignedVehicles] = useState({});
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  const booking = bookings.find(item => item._id === bookingId);
  const selectedSchedule = schedules[0];
  const stops = useMemo(() => selectedSchedule?.stops || [], [selectedSchedule]);

  useEffect(() => {
    api.get('/bookings', { limit: 100 })
      .then(result => setBookings(result.bookings || []))
      .catch(error => toast.error(error.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setSchedules([]); setSuggestions([]); setSelectedPlan(null); setOrigin(''); setDestination('');
    if (!booking?.tour?._id) return;
    api.get(`/tour-operations/route-schedules/${booking.tour._id}`)
      .then(result => setSchedules((result.schedules || []).filter(item => item.active)))
      .catch(error => toast.error(error.message));
  }, [bookingId]);

  useEffect(() => {
    if (!origin && stops[0]) setOrigin(stops[0].code);
    if (!destination && stops.length > 1) setDestination(stops[stops.length - 1].code);
  }, [stops, origin, destination]);

  const suggest = async event => {
    event.preventDefault();
    if (!booking || !origin || !destination || origin === destination) return toast.error('Hãy chọn điểm đi và điểm đến khác nhau');
    try {
      setWorking(true);
      const result = await api.get(`/tour-operations/route-schedules/${booking.tour._id}/suggestions`, { origin, destination, date: travelDate });
      setSuggestions(result.suggestions || []); setSelectedPlan(null); setAssignedVehicles({});
      if (!result.suggestions?.length) toast.error('Chưa tìm thấy hành trình phù hợp trong ngày này');
    } catch (error) { toast.error(error.message); } finally { setWorking(false); }
  };

  const save = async () => {
    if (!selectedPlan || !booking) return;
    try {
      setWorking(true);
      const segments = selectedPlan.legs.map((leg, index) => ({
        routeSchedule: leg.scheduleId,
        serviceCode: leg.service.code,
        travelDate,
        originStopCode: leg.origin.code,
        destinationStopCode: leg.destination.code,
        vehicle: assignedVehicles[index] || leg.service.defaultVehicle || undefined,
        status: assignedVehicles[index] || leg.service.defaultVehicle ? 'assigned' : 'suggested',
        assignmentSource: assignedVehicles[index] ? 'manual' : 'schedule',
        transferStatus: index ? 'pending' : 'not_required'
      }));
      await api.put(`/bookings/${booking._id}/journey-segments`, { segments });
      toast.success('Đã lưu hành trình nhiều chặng cho booking');
    } catch (error) { toast.error(error.message); } finally { setWorking(false); }
  };

  return <div className="booking-journey-layout">
    <section className="ops-panel booking-journey-search"><div className="ops-panel-title"><div><h2>Đề xuất hành trình booking</h2><p>Một booking có thể đi qua nhiều xe và nhiều chặng.</p></div></div>
      <label className="ops-label">Booking<select className="form-control" value={bookingId} onChange={event => setBookingId(event.target.value)} disabled={loading}><option value="">{loading ? 'Đang tải booking...' : 'Chọn booking'}</option>{bookings.filter(item => item.status !== 'cancelled').map(item => <option key={item._id} value={item._id}>{item.code} · {item.customerName} · {item.tour?.name} · {item.status}</option>)}</select></label>
      {booking && <div className="booking-journey-customer"><b>{booking.customerName}</b><span>{booking.adults} người lớn · {booking.children || 0} trẻ em · {booking.infants || 0} em bé</span></div>}
      {booking && <form className="ops-form" onSubmit={suggest}><div className="form-row"><label>Điểm đón<select required className="form-control" value={origin} onChange={event => setOrigin(event.target.value)}><option value="">Chọn điểm đi</option>{stops.map(stop => <option key={stop.code} value={stop.code}>{stop.code} · {stop.name}</option>)}</select></label><label>Điểm trả<select required className="form-control" value={destination} onChange={event => setDestination(event.target.value)}><option value="">Chọn điểm đến</option>{stops.map(stop => <option key={stop.code} value={stop.code}>{stop.code} · {stop.name}</option>)}</select></label></div><label>Ngày đi<input required type="date" className="form-control" value={travelDate} onChange={event => setTravelDate(event.target.value)} /></label><button className="btn btn-primary" type="submit" disabled={working}><Wand2 size={16} /> {working ? 'Đang tìm...' : 'Tìm phương án tự động'}</button></form>}
      {booking && !schedules.length && <p className="ops-form-note">Tour này chưa có lịch tuyến cố định. Hãy cấu hình tại tab “Lịch tuyến cố định” trước.</p>}
    </section>
      <section className="ops-panel booking-journey-results"><div className="ops-panel-title"><div><h2>Phương án hành trình</h2><p>Chọn phương án phù hợp, sau đó gán xe riêng cho từng chặng nếu cần.</p></div></div>{!suggestions.length && <div className="ops-empty booking-journey-empty"><Search size={34} /><p>Chưa có phương án được chọn.</p></div>}{suggestions.map((suggestion, suggestionIndex) => <button type="button" key={suggestionIndex} className={`journey-suggestion ${selectedPlan === suggestion ? 'selected' : ''}`} onClick={() => { setSelectedPlan(suggestion); setAssignedVehicles(Object.fromEntries(suggestion.legs.map((leg, index) => [index, leg.service.defaultVehicle?._id || leg.service.defaultVehicle || '']))); }}><span className="journey-suggestion-title"><b>Phương án {suggestionIndex + 1}</b><small>{suggestion.legs.length} chặng{suggestion.transferRequired ? ' · Có chuyển xe' : ' · Đi thẳng'}</small></span><span className="journey-leg-preview">{suggestion.legs.map((leg, index) => <span key={`${leg.scheduleId}-${leg.service.code}`}><b>{leg.origin.name} → {leg.destination.name}</b><small>{leg.service.departureTime} - {leg.service.arrivalTime} · {leg.scheduleName}</small>{leg.service.defaultVehicle && <small className="journey-default-vehicle">Có xe mặc định</small>}{index < suggestion.legs.length - 1 && <ChevronRight size={15} />}</span>)}</span></button>)}{selectedPlan && <div className="journey-assignment"><div className="journey-assignment-head"><div><h3>Gán xe theo từng chặng</h3><small>Xe mặc định đã được chọn trước; điều hành có thể đổi xe.</small></div><button type="button" className="btn btn-primary btn-sm" onClick={save} disabled={working}><CheckCircle2 size={15} /> {working ? 'Đang lưu...' : 'Lưu hành trình'}</button></div>{selectedPlan.legs.map((leg, index) => <div className="journey-leg-row" key={`${leg.scheduleId}-${leg.service.code}`}><div><b>Chặng {index + 1}: {leg.origin.name} → {leg.destination.name}</b><small>{leg.service.departureTime} - {leg.service.arrivalTime} · {leg.service.code}</small></div><select className="form-control" value={assignedVehicles[index] || ''} onChange={event => setAssignedVehicles({ ...assignedVehicles, [index]: event.target.value })}><option value="">Theo lịch / chọn sau</option>{vehicles.map(vehicle => <option key={vehicle._id} value={vehicle._id}>{vehicle.plateNumber} · {vehicle.seatCapacity} chỗ</option>)}</select></div>)}</div>}</section>
  </div>;
}
