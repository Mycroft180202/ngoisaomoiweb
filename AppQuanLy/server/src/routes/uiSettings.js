const express = require('express');
const CompanySetting = require('../models/CompanySetting');
const { requireSystemAdmin, isSystemAdmin } = require('../middleware/rbac');

const router = express.Router();
const SETTING_KEY = 'crm_ui_version';
const ALLOWED_VERSIONS = ['legacy', 'v2'];

const normalizeConfig = (setting) => {
  const value = setting?.value || {};
  const activeVersion = ALLOWED_VERSIONS.includes(value.activeVersion)
    ? value.activeVersion
    : 'legacy';

  return {
    activeVersion,
    availableVersions: ALLOWED_VERSIONS,
    updatedAt: value.updatedAt || setting?.updatedAt || null,
  };
};

/**
 * GET /api/ui-settings
 * Mọi tài khoản đã đăng nhập được đọc phiên bản đang áp dụng.
 * Quyền cập nhật được trả riêng để frontend không phải tự suy đoán.
 */
router.get('/', async (req, res) => {
  try {
    const setting = await CompanySetting.findOne({ key: SETTING_KEY }).lean();
    res.json({
      config: normalizeConfig(setting),
      canManage: isSystemAdmin(req.user),
    });
  } catch (error) {
    console.error('Get UI settings error:', error);
    // Fail-safe: nếu không đọc được cấu hình thì luôn dùng giao diện cũ.
    res.status(500).json({ error: 'Không thể tải cấu hình giao diện', fallbackVersion: 'legacy' });
  }
});

/**
 * PUT /api/ui-settings
 * Chỉ đúng tài khoản hệ thống `admin` được thay đổi cho toàn công ty.
 */
router.put('/', requireSystemAdmin(), async (req, res) => {
  try {
    const { activeVersion } = req.body || {};
    if (!ALLOWED_VERSIONS.includes(activeVersion)) {
      return res.status(400).json({ error: 'Phiên bản giao diện không hợp lệ' });
    }

    const updatedAt = new Date();
    const setting = await CompanySetting.findOneAndUpdate(
      { key: SETTING_KEY },
      {
        $set: {
          value: {
            activeVersion,
            updatedAt,
            updatedBy: req.user._id,
          },
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    const payload = {
      config: normalizeConfig(setting),
      canManage: true,
      message: activeVersion === 'legacy'
        ? 'Đã đưa toàn bộ hệ thống về giao diện cũ'
        : 'Đã bật giao diện V2 thử nghiệm cho toàn bộ hệ thống',
    };

    req.app.get('io')?.emit('ui:version-changed', payload.config);
    return res.json(payload);
  } catch (error) {
    console.error('Update UI settings error:', error);
    return res.status(500).json({ error: 'Không thể cập nhật phiên bản giao diện' });
  }
});

module.exports = router;
