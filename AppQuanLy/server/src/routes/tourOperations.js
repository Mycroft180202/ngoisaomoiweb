const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Carrier = require('../models/Carrier');
const Vehicle = require('../models/Vehicle');
const Tour = require('../models/Tour');
const TourDeparture = require('../models/TourDeparture');
const User = require('../models/User');
const RouteSchedule = require('../models/RouteSchedule');
const { generateCode } = require('../utils/codeGenerator');
const uploadTourDocument = require('../middleware/tourDocumentUpload');
const { UPLOAD_DIR } = require('../middleware/tourDocumentUpload');

const mapResponseCache = new Map();
const cachedMapRequest = async (key, ttl, request) => {
  const cached = mapResponseCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const value = await request();
  mapResponseCache.set(key, { value, expiresAt: Date.now() + ttl });
  if (mapResponseCache.size > 300) {
    const firstKey = mapResponseCache.keys().next().value;
    mapResponseCache.delete(firstKey);
  }
  return value;
};

const normalizeUploadName = value => {
  const name = String(value || '');
  if (!/[ÃÄÆá»]/.test(name)) return name;
  try { return Buffer.from(name, 'latin1').toString('utf8'); } catch { return name; }
};

const canManage = (req) => (
  req.user?.role === 'director' ||
  req.user?.department === 'operations' ||
  /^operations?_/.test(req.user?.role || '') ||
  req.user?.role === 'tour_operator' ||
  /điều hành|operations?/i.test(req.user?.position || '') ||
  req.user?.permissions?.includes('tour_operations.manage') ||
  req.user?.username?.toLowerCase() === 'admin'
);

const requireTourOperations = (req, res, next) => {
  if (canManage(req)) return next();
  return res.status(403).json({ error: 'Bạn không có quyền điều hành Tour' });
};

const validateRouteSchedule = (stops = [], services = []) => {
  if (stops.length < 2) return 'Tuyến cần ít nhất hai điểm dừng';
  const stopCodes = new Set(stops.map(stop => String(stop.code || '').trim().toUpperCase()).filter(Boolean));
  if (stopCodes.size !== stops.length) return 'Mã điểm dừng không được trùng hoặc để trống';
  const sequenceByCode = new Map(stops.map((stop, index) => [String(stop.code).toUpperCase(), Number.isFinite(Number(stop.sequence)) ? Number(stop.sequence) : index]));
  const serviceCodes = new Set();
  for (const service of services) {
    const code = String(service.code || '').trim().toUpperCase();
    const origin = String(service.originStopCode || '').toUpperCase();
    const destination = String(service.destinationStopCode || '').toUpperCase();
    if (!code || serviceCodes.has(code)) return 'Mã chặng không được trùng hoặc để trống';
    if (!stopCodes.has(origin) || !stopCodes.has(destination)) return 'Chặng trong lịch không thuộc các điểm dừng của tuyến';
    if (origin === destination || sequenceByCode.get(origin) >= sequenceByCode.get(destination)) return 'Điểm đi phải đứng trước điểm đến trong tuyến';
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(service.departureTime) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(service.arrivalTime)) return 'Giờ đi và giờ đến không hợp lệ';
    serviceCodes.add(code);
  }
  return null;
};

const populateDeparture = (query) => query
  .populate('tour', 'code name destination durationDays durationNights')
  .populate('routeSegment.routeSchedule', 'code name stops services')
  .populate('manager', 'fullName phone')
  .populate('assignedGuides.guide', 'fullName phone email department role status')
  .populate('createdBy', 'fullName')
  .populate('programDocuments.uploadedBy', 'fullName')
  .populate('attendanceSessions.createdBy', 'fullName')
  .populate('attendanceSessions.records.checkedBy', 'fullName')
  .populate('attendanceSessions.vehicle', 'plateNumber name seatCapacity')
  .populate({
    path: 'assignedVehicles.vehicle',
    populate: { path: 'carrier', select: 'name phone' }
  })
  .populate({
    path: 'passengers.vehicle',
    select: 'plateNumber name seatCapacity'
  })
  .populate({
    path: 'passengers.sourceTour',
    select: 'code name destination'
  });

const normalizeVehicleIds = (assignedVehicles = []) => (
  assignedVehicles.map(item => String(item.vehicle?._id || item.vehicle)).filter(Boolean)
);

const normalizeGuideIds = (assignedGuides = []) => (
  assignedGuides.map(item => String(item.guide?._id || item.guide)).filter(Boolean)
);

const toDateTime = (date, time, fallbackTime) => {
  if (!date) return null;
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return null;
  const [hours, minutes] = String(time || fallbackTime).split(':').map(Number);
  value.setHours(Number.isFinite(hours) ? hours : 0, Number.isFinite(minutes) ? minutes : 0, 0, 0);
  return value;
};

const operationalRange = ({ startDate, endDate, departureTime, returnTime, operationalStartAt, operationalEndAt }) => ({
  start: operationalStartAt ? new Date(operationalStartAt) : toDateTime(startDate, departureTime, '00:00'),
  end: operationalEndAt ? new Date(operationalEndAt) : toDateTime(endDate, returnTime, '23:59')
});

const validateGuideAssignments = async ({ assignedGuides = [], startDate, endDate, departureTime, returnTime, operationalStartAt, operationalEndAt, excludeDepartureId }) => {
  const guideIds = normalizeGuideIds(assignedGuides);
  if (new Set(guideIds).size !== guideIds.length) return 'Một hướng dẫn viên không thể được phân công hai lần trong cùng chuyến';
  if (!guideIds.length) return null;
  const guides = await User.find({ _id: { $in: guideIds } }).select('_id fullName status');
  if (guides.length !== guideIds.length) return 'Có hướng dẫn viên không tồn tại';
  const inactive = guides.find(guide => guide.status !== 'active');
  if (inactive) return `Hướng dẫn viên ${inactive.fullName} hiện không hoạt động`;
  const range = operationalRange({ startDate, endDate, departureTime, returnTime, operationalStartAt, operationalEndAt });
  if (!range.start || !range.end || range.end < range.start) return 'Khoảng thời gian điều hành không hợp lệ';
  const conflicts = await TourDeparture.find({
    _id: excludeDepartureId ? { $ne: excludeDepartureId } : { $exists: true },
    status: { $nin: ['cancelled', 'completed'] },
    'assignedGuides.guide': { $in: guideIds }
  }).select('code tour startDate endDate departureTime returnTime operationalStartAt operationalEndAt assignedGuides').populate('tour', 'name code');
  const conflict = conflicts.find(item => {
    return item.assignedGuides.some(existing => {
      const existingId = String(existing.guide?._id || existing.guide);
      if (!guideIds.includes(existingId)) return false;
      const current = assignedGuides.find(candidate => String(candidate.guide?._id || candidate.guide) === existingId);
      const currentRange = current?.startAt && current?.endAt
        ? { start: new Date(current.startAt), end: new Date(current.endAt) }
        : range;
      const other = existing.startAt && existing.endAt
        ? { start: new Date(existing.startAt), end: new Date(existing.endAt) }
        : operationalRange(item);
      return other.start <= currentRange.end && other.end >= currentRange.start;
    });
  });
  if (conflict) {
    const guideId = normalizeGuideIds(conflict.assignedGuides).find(id => guideIds.includes(id));
    const guide = guides.find(item => String(item._id) === guideId);
    return `Hướng dẫn viên ${guide?.fullName || ''} đã được phân công cho ${conflict.tour?.name || conflict.code} trong khoảng thời gian này`;
  }
  return null;
};

