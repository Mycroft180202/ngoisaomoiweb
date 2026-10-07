const express = require('express');
const fs = require('fs');
const path = require('path');
const TourDeparture = require('../models/TourDeparture');
const { UPLOAD_DIR } = require('../middleware/tourDocumentUpload');

const router = express.Router();

router.get('/:token', async (req, res) => {
  const departure = await TourDeparture.findOne({ 'publicAccess.token': req.params.token, 'publicAccess.enabled': true })
    .populate('tour', 'code name destination durationDays durationNights')
    .populate('manager', 'fullName')
    .populate('assignedVehicles.vehicle', 'plateNumber name vehicleType seatCapacity driverName');
  if (!departure) return res.status(404).json({ error: 'Liên kết chuyến không tồn tại hoặc đã bị tắt' });
  const vehicles = (departure.assignedVehicles || []).map(item => ({
    plateNumber: item.vehicle?.plateNumber,
    name: item.vehicle?.name,
    vehicleType: item.vehicle?.vehicleType,
    seatCapacity: item.vehicle?.seatCapacity,
    driverName: item.driverName || item.vehicle?.driverName
  }));
  res.json({ mapsApiKey: String(process.env.GOOGLE_MAPS_API_KEY || ''),
    departure: {
      code: departure.code, tour: departure.tour, startDate: departure.startDate, endDate: departure.endDate,
      departureTime: departure.departureTime, returnTime: departure.returnTime,
      actualStartAt: departure.actualStartAt, actualEndAt: departure.actualEndAt,
      status: departure.status, departurePoint: departure.departurePoint, manager: departure.manager,
      itineraryDays: departure.itineraryDays, liveLocation: departure.liveLocation, publicProgress: departure.publicProgress, vehicles,
      programDocuments: (departure.programDocuments || []).map(document => ({ _id: document._id, title: document.title, originalName: document.originalName, size: document.size }))
    }
  });
});

router.get('/:token/documents/:documentId', async (req, res) => {
  const departure = await TourDeparture.findOne({ 'publicAccess.token': req.params.token, 'publicAccess.enabled': true });
  const document = departure?.programDocuments.id(req.params.documentId);
  if (!document) return res.status(404).json({ error: 'Không tìm thấy file chương trình' });
  const filePath = path.join(UPLOAD_DIR, path.basename(document.storedName));
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File không còn trên máy chủ' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(document.originalName)}`);
  return res.sendFile(filePath);
});

router.get('/:token/route-preview', async (req, res) => {
  const exists = await TourDeparture.exists({ 'publicAccess.token': req.params.token, 'publicAccess.enabled': true });
  if (!exists) return res.status(404).json({ error: 'Liên kết chuyến không tồn tại hoặc đã bị tắt' });
  const raw = String(req.query.coordinates || '');
  const coordinates = raw.split(';').map(pair => pair.split(',').map(Number));
  const valid = coordinates.length >= 2 && coordinates.length <= 50 && coordinates.every(pair => pair.length === 2 && pair.every(Number.isFinite));
  if (!valid) return res.status(400).json({ error: 'Danh sách tọa độ không hợp lệ' });
  try {
    const normalized = coordinates.map(([lng, lat]) => `${lng.toFixed(6)},${lat.toFixed(6)}`).join(';');
    const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${normalized}?overview=false&steps=false`, {
      headers: { 'User-Agent': 'NewStarTour-TravelOps/1.0 (https://newstartour.vn)' },
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`OSRM ${response.status}`);
    const data = await response.json();
    const route = data.routes?.[0];
    if (data.code !== 'Ok' || !route) throw new Error(data.code || 'No route');
    return res.json({ distance: route.distance, duration: route.duration, legs: (route.legs || []).map(leg => ({ distance: leg.distance, duration: leg.duration })), provider: 'OSRM' });
  } catch (error) {
    console.error('Public route preview error:', error.message);
    return res.status(502).json({ error: 'Không thể tính quãng đường lúc này' });
  }
});

module.exports = router;
