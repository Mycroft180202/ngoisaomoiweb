import { useEffect, useState } from 'react';

const TOUCH_BREAKPOINT = '(max-width: 1023px)';

const getViewportMode = () => {
  if (typeof window === 'undefined') return 'desktop';
  return window.matchMedia(TOUCH_BREAKPOINT).matches ? 'touch' : 'desktop';
};

/**
 * Phan loai shell giao dien thay vi de tung trang tu suy doan kich thuoc man hinh.
 * Touch gom dien thoai va tablet; desktop dung shell rieng.
 */
export default function useViewportMode() {
  const [viewportMode, setViewportMode] = useState(getViewportMode);

  useEffect(() => {
    const mediaQuery = window.matchMedia(TOUCH_BREAKPOINT);
    const handleChange = () => setViewportMode(mediaQuery.matches ? 'touch' : 'desktop');

    handleChange();
    mediaQuery.addEventListener?.('change', handleChange);
    return () => mediaQuery.removeEventListener?.('change', handleChange);
  }, []);

  useEffect(() => {
    document.body.dataset.viewportMode = viewportMode;
  }, [viewportMode]);

  return viewportMode;
}