const validateVehicleAssignments = async ({ assignedVehicles, startDate, endDate, departureTime, returnTime, operationalStartAt, operationalEndAt, excludeDepartureId }) => {
  const vehicleIds = normalizeVehicleIds(assignedVehicles);
  if (new Set(vehicleIds).size !== vehicleIds.length) {
    return 'Một xe không thể được phân công hai lần trong cùng chuyến';
  }
  if (!vehicleIds.length) return null;

  const vehicles = await Vehicle.find({ _id: { $in: vehicleIds } });
  if (vehicles.length !== vehicleIds.length) return 'Có phương tiện không tồn tại';
  const unavailable = vehicles.find(vehicle => vehicle.status !== 'active');
  if (unavailable) return `Xe ${unavailable.plateNumber} hiện không sẵn sàng`;

  const conflictFilter = {
    _id: excludeDepartureId ? { $ne: excludeDepartureId } : { $exists: true },
    status: { $nin: ['cancelled', 'completed'] },
    'assignedVehicles.vehicle': { $in: vehicleIds },
    // Lọc nhanh theo ngày trước, sau đó kiểm tra chính xác theo giờ điều hành.
    startDate: { $lte: new Date(endDate) },
    endDate: { $gte: new Date(startDate) }
  };
  const candidates = await TourDeparture.find(conflictFilter)
    .populate('tour', 'name code')
    .populate('assignedVehicles.vehicle', 'plateNumber');
  const range = operationalRange({ startDate, endDate, departureTime, returnTime, operationalStartAt, operationalEndAt });
  const conflict = candidates.find(item => {
    const other = operationalRange(item);
    return other.start <= range.end && other.end >= range.start;
  });
  if (conflict) {
    const conflicted = conflict.assignedVehicles.find(item => vehicleIds.includes(String(item.vehicle?._id)));
    return `Xe ${conflicted?.vehicle?.plateNumber || ''} đã được xếp cho ${conflict.tour?.name || conflict.code} trong khoảng thời gian này`;
  }
  return null;
};

const orderedStops = departure => (departure.itineraryDays || [])
  .slice().sort((a, b) => a.day - b.day)
  .flatMap(day => (day.stops || []).slice().sort((a, b) => a.order - b.order).map(stop => {
    const value = typeof stop.toObject === 'function' ? stop.toObject() : stop;
    return { ...value, day: day.day };
  }));

const passengerRange = (departure, passenger) => {
  const stops = orderedStops(departure);
  const pickupIndex = passenger.pickupStopId ? stops.findIndex(stop => String(stop._id) === String(passenger.pickupStopId)) : 0;
  const dropoffIndex = passenger.dropoffStopId ? stops.findIndex(stop => String(stop._id) === String(passenger.dropoffStopId)) : stops.length - 1;
  return { stops, pickupIndex, dropoffIndex };
};

const isActiveAllocation = passenger => passenger.allocationStatus !== 'cancelled' && !(
  passenger.allocationStatus === 'hold' && passenger.holdExpiresAt && new Date(passenger.holdExpiresAt) <= new Date()
);

const buildCapacityOverview = (departure, vehicles) => {
  const stops = orderedStops(departure);
  return vehicles.map(vehicle => {
    const passengers = (departure.passengers || []).filter(item =>
      String(item.vehicle?._id || item.vehicle) === String(vehicle._id) && isActiveAllocation(item)
    );
    const segments = stops.slice(0, -1).map((fromStop, index) => {
      const toStop = stops[index + 1];
      const occupied = passengers.filter(passenger => {
        const range = passengerRange(departure, passenger);
        return range.pickupIndex <= index && range.dropoffIndex > index;
      }).length;
      return {
        index,
        fromStopId: fromStop._id,
        toStopId: toStop._id,
        fromName: fromStop.name,
        toName: toStop.name,
        fromDay: fromStop.day,
        toDay: toStop.day,
        occupied,
        capacity: vehicle.seatCapacity,
        available: Math.max(0, vehicle.seatCapacity - occupied)
      };
    });
    return {
      vehicle: { _id: vehicle._id, plateNumber: vehicle.plateNumber, seatCapacity: vehicle.seatCapacity },
      segments,
      minimumAvailable: segments.length ? Math.min(...segments.map(segment => segment.available)) : vehicle.seatCapacity
    };
  });
};

const validatePassengers = async (departure, passengers) => {
  const assignedVehicleIds = new Set(normalizeVehicleIds(departure.assignedVehicles));
  const vehicleIds = [...new Set(passengers.map(item => String(item.vehicle?._id || item.vehicle)).filter(Boolean))];
  if (vehicleIds.some(id => !assignedVehicleIds.has(id))) {
    return 'Hành khách phải được xếp vào xe đã phân công cho chuyến';
  }

  const vehicles = await Vehicle.find({ _id: { $in: vehicleIds } });
  for (const vehicle of vehicles) {
    const vehiclePassengers = passengers.filter(item => String(item.vehicle?._id || item.vehicle) === String(vehicle._id) && isActiveAllocation(item));
    for (const passenger of vehiclePassengers) {
      const { stops, pickupIndex, dropoffIndex } = passengerRange(departure, passenger);
      if (stops.length < 2) return 'Chuyến cần ít nhất 2 điểm dừng trước khi xếp hành khách';
      if (pickupIndex < 0) return `Điểm đón của khách ${passenger.fullName} không thuộc hành trình`;
      if (dropoffIndex < 0) return `Điểm xuống của khách ${passenger.fullName} không thuộc hành trình`;
      if (pickupIndex >= dropoffIndex) return `Điểm xuống của khách ${passenger.fullName} phải nằm sau điểm đón`;
    }

    const departureValue = typeof departure.toObject === 'function' ? departure.toObject() : departure;
    const capacity = buildCapacityOverview({ ...departureValue, passengers }, [vehicle])[0];
    const overloaded = capacity.segments.find(segment => segment.occupied > vehicle.seatCapacity);
    if (overloaded) {
      return `Xe ${vehicle.plateNumber} không đủ chỗ trên chặng ${overloaded.fromName} → ${overloaded.toName}: ${overloaded.occupied}/${vehicle.seatCapacity} khách`;
    }

    for (let first = 0; first < vehiclePassengers.length; first += 1) {
      const passenger = vehiclePassengers[first];
      const seat = passenger.seatNumber?.trim().toUpperCase();
      if (!seat) continue;
      const firstRange = passengerRange(departure, passenger);
      const duplicate = vehiclePassengers.slice(first + 1).find(other => {
        if (other.seatNumber?.trim().toUpperCase() !== seat) return false;
        const otherRange = passengerRange(departure, other);
        return firstRange.pickupIndex < otherRange.dropoffIndex && otherRange.pickupIndex < firstRange.dropoffIndex;
      });
      if (duplicate) return `Ghế ${seat} trên xe ${vehicle.plateNumber} bị trùng giữa ${passenger.fullName} và ${duplicate.fullName}`;
    }
  }
  return null;
};

