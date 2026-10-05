import LegacyMainLayout from './LegacyMainLayout';
import DesktopAppLayout from '../../layouts/desktop/DesktopAppLayout';
import TouchAppLayout from '../../layouts/touch/TouchAppLayout';
import useViewportMode from '../../hooks/useViewportMode';
import { useUiVersion } from '../../contexts/UiVersionContext';

export default function MainLayout() {
  const { uiVersion, loadingUiVersion } = useUiVersion();
  const viewportMode = useViewportMode();

  if (loadingUiVersion) {
    return (
      <div className="ui-version-loading" role="status" aria-label="Dang tai giao dien">
        <div className="loading-spinner" />
      </div>
    );
  }

  if (uiVersion !== 'v2') return <LegacyMainLayout />;
  return viewportMode === 'touch' ? <TouchAppLayout /> : <DesktopAppLayout />;
}
