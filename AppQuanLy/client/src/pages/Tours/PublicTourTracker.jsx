import { useEffect, useMemo, useState } from 'react';
import { Bus, CalendarDays, Download, FileText, MapPin, Navigation, Route, UserRound, UsersRound } from 'lucide-react';
import { useParams } from 'react-router-dom';
import api, { getApiBaseUrl } from '../../services/api';
import TourRouteMap from './TourRouteMap';
import './TourOperations.css';
import './PublicTourTracker.css';

export default function PublicTourTracker() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [mapDay, setMapDay] = useState('all');
  useEffect(() => {
    let active = true;
    const load = () => api.get(`/public/tours/${token}`).then(result => { if (active) setData(result); }).catch(err => { if (active) setError(err.message); });
    load(); const timer = setInterval(load, 15000);
    return () => { active = false; clearInterval(timer); };
  }, [token]);
  const today = new Date();
  const currentDay = useMemo(() => {
    const days = data?.departure?.itineraryDays || [];
    const manualDay = data?.departure?.publicProgress?.currentDay;
    return (manualDay && days.find(day => day.day === manualDay)) || days.find(day => day.date && new Date(day.date).toDateString() === today.toDateString()) || days[0];
  }, [data]);
  const manualNextStop = data?.departure?.publicProgress?.nextStopId;
  const nextStop = currentDay?.stops?.find(stop => String(stop._id) === String(manualNextStop)) || currentDay?.stops?.find(stop => stop.plannedTime && stop.plannedTime >= today.toTimeString().slice(0, 5)) || currentDay?.stops?.[0];
  if (error) return <div className="public-tour-state"><h2>Không thể mở chuyến</h2><p>{error}</p></div>;
  if (!data) return <div className="public-tour-state">Đang tải hành trình…</div>;
  const { departure, mapsApiKey } = data;
  const location = departure.liveLocation;
  const mapUrl = location && mapsApiKey ? `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(mapsApiKey)}&q=${location.latitude},${location.longitude}&zoom=14&language=vi&region=VN` : '';
  return <main className="public-tour-page">
    <header><span>{departure.code}</span><h1>{departure.tour?.name}</h1><p>{new Date(departure.startDate).toLocaleDateString('vi-VN')} – {new Date(departure.endDate).toLocaleDateString('vi-VN')}</p></header>
    <div className="public-tour-summary"><div><CalendarDays /><span><small>Ngày hiện tại</small><b>Ngày {currentDay?.day || '—'} · {currentDay?.title || 'Chưa có lịch trình'}</b></span></div><div><Navigation /><span><small>Điểm tiếp theo</small><b>{nextStop?.name || 'Chưa xác định'}</b></span></div></div>
    {!!departure.vehicles?.length && <section className="public-vehicles-section">
      <div className="public-section-heading"><div><h2><Bus /> Phương tiện của đoàn</h2><p>Mỗi xe được tách riêng để hành khách dễ nhận biết.</p></div><span>{departure.vehicles.length} xe</span></div>
      <div className="public-vehicle-grid">{departure.vehicles.map((vehicle, index) => <article key={`${vehicle.plateNumber}-${index}`} className="public-vehicle-card">
        <div className="public-vehicle-index"><span>Xe thứ</span><strong>{index + 1}</strong></div>
        <div className="public-vehicle-main"><small>{vehicle.name || vehicle.vehicleType || 'Phương tiện Tour'}</small><b>{vehicle.plateNumber || 'Đang cập nhật biển số'}</b><div className="public-vehicle-meta"><span><UserRound /> {vehicle.driverName || 'Chưa cập nhật tài xế'}</span>{vehicle.seatCapacity && <span><UsersRound /> {vehicle.seatCapacity} chỗ</span>}</div></div>
      </article>)}</div>
    </section>}
    <section><h2><MapPin /> Vị trí hiện tại của đoàn</h2>{mapUrl ? <iframe src={mapUrl} title="Vị trí đoàn" allowFullScreen loading="lazy" /> : <div className="public-tour-empty">Người quản lý chưa chia sẻ vị trí.</div>}{location?.updatedAt && <small>Cập nhật lúc {new Date(location.updatedAt).toLocaleString('vi-VN')}</small>}</section>
    <section className="public-route-section"><h2><Route /> Bản đồ hành trình</h2><TourRouteMap itineraryDays={departure.itineraryDays || []} selectedDay={mapDay} onSelectedDayChange={setMapDay} apiKey={mapsApiKey} routePreviewEndpoint={`/public/tours/${token}/route-preview`} /></section>
    {!!departure.programDocuments?.length && <section><h2><FileText /> Chương trình Tour</h2><div className="public-documents">{departure.programDocuments.map(document => { const url = `${getApiBaseUrl()}/public/tours/${token}/documents/${document._id}`; return <article key={document._id}><FileText /><span><b>{document.title}</b><small>{document.originalName} · {(document.size / 1024 / 1024).toFixed(1)} MB</small></span><a href={url} target="_blank" rel="noreferrer"><Download size={16} /> Xem PDF</a></article>; })}</div></section>}
    <section><h2><Route /> Lịch trình</h2><div className="public-itinerary">{departure.itineraryDays?.map(day => <article className={day._id === currentDay?._id ? 'active' : ''} key={day._id}><b>Ngày {day.day}: {day.title}</b>{day.stops?.map(stop => <p key={stop._id}><span>{stop.plannedTime || '--:--'}</span>{stop.name}</p>)}</article>)}</div></section>
  </main>;
}