router.get('/overview', async (req, res) => {
  const [carriers, vehicles, departures] = await Promise.all([
    Carrier.find().sort({ status: 1, name: 1 }),
    Vehicle.find().populate('carrier', 'name phone').sort({ status: 1, plateNumber: 1 }),
    populateDeparture(TourDeparture.find().sort({ startDate: -1 }).limit(100))
  ]);
  res.json({ carriers, vehicles, departures, canManage: canManage(req) });
});

router.get('/route-schedules/:tourId', async (req, res) => {
  const schedules = await RouteSchedule.find({ tour: req.params.tourId }).populate('services.defaultVehicle', 'plateNumber name seatCapacity').sort({ active: -1, name: 1 });
  res.json({ schedules });
});

router.post('/route-schedules', requireTourOperations, async (req, res) => {
  try {
    const { tour, code, name, stops = [], services = [], transferMinutes, autoSuggest, active } = req.body;
    if (!tour || !code || !name) return res.status(400).json({ error: 'Tuyến cần Tour, mã và tên' });
    const validationError = validateRouteSchedule(stops, services);
    if (validationError) return res.status(400).json({ error: validationError });
    const schedule = await RouteSchedule.create({ tour, code, name, stops, services, transferMinutes, autoSuggest, active, createdBy: req.user._id });
    res.status(201).json({ schedule, message: 'Đã tạo lịch tuyến cố định' });
  } catch (error) { res.status(400).json({ error: error.message || 'Không thể tạo lịch tuyến' }); }
});

router.put('/route-schedules/:id', requireTourOperations, async (req, res) => {
  try {
    const schedule = await RouteSchedule.findById(req.params.id);
    if (!schedule) return res.status(404).json({ error: 'Không tìm thấy lịch tuyến' });
    const fields = ['code', 'name', 'stops', 'services', 'transferMinutes', 'autoSuggest', 'active'];
    fields.forEach(field => { if (req.body[field] !== undefined) schedule[field] = req.body[field]; });
    const validationError = validateRouteSchedule(schedule.stops, schedule.services);
    if (validationError) return res.status(400).json({ error: validationError });
    await schedule.save();
    res.json({ schedule, message: 'Đã cập nhật lịch tuyến cố định' });
  } catch (error) { res.status(400).json({ error: error.message || 'Không thể cập nhật lịch tuyến' }); }
});

router.get('/route-schedules/:tourId/suggestions', async (req, res) => {
  const { origin, destination, date } = req.query;
  if (!origin || !destination || !date) return res.status(400).json({ error: 'Cần origin, destination và date' });
  const travelDate = new Date(`${date}T00:00:00+07:00`);
  if (Number.isNaN(travelDate.getTime())) return res.status(400).json({ error: 'Ngày đi không hợp lệ' });
  const dayOfWeek = travelDate.getDay();
  const schedules = await RouteSchedule.find({ tour: req.params.tourId, active: true, autoSuggest: true }).lean();
  const services = schedules.flatMap(schedule => {
    const stopMap = new Map(schedule.stops.map(stop => [stop.code, stop]));
    const activeServices = schedule.services.filter(service => service.active && service.daysOfWeek.includes(dayOfWeek));
    return activeServices.map(service => ({ schedule, stopMap, service }));
  });
  const originCode = String(origin).toUpperCase();
  const destinationCode = String(destination).toUpperCase();
  const toMinutes = value => { const [hours, minutes] = value.split(':').map(Number); return hours * 60 + minutes; };
  const suggestions = [];
  const walk = (currentStop, arrivalMinutes, path, visited) => {
    if (path.length >= 4) return;
    services.filter(item => item.service.originStopCode === currentStop && !visited.has(`${item.schedule._id}:${item.service.code}`))
      .forEach(item => {
        const departureMinutes = toMinutes(item.service.departureTime);
        const transferMinutes = path.length ? (item.schedule.transferMinutes || 0) : 0;
        if (path.length && departureMinutes < arrivalMinutes + transferMinutes) return;
        const nextPath = [...path, item];
        if (item.service.destinationStopCode === destinationCode) {
          suggestions.push({
            legs: nextPath.map(leg => ({ scheduleId: leg.schedule._id, scheduleName: leg.schedule.name, service: leg.service, origin: leg.stopMap.get(leg.service.originStopCode), destination: leg.stopMap.get(leg.service.destinationStopCode) })),
            transferRequired: nextPath.length > 1
          });
          return;
        }
        const nextVisited = new Set(visited).add(`${item.schedule._id}:${item.service.code}`);
        walk(item.service.destinationStopCode, toMinutes(item.service.arrivalTime), nextPath, nextVisited);
      });
  };
  walk(originCode, 0, [], new Set());
  suggestions.sort((first, second) => first.legs.length - second.legs.length);
  res.json({ suggestions });
});

// API key này được giới hạn theo HTTP referrer trong Google Cloud nên chỉ có
// thể dùng từ các website đã khai báo. Không trả thêm bất kỳ secret nào khác.
router.get('/map-config', (req, res) => {
  const apiKey = String(process.env.GOOGLE_MAPS_API_KEY || '').trim();
  res.json({ enabled: Boolean(apiKey), apiKey });
});

