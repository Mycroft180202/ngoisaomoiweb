import FloatingContact from "../../ui/FloatingContact";
import CookieConsent from "../../ui/CookieConsent";
import SideAdvertisements from "../../ui/SideAdvertisements";
import V2TouchHeader from "../../v2/layout/V2TouchHeader";
import V2Footer from "../../v2/layout/V2Footer";

/** Shell V2 dành riêng cho điện thoại và tablet. */
export default function TouchSiteFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="site-frame site-frame--v2 site-frame--touch">
      <V2TouchHeader />
      {children}
      <V2Footer />
      <FloatingContact />
      <CookieConsent />
      <SideAdvertisements />
    </div>
  );
}
