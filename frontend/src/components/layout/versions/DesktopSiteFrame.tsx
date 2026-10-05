import FloatingContact from "../../ui/FloatingContact";
import CookieConsent from "../../ui/CookieConsent";
import SideAdvertisements from "../../ui/SideAdvertisements";
import V2DesktopHeader from "../../v2/layout/V2DesktopHeader";
import V2Footer from "../../v2/layout/V2Footer";

/** Shell V2 dành riêng cho trình duyệt desktop. */
export default function DesktopSiteFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="site-frame site-frame--v2 site-frame--desktop">
      <V2DesktopHeader />
      {children}
      <V2Footer />
      <FloatingContact />
      <CookieConsent />
      <SideAdvertisements />
    </div>
  );
}