// Ưu tiên Nominatim để có địa chỉ hành chính/số nhà chi tiết, sau đó bổ sung
// Photon cho tìm kiếm gần đúng. Request được cache để tuân thủ dịch vụ OSM.
router.get('/place-search', async (req, res) => {
  const query = String(req.query.q || '').trim();
  const sessionToken = String(req.query.sessiontoken || '').trim();
  if (query.length < 3) return res.json({ suggestions: [] });
  try {
    const goongApiKey = String(process.env.GOONG_API_KEY || '').trim();
    if (goongApiKey) {
      try {
        const params = new URLSearchParams({
          api_key: goongApiKey,
          input: query,
          limit: '8',
          more_compound: 'true'
        });
        if (sessionToken) params.set('sessiontoken', sessionToken);
        const response = await fetch(`https://rsapi.goong.io/Place/AutoComplete?${params}`, {
          signal: AbortSignal.timeout(7000)
        });
        const data = await response.json();
        if (!response.ok || data.status !== 'OK') throw new Error(data.error_message || data.status || `Goong ${response.status}`);
        const suggestions = (data.predictions || []).map(item => ({
          id: item.place_id,
          name: item.structured_formatting?.main_text || item.description,
          address: item.description,
          detail: item.structured_formatting?.secondary_text || item.description,
          source: 'goong'
        }));
        if (suggestions.length) return res.json({ suggestions, provider: 'Goong' });
      } catch (goongError) {
        console.warn('Goong autocomplete fallback to OSM:', goongError.message);
      }
    }

    const cacheKey = `place:${query.toLocaleLowerCase('vi')}`;
    const suggestions = await cachedMapRequest(cacheKey, 10 * 60 * 1000, async () => {
      const headers = { 'User-Agent': 'NewStarTour-TravelOps/1.0 (admin@newstartour.vn)' };
      const nominatimParams = new URLSearchParams({ q: query, format: 'jsonv2', addressdetails: '1', limit: '7', countrycodes: 'vn', dedupe: '1', 'accept-language': 'vi' });
      const photonParams = new URLSearchParams({ q: query, limit: '7', bbox: '102.14,8.18,109.47,23.4', lang: 'vi' });
      const [nominatimResult, photonResult] = await Promise.allSettled([
        fetch(`https://nominatim.openstreetmap.org/search?${nominatimParams}`, { headers, signal: AbortSignal.timeout(7000) }),
        fetch(`https://photon.komoot.io/api/?${photonParams}`, { headers, signal: AbortSignal.timeout(7000) })
      ]);

      let nominatim = [];
      if (nominatimResult.status === 'fulfilled' && nominatimResult.value.ok) {
        const data = await nominatimResult.value.json();
        nominatim = (data || []).map(item => ({
          id: `nominatim-${item.place_id}`,
          name: (item.address?.house_number && item.address?.road)
            ? `${item.address.house_number} ${item.address.road}`
            : item.name || item.display_name?.split(',')[0] || query,
          address: item.display_name || query,
          latitude: Number(item.lat),
          longitude: Number(item.lon),
          source: 'nominatim'
        }));
      }

      let photon = [];
      if (photonResult.status === 'fulfilled' && photonResult.value.ok) {
        const data = await photonResult.value.json();
        photon = (data.features || []).map((feature, index) => {
        const properties = feature.properties || {};
        const [longitude, latitude] = feature.geometry?.coordinates || [];
        const name = properties.name || properties.street || properties.city || properties.county || query;
        const address = [properties.housenumber, properties.street, properties.district, properties.city, properties.county, properties.state, properties.country]
          .filter(Boolean).filter((item, itemIndex, items) => items.indexOf(item) === itemIndex).join(', ');
          return {
          id: properties.osm_id ? `${properties.osm_type || 'osm'}-${properties.osm_id}` : `${longitude}-${latitude}-${index}`,
          name,
          address: address || name,
          latitude,
          longitude
          };
        });
      }

      const combined = [...nominatim, ...photon]
        .filter(item => Number.isFinite(item.latitude) && Number.isFinite(item.longitude));
      const unique = combined.filter((item, index, items) => items.findIndex(other =>
        other.address.toLocaleLowerCase('vi') === item.address.toLocaleLowerCase('vi')
      ) === index);

      // OSM đôi khi có tọa độ của con đường nhưng chưa có node số nhà. Cho phép
      // giữ nguyên địa chỉ người dùng nhập và dùng tọa độ gần nhất một cách rõ ràng.
      const nearest = unique[0];
      const exactInput = nearest && query.match(/\d/) ? [{
        id: `manual-${crypto.createHash('sha1').update(query).digest('hex').slice(0, 12)}`,
        name: query,
        address: query,
        detail: 'Giữ nguyên địa chỉ đã nhập · tọa độ lấy theo kết quả OSM gần nhất',
        latitude: nearest.latitude,
        longitude: nearest.longitude,
        source: 'manual'
      }] : [];
      return [...exactInput, ...unique].slice(0, 8);
    });
    return res.json({ suggestions, provider: 'OpenStreetMap' });
  } catch (error) {
    console.error('Place search error:', error.message);
    return res.status(502).json({ error: 'Dịch vụ tìm địa điểm đang bận, bạn vẫn có thể nhập địa chỉ thủ công' });
  }
});

router.get('/place-detail', async (req, res) => {
  const placeId = String(req.query.placeId || '').trim();
  const sessionToken = String(req.query.sessiontoken || '').trim();
  const goongApiKey = String(process.env.GOONG_API_KEY || '').trim();
  if (!goongApiKey) return res.status(503).json({ error: 'Goong chưa được cấu hình' });
  if (!placeId) return res.status(400).json({ error: 'Thiếu mã địa điểm' });
  try {
    const params = new URLSearchParams({ api_key: goongApiKey, place_id: placeId });
    if (sessionToken) params.set('sessiontoken', sessionToken);
    const response = await fetch(`https://rsapi.goong.io/Place/Detail?${params}`, { signal: AbortSignal.timeout(7000) });
    const data = await response.json();
    const place = data.result;
    if (!response.ok || data.status !== 'OK' || !place?.geometry?.location) {
      throw new Error(data.error_message || data.status || `Goong ${response.status}`);
    }
    return res.json({
      id: place.place_id || placeId,
      name: place.name || '',
      address: place.formatted_address || place.name || '',
      latitude: Number(place.geometry.location.lat),
      longitude: Number(place.geometry.location.lng),
      provider: 'Goong'
    });
  } catch (error) {
    console.error('Goong place detail error:', error.message);
    return res.status(502).json({ error: 'Không lấy được tọa độ chi tiết từ Goong' });
  }
});

