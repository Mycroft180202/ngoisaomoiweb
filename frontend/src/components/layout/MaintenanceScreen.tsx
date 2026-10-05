export interface MaintenanceConfig {
  enabled?: boolean;
  title?: string;
  message?: string;
  expected_end?: string;
  contact_email?: string;
}

export default function MaintenanceScreen({ config }: { config: MaintenanceConfig }) {
  return (
    <main className="maintenance-page">
      <div className="maintenance-card">
        <div className="maintenance-icon" aria-hidden="true">✦</div>
        <p className="maintenance-kicker">NEW STAR TOUR</p>
        <h1>{config.title || "Website đang được bảo trì"}</h1>
        <p>{config.message || "Chúng tôi đang nâng cấp hệ thống để phục vụ bạn tốt hơn. Vui lòng quay lại sau ít phút."}</p>
        {config.expected_end && (
          <p className="maintenance-note">Dự kiến hoạt động lại: {config.expected_end}</p>
        )}
        {config.contact_email && (
          <a className="button button-primary" href={`mailto:${config.contact_email}`}>Liên hệ hỗ trợ</a>
        )}
      </div>
    </main>
  );
}
