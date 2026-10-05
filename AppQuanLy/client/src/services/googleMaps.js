import api from './api';

let loaderPromise;
const authFailureListeners = new Set();

window.gm_authFailure = () => {
  authFailureListeners.forEach(listener => listener(new Error('Google Maps từ chối API key hoặc domain hiện tại')));
};

export const onGoogleMapsAuthFailure = listener => {
  authFailureListeners.add(listener);
  return () => authFailureListeners.delete(listener);
};

export const loadGoogleMaps = () => {
  if (window.google?.maps) return Promise.resolve(window.google.maps);
  if (loaderPromise) return loaderPromise;

  loaderPromise = api.get('/tour-operations/map-config').then(config => {
    if (!config?.enabled || !config.apiKey) throw new Error('Google Maps chưa được cấu hình');
    return new Promise((resolve, reject) => {
      const callback = `initTravelGoogleMaps_${Date.now()}`;
      const script = document.createElement('script');
      let settled = false;
      const finishError = error => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeout);
        delete window[callback];
        unsubscribeAuthFailure();
        script.remove();
        reject(error);
      };
      const timeout = window.setTimeout(() => finishError(new Error('Google Maps tải quá lâu')), 12000);
      const unsubscribeAuthFailure = onGoogleMapsAuthFailure(error => finishError(error));
      window[callback] = () => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeout);
        delete window[callback];
        unsubscribeAuthFailure();
        resolve(window.google.maps);
      };
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(config.apiKey)}&v=weekly&loading=async&libraries=places&language=vi&region=VN&auth_referrer_policy=origin&callback=${callback}`;
      script.async = true;
      script.onerror = () => finishError(new Error('Không tải được Google Maps'));
      document.head.appendChild(script);
    });
  }).catch(error => {
    loaderPromise = null;
    throw error;
  });
  return loaderPromise;
};
