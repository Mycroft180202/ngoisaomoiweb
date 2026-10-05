import Header from "../Header";
import Footer from "../Footer";
import FloatingContact from "../../ui/FloatingContact";
import CookieConsent from "../../ui/CookieConsent";
import SideAdvertisements from "../../ui/SideAdvertisements";

/** Giao diện đang chạy ổn định, được giữ riêng làm phương án quay lại. */
export default function LegacySiteFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="site-frame site-frame--legacy">
      <Header />
      {children}
      <Footer />
      <FloatingContact />
      <CookieConsent />
      <SideAdvertisements />
    </div>
  );
}