// OSRM chỉ dùng để dựng đường xem trước. Nếu dịch vụ định tuyến tạm lỗi,
// frontend tự nối các điểm bằng đường thẳng và không ảnh hưởng dữ liệu tour.
router.get('/route-preview', async (req, res) => {
  const raw = String(req.query.coordinates || '');
  const coordinates = raw.split(';').map(pair => pair.split(',').map(Number));
  const valid = coordinates.length >= 2 && coordinates.length <= 50 && coordinates.every(pair => pair.length === 2 && pair.every(Number.isFinite));
  if (!valid) return res.status(400).json({ error: 'Danh sách tọa độ không hợp lệ' });
  try {
    const normalized = coordinates.map(([lng, lat]) => `${lng.toFixed(6)},${lat.toFixed(6)}`).join(';');
    const route = await cachedMapRequest(`route:${normalized}`, 15 * 60 * 1000, async () => {
      const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${normalized}?overview=full&geometries=geojson&steps=false`, {
        headers: { 'User-Agent': 'NewStarTour-TravelOps/1.0 (https://newstartour.vn)' },
        signal: AbortSignal.timeout(10000)
      });
      if (!response.ok) throw new Error(`OSRM ${response.status}`);
      const data = await response.json();
      if (data.code !== 'Ok' || !data.routes?.[0]?.geometry) throw new Error(data.code || 'No route');
      const selectedRoute = data.routes[0];
      return {
        geometry: selectedRoute.geometry,
        distance: selectedRoute.distance,
        duration: selectedRoute.duration,
        legs: (selectedRoute.legs || []).map(leg => ({ distance: leg.distance, duration: leg.duration }))
      };
    });
    return res.json({ ...route, provider: 'OSRM' });
  } catch (error) {
    console.error('Route preview error:', error.message);
    return res.status(502).json({ error: 'Không thể dựng đường bộ; hệ thống sẽ nối trực tiếp các điểm' });
  }
});

router.post('/carriers', requireTourOperations, async (req, res) => {
  try {
    const { name, contactName, phone, email, address, note } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Vui lòng nhập tên nhà xe' });
    const carrier = await Carrier.create({ name, contactName, phone, email, address, note, createdBy: req.user._id });
    res.status(201).json({ carrier, message: 'Đã thêm nhà xe' });
  } catch (error) {
    res.status(500).json({ error: 'Không thể thêm nhà xe' });
  }
});

router.put('/carriers/:id', requireTourOperations, async (req, res) => {
  const fields = ['name', 'contactName', 'phone', 'email', 'address', 'note', 'status'];
  const updates = {};
  fields.forEach(field => { if (req.body[field] !== undefined) updates[field] = req.body[field]; });
  const carrier = await Carrier.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
  if (!carrier) return res.status(404).json({ error: 'Không tìm thấy nhà xe' });
  res.json({ carrier, message: 'Đã cập nhật nhà xe' });
});

router.post('/vehicles', requireTourOperations, async (req, res) => {
  try {
    const { carrier, plateNumber, name, vehicleType, seatCapacity, driverName, driverPhone, note } = req.body;
    if (!carrier || !plateNumber?.trim() || !Number(seatCapacity)) {
      return res.status(400).json({ error: 'Vui lòng nhập nhà xe, biển số và số ghế' });
    }
    const vehicle = await Vehicle.create({ carrier, plateNumber, name, vehicleType, seatCapacity, driverName, driverPhone, note, createdBy: req.user._id });
    const populated = await Vehicle.findById(vehicle._id).populate('carrier', 'name phone');
    res.status(201).json({ vehicle: populated, message: 'Đã thêm phương tiện' });
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ error: 'Biển số xe đã tồn tại' });
    res.status(500).json({ error: 'Không thể thêm phương tiện' });
  }
});

router.put('/vehicles/:id', requireTourOperations, async (req, res) => {
  try {
    const fields = ['carrier', 'plateNumber', 'name', 'vehicleType', 'seatCapacity', 'driverName', 'driverPhone', 'note', 'status'];
    const updates = {};
    fields.forEach(field => { if (req.body[field] !== undefined) updates[field] = req.body[field]; });
    const vehicle = await Vehicle.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true }).populate('carrier', 'name phone');
    if (!vehicle) return res.status(404).json({ error: 'Không tìm thấy phương tiện' });
    res.json({ vehicle, message: 'Đã cập nhật phương tiện' });
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ error: 'Biển số xe đã tồn tại' });
    res.status(400).json({ error: error.message || 'Không thể cập nhật phương tiện' });
  }
});

router.post('/departures', requireTourOperations, async (req, res) => {
  try {
    const { tour, startDate, endDate, departureTime, returnTime, operationalStartAt, operationalEndAt, departurePoint, manager, assignedVehicles = [], assignedGuides = [], itineraryDays = [], note, status } = req.body;
    if (!tour || !startDate || !endDate) return res.status(400).json({ error: 'Vui lòng chọn Tour và ngày đi/về' });
    if (new Date(endDate) < new Date(startDate)) return res.status(400).json({ error: 'Ngày về không được trước ngày khởi hành' });
    if (!await Tour.exists({ _id: tour })) return res.status(404).json({ error: 'Không tìm thấy Tour mẫu' });
    const assignmentError = await validateVehicleAssignments({ assignedVehicles, startDate, endDate, departureTime, returnTime, operationalStartAt, operationalEndAt });
    if (assignmentError) return res.status(400).json({ error: assignmentError });
    const guideError = await validateGuideAssignments({ assignedGuides, startDate, endDate, departureTime, returnTime, operationalStartAt, operationalEndAt });
    if (guideError) return res.status(400).json({ error: guideError });

    const code = await generateCode('TRIP', 4);
    const departure = await TourDeparture.create({
      code, tour, startDate, endDate, departureTime, returnTime, operationalStartAt, operationalEndAt,
      departurePoint, manager: manager || null, assignedVehicles, assignedGuides, itineraryDays,
      note, status: status || 'planning', createdBy: req.user._id
    });
    const populated = await populateDeparture(TourDeparture.findById(departure._id));
    res.status(201).json({ departure: populated, message: 'Đã tạo chuyến khởi hành' });
  } catch (error) {
    res.status(400).json({ error: error.message || 'Không thể tạo chuyến' });
  }
});

router.get('/departures/:id', async (req, res) => {
  const departure = await populateDeparture(TourDeparture.findById(req.params.id));
  if (!departure) return res.status(404).json({ error: 'Không tìm thấy chuyến' });
  res.json({ departure });
});

router.get('/departures/:id/capacity', async (req, res) => {
  const departure = await TourDeparture.findById(req.params.id);
  if (!departure) return res.status(404).json({ error: 'Không tìm thấy chuyến' });
  const vehicleIds = normalizeVehicleIds(departure.assignedVehicles);
  const vehicles = await Vehicle.find({ _id: { $in: vehicleIds } }).select('plateNumber name seatCapacity');
  return res.json({ vehicles: buildCapacityOverview(departure, vehicles) });
});

router.put('/departures/:id', requireTourOperations, async (req, res) => {
  try {
    const departure = await TourDeparture.findById(req.params.id);
    if (!departure) return res.status(404).json({ error: 'Không tìm thấy chuyến' });
    const nextStart = req.body.startDate || departure.startDate;
    const nextEnd = req.body.endDate || departure.endDate;
    const nextVehicles = req.body.assignedVehicles || departure.assignedVehicles;
    const nextGuides = req.body.assignedGuides || departure.assignedGuides;
    const nextDepartureTime = req.body.departureTime || departure.departureTime;
    const nextReturnTime = req.body.returnTime || departure.returnTime;
    const nextOperationalStartAt = req.body.operationalStartAt || departure.operationalStartAt;
    const nextOperationalEndAt = req.body.operationalEndAt || departure.operationalEndAt;
    if (new Date(nextEnd) < new Date(nextStart)) return res.status(400).json({ error: 'Ngày về không được trước ngày khởi hành' });
    const assignmentError = await validateVehicleAssignments({ assignedVehicles: nextVehicles, startDate: nextStart, endDate: nextEnd, departureTime: nextDepartureTime, returnTime: nextReturnTime, operationalStartAt: nextOperationalStartAt, operationalEndAt: nextOperationalEndAt, excludeDepartureId: departure._id });
    if (assignmentError) return res.status(400).json({ error: assignmentError });
    const guideError = await validateGuideAssignments({ assignedGuides: nextGuides, startDate: nextStart, endDate: nextEnd, departureTime: nextDepartureTime, returnTime: nextReturnTime, operationalStartAt: nextOperationalStartAt, operationalEndAt: nextOperationalEndAt, excludeDepartureId: departure._id });
    if (guideError) return res.status(400).json({ error: guideError });
    const departureValue = departure.toObject();
    const passengerError = await validatePassengers({
      ...departureValue,
      assignedVehicles: nextVehicles,
      itineraryDays: req.body.itineraryDays || departure.itineraryDays
    }, departure.passengers);
    if (passengerError) return res.status(400).json({ error: passengerError });

    const fields = ['tour', 'startDate', 'endDate', 'departureTime', 'returnTime', 'operationalStartAt', 'operationalEndAt', 'actualStartAt', 'actualEndAt', 'status', 'departurePoint', 'manager', 'assignedVehicles', 'assignedGuides', 'itineraryDays', 'note'];
    fields.forEach(field => { if (req.body[field] !== undefined) departure[field] = req.body[field]; });
    await departure.save();
    const populated = await populateDeparture(TourDeparture.findById(departure._id));
    res.json({ departure: populated, message: 'Đã cập nhật chuyến' });
  } catch (error) {
    res.status(400).json({ error: error.message || 'Không thể cập nhật chuyến' });
  }
});

router.post('/departures/:id/lifecycle', requireTourOperations, async (req, res) => {
  try {
    const departure = await TourDeparture.findById(req.params.id);
    if (!departure) return res.status(404).json({ error: 'Không tìm thấy chuyến' });
    const action = String(req.body.action || '').toLowerCase();
    const transitions = {
      start: { from: ['planning', 'open', 'confirmed'], status: 'departing', field: 'actualStartAt', message: 'Đã bắt đầu chuyến' },
      complete: { from: ['departing'], status: 'completed', field: 'actualEndAt', message: 'Đã kết thúc chuyến' },
      cancel: { from: ['planning', 'open', 'confirmed', 'departing'], status: 'cancelled', field: null, message: 'Đã hủy chuyến' }
    };
    const transition = transitions[action];
    if (!transition) return res.status(400).json({ error: 'Thao tác vòng đời không hợp lệ' });
    if (!transition.from.includes(departure.status)) return res.status(400).json({ error: `Không thể chuyển chuyến từ trạng thái ${departure.status}` });
    departure.status = transition.status;
    if (transition.field) departure[transition.field] = req.body.at ? new Date(req.body.at) : new Date();
    await departure.save();
    const populated = await populateDeparture(TourDeparture.findById(departure._id));
    res.json({ departure: populated, message: transition.message });
  } catch (error) { res.status(400).json({ error: error.message || 'Không thể cập nhật trạng thái chuyến' }); }
});

router.post('/departures/:id/itinerary-days', requireTourOperations, async (req, res) => {
  try {
    const departure = await TourDeparture.findById(req.params.id);
    if (!departure) return res.status(404).json({ error: 'Không tìm thấy chuyến' });
    const { day, date, title, description, stops = [] } = req.body;
    if (!day || !title?.trim()) return res.status(400).json({ error: 'Vui lòng nhập ngày và tiêu đề lịch trình' });
    if (departure.itineraryDays.some(item => item.day === Number(day))) return res.status(400).json({ error: `Ngày ${day} đã có lịch trình` });
    departure.itineraryDays.push({ day, date, title, description, stops });
    departure.itineraryDays.sort((a, b) => a.day - b.day);
    await departure.save();
    const populated = await populateDeparture(TourDeparture.findById(departure._id));
    res.status(201).json({ departure: populated, message: 'Đã thêm lịch trình ngày' });
  } catch (error) {
    res.status(400).json({ error: error.message || 'Không thể thêm lịch trình' });
  }
});

router.put('/departures/:id/itinerary-days/:dayId', requireTourOperations, async (req, res) => {
  try {
    const departure = await TourDeparture.findById(req.params.id);
    if (!departure) return res.status(404).json({ error: 'Không tìm thấy chuyến' });
    const itineraryDay = departure.itineraryDays.id(req.params.dayId);
    if (!itineraryDay) return res.status(404).json({ error: 'Không tìm thấy ngày lịch trình' });
    const { day, date, title, description, stops = [] } = req.body;
    if (!day || !title?.trim()) return res.status(400).json({ error: 'Vui lòng nhập ngày và tiêu đề lịch trình' });
    if (departure.itineraryDays.some(item => String(item._id) !== String(itineraryDay._id) && item.day === Number(day))) {
      return res.status(400).json({ error: `Ngày ${day} đã có lịch trình` });
    }
    const retainedStopIds = new Set(stops.map(stop => String(stop._id || '')).filter(Boolean));
    const removedStopIds = itineraryDay.stops.map(stop => String(stop._id)).filter(id => !retainedStopIds.has(id));
    const usedStop = departure.passengers.find(item =>
      (item.pickupStopId && removedStopIds.includes(String(item.pickupStopId))) ||
      (item.dropoffStopId && removedStopIds.includes(String(item.dropoffStopId)))
    );
    if (usedStop) return res.status(400).json({ error: `Không thể xóa điểm đang được dùng để đón khách ${usedStop.fullName}` });
    itineraryDay.day = Number(day);
    itineraryDay.date = date || undefined;
    itineraryDay.title = title;
    itineraryDay.description = description || '';
    itineraryDay.stops = stops;
    departure.itineraryDays.sort((a, b) => a.day - b.day);
    await departure.save();
    const populated = await populateDeparture(TourDeparture.findById(departure._id));
    res.json({ departure: populated, message: 'Đã cập nhật lịch trình ngày' });
  } catch (error) {
    res.status(400).json({ error: error.message || 'Không thể cập nhật lịch trình' });
  }
});

router.delete('/departures/:id/itinerary-days/:dayId', requireTourOperations, async (req, res) => {
  try {
    const departure = await TourDeparture.findById(req.params.id);
    if (!departure) return res.status(404).json({ error: 'Không tìm thấy chuyến' });
    const itineraryDay = departure.itineraryDays.id(req.params.dayId);
    if (!itineraryDay) return res.status(404).json({ error: 'Không tìm thấy ngày lịch trình' });
    const stopIds = itineraryDay.stops.map(stop => String(stop._id));
    const usedStop = departure.passengers.find(item =>
      (item.pickupStopId && stopIds.includes(String(item.pickupStopId))) ||
      (item.dropoffStopId && stopIds.includes(String(item.dropoffStopId)))
    );
    if (usedStop) return res.status(400).json({ error: `Ngày này có điểm đón của khách ${usedStop.fullName}; hãy chuyển điểm đón trước khi xóa` });
    itineraryDay.deleteOne();
    await departure.save();
    const populated = await populateDeparture(TourDeparture.findById(departure._id));
    res.json({ departure: populated, message: 'Đã xóa ngày lịch trình' });
  } catch (error) {
    res.status(400).json({ error: error.message || 'Không thể xóa ngày lịch trình' });
  }
});

router.post('/departures/:id/passengers', requireTourOperations, async (req, res) => {
  try {
    const departure = await TourDeparture.findById(req.params.id);
    if (!departure) return res.status(404).json({ error: 'Không tìm thấy chuyến' });
    const passenger = { ...req.body, sourceTour: req.body.sourceTour || departure.tour };
    if (!passenger.fullName?.trim() || !passenger.vehicle) return res.status(400).json({ error: 'Vui lòng nhập tên khách và chọn xe' });
    if (!passenger.pickupStopId || !passenger.dropoffStopId) return res.status(400).json({ error: 'Vui lòng chọn đầy đủ điểm lên và điểm xuống xe' });
    if (passenger.sourceTour && !await Tour.exists({ _id: passenger.sourceTour })) return res.status(404).json({ error: 'Không tìm thấy Tour nguồn của hành khách' });
    if (passenger.allocationStatus === 'hold' && !passenger.holdExpiresAt) passenger.holdExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
    const nextPassengers = [...departure.passengers.map(item => item.toObject()), passenger];
    const passengerError = await validatePassengers(departure, nextPassengers);
    if (passengerError) return res.status(400).json({ error: passengerError });
    departure.passengers.push(passenger);
    await departure.save();
    const populated = await populateDeparture(TourDeparture.findById(departure._id));
    res.status(201).json({ departure: populated, message: 'Đã xếp khách lên xe' });
  } catch (error) {
    res.status(400).json({ error: error.message || 'Không thể thêm hành khách' });
  }
});

router.delete('/departures/:id/passengers/:passengerId', requireTourOperations, async (req, res) => {
  const departure = await TourDeparture.findById(req.params.id);
  if (!departure) return res.status(404).json({ error: 'Không tìm thấy chuyến' });
  const passenger = departure.passengers.id(req.params.passengerId);
  if (!passenger) return res.status(404).json({ error: 'Không tìm thấy hành khách' });
  passenger.deleteOne();
  await departure.save();
  const populated = await populateDeparture(TourDeparture.findById(departure._id));
  res.json({ departure: populated, message: 'Đã gỡ hành khách khỏi chuyến' });
});

router.put('/departures/:id/passengers/:passengerId', requireTourOperations, async (req, res) => {
  try {
    const departure = await TourDeparture.findById(req.params.id);
    if (!departure) return res.status(404).json({ error: 'Không tìm thấy chuyến' });
    const passenger = departure.passengers.id(req.params.passengerId);
    if (!passenger) return res.status(404).json({ error: 'Không tìm thấy hành khách' });
    const fields = ['booking', 'sourceTour', 'fullName', 'phone', 'idNumber', 'passengerType', 'vehicle', 'seatNumber', 'pickupStopId', 'dropoffStopId', 'pickupNote', 'dropoffNote', 'allocationStatus', 'holdExpiresAt', 'status'];
    fields.forEach(field => { if (req.body[field] !== undefined) passenger[field] = req.body[field] || null; });
    if (!passenger.pickupStopId || !passenger.dropoffStopId) return res.status(400).json({ error: 'Vui lòng chọn đầy đủ điểm lên và điểm xuống xe' });
    const passengerError = await validatePassengers(departure, departure.passengers);
    if (passengerError) return res.status(400).json({ error: passengerError });
    await departure.save();
    const populated = await populateDeparture(TourDeparture.findById(departure._id));
    res.json({ departure: populated, message: 'Đã cập nhật hành khách' });
  } catch (error) { res.status(400).json({ error: error.message || 'Không thể cập nhật hành khách' }); }
});

router.put('/departures/:id/passengers/:passengerId/movement', requireTourOperations, async (req, res) => {
  try {
    const departure = await TourDeparture.findById(req.params.id);
    const passenger = departure?.passengers.id(req.params.passengerId);
    if (!passenger) return res.status(404).json({ error: 'Không tìm thấy hành khách' });
    const action = req.body.action;
    if (action === 'board') {
      passenger.status = 'boarded'; passenger.boardedAt = new Date(); passenger.droppedOffAt = undefined;
    } else if (action === 'dropoff') {
      passenger.status = 'completed'; passenger.droppedOffAt = new Date();
    } else if (action === 'absent') {
      passenger.status = 'absent';
    } else return res.status(400).json({ error: 'Thao tác lên/xuống xe không hợp lệ' });
    await departure.save();
    return res.json({ departure: await populateDeparture(TourDeparture.findById(departure._id)), message: action === 'board' ? 'Đã xác nhận khách lên xe' : action === 'dropoff' ? 'Đã xác nhận khách xuống xe' : 'Đã đánh dấu khách vắng' });
  } catch (error) { return res.status(400).json({ error: error.message || 'Không thể cập nhật trạng thái hành khách' }); }
});

router.post('/departures/:id/attendance-sessions', requireTourOperations, async (req, res) => {
  try {
    const departure = await TourDeparture.findById(req.params.id);
    if (!departure) return res.status(404).json({ error: 'Không tìm thấy chuyến' });
    const vehicleId = String(req.body.vehicle || '');
    if (!normalizeVehicleIds(departure.assignedVehicles).includes(vehicleId)) return res.status(400).json({ error: 'Xe không thuộc chuyến này' });
    const referenceStopId = req.body.fromStopId || req.body.stopId;
    const referenceIndex = referenceStopId
      ? orderedStops(departure).findIndex(stop => String(stop._id) === String(referenceStopId))
      : -1;
    const passengers = departure.passengers.filter(item => {
      if (String(item.vehicle) !== vehicleId || !isActiveAllocation(item)) return false;
      if (referenceIndex < 0) return true;
      const range = passengerRange(departure, item);
      return range.pickupIndex <= referenceIndex && range.dropoffIndex > referenceIndex;
    });
    if (!passengers.length) return res.status(400).json({ error: 'Xe chưa có hành khách để điểm danh' });
    departure.attendanceSessions.push({
      title: String(req.body.title || '').trim(), type: req.body.type || 'custom', vehicle: vehicleId,
      day: req.body.day ? Number(req.body.day) : undefined, stopId: req.body.stopId || undefined,
      fromStopId: req.body.fromStopId || undefined, toStopId: req.body.toStopId || undefined,
      scheduledAt: req.body.scheduledAt || new Date(), note: req.body.note || '', createdBy: req.user._id,
      records: passengers.map(item => ({ passengerId: item._id, fullName: item.fullName, seatNumber: item.seatNumber || '', status: 'pending' }))
    });
    await departure.save();
    res.status(201).json({ departure: await populateDeparture(TourDeparture.findById(departure._id)), message: 'Đã tạo bảng điểm danh' });
  } catch (error) { res.status(400).json({ error: error.message || 'Không thể tạo bảng điểm danh' }); }
});

router.put('/departures/:id/attendance-sessions/:sessionId', requireTourOperations, async (req, res) => {
  try {
    const departure = await TourDeparture.findById(req.params.id);
    if (!departure) return res.status(404).json({ error: 'Không tìm thấy chuyến' });
    const session = departure.attendanceSessions.id(req.params.sessionId);
    if (!session) return res.status(404).json({ error: 'Không tìm thấy bảng điểm danh' });
    ['title', 'type', 'day', 'stopId', 'fromStopId', 'toStopId', 'scheduledAt', 'note'].forEach(field => { if (req.body[field] !== undefined) session[field] = req.body[field] || undefined; });
    await departure.save();
    res.json({ departure: await populateDeparture(TourDeparture.findById(departure._id)), message: 'Đã cập nhật bảng điểm danh' });
  } catch (error) { res.status(400).json({ error: error.message || 'Không thể cập nhật bảng điểm danh' }); }
});

router.put('/departures/:id/attendance-sessions/:sessionId/records/:recordId', requireTourOperations, async (req, res) => {
  try {
    const departure = await TourDeparture.findById(req.params.id);
    if (!departure) return res.status(404).json({ error: 'Không tìm thấy chuyến' });
    const session = departure.attendanceSessions.id(req.params.sessionId);
    const record = session?.records.id(req.params.recordId);
    if (!record) return res.status(404).json({ error: 'Không tìm thấy hành khách trong bảng điểm danh' });
    if (!['pending', 'present', 'missing', 'excused'].includes(req.body.status)) return res.status(400).json({ error: 'Trạng thái điểm danh không hợp lệ' });
    record.status = req.body.status; record.note = req.body.note ?? record.note;
    record.checkedAt = req.body.status === 'pending' ? undefined : new Date();
    record.checkedBy = req.body.status === 'pending' ? undefined : req.user._id;
    await departure.save();
    res.json({ departure: await populateDeparture(TourDeparture.findById(departure._id)), message: 'Đã lưu điểm danh' });
  } catch (error) { res.status(400).json({ error: error.message || 'Không thể lưu điểm danh' }); }
});

router.delete('/departures/:id/attendance-sessions/:sessionId', requireTourOperations, async (req, res) => {
  const departure = await TourDeparture.findById(req.params.id);
  if (!departure) return res.status(404).json({ error: 'Không tìm thấy chuyến' });
  const session = departure.attendanceSessions.id(req.params.sessionId);
  if (!session) return res.status(404).json({ error: 'Không tìm thấy bảng điểm danh' });
  session.deleteOne(); await departure.save();
  res.json({ departure: await populateDeparture(TourDeparture.findById(departure._id)), message: 'Đã xóa bảng điểm danh' });
});

router.post('/departures/:id/public-access', requireTourOperations, async (req, res) => {
  const departure = await TourDeparture.findById(req.params.id);
  if (!departure) return res.status(404).json({ error: 'Không tìm thấy chuyến' });
  if (!departure.publicAccess?.token) departure.publicAccess = { token: crypto.randomBytes(20).toString('hex'), enabled: true, createdAt: new Date() };
  else departure.publicAccess.enabled = req.body.enabled !== false;
  await departure.save();
  res.json({ token: departure.publicAccess.token, enabled: departure.publicAccess.enabled });
});

router.put('/departures/:id/live-location', requireTourOperations, async (req, res) => {
  const latitude = Number(req.body.latitude); const longitude = Number(req.body.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return res.status(400).json({ error: 'Vị trí không hợp lệ' });
  const departure = await TourDeparture.findByIdAndUpdate(req.params.id, { liveLocation: { latitude, longitude, accuracy: Number(req.body.accuracy) || 0, updatedAt: new Date(), updatedBy: req.user._id } }, { new: true });
  if (!departure) return res.status(404).json({ error: 'Không tìm thấy chuyến' });
  res.json({ liveLocation: departure.liveLocation, message: 'Đã cập nhật vị trí đoàn' });
});

router.put('/departures/:id/public-progress', requireTourOperations, async (req, res) => {
  const departure = await TourDeparture.findById(req.params.id);
  if (!departure) return res.status(404).json({ error: 'Không tìm thấy chuyến' });
  const currentDay = req.body.currentDay === '' || req.body.currentDay === null ? undefined : Number(req.body.currentDay);
  if (currentDay && !departure.itineraryDays.some(day => day.day === currentDay)) return res.status(400).json({ error: 'Ngày hành trình không tồn tại' });
  const nextStopId = req.body.nextStopId || undefined;
  if (nextStopId && !departure.itineraryDays.some(day => day.stops.some(stop => String(stop._id) === String(nextStopId)))) return res.status(400).json({ error: 'Điểm tiếp theo không thuộc hành trình' });
  departure.publicProgress = { currentDay, nextStopId, updatedAt: new Date(), updatedBy: req.user._id };
  await departure.save();
  res.json({ departure: await populateDeparture(TourDeparture.findById(departure._id)), message: currentDay ? `Đã đặt đoàn ở ngày ${currentDay}` : 'Đã chuyển về tự động theo ngày thực tế' });
});

router.post('/departures/:id/documents', requireTourOperations, (req, res, next) => {
  uploadTourDocument(req, res, error => {
    if (!error) return next();
    if (error.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'File PDF không được vượt quá 25 MB' });
    return res.status(400).json({ error: error.message || 'Không thể tải file PDF' });
  });
}, async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Vui lòng chọn file PDF' });
    const departure = await TourDeparture.findById(req.params.id);
    if (!departure) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'Không tìm thấy chuyến' });
    }

    // MIME và đuôi file có thể bị giả mạo; xác nhận thêm chữ ký PDF thực tế.
    const descriptor = fs.openSync(req.file.path, 'r');
    const signature = Buffer.alloc(5);
    fs.readSync(descriptor, signature, 0, 5, 0);
    fs.closeSync(descriptor);
    if (signature.toString() !== '%PDF-') {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Nội dung file không phải PDF hợp lệ' });
    }

    const originalName = normalizeUploadName(req.file.originalname);
    departure.programDocuments.push({
      title: String(req.body.title || originalName.replace(/\.pdf$/i, '')).trim(),
      originalName,
      storedName: req.file.filename,
      mimeType: req.file.mimetype,
      size: req.file.size,
      uploadedBy: req.user._id
    });
    await departure.save();
    const populated = await populateDeparture(TourDeparture.findById(departure._id));
    res.status(201).json({ departure: populated, message: 'Đã tải lên chương trình Tour' });
  } catch (error) {
    if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: 'Không thể lưu file chương trình Tour' });
  }
});

router.get('/departures/:id/documents/:documentId/view', async (req, res) => {
  const departure = await TourDeparture.findById(req.params.id);
  const document = departure?.programDocuments?.id(req.params.documentId);
  if (!document) return res.status(404).json({ error: 'Không tìm thấy file chương trình' });
  const filePath = path.join(UPLOAD_DIR, path.basename(document.storedName));
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File không còn tồn tại trên máy chủ' });
  res.setHeader('Content-Type', 'application/pdf');
  const safeAsciiName = document.originalName.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_');
  res.setHeader('Content-Disposition', `inline; filename="${safeAsciiName}"; filename*=UTF-8''${encodeURIComponent(document.originalName)}`);
  res.setHeader('Cache-Control', 'private, max-age=300');
  return res.sendFile(filePath);
});

router.delete('/departures/:id/documents/:documentId', requireTourOperations, async (req, res) => {
  const departure = await TourDeparture.findById(req.params.id);
  const document = departure?.programDocuments?.id(req.params.documentId);
  if (!document) return res.status(404).json({ error: 'Không tìm thấy file chương trình' });
  const filePath = path.join(UPLOAD_DIR, path.basename(document.storedName));
  document.deleteOne();
  await departure.save();
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  const populated = await populateDeparture(TourDeparture.findById(departure._id));
  res.json({ departure: populated, message: 'Đã xóa file chương trình Tour' });
});

router.delete('/departures/:id', requireTourOperations, async (req, res) => {
  const departure = await TourDeparture.findById(req.params.id);
  if (!departure) return res.status(404).json({ error: 'Không tìm thấy chuyến' });
  if (departure.passengers.length) return res.status(400).json({ error: 'Chuyến đã có hành khách; hãy chuyển sang trạng thái Hủy thay vì xóa' });
  for (const document of departure.programDocuments || []) {
    const filePath = path.join(UPLOAD_DIR, path.basename(document.storedName));
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
  await departure.deleteOne();
  res.json({ message: 'Đã xóa chuyến khởi hành' });
});

module.exports = router;
