import { useEffect, useMemo, useState } from 'react';
import { MapPin } from 'lucide-react';
import api from '../../services/api';

const validCoordinate = stop => (
  Number.isFinite(Number(stop.latitude)) && Number.isFinite(Number(stop.longitude)) &&
  stop.latitude !== null && stop.longitude !== null && stop.latitude !== '' && stop.longitude !== ''
);

export default function TourRouteMap({ itineraryDays = [], selectedDay: controlledDay, onSelectedDayChange, apiKey: providedApiKey = '', enableMetrics = true, routePreviewEndpoint = '/tour-operations/route-preview' }) {
  const [selectedDay, setSelectedDay] = useState('all');
  const [routeMetrics, setRouteMetrics] = useState(null);
  const [apiKey, setApiKey] = useState(providedApiKey);
  const [focusedLeg, setFocusedLeg] = useState(null);
  const activeDay = controlledDay ?? selectedDay;
  const daysWithCoordinates = useMemo(() => itineraryDays.filter(day => day.stops?.some(validCoordinate)), [itineraryDays]);
  const visibleStops = useMemo(() => {
    const days = activeDay === 'all' ? daysWithCoordinates : daysWithCoordinates.filter(day => String(day.day) === activeDay);
    return days.flatMap(day => day.stops.filter(validCoordinate).map(stop => ({ ...stop, day: day.day })));
  }, [daysWithCoordinates, activeDay]);

  const changeDay = value => {
    setFocusedLeg(null);
    setSelectedDay(value);
    onSelectedDayChange?.(value);
  };

  useEffect(() => { setFocusedLeg(null); }, [activeDay]);
  const mapStops = focusedLeg === null ? visibleStops : visibleStops.slice(focusedLeg, focusedLeg + 2);
  const displayedMetrics = focusedLeg === null ? routeMetrics : routeMetrics?.legs?.[focusedLeg];

  useEffect(() => {
    if (providedApiKey) { setApiKey(providedApiKey); return undefined; }
    let active = true;
    api.get('/tour-operations/map-config').then(config => {
      if (active && config?.enabled) setApiKey(config.apiKey || '');
    }).catch(() => {});
    return () => { active = false; };
  }, [providedApiKey]);

  const embedUrl = useMemo(() => {
    if (!mapStops.length || !apiKey) return '';
    const points = mapStops.map(stop => `${Number(stop.latitude)},${Number(stop.longitude)}`);
    const base = `https://www.google.com/maps/embed/v1`;
    if (points.length === 1) return `${base}/place?key=${encodeURIComponent(apiKey)}&q=${encodeURIComponent(points[0])}&zoom=14&language=vi&region=VN`;
    const params = new URLSearchParams({ key: apiKey, origin: points[0], destination: points.at(-1), mode: 'driving', language: 'vi', region: 'VN' });
    const waypoints = points.slice(1, -1).slice(0, 20);
    if (waypoints.length) params.set('waypoints', waypoints.join('|'));
    return `${base}/directions?${params}`;
  }, [mapStops, apiKey]);

  useEffect(() => {
    if (!enableMetrics || visibleStops.length < 2) {
      setRouteMetrics(null);
      return undefined;
    }
    let active = true;
    const coordinates = visibleStops.map(stop => `${Number(stop.longitude)},${Number(stop.latitude)}`).join(';');
    api.get(routePreviewEndpoint, { coordinates })
      .then(result => {
        if (!active) return;
        setRouteMetrics({
          distance: result.distance,
          duration: result.duration,
          legs: (result.legs || []).map((leg, index) => ({ ...leg, from: visibleStops[index], to: visibleStops[index + 1] }))
        });
      })
      .catch(() => { if (active) setRouteMetrics(null); });
    return () => { active = false; };
  }, [visibleStops, enableMetrics, routePreviewEndpoint]);

  return <div className="tour-map-wrap">
    <div className="tour-map-toolbar"><span>Tuyến đường Google Maps</span><select value={activeDay} onChange={event => changeDay(event.target.value)}><option value="all">Tất cả ngày</option>{daysWithCoordinates.map(day => <option key={day._id || day.day} value={String(day.day)}>Ngày {day.day} · {day.title}</option>)}</select></div>
    {embedUrl ? <iframe className="tour-route-map google-map-embed" src={embedUrl} title={`Bản đồ hành trình ${activeDay === 'all' ? 'tất cả ngày' : `ngày ${activeDay}`}`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen /> : <div className="tour-map-fallback"><div className="tour-map-fallback-head"><MapPin size={22} /><div><b>{visibleStops.length ? 'Đang tải Google Maps…' : 'Chưa có tọa độ hành trình'}</b><span>{visibleStops.length ? 'Bản đồ sẽ hiển thị ngay trong trang.' : 'Tìm và chọn địa điểm trong lịch trình để hệ thống tự lưu vị trí.'}</span></div></div></div>}
    {routeMetrics && <div className="route-metrics">
      <div className="route-metrics-summary"><span><b>{(displayedMetrics.distance / 1000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} km</b><small>{focusedLeg === null ? 'Tổng quãng đường' : 'Quãng đường chặng đang chọn'}</small></span><span><b>{formatDuration(displayedMetrics.duration)}</b><small>{focusedLeg === null ? 'Thời gian di chuyển dự kiến' : 'Thời gian chặng đang chọn'}</small></span></div>
      <div className="route-leg-list">{routeMetrics.legs.map((leg, index) => <button type="button" className={focusedLeg === index ? 'active' : ''} onClick={() => setFocusedLeg(current => current === index ? null : index)} key={`${leg.from?._id || index}-${leg.to?._id || index + 1}`}><span>{index + 1}</span><div><b>{leg.from?.name} → {leg.to?.name}</b><small>{(leg.distance / 1000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} km · khoảng {formatDuration(leg.duration)} · Bấm để xem chặng</small></div></button>)}</div>
    </div>}
  </div>;
}

function formatDuration(seconds = 0) {
  const minutes = Math.max(1, Math.round(Number(seconds) / 60));
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (!hours) return `${minutes} phút`;
  return remaining ? `${hours} giờ ${remaining} phút` : `${hours} giờ`;
}
