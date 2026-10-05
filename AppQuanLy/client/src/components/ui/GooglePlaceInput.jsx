import { useEffect, useRef, useState } from 'react';
import { MapPin, Search } from 'lucide-react';
import api from '../../services/api';

export default function GooglePlaceInput({ value, onChange, placeholder = 'Tìm địa điểm hoặc địa chỉ...' }) {
  const [query, setQuery] = useState(value?.address || '');
  const [suggestions, setSuggestions] = useState([]);
  const [status, setStatus] = useState('idle');
  const timerRef = useRef(null);
  const requestRef = useRef(0);
  const sessionTokenRef = useRef(globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`);

  useEffect(() => setQuery(value?.address || ''), [value?.address]);
  useEffect(() => () => clearTimeout(timerRef.current), []);

  const searchPlaces = input => {
    setQuery(input);
    setSuggestions([]);
    onChange({ ...value, address: input, placeId: '', latitude: '', longitude: '' });
    clearTimeout(timerRef.current);
    const requestId = ++requestRef.current;
    if (input.trim().length < 3) {
      setStatus('idle');
      return;
    }
    timerRef.current = setTimeout(async () => {
      try {
        setStatus('loading');
        const response = await api.get('/tour-operations/place-search', { q: input.trim(), sessiontoken: sessionTokenRef.current });
        const results = response.suggestions || [];
        if (requestId !== requestRef.current) return;
        setSuggestions(results);
        setStatus('ready');
      } catch {
        if (requestId !== requestRef.current) return;
        setStatus('error');
      }
    }, 500);
  };

  const choosePlace = async suggestion => {
    let selected = suggestion;
    if (suggestion.source === 'goong') {
      try {
        selected = await api.get('/tour-operations/place-detail', {
          placeId: suggestion.id,
          sessiontoken: sessionTokenRef.current
        });
        sessionTokenRef.current = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
      } catch {
        setStatus('error');
        return;
      }
    }
    const next = {
      ...value,
      name: value?.name || selected.name || '',
      address: selected.address || selected.name,
      placeId: selected.id || '',
      latitude: selected.latitude ?? '',
      longitude: selected.longitude ?? ''
    };
    setQuery(next.address);
    setSuggestions([]);
    setStatus('ready');
    onChange(next);
  };

  return <div className="google-place-input">
    <div className="google-place-control"><Search size={15} /><input value={query} onChange={event => searchPlaces(event.target.value)} placeholder={placeholder} autoComplete="off" /></div>
    {suggestions.length > 0 && <div className="google-place-suggestions">
      {suggestions.map(item => <button type="button" key={item.id} onClick={() => choosePlace(item)}><MapPin size={15} /><span><b>{item.name}</b><small>{item.detail || item.address}</small></span></button>)}
      <div className="map-data-attribution">Dữ liệu {suggestions[0]?.source === 'goong' ? 'Goong' : '© OpenStreetMap contributors'}</div>
    </div>}
    {status === 'loading' && <small className="place-status">Đang tìm địa điểm…</small>}
    {status === 'ready' && query.trim().length >= 3 && !suggestions.length && !value?.latitude && <small className="place-status">Không thấy kết quả phù hợp; bạn vẫn có thể lưu địa chỉ nhập tay.</small>}
    {status === 'error' && <small className="place-status error">Tìm kiếm đang tạm bận; bạn vẫn có thể lưu địa chỉ nhập tay.</small>}
  </div>;
}
