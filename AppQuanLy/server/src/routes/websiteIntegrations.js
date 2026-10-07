const express = require('express');
const crypto = require('crypto');
const Tour = require('../models/Tour');
const User = require('../models/User');
const Booking = require('../models/Booking');
const Customer = require('../models/Customer');
const TourPartner = require('../models/TourPartner');

const router = express.Router();

const authorizeWebsite = (req, res, next) => {
  const configuredKey = process.env.WEBSITE_INTEGRATION_KEY;
  if (!configuredKey) return res.status(503).json({ error: 'WEBSITE_INTEGRATION_KEY chưa được cấu hình' });
  const supplied = (req.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!supplied || Buffer.byteLength(supplied) !== Buffer.byteLength(configuredKey) || !crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(configuredKey))) {
    return res.status(401).json({ error: 'Integration key không hợp lệ' });
  }
  next();
};

const durationNumbers = (raw, itinerary = []) => {
  const values = String(raw || '').match(/\d+/g)?.map(Number) || [];
  return {
    days: Math.max(1, values[0] || itinerary.length || 1),
    nights: Math.max(0, values[1] ?? Math.max(0, (values[0] || itinerary.length || 1) - 1))
  };
};

router.post('/tours', authorizeWebsite, async (req, res) => {
  try {
    const data = req.body?.data;
    if (!data?.tour_id || !data?.tour_code || !data?.name) return res.status(400).json({ error: 'Payload tour không hợp lệ' });
    const systemUser = await User.findOne({ username: 'admin' }) || await User.findOne({ role: 'director', status: 'active' });
    if (!systemUser) return res.status(503).json({ error: 'CRM chưa có tài khoản hệ thống để ghi nhận tour' });
    const itinerary = (data.itinerary || []).map(item => ({
      day: Math.max(1, Number(item.day) || 1), title: item.title || `Ngày ${item.day}`,
      description: item.description || '', meals: item.meals ? String(item.meals).split(',').map(v => v.trim()).filter(Boolean) : [],
      overnight: item.overnight || ''
    }));
    const duration = durationNumbers(data.duration, itinerary);
    const firstDeparture = (data.departures || []).map(item => item.date).filter(Boolean).sort()[0];
    const linkedTour = await Tour.findOne({ 'websiteSource.tourId': Number(data.tour_id) });
    const codeTour = await Tour.findOne({ code: String(data.tour_code).toUpperCase() });
    if ((linkedTour && codeTour && String(linkedTour._id) !== String(codeTour._id)) ||
        (codeTour?.websiteSource?.tourId && codeTour.websiteSource.tourId !== Number(data.tour_id))) {
      return res.status(409).json({ error: 'Mã tour đã liên kết với tour CMS khác. Cần xử lý xung đột trước khi đồng bộ.' });
    }
    const update = {
      code: String(data.tour_code).toUpperCase(), name: data.name, destination: data.destination || data.name,
      description: data.description || '', durationDays: duration.days, durationNights: duration.nights,
      'price.adult': Number(data.price?.adult) || 0, 'price.child': Number(data.price?.child) || 0,
      itinerary, images: data.images || [],
      includes: data.price_includes ? [data.price_includes] : [],
      excludes: data.price_excludes ? [data.price_excludes] : [],
      websiteSource: {
        tourId: Number(data.tour_id), slug: data.slug || '', documentUrl: data.document_url || '',
        isInternational: Boolean(data.is_international), infantPrice: Number(data.price?.infant) || 0,
        promotionPrice: Number(data.price?.promotion) || 0, thumbnail: data.thumbnail || data.images?.[0] || '',
        snapshot: data, departures: data.departures || [], lastSyncedAt: new Date()
      }
    };
    const tour = await Tour.findOneAndUpdate(
      linkedTour || codeTour ? { _id: (linkedTour || codeTour)._id } : { 'websiteSource.tourId': Number(data.tour_id) },
      { $set: update, $setOnInsert: {
        createdBy: systemUser._id, status: data.is_active ? 'active' : 'draft', departureDate: firstDeparture || null,
        maxGuests: Math.max(1, ...((data.departures || []).map(item => Number(item.max_capacity) || 0)), 30)
      } }, { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
    );
    res.json({ tour_id: String(tour._id), code: tour.code, status: 'synced' });
  } catch (error) {
    console.error('Website tour integration error:', error);
    res.status(500).json({ error: error.message || 'Không thể đồng bộ tour' });
  }
});

router.post('/bookings', authorizeWebsite, async (req, res) => {
  try {
    const data = req.body?.data;
    if (!data?.booking_id || !data?.booking_code || !data?.tour_code) return res.status(400).json({ error: 'Payload booking không hợp lệ' });
    const systemUser = await User.findOne({ username: 'admin' }) || await User.findOne({ role: 'director', status: 'active' });
    const tour = await Tour.findOne({ code: String(data.tour_code).toUpperCase() });
    if (!systemUser || !tour) return res.status(409).json({ error: 'Cần đồng bộ tour trước khi đồng bộ booking' });
    const customerData = data.customer || {};
    let customer = await Customer.findOne({ $or: [{ phone: customerData.phone || '__none__' }, { email: customerData.email || '__none__' }] });
    if (!customer) customer = new Customer({
      code: `WEB-${String(data.booking_id).padStart(6, '0')}`, name: customerData.full_name || 'Khách website',
      phone: customerData.phone || `WEB-${data.booking_id}`, email: customerData.email || '', source: 'website', status: 'booked', createdBy: systemUser._id
    });
    else Object.assign(customer, { name: customerData.full_name || customer.name, email: customerData.email || customer.email, status: 'booked' });
    await customer.save();
    const mappedStatus = data.booking_status === 'cancelled' ? 'cancelled' : data.payment_status === 'paid' ? 'paid' : data.booking_status === 'confirmed' ? 'confirmed' : 'pending';
    const partner = data.partner_code ? await TourPartner.findOne({ code: String(data.partner_code).toUpperCase(), status: 'active' }) : null;
    const guestCount = Math.max(1, Number(data.passenger_counts?.total) || (Number(data.passenger_counts?.adults) || 1) + (Number(data.passenger_counts?.children) || 0) + (Number(data.passenger_counts?.infants) || 0));
    const partnerCommission = partner ? partner.commissionPerDay * tour.durationDays * guestCount : 0;
    const booking = await Booking.findOneAndUpdate(
      { code: String(data.booking_code).toUpperCase() },
      { $set: { tour: tour._id, customerName: customerData.full_name, customerPhone: customerData.phone, customerEmail: customerData.email,
        adults: Math.max(1, Number(data.passenger_counts?.adults) || 1), children: Number(data.passenger_counts?.children) || 0,
        infants: Number(data.passenger_counts?.infants) || 0,
        totalPrice: Number(data.quoted_total) || 0, status: mappedStatus, note: data.notes || '', partner: partner?._id || null, partnerCommission,
        websiteSource: {
          bookingId: Number(data.booking_id), bookingCode: String(data.booking_code).toUpperCase(),
          departureId: data.departure_id, departureCode: data.departure_code, departureDate: data.departure_date,
          bookingStatus: data.booking_status, paymentStatus: data.payment_status,
          discountCode: data.discount_code, discountAmount: Number(data.discount_amount) || 0, lastSyncedAt: new Date()
        }
      }, $setOnInsert: { createdBy: systemUser._id } },
      { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
    );
    res.json({ booking_id: String(booking._id), customer_id: String(customer._id), status: 'synced' });
  } catch (error) {
    console.error('Website booking integration error:', error);
    res.status(500).json({ error: error.message || 'Không thể đồng bộ booking' });
  }
});

module.exports = router;
