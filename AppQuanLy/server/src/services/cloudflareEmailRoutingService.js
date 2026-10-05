const API_BASE = 'https://api.cloudflare.com/client/v4';

const config = () => ({
  token: process.env.CLOUDFLARE_API_TOKEN || '',
  accountId: process.env.CLOUDFLARE_ACCOUNT_ID || '',
  zoneId: process.env.CLOUDFLARE_ZONE_ID || '',
  domain: (process.env.CLOUDFLARE_EMAIL_DOMAIN || 'newstartour.vn').toLowerCase()
});

const isConfigured = () => {
  const value = config();
  return Boolean(value.token && value.accountId && value.zoneId);
};

async function request(path, options = {}) {
  const { token } = config();
  if (!isConfigured()) throw new Error('Cloudflare Email Routing chưa được cấu hình trên server');
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.success === false) {
    const message = payload.errors?.map((item) => item.message).filter(Boolean).join('; ')
      || `Cloudflare API trả về HTTP ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }
  return payload.result;
}

const getOverview = async () => {
  const { accountId, zoneId, domain } = config();
  const [settingsResult, rules, addresses] = await Promise.all([
    request(`/zones/${zoneId}/email/routing`)
      .then((settings) => ({ settings, accessible: true }))
      .catch(() => ({ settings: { status: 'unknown' }, accessible: false })),
    request(`/zones/${zoneId}/email/routing/rules?per_page=200`),
    request(`/accounts/${accountId}/email/routing/addresses?per_page=200`)
  ]);
  return {
    domain,
    settings: settingsResult.settings,
    settingsAccessible: settingsResult.accessible,
    rules,
    addresses
  };
};

const createDestination = (email) => {
  const { accountId } = config();
  return request(`/accounts/${accountId}/email/routing/addresses`, { method: 'POST', body: JSON.stringify({ email }) });
};

const ruleBody = ({ name, customAddress, destinationAddress, enabled = true }) => ({
  name, enabled,
  matchers: [{ type: 'literal', field: 'to', value: customAddress }],
  actions: [{ type: 'forward', value: [destinationAddress] }]
});

const createRule = (data) => {
  const { zoneId } = config();
  return request(`/zones/${zoneId}/email/routing/rules`, { method: 'POST', body: JSON.stringify(ruleBody(data)) });
};

const updateRule = (id, data) => {
  const { zoneId } = config();
  return request(`/zones/${zoneId}/email/routing/rules/${id}`, { method: 'PUT', body: JSON.stringify(ruleBody(data)) });
};

const deleteRule = (id) => {
  const { zoneId } = config();
  return request(`/zones/${zoneId}/email/routing/rules/${id}`, { method: 'DELETE' });
};

module.exports = { config, isConfigured, getOverview, createDestination, createRule, updateRule, deleteRule };
