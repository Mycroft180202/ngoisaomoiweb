const express = require('express');
const router = express.Router();
const { requireITOrDirector } = require('../middleware/rbac');
const cloudflare = require('../services/cloudflareEmailRoutingService');

router.use(requireITOrDirector());
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const handleError = (res, error) => {
  console.error('Cloudflare Email Routing error:', error.message);
  res.status(error.status && error.status < 500 ? error.status : 502).json({ error: error.message });
};

router.get('/', async (req, res) => {
  const { domain, accountId, zoneId } = cloudflare.config();
  if (!cloudflare.isConfigured()) {
    return res.json({ configured: false, domain, hasAccountId: Boolean(accountId), hasZoneId: Boolean(zoneId), rules: [], addresses: [] });
  }
  try { res.json({ configured: true, ...(await cloudflare.getOverview()) }); }
  catch (error) { handleError(res, error); }
});

router.post('/destinations', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  if (!emailPattern.test(email)) return res.status(400).json({ error: 'Địa chỉ email đích không hợp lệ' });
  try {
    const address = await cloudflare.createDestination(email);
    res.status(201).json({ address, message: 'Đã thêm địa chỉ. Vui lòng mở email đích để xác minh với Cloudflare.' });
  } catch (error) { handleError(res, error); }
});

const validateRule = (body) => {
  const domain = cloudflare.config().domain;
  const source = String(body.customAddress || '').trim().toLowerCase();
  const destination = String(body.destinationAddress || '').trim().toLowerCase();
  if (!emailPattern.test(source) || !source.endsWith(`@${domain}`)) return `Email công ty phải thuộc tên miền @${domain}`;
  if (!emailPattern.test(destination)) return 'Email đích không hợp lệ';
  return null;
};

router.post('/rules', async (req, res) => {
  const validationError = validateRule(req.body);
  if (validationError) return res.status(400).json({ error: validationError });
  try { res.status(201).json({ rule: await cloudflare.createRule(req.body), message: 'Đã tạo routing rule trên Cloudflare' }); }
  catch (error) { handleError(res, error); }
});

router.put('/rules/:id', async (req, res) => {
  const validationError = validateRule(req.body);
  if (validationError) return res.status(400).json({ error: validationError });
  try { res.json({ rule: await cloudflare.updateRule(req.params.id, req.body), message: 'Đã cập nhật routing rule' }); }
  catch (error) { handleError(res, error); }
});

router.delete('/rules/:id', async (req, res) => {
  try { await cloudflare.deleteRule(req.params.id); res.json({ message: 'Đã xóa routing rule' }); }
  catch (error) { handleError(res, error); }
});

module.exports = router;
