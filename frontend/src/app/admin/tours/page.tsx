"use client";


import { appToast, appConfirm } from "@/components/ui/AppDialogProvider";
import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

interface Itinerary {
  id?: number;
  day: number;
  title: string;
  title_en?: string;
  icon?: string;
  sort_order?: number;
  content: string;
  meals?: string;
  overnight?: string;
}

interface TourImage {
  id?: number;
  url: string;
  image_type: string;
  is_primary: boolean;
  order_index: number;
}

interface AccommodationPrice {
  hotel_stars: number;
  room_type: string;
  guests_per_room: number;
  adult_price: number;
  child_price: number;
  single_supplement: number;
}

interface Tour {
  id: number;
  created_by_id?: number | null;
  tour_code?: string;
  crm_tour_id?: string;
  slug: string;
  title: string;
  title_en?: string;
  description: string;
  image: string;
  price: number;
  duration: string;
  rating: number;
  reviews_count: number;
  location: string;
  category: string;
  region: string;
  is_featured: boolean;
  is_international: boolean;
  group_discount: number;
  departure_point_id?: number | null;
  destination_domestic_id?: number | null;
  destination_foreign_id?: number | null;
  province_id?: number | null;
  country_id?: number | null;
  duration_id?: number | null;
  category_id?: number | null;
  guide_id?: number | null;
  departure_point?: any;
  is_daily: boolean;
  price_daily: number;
  price_promo_daily: number;
  custom_departures: { date: string; price: number; promo_price: number }[];
  price_child: number;
  price_infant: number;
  user_discount_percent: number;
  is_promo: boolean;
  is_active: boolean;
  sort_order: number;
  schedule_title?: string;
  schedule_title_en?: string;
  schedule_icon?: string;
  document_url?: string;
  notes?: string;
  min_group_size?: number;
  price_includes?: string;
  price_excludes?: string;
  cancellation_policy?: string;
  payment_terms?: string;
  important_note?: string;
  accommodation_prices?: AccommodationPrice[];
  itinerary: Itinerary[];
  images?: TourImage[];
  tags?: any[];
  guides?: any[];
  categories?: any[];
}

function RichTextToolbar({ onInsert }: { onInsert: (start: string, end?: string) => void }) {
  const [imageUrlDialog, setImageUrlDialog] = useState(false);
  const [toolbarImageUrl, setToolbarImageUrl] = useState("");
  const btnStyle = {
    padding: "0.25rem 0.5rem",
    background: "white",
    border: "1px solid #cbd5e1",
    borderRadius: "0.375rem",
    cursor: "pointer",
    fontSize: "0.8rem",
    fontWeight: 600,
    color: "#475569",
    display: "inline-flex",
    alignItems: "center",
    gap: "0.25rem"
  };

  return (
    <div style={{
      display: "flex",
      gap: "0.25rem",
      background: "#f1f5f9",
      padding: "0.4rem",
      borderTopLeftRadius: "0.5rem",
      borderTopRightRadius: "0.5rem",
      border: "1px solid #cbd5e1",
      borderBottom: "none",
      flexWrap: "wrap"
    }}>
      <button type="button" onClick={() => onInsert("<b>", "</b>")} style={btnStyle} title="Bold"><b>B</b></button>
      <button type="button" onClick={() => onInsert("<i>", "</i>")} style={btnStyle} title="Italic"><i>I</i></button>
      <button type="button" onClick={() => onInsert("<u>", "</u>")} style={btnStyle} title="Underline"><u>U</u></button>
      <button type="button" onClick={() => onInsert("<h1>", "</h1>")} style={btnStyle} title="Heading 1">H1</button>
      <button type="button" onClick={() => onInsert("<h2>", "</h2>")} style={btnStyle} title="Heading 2">H2</button>
      <button type="button" onClick={() => onInsert("<p>", "</p>")} style={btnStyle} title="Paragraph">P</button>
      <button type="button" onClick={() => onInsert("<ul>\n  <li>", "</li>\n</ul>")} style={btnStyle} title="Bullet List">• List</button>
      <button type="button" onClick={() => onInsert('<a href="" target="_blank">', "</a>")} style={btnStyle} title="Link">🔗 Link</button>
      <button type="button" onClick={() => onInsert("<br/>")} style={btnStyle} title="Line Break">↵ Break</button>
      <button type="button" onClick={() => { setToolbarImageUrl(""); setImageUrlDialog(true); }} style={btnStyle} title="Image">🖼️ Image</button>
      <button type="button" onClick={() => onInsert('<div style="background:#f8fafc; border-left:4px solid #3b82f6; padding:0.75rem; border-radius:0.25rem;">', '</div>')} style={btnStyle} title="Note Block">📝 Note</button>
      {imageUrlDialog && <div className="app-dialog-backdrop" onMouseDown={e => e.target === e.currentTarget && setImageUrlDialog(false)}><form className="app-confirm-dialog" onSubmit={e => { e.preventDefault(); if (toolbarImageUrl.trim()) onInsert(`<img src="${toolbarImageUrl.trim()}" alt="image" style="max-width:100%; height:auto; border-radius:0.5rem;"/>`); setImageUrlDialog(false); }}><div className="app-confirm-dialog__icon">🖼️</div><h3>Chèn hình ảnh</h3><p>Nhập đường dẫn công khai của hình ảnh cần chèn.</p><input autoFocus type="url" value={toolbarImageUrl} onChange={e => setToolbarImageUrl(e.target.value)} placeholder="https://example.com/image.jpg" style={{width:"100%",padding:"11px 13px",border:"1px solid #cfd9e6",borderRadius:10,marginBottom:18}} required/><div><button type="button" className="app-confirm-dialog__cancel" onClick={() => setImageUrlDialog(false)}>Hủy</button><button type="submit" className="app-confirm-dialog__accept">Chèn ảnh</button></div></form></div>}
    </div>
  );
}

function CurrencyInput({ value, onChange, style, placeholder }: { value: number; onChange: (value: number) => void; style?: React.CSSProperties; placeholder?: string }) {
  return <input
    type="text"
    inputMode="numeric"
    value={new Intl.NumberFormat("vi-VN").format(Number(value) || 0)}
    placeholder={placeholder}
    onFocus={(e) => e.currentTarget.select()}
    onChange={(e) => {
      const digits = e.target.value.replace(/\D/g, "");
      onChange(digits ? Number(digits) : 0);
    }}
    style={style}
  />;
}

function ToursManagerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Data states
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncingCrm, setSyncingCrm] = useState(false);
  const [crmMessage, setCrmMessage] = useState("");
  const [currentRole, setCurrentRole] = useState("");
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  // Filters & Search (Screenshot 1 alignment)
  const [searchTerm, setSearchTerm] = useState("");
  const [departureFilter, setDepartureFilter] = useState("");
  const [destinationFilter, setDestinationFilter] = useState("");
  const [intlFilter, setIntlFilter] = useState(""); // all, domestic, international
  const [statusFilter, setStatusFilter] = useState(""); // all, active, inactive
  const [sortField, setSortField] = useState("id");
  const [sortDirection, setSortDirection] = useState("desc");

  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editTourId, setEditTourId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"info" | "other" | "seo">("info");

  // Tab 1: Thông tin
  const [title, setTitle] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [slug, setSlug] = useState("");
  const [isInternational, setIsInternational] = useState(false);
  const [provinceId, setProvinceId] = useState<number | "">("");
  const [countryId, setCountryId] = useState<number | "">("");
  const [durationId, setDurationId] = useState<number | "">("");
  const [durationStr, setDurationStr] = useState("");
  const [region, setRegion] = useState("Miền Bắc");
  const [locationStr, setLocationStr] = useState("");
  const [notes, setNotes] = useState("");
  
  // Tab 1: Many-to-many Search/Checkbox
  const [guideSearch, setGuideSearch] = useState("");
  const [categorySearch, setCategorySearch] = useState("");
  const [selectedGuideIds, setSelectedGuideIds] = useState<number[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);

  // Tab 2: Thông tin khác
  const [groupDiscount, setGroupDiscount] = useState(0);
  const [departurePointId, setDeparturePointId] = useState<number | "">("");
  const [destinationDomesticId, setDestinationDomesticId] = useState<number | "">("");
  const [destinationForeignId, setDestinationForeignId] = useState<number | "">("");
  const [isDaily, setIsDaily] = useState(false);
  const [priceDaily, setPriceDaily] = useState(0);
  const [pricePromoDaily, setPricePromoDaily] = useState(0);
  
  // Custom Departures Builder
  const [customDate, setCustomDate] = useState("");
  const [customPrice, setCustomPrice] = useState(0);
  const [customPromoPrice, setCustomPromoPrice] = useState(0);
  const [customDepartures, setCustomDepartures] = useState<{ date: string; price: number; promo_price: number }[]>([]);
  const [departureType, setDepartureType] = useState<"daily" | "weekly" | "custom">("custom");
  const [recurringDays, setRecurringDays] = useState<number[]>([]);

  const [priceChild, setPriceChild] = useState(0);
  const [priceInfant, setPriceInfant] = useState(0);
  const [baseAdultPrice, setBaseAdultPrice] = useState(0);
  const [minGroupSize, setMinGroupSize] = useState(1);
  const [priceIncludes, setPriceIncludes] = useState("");
  const [priceExcludes, setPriceExcludes] = useState("");
  const [cancellationPolicy, setCancellationPolicy] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [importantNote, setImportantNote] = useState("");
  const [accommodationPrices, setAccommodationPrices] = useState<AccommodationPrice[]>([]);
  const [userDiscountPercent, setUserDiscountPercent] = useState(0);
  const [isPromo, setIsPromo] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [sortOrder, setSortOrder] = useState(0);

  // Tab 3: Cấu hình SEO & Lịch trình
  const [scheduleTitle, setScheduleTitle] = useState("");
  const [scheduleTitleEn, setScheduleTitleEn] = useState("");
  const [scheduleIcon, setScheduleIcon] = useState("");
  const [documentUrl, setDocumentUrl] = useState("");
  const [image, setImage] = useState(""); // Banner
  const [galleryList, setGalleryList] = useState<{ url: string; is_primary: boolean; order_index: number }[]>([]);
  const [description, setDescription] = useState("");
  const [itineraryList, setItineraryList] = useState<Itinerary[]>([]);
  const [expandedDays, setExpandedDays] = useState<{ [key: number]: boolean }>({ 0: true });

  // Upload progress states
  const [uploading, setUploading] = useState(false);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [iconUploading, setIconUploading] = useState(false);
  const [documentUploading, setDocumentUploading] = useState(false);
  const [qrModalData, setQrModalData] = useState<{ url: string; title: string } | null>(null);
  const [dayIconUploading, setDayIconUploading] = useState<{ [key: number]: boolean }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Relationship source lists
  const [countriesList, setCountriesList] = useState<any[]>([]);
  const [provincesList, setProvincesList] = useState<any[]>([]);
  const [durationsList, setDurationsList] = useState<any[]>([]);
  const [categoriesList, setCategoriesList] = useState<any[]>([]);
  const [guidesList, setGuidesList] = useState<any[]>([]);
  const [tagsList, setTagsList] = useState<any[]>([]);

  const descTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const dayTextareaRefs = useRef<{ [key: number]: HTMLTextAreaElement | null }>({});

  useEffect(() => {
    fetchTours();
    fetchRelationships();
    const token = localStorage.getItem("admin_token");
    fetch("http://localhost:8000/api/auth/me", { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.ok ? res.json() : null).then(user => {
        setCurrentRole(user?.role || "");
        setCurrentUserId(typeof user?.id === "number" ? user.id : null);
      });
    const action = searchParams.get("action");
    if (action === "add") {
      handleOpenAddForm();
    }
  }, [searchParams]);

  const fetchRelationships = async () => {
    try {
      const [countriesRes, provincesRes, durationsRes, categoriesRes, guidesRes, tagsRes] = await Promise.all([
        fetch("http://localhost:8000/api/countries/"),
        fetch("http://localhost:8000/api/provinces/"),
        fetch("http://localhost:8000/api/durations/"),
        fetch("http://localhost:8000/api/categories/"),
        fetch("http://localhost:8000/api/guides/"),
        fetch("http://localhost:8000/api/tags/")
      ]);

      if (countriesRes.ok) setCountriesList(await countriesRes.json());
      if (provincesRes.ok) setProvincesList(await provincesRes.json());
      if (durationsRes.ok) setDurationsList(await durationsRes.json());
      if (categoriesRes.ok) setCategoriesList(await categoriesRes.json());
      if (guidesRes.ok) setGuidesList(await guidesRes.json());
      if (tagsRes.ok) setTagsList(await tagsRes.json());
    } catch (err) {
      console.error("Lỗi tải thông tin liên kết:", err);
    }
  };

  const fetchTours = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("admin_token");
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch("http://localhost:8000/api/tours/?include_inactive=true", {
        headers
      });
      if (!res.ok) throw new Error("Không thể tải danh sách tour.");
      const data = await res.json();
      setTours(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Đã xảy ra lỗi.");
    } finally {
      setLoading(false);
    }
  };

  const handleSyncAllToCrm = async () => {
    if (!await appConfirm(`Đồng bộ ${tours.length} tour hiện tại sang CRM? Tour trùng mã sẽ được cập nhật, không tạo bản sao.`)) return;
    setSyncingCrm(true); setCrmMessage("");
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch("http://localhost:8000/api/tours/sync-crm/all", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Không thể đồng bộ CRM");
      setCrmMessage(`Đã đồng bộ ${data.synced}/${data.total} tour${data.failed ? `, lỗi ${data.failed}` : ""}.`);
      await fetchTours();
    } catch (err) { setCrmMessage(err instanceof Error ? err.message : "Không thể đồng bộ CRM"); }
    finally { setSyncingCrm(false); }
  };

  const handleOpenAddForm = () => {
    setEditTourId(null);
    setActiveTab("info");
    setTitle("");
    setTitleEn("");
    setSlug("");
    setIsInternational(false);
    setProvinceId("");
    setLocationStr("");
    setNotes("");
    setCountryId("");
    setDurationId("");
    setDurationStr("");
    setRegion("Miền Bắc");
    
    setSelectedGuideIds([]);
    setSelectedCategoryIds([]);
    setSelectedTagIds([]);

    setGroupDiscount(0);
    setDeparturePointId("");
    setDestinationDomesticId("");
    setDestinationForeignId("");
    setIsDaily(false);
    setPriceDaily(0);
    setPricePromoDaily(0);
    setCustomDepartures([]);
    setDepartureType("custom");
    setRecurringDays([]);
    setPriceChild(0);
    setPriceInfant(0);
    setBaseAdultPrice(0);
    setMinGroupSize(1);
    setPriceIncludes("");
    setPriceExcludes("");
    setCancellationPolicy("");
    setPaymentTerms("");
    setImportantNote("");
    setAccommodationPrices([]);
    setUserDiscountPercent(0);
    setIsPromo(false);
    setIsActive(true);
    setIsFeatured(false);
    setSortOrder(0);

    setScheduleTitle("");
    setScheduleTitleEn("");
    setScheduleIcon("");
    setImage("");
    setGalleryList([]);
    setDescription("");
    setItineraryList([{ day: 1, title: "Khởi hành", title_en: "", icon: "", sort_order: 1, content: "" }]);
    setExpandedDays({ 0: true });

    setFormError(null);
    setFormSuccess(null);
    setIsFormOpen(true);
  };

  const handleOpenSaleDemo = () => {
    handleOpenAddForm();
    setTitle("[TOUR MẪU] Hà Nội – Hạ Long 2 ngày 1 đêm");
    setTitleEn("Demo Hanoi – Ha Long 2 Days 1 Night");
    setSlug(`tour-mau-ha-noi-ha-long-${Date.now().toString().slice(-6)}`);
    setDurationStr("2 ngày 1 đêm");
    setRegion("Miền Bắc");
    setLocationStr("Hạ Long, Quảng Ninh");
    setBaseAdultPrice(3500000);
    setPriceChild(2800000);
    setPriceInfant(500000);
    setMinGroupSize(10);
    setGroupDiscount(200000);
    setDescription("Tour mẫu giúp nhân viên Sale hình dung cách nhập nội dung giới thiệu, giá bán và lịch trình. Hãy thay toàn bộ thông tin mẫu trước khi kích hoạt Tour.");
    setPriceIncludes("Xe du lịch theo chương trình\nKhách sạn tiêu chuẩn 3 sao\n03 bữa chính và 01 bữa sáng\nVé tham quan theo lịch trình\nHướng dẫn viên và bảo hiểm du lịch");
    setPriceExcludes("Chi phí cá nhân\nĐồ uống ngoài chương trình\nThuế VAT\nPhụ thu phòng đơn");
    setCancellationPolicy("Hủy trước 15 ngày: miễn phí. Hủy từ 7–14 ngày: 30% giá Tour. Hủy dưới 7 ngày: 70% giá Tour.");
    setPaymentTerms("Đặt cọc 50% sau khi xác nhận. Thanh toán phần còn lại trước ngày khởi hành 7 ngày.");
    setImportantNote("ĐÂY LÀ TOUR MẪU. Nhân viên phải kiểm tra giá, lịch trình, dịch vụ và xóa chữ TOUR MẪU trước khi kích hoạt.");
    setIsActive(false);
    setIsFeatured(false);
    setIsPromo(false);
    setItineraryList([
      { day: 1, title: "Hà Nội – Hạ Long", content: "06:30 đón khách tại Hà Nội. Di chuyển đến Hạ Long, ăn trưa, nhận phòng và tham quan Vịnh Hạ Long.", meals: "Trưa, Tối", overnight: "Hạ Long", sort_order: 1 },
      { day: 2, title: "Hạ Long – Hà Nội", content: "Ăn sáng tại khách sạn, tự do tham quan. Trả phòng, ăn trưa và trở về Hà Nội.", meals: "Sáng, Trưa", overnight: "", sort_order: 2 }
    ]);
    setExpandedDays({ 0: true, 1: true });
    setActiveTab("info");
    setFormError(null);
    appToast("Đã nạp Tour mẫu. Hãy thay thông tin mẫu trước khi lưu.", "success");
  };

  const handleOpenEditForm = (tour: Tour) => {
    setEditTourId(tour.id);
    setActiveTab("info");
    setTitle(tour.title || "");
    setTitleEn(tour.title_en || "");
    setSlug(tour.slug || "");
    setIsInternational(tour.is_international || false);
    setProvinceId(tour.province_id || "");
    setLocationStr(tour.location || "");
    setNotes(tour.notes || "");
    setCountryId(tour.country_id || "");
    setDurationId(tour.duration_id || "");
    setDurationStr(tour.duration || "");
    setRegion(tour.region || "Miền Bắc");

    setSelectedGuideIds(tour.guides ? tour.guides.map((g) => g.id) : []);
    setSelectedCategoryIds(tour.categories ? tour.categories.map((c) => c.id) : []);
    setSelectedTagIds(tour.tags ? tour.tags.map((t) => t.id) : []);

    setGroupDiscount(tour.group_discount || 0);
    setDeparturePointId(tour.departure_point_id || "");
    setDestinationDomesticId(tour.destination_domestic_id || "");
    setDestinationForeignId(tour.destination_foreign_id || "");
    setIsDaily(tour.is_daily || false);
    setPriceDaily(tour.price_daily || 0);
    setPricePromoDaily(tour.price_promo_daily || 0);
    setCustomDepartures(tour.custom_departures || []);

    const rDays = (tour as any).recurring_days || [];
    setRecurringDays(rDays);
    if (tour.is_daily) {
      setDepartureType("daily");
    } else if (rDays.length > 0) {
      setDepartureType("weekly");
    } else {
      setDepartureType("custom");
    }
    setPriceChild(tour.price_child || 0);
    setPriceInfant(tour.price_infant || 0);
    setBaseAdultPrice(tour.price || 0);
    setMinGroupSize(tour.min_group_size || 1);
    setPriceIncludes(tour.price_includes || "");
    setPriceExcludes(tour.price_excludes || "");
    setCancellationPolicy(tour.cancellation_policy || "");
    setPaymentTerms(tour.payment_terms || "");
    setImportantNote(tour.important_note || "");
    setAccommodationPrices(tour.accommodation_prices || []);
    setUserDiscountPercent(tour.user_discount_percent || 0);
    setIsPromo(tour.is_promo || false);
    setIsActive(tour.is_active !== undefined ? tour.is_active : true);
    setIsFeatured(tour.is_featured || false);
    setSortOrder(tour.sort_order || 0);

    setScheduleTitle(tour.schedule_title || "");
    setScheduleTitleEn(tour.schedule_title_en || "");
    setScheduleIcon(tour.schedule_icon || "");
    setDocumentUrl(tour.document_url || "");
    setImage(tour.image || "");
    
    const rawImages = tour.images || [];
    const galleryImgs = rawImages
      .filter((img) => img.image_type === "gallery")
      .map((img) => ({
        url: img.url,
        is_primary: img.is_primary,
        order_index: img.order_index
      }));
    setGalleryList(galleryImgs);
    setDescription(tour.description || "");
    
    const sortedItinerary = tour.itinerary
      ? [...tour.itinerary].sort((a, b) => (a.sort_order || a.day) - (b.sort_order || b.day))
      : [];
    setItineraryList(sortedItinerary);
    
    // Expand the first day by default
    const expanded: { [key: number]: boolean } = {};
    sortedItinerary.forEach((_, idx) => {
      expanded[idx] = idx === 0;
    });
    setExpandedDays(expanded);

    setFormError(null);
    setFormSuccess(null);
    setIsFormOpen(true);
  };

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!editTourId) {
      const generatedSlug = val
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[đĐ]/g, "d")
        .replace(/[^a-z0-9\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-");
      setSlug(generatedSlug);
    }
  };

  // Inline switches updates (modern list table view)
  const handleToggleField = async (tourId: number, field: "is_international" | "is_promo" | "is_active", currentValue: boolean) => {
    const token = localStorage.getItem("admin_token");
    if (!token) return;
    try {
      const res = await fetch(`http://localhost:8000/api/tours/${tourId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ [field]: !currentValue }),
      });
      if (res.ok) {
        setTours((prev) =>
          prev.map((t) => (t.id === tourId ? { ...t, [field]: !currentValue } : t))
        );
      } else {
        appToast("Cập nhật trạng thái thất bại.");
      }
    } catch (err) {
      console.error(err);
      appToast("Đã xảy ra lỗi khi cập nhật.");
    }
  };

  const handleUploadImageGeneric = async (file: File, type: "banner" | "gallery" | "schedule_icon" | number) => {
    const token = localStorage.getItem("admin_token");
    if (!token) return "";

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("http://localhost:8000/api/tours/upload-image", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) throw new Error("Upload ảnh thất bại.");
      const data = await res.json();
      return data.url;
    } catch (err) {
      console.error(err);
      return "";
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const url = await handleUploadImageGeneric(file, "banner");
    if (url) setImage(url);
    setUploading(false);
  };

  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIconUploading(true);
    const url = await handleUploadImageGeneric(file, "schedule_icon");
    if (url) setScheduleIcon(url);
    setIconUploading(false);
  };

  const handleDayIconUpload = async (e: React.ChangeEvent<HTMLInputElement>, idx: number) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDayIconUploading((prev) => ({ ...prev, [idx]: true }));
    const url = await handleUploadImageGeneric(file, idx);
    if (url) {
      handleItineraryChange(idx, "icon", url);
    }
    setDayIconUploading((prev) => ({ ...prev, [idx]: false }));
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setGalleryUploading(true);
    try {
      const uploadedUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const url = await handleUploadImageGeneric(files[i], "gallery");
        if (url) uploadedUrls.push(url);
      }

      setGalleryList((prev) => {
        const nextList = [...prev];
        uploadedUrls.forEach((url, index) => {
          const isPrimary = nextList.length === 0 && index === 0;
          nextList.push({
            url,
            is_primary: isPrimary,
            order_index: nextList.length,
          });
        });
        return nextList;
      });
    } catch (err) {
      console.error(err);
    } finally {
      setGalleryUploading(false);
    }
  };

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setDocumentUploading(true);
    setFormError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const token = localStorage.getItem("admin_token");
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch("http://localhost:8000/api/tours/upload-document", {
        method: "POST",
        headers,
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Tải lên tài liệu thất bại.");
      }

      const data = await res.json();
      setDocumentUrl(data.url);
      setFormSuccess(`Tải lên tài liệu "${file.name}" thành công!`);
    } catch (err: any) {
      console.error(err);
      setFormError(err.message || "Đã xảy ra lỗi khi tải lên tài liệu.");
    } finally {
      setDocumentUploading(false);
    }
  };

  const handleAddGalleryUrl = () => {
    setGalleryList((prev) => [
      ...prev,
      {
        url: "",
        is_primary: prev.length === 0,
        order_index: prev.length,
      },
    ]);
  };

  const handleRemoveGalleryImage = (index: number) => {
    setGalleryList((prev) => {
      const filtered = prev.filter((_, idx) => idx !== index);
      if (prev[index]?.is_primary && filtered.length > 0) {
        filtered[0].is_primary = true;
      }
      return filtered.map((item, idx) => ({ ...item, order_index: idx }));
    });
  };

  const handleSetPrimaryGalleryImage = (index: number) => {
    setGalleryList((prev) =>
      prev.map((item, idx) => ({
        ...item,
        is_primary: idx === index,
      }))
    );
  };

  const handleGalleryUrlChange = (index: number, val: string) => {
    setGalleryList((prev) =>
      prev.map((item, idx) => {
        if (idx === index) return { ...item, url: val };
        return item;
      })
    );
  };

  // Departures helpers
  const handleAddDepartureDate = () => {
    if (!customDate) {
      appToast("Vui lòng nhập ngày khởi hành.");
      return;
    }
    const exists = customDepartures.some((d) => d.date === customDate);
    if (exists) {
      appToast("Ngày khởi hành này đã tồn tại trong danh sách.");
      return;
    }
    setCustomDepartures((prev) => [
      ...prev,
      { date: customDate, price: Number(customPrice), promo_price: Number(customPromoPrice) }
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
    setCustomDate("");
    setCustomPrice(0);
    setCustomPromoPrice(0);
  };

  const handleRemoveDepartureDate = (dateStr: string) => {
    setCustomDepartures((prev) => prev.filter((d) => d.date !== dateStr));
  };

  // Itinerary helpers
  const handleAddItineraryDay = () => {
    const nextDay = itineraryList.length + 1;
    setItineraryList([
      ...itineraryList,
      { day: nextDay, title: `Ngày ${nextDay}`, title_en: "", icon: "", sort_order: nextDay, content: "" }
    ]);
    setExpandedDays((prev) => ({ ...prev, [itineraryList.length]: true }));
  };

  const handleRemoveItineraryDay = (index: number) => {
    const updated = itineraryList.filter((_, idx) => idx !== index);
    const reindexed = updated.map((item, idx) => ({
      ...item,
      day: idx + 1,
      sort_order: idx + 1
    }));
    setItineraryList(reindexed);
  };

  const handleItineraryChange = (index: number, field: keyof Itinerary, val: any) => {
    setItineraryList((prev) =>
      prev.map((item, idx) => {
        if (idx === index) return { ...item, [field]: val };
        return item;
      })
    );
  };

  const handleInsertTag = (textareaRef: HTMLTextAreaElement | null, startTag: string, endTag: string = "") => {
    if (!textareaRef) return "";
    const start = textareaRef.selectionStart;
    const end = textareaRef.selectionEnd;
    const text = textareaRef.value;
    const selected = text.substring(start, end);
    const replacement = startTag + selected + endTag;
    const newValue = text.substring(0, start) + replacement + text.substring(end);
    
    // Set native value via dispatcher if needed or directly modify ref
    textareaRef.value = newValue;
    textareaRef.focus();
    
    setTimeout(() => {
      textareaRef.selectionStart = start + startTag.length;
      textareaRef.selectionEnd = start + startTag.length + selected.length;
    }, 10);
    
    return newValue;
  };

  const handleDeleteTour = async (tourId: number) => {
    if (!await appConfirm("Bạn có chắc chắn muốn xóa tour này không? Hành động này không thể hoàn tác.")) return;

    const token = localStorage.getItem("admin_token");
    if (!token) return;

    try {
      const res = await fetch(`http://localhost:8000/api/tours/${tourId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setTours((prev) => prev.filter((t) => t.id !== tourId));
      } else {
        appToast("Xóa tour thất bại.");
      }
    } catch (err) {
      console.error(err);
      appToast("Đã xảy ra lỗi khi xóa.");
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const token = localStorage.getItem("admin_token");
    if (!token) {
      setFormError("Vui lòng đăng nhập lại.");
      return;
    }

    // Validation
    if (!title) {
      setFormError("Tên tour không được để trống.");
      return;
    }
    if (baseAdultPrice <= 0) {
      setActiveTab("other");
      setFormError("Giá người lớn mặc định phải lớn hơn 0 VNĐ.");
      return;
    }
    const hasPromoPrice = pricePromoDaily > 0 || customDepartures.some((item) => item.promo_price > 0);
    if (isPromo && !hasPromoPrice) {
      setActiveTab("other");
      setFormError("Bạn đã bật Khuyến mãi nhưng chưa nhập giá khuyến mại theo ngày khởi hành.");
      return;
    }
    if (isInternational && destinationDomesticId !== "") {
      setFormError("Tour quốc tế chỉ được chọn điểm đến nước ngoài.");
      return;
    }
    if (!isInternational && destinationForeignId !== "") {
      setFormError("Tour trong nước chỉ được chọn điểm đến trong nước.");
      return;
    }
    if (accommodationPrices.some((option) => option.adult_price < 0 || option.child_price < 0 || option.guests_per_room < 1)) {
      setFormError("Phương án lưu trú có giá hoặc số khách/phòng không hợp lệ.");
      return;
    }

    const cleanedItinerary = itineraryList.map((item) => ({
      day: item.day,
      title: item.title,
      title_en: item.title_en || "",
      icon: item.icon || "",
      sort_order: item.sort_order || item.day,
      content: item.content,
      meals: item.meals || "",
      overnight: item.overnight || ""
    }));

    const finalGallery = [...galleryList];
    if (finalGallery.length > 0 && !finalGallery.some((g) => g.is_primary)) {
      finalGallery[0].is_primary = true;
    }

    const primaryGalleryImg = finalGallery.find((g) => g.is_primary);
    const payload = {
      slug,
      title,
      title_en: titleEn,
      description,
      image: image || (primaryGalleryImg ? primaryGalleryImg.url : ""),
      price: Number(baseAdultPrice) || 0,
      duration: durationStr || "Chưa xác định",
      location: locationStr || locationNameFromId() || "Việt Nam",
      category: selectedCategoryIds.length > 0 ? "inbound" : "inbound", 
      region: region || "Miền Bắc",
      is_featured: isFeatured,
      is_international: isInternational,
      group_discount: Number(groupDiscount),
      departure_point_id: departurePointId !== "" ? Number(departurePointId) : null,
      destination_domestic_id: destinationDomesticId !== "" ? Number(destinationDomesticId) : null,
      destination_foreign_id: destinationForeignId !== "" ? Number(destinationForeignId) : null,
      is_daily: departureType === "daily",
      price_daily: Number(priceDaily),
      price_promo_daily: Number(pricePromoDaily),
      custom_departures: departureType === "custom" ? customDepartures : [],
      recurring_days: departureType === "weekly" ? recurringDays : [],
      price_child: Number(priceChild),
      price_infant: Number(priceInfant),
      min_group_size: Number(minGroupSize),
      price_includes: priceIncludes,
      price_excludes: priceExcludes,
      cancellation_policy: cancellationPolicy,
      payment_terms: paymentTerms,
      important_note: importantNote,
      accommodation_prices: accommodationPrices,
      user_discount_percent: Number(userDiscountPercent),
      is_promo: isPromo,
      is_active: isActive,
      sort_order: Number(sortOrder),
      schedule_title: scheduleTitle,
      schedule_title_en: scheduleTitleEn,
      schedule_icon: scheduleIcon,
      document_url: documentUrl,
      notes: notes,
      itinerary: cleanedItinerary,
      images: [
        ...(image ? [{ url: image, image_type: "banner", is_primary: false, order_index: 0 }] : []),
        ...finalGallery.map((g, idx) => ({
          url: g.url,
          image_type: "gallery",
          is_primary: g.is_primary,
          order_index: idx + 1
        }))
      ],
      province_id: provinceId !== "" ? Number(provinceId) : null,
      country_id: countryId !== "" ? Number(countryId) : null,
      duration_id: durationId !== "" ? Number(durationId) : null,
      tag_ids: selectedTagIds,
      guide_ids: selectedGuideIds,
      category_ids: selectedCategoryIds
    };

    try {
      let res;
      if (editTourId) {
        res = await fetch(`http://localhost:8000/api/tours/${editTourId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch("http://localhost:8000/api/tours/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
      }

      const data = await res.json();
      if (!res.ok) {
        const detail = Array.isArray(data.detail)
          ? data.detail.map((item: any) => item?.msg || String(item)).join("; ")
          : data.detail;
        throw new Error(detail || `Không thể lưu Tour (HTTP ${res.status}).`);
      }

      setFormSuccess(editTourId ? "Cập nhật tour thành công!" : "Tạo tour mới thành công!");
      fetchTours();
      setTimeout(() => {
        setIsFormOpen(false);
        if (searchParams.get("action")) router.replace("/admin/tours");
      }, 1000);
    } catch (err: any) {
      console.error(err);
      setFormError(err.message === "Failed to fetch" ? "Không kết nối được máy chủ. Vui lòng kiểm tra mạng và thử lại." : (err.message || "Lưu thất bại."));
    }
  };

  const locationNameFromId = () => {
    if (provinceId !== "") {
      const p = provincesList.find((x) => x.id === provinceId);
      return p ? p.name : "";
    }
    if (countryId !== "") {
      const c = countriesList.find((x) => x.id === countryId);
      return c ? c.name : "";
    }
    return "";
  };

  // Filters & Search processing
  const filteredTours = tours.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.title_en && t.title_en.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesDeparture =
      departureFilter === "" || t.departure_point_id === Number(departureFilter);

    const matchesDestination =
      destinationFilter === "" ||
      t.destination_domestic_id === Number(destinationFilter) ||
      t.destination_foreign_id === Number(destinationFilter) ||
      t.province_id === Number(destinationFilter) ||
      t.country_id === Number(destinationFilter);

    const matchesIntl =
      intlFilter === "" ||
      (intlFilter === "domestic" && !t.is_international) ||
      (intlFilter === "international" && t.is_international);

    const matchesStatus =
      statusFilter === "" ||
      (statusFilter === "active" && t.is_active) ||
      (statusFilter === "inactive" && !t.is_active);

    return matchesSearch && matchesDeparture && matchesDestination && matchesIntl && matchesStatus;
  }).sort((a, b) => {
    let factor = sortDirection === "asc" ? 1 : -1;
    if (sortField === "price") {
      return (a.price - b.price) * factor;
    }
    if (sortField === "sort_order") {
      return (a.sort_order - b.sort_order) * factor;
    }
    if (sortField === "title") {
      return a.title.localeCompare(b.title) * factor;
    }
    return (a.id - b.id) * factor;
  });

  const formatPrice = (p: number) => {
    return new Intl.NumberFormat("vi-VN").format(p) + " VNĐ";
  };

  const handleResetFilters = () => {
    setSearchTerm("");
    setDepartureFilter("");
    setDestinationFilter("");
    setIntlFilter("");
    setStatusFilter("");
    setSortField("id");
    setSortDirection("desc");
  };

  // Tree category nested renderer helper
  const renderIndentedCategory = (cat: any) => {
    const isSub = cat.name.startsWith(" ") || cat.name.includes("L---");
    return (
      <span style={{ paddingLeft: isSub ? "1.5rem" : "0", fontSize: "0.9rem", color: isSub ? "#475569" : "#0f172a" }}>
        {cat.name}
      </span>
    );
  };

  const handleDownloadQR = async (url: string, title: string) => {
    try {
      const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(url)}`;
      const response = await fetch(qrImageUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `QR_${title.replace(/[^a-zA-Z0-9]/g, "_")}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      window.open(`https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&data=${encodeURIComponent(url)}`, "_blank");
    }
  };

  const handleCopyQR = async (url: string) => {
    try {
      const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(url)}`;
      const response = await fetch(qrImageUrl);
      const blob = await response.blob();
      if (typeof window !== "undefined" && window.navigator?.clipboard) {
        await navigator.clipboard.write([
          new ClipboardItem({
            "image/png": blob
          })
        ]);
        appToast("Đã sao chép ảnh QR vào bộ nhớ tạm!");
      } else {
        throw new Error();
      }
    } catch (err) {
      appToast("Trình duyệt không hỗ trợ sao chép ảnh tự động. Bạn có thể nhấn chuột phải vào ảnh QR bên dưới và chọn Sao chép hình ảnh.");
    }
  };

  if (loading && tours.length === 0) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "8rem 2rem" }}>
        <div className="admin-spinner"></div>
      </div>
    );
  }

  return (
    <div style={{ padding: "1.5rem", maxWidth: "1280px", margin: "0 auto" }}>
      {/* Dynamic Styling Injector for Modern UI components */}
      <style dangerouslySetInnerHTML={{ __html: `
        .tab-btn {
          padding: 0.75rem 1.5rem;
          font-weight: 600;
          font-size: 0.95rem;
          color: #64748b;
          border-bottom: 2px solid transparent;
          background: none;
          border-top: none; border-left: none; border-right: none;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .tab-btn.active {
          color: #16a34a;
          border-bottom-color: #16a34a;
        }
        .modern-card {
          background: white;
          border-radius: 1rem;
          box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 2px 8px -1px rgba(0, 0, 0, 0.03);
          border: 1px solid #f1f5f9;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
        }
        .timeline-container {
          position: relative;
          padding-left: 2rem;
          border-left: 2px solid #e2e8f0;
          margin-left: 0.75rem;
        }
        .timeline-marker {
          position: absolute;
          left: -0.5rem;
          top: 0;
          width: 1rem;
          height: 1rem;
          border-radius: 9999px;
          background: #16a34a;
          border: 2px solid white;
          box-shadow: 0 0 0 2px #bbf7d0;
        }
        .switch-container {
          position: relative;
          display: inline-flex;
          align-items: center;
          cursor: pointer;
        }
        .switch-input {
          display: none;
        }
        .switch-track {
          width: 2.75rem;
          height: 1.5rem;
          background-color: #cbd5e1;
          border-radius: 9999px;
          transition: background-color 0.25s ease;
          position: relative;
        }
        .switch-thumb {
          position: absolute;
          top: 0.125rem;
          left: 0.125rem;
          width: 1.25rem;
          height: 1.25rem;
          background-color: white;
          border-radius: 9999px;
          transition: transform 0.25s ease;
          box-shadow: 0 1px 3px rgba(0,0,0,0.15);
        }
        .switch-input:checked + .switch-track {
          background-color: #16a34a;
        }
        .switch-input:checked + .switch-track .switch-thumb {
          transform: translateX(1.25rem);
        }
        .search-scroll-box {
          border: 1px solid #cbd5e1;
          border-radius: 0.75rem;
          height: 150px;
          overflow-y: auto;
          padding: 0.5rem;
          background: white;
        }
        .chip {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          background: #f1f5f9;
          color: #334155;
          padding: 0.25rem 0.6rem;
          border-radius: 9999px;
          font-size: 0.8rem;
          font-weight: 600;
          border: 1px solid #e2e8f0;
        }
        .chip-remove {
          background: none; border: none; color: #94a3b8; cursor: pointer; font-size: 0.85rem; padding: 0;
        }
        .chip-remove:hover { color: #ef4444; }
      ` }} />

      {isFormOpen ? (
        /* ------------------------------------------------------------- */
        /* CREATE / EDIT TOUR FORM (Modern Card tabbed layout) */
        /* ------------------------------------------------------------- */
        <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
          
          {/* Header Row */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
            <div>
              <h2 style={{ fontSize: "1.75rem", fontWeight: 800, color: "#0f172a" }}>
                {editTourId ? `✏️ Chỉnh sửa Tour: ${title}` : "➕ Tạo Tour du lịch mới"}
              </h2>
              <p style={{ color: "#64748b", fontSize: "0.95rem" }}>
                Cấu hình chi tiết dữ liệu, lịch trình và tối ưu hóa SEO cho Tour du lịch
              </p>
            </div>
            
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                style={{ padding: "0.6rem 1.25rem", background: "white", border: "1px solid #cbd5e1", borderRadius: "0.75rem", fontWeight: 700, cursor: "pointer", color: "#334155" }}
              >
                Quay lại
              </button>
              <button
                type="button"
                onClick={handleFormSubmit}
                style={{ padding: "0.6rem 1.5rem", background: "#16a34a", color: "white", border: "none", borderRadius: "0.75rem", fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 12px rgba(22,163,74,0.2)" }}
              >
                💾 Lưu lại
              </button>
            </div>
          </div>

          {formError && (
            <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", color: "#b91c1c", padding: "1rem", borderRadius: "0.75rem", marginBottom: "1.5rem", fontWeight: 600 }}>
              ⚠️ {formError}
            </div>
          )}
          {formSuccess && (
            <div style={{ background: "#f0fdf4", border: "1px solid #86efac", color: "#15803d", padding: "1rem", borderRadius: "0.75rem", marginBottom: "1.5rem", fontWeight: 600 }}>
              ✅ {formSuccess}
            </div>
          )}

          {/* Form Tabs Switcher */}
          <div style={{ display: "flex", borderBottom: "2px solid #e2e8f0", marginBottom: "1.5rem", gap: "0.5rem" }}>
            <button type="button" onClick={() => setActiveTab("info")} className={`tab-btn ${activeTab === "info" ? "active" : ""}`}>
              📁 Thông tin chính
            </button>
            <button type="button" onClick={() => setActiveTab("other")} className={`tab-btn ${activeTab === "other" ? "active" : ""}`}>
              💰 Giá & Lịch trình
            </button>
            <button type="button" onClick={() => setActiveTab("seo")} className={`tab-btn ${activeTab === "seo" ? "active" : ""}`}>
              🗺️ Album & Lịch trình chi tiết
            </button>
          </div>

          <form onSubmit={handleFormSubmit}>
            
            {/* ----------------- TAB 1: THÔNG TIN CHÍNH ----------------- */}
            {activeTab === "info" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                <div className="modern-card" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
                  
                  <div style={{ gridColumn: "span 2" }}>
                    <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: 700, color: "#1e293b" }}>Tên Tour du lịch</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => handleTitleChange(e.target.value)}
                      placeholder="Nhập tên Tour (Ví dụ: Tour Du Lịch Đà Nẵng - Hội An - Bà Nà)"
                      required
                      style={{ width: "100%", padding: "0.75rem 1rem", borderRadius: "0.75rem", border: "1px solid #cbd5e1" }}
                    />
                  </div>

                  <div style={{ gridColumn: "span 2" }}>
                    <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: 700, color: "#1e293b" }}>Tên Tour (Tiếng Anh)</label>
                    <input
                      type="text"
                      value={titleEn}
                      onChange={(e) => setTitleEn(e.target.value)}
                      placeholder="Nhập tên Tour tiếng Anh"
                      style={{ width: "100%", padding: "0.75rem 1rem", borderRadius: "0.75rem", border: "1px solid #cbd5e1" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: 700, color: "#1e293b" }}>Đường dẫn Slug</label>
                    <input
                      type="text"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      placeholder="tour-slug-viet-tat"
                      required
                      style={{ width: "100%", padding: "0.75rem 1rem", borderRadius: "0.75rem", border: "1px solid #cbd5e1", background: "#f8fafc" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: 700, color: "#1e293b" }}>Vùng miền / Châu lục</label>
                    <input
                      type="text"
                      value={region}
                      onChange={(e) => setRegion(e.target.value)}
                      placeholder="Ví dụ: Miền Bắc, Miền Trung, Châu Á, Châu Âu"
                      required
                      style={{ width: "100%", padding: "0.75rem 1rem", borderRadius: "0.75rem", border: "1px solid #cbd5e1" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: 700, color: "#1e293b" }}>Tỉnh / Thành phố đại diện</label>
                    <select
                      value={provinceId}
                      onChange={(e) => {
                        const val = e.target.value !== "" ? Number(e.target.value) : "";
                        setProvinceId(val);
                        if (val !== "") {
                          const p = provincesList.find((x) => x.id === val);
                          if (p && p.country_id) setCountryId(p.country_id);
                        }
                      }}
                      style={{ width: "100%", padding: "0.75rem 1rem", borderRadius: "0.75rem", border: "1px solid #cbd5e1", background: "white" }}
                    >
                      <option value="">-- Chọn tỉnh thành --</option>
                      {provincesList.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: 700, color: "#1e293b" }}>Quốc gia đại diện</label>
                    <select
                      value={countryId}
                      onChange={(e) => setCountryId(e.target.value !== "" ? Number(e.target.value) : "")}
                      style={{ width: "100%", padding: "0.75rem 1rem", borderRadius: "0.75rem", border: "1px solid #cbd5e1", background: "white" }}
                    >
                      <option value="">-- Chọn quốc gia --</option>
                      {countriesList.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: 700, color: "#1e293b" }}>Thời lượng hiển thị (Text)</label>
                    <input
                      type="text"
                      value={durationStr}
                      onChange={(e) => setDurationStr(e.target.value)}
                      placeholder="Ví dụ: 3 Ngày 2 Đêm, 2 Ngày 1 Đêm"
                      style={{ width: "100%", padding: "0.75rem 1rem", borderRadius: "0.75rem", border: "1px solid #cbd5e1" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: 700, color: "#1e293b" }}>Liên kết thời lượng (ID)</label>
                    <select
                      value={durationId}
                      onChange={(e) => {
                        const val = e.target.value !== "" ? Number(e.target.value) : "";
                        setDurationId(val);
                        if (val !== "") {
                          const d = durationsList.find((x) => x.id === val);
                          if (d) setDurationStr(d.name);
                        }
                      }}
                      style={{ width: "100%", padding: "0.75rem 1rem", borderRadius: "0.75rem", border: "1px solid #cbd5e1", background: "white" }}
                    >
                      <option value="">-- Chọn mốc thời lượng --</option>
                      {durationsList.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ gridColumn: "span 2" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem", background: "#f8fafc", padding: "1rem", borderRadius: "0.75rem", border: "1px solid #e2e8f0" }}>
                      <label className="switch-container">
                        <input
                          type="checkbox"
                          className="switch-input"
                          checked={isInternational}
                          onChange={(e) => {
                            const international = e.target.checked;
                            setIsInternational(international);
                            if (international) {
                              setDestinationDomesticId("");
                              setProvinceId("");
                            } else {
                              setDestinationForeignId("");
                              setCountryId("");
                            }
                          }}
                        />
                        <div className="switch-track">
                          <div className="switch-thumb"></div>
                        </div>
                      </label>
                      <div>
                        <strong style={{ display: "block", fontSize: "0.95rem", color: "#1e293b" }}>Phân loại: Tour Quốc Tế (Nước Ngoài)</strong>
                        <span style={{ fontSize: "0.85rem", color: "#64748b" }}>Mặc định tắt là tour Trong nước. Bật lên là tour Nước ngoài.</span>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Many-to-Many Guides and Categories Card (PREMIUM CHIP MULTISELECT DESIGN) */}
                <div className="modern-card" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
                  
                  {/* Category Tree Box */}
                  <div>
                    <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: 700, color: "#1e293b" }}>Danh mục cha</label>
                    
                    {/* Selected Categories Display Chips */}
                    <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "0.75rem", minHeight: "34px", padding: "0.25rem", border: "1px dashed #cbd5e1", borderRadius: "0.5rem" }}>
                      {selectedCategoryIds.length === 0 ? (
                        <span style={{ color: "#94a3b8", fontSize: "0.85rem", fontStyle: "italic", padding: "0.25rem" }}>Chưa chọn danh mục nào</span>
                      ) : (
                        selectedCategoryIds.map((cid) => {
                          const catObj = categoriesList.find((c) => c.id === cid);
                          return (
                            <span key={cid} className="chip">
                              {catObj ? catObj.name.replace("L---", "").trim() : `Danh mục #${cid}`}
                              <button type="button" className="chip-remove" onClick={() => setSelectedCategoryIds((prev) => prev.filter((id) => id !== cid))}>✕</button>
                            </span>
                          );
                        })
                      )}
                    </div>

                    <input
                      type="text"
                      placeholder="🔍 Gõ để tìm danh mục..."
                      value={categorySearch}
                      onChange={(e) => setCategorySearch(e.target.value)}
                      style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "0.5rem", border: "1px solid #cbd5e1", marginBottom: "0.5rem" }}
                    />
                    
                    <div className="search-scroll-box">
                      {categoriesList
                        .filter((c) => c.name.toLowerCase().includes(categorySearch.toLowerCase()))
                        .map((cat) => (
                          <label key={cat.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.25rem", cursor: "pointer" }}>
                            <input
                              type="checkbox"
                              checked={selectedCategoryIds.includes(cat.id)}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedCategoryIds([...selectedCategoryIds, cat.id]);
                                else setSelectedCategoryIds(selectedCategoryIds.filter((id) => id !== cat.id));
                              }}
                            />
                            {renderIndentedCategory(cat)}
                          </label>
                        ))}
                    </div>
                  </div>

                  {/* Guides Box */}
                  <div>
                    <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: 700, color: "#1e293b" }}>Hướng dẫn viên</label>
                    
                    {/* Selected Guides Display Chips */}
                    <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "0.75rem", minHeight: "34px", padding: "0.25rem", border: "1px dashed #cbd5e1", borderRadius: "0.5rem" }}>
                      {selectedGuideIds.length === 0 ? (
                        <span style={{ color: "#94a3b8", fontSize: "0.85rem", fontStyle: "italic", padding: "0.25rem" }}>Chưa chọn hướng dẫn viên</span>
                      ) : (
                        selectedGuideIds.map((gid) => {
                          const guideObj = guidesList.find((g) => g.id === gid);
                          return (
                            <span key={gid} className="chip">
                              👤 {guideObj ? guideObj.name : `HDV #${gid}`}
                              <button type="button" className="chip-remove" onClick={() => setSelectedGuideIds((prev) => prev.filter((id) => id !== gid))}>✕</button>
                            </span>
                          );
                        })
                      )}
                    </div>

                    <input
                      type="text"
                      placeholder="🔍 Gõ để tìm kiếm hướng dẫn viên..."
                      value={guideSearch}
                      onChange={(e) => setGuideSearch(e.target.value)}
                      style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "0.5rem", border: "1px solid #cbd5e1", marginBottom: "0.5rem" }}
                    />
                    
                    <div className="search-scroll-box">
                      {guidesList
                        .filter((g) => g.name.toLowerCase().includes(guideSearch.toLowerCase()))
                        .map((g) => (
                          <label key={g.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.25rem", cursor: "pointer" }}>
                            <input
                              type="checkbox"
                              checked={selectedGuideIds.includes(g.id)}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedGuideIds([...selectedGuideIds, g.id]);
                                else setSelectedGuideIds(selectedGuideIds.filter((id) => id !== g.id));
                              }}
                            />
                            <span style={{ fontSize: "0.9rem" }}>{g.name}</span>
                          </label>
                        ))}
                    </div>
                  </div>

                  {/* Tags Box */}
                  <div style={{ gridColumn: "span 2" }}>
                    <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 700, color: "#1e293b" }}>Thẻ gắn Tour (Tags)</label>
                    <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", padding: "0.75rem", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "0.75rem" }}>
                      {tagsList.map((t) => (
                        <label key={t.id} style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", cursor: "pointer", fontWeight: 600, fontSize: "0.88rem", background: "white", padding: "0.35rem 0.75rem", borderRadius: "0.5rem", border: "1px solid #cbd5e1" }}>
                          <input
                            type="checkbox"
                            checked={selectedTagIds.includes(t.id)}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedTagIds([...selectedTagIds, t.id]);
                              else setSelectedTagIds(selectedTagIds.filter((id) => id !== t.id));
                            }}
                          />
                          <span>🏷️ {t.name}</span>
                        </label>
                      ))}
                    </div>
                    <div style={{ marginTop: "0.65rem", padding: "0.75rem", borderRadius: "0.6rem", background: "#eff6ff", color: "#1e40af", fontSize: "0.82rem", lineHeight: 1.55 }}>
                      <strong>Tags dùng để phân loại và truyền thông:</strong> “Giá Tốt”, “Bán Chạy”, “Mùa Hè”… sẽ xuất hiện trên thẻ Tour để khách dễ nhận biết. Tag “Khuyến Mãi” chỉ là nhãn nội dung; công tắc <strong>🔥 Khuyến mãi</strong> trong phần trạng thái mới điều khiển huy hiệu giảm giá.
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* ----------------- TAB 2: GIÁ & LỊCH TRÌNH ----------------- */}
            {activeTab === "other" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                
                {/* Standard Pricing Card */}
                <div className="modern-card">
                  <h4 style={{ margin: "0 0 1rem 0", color: "#0f172a", fontSize: "1.1rem", fontWeight: 800 }}>💵 Cấu hình giá cơ bản</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.25rem" }}>
                    <div>
                      <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: 700, color: "#1e293b" }}>Giá người lớn mặc định (VNĐ) *</label>
                      <CurrencyInput
                        value={baseAdultPrice}
                        onChange={setBaseAdultPrice}
                        style={{ width: "100%", padding: "0.75rem 1rem", borderRadius: "0.75rem", border: "1px solid #cbd5e1" }}
                      />
                      <small style={{ color: "#64748b" }}>Giá mặc định khi ngày khởi hành không có mức giá riêng.</small>
                    </div>
                    <div>
                      <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: 700, color: "#1e293b" }}>Giá trẻ em (VNĐ)</label>
                      <CurrencyInput
                        value={priceChild}
                        onChange={setPriceChild}
                        style={{ width: "100%", padding: "0.75rem 1rem", borderRadius: "0.75rem", border: "1px solid #cbd5e1" }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: 700, color: "#1e293b" }}>Giá em bé (VNĐ)</label>
                      <CurrencyInput
                        value={priceInfant}
                        onChange={setPriceInfant}
                        style={{ width: "100%", padding: "0.75rem 1rem", borderRadius: "0.75rem", border: "1px solid #cbd5e1" }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: 700, color: "#1e293b" }}>Giảm giá User đăng nhập (%)</label>
                      <input
                        type="number"
                        value={userDiscountPercent}
                        onChange={(e) => setUserDiscountPercent(Number(e.target.value))}
                        max={100}
                        min={0}
                        style={{ width: "100%", padding: "0.75rem 1rem", borderRadius: "0.75rem", border: "1px solid #cbd5e1" }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: 700, color: "#1e293b" }}>Ưu đãi đặt theo nhóm (VNĐ)</label>
                      <CurrencyInput
                        value={groupDiscount}
                        onChange={setGroupDiscount}
                        style={{ width: "100%", padding: "0.75rem 1rem", borderRadius: "0.75rem", border: "1px solid #cbd5e1" }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: 700, color: "#1e293b" }}>Giá áp dụng từ số khách</label>
                      <input type="number" min={1} value={minGroupSize} onChange={(e) => setMinGroupSize(Math.max(1, Number(e.target.value)))} style={{ width: "100%", padding: "0.75rem 1rem", borderRadius: "0.75rem", border: "1px solid #cbd5e1" }} />
                      <small style={{ color: "#64748b" }}>Ví dụ: nhập 10 nếu bảng giá áp dụng cho đoàn từ 10 khách.</small>
                    </div>
                    <div>
                      <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: 700, color: "#1e293b" }}>Thứ tự sắp xếp hiển thị</label>
                      <input
                        type="number"
                        value={sortOrder}
                        onChange={(e) => setSortOrder(Number(e.target.value))}
                        style={{ width: "100%", padding: "0.75rem 1rem", borderRadius: "0.75rem", border: "1px solid #cbd5e1" }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: 700, color: "#1e293b" }}>Tài liệu chương trình Tour (PDF/Word)</label>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <input
                          type="text"
                          value={documentUrl}
                          onChange={(e) => setDocumentUrl(e.target.value)}
                          placeholder="Chưa tải lên tài liệu..."
                          style={{ flexGrow: 1, padding: "0.75rem 1rem", borderRadius: "0.75rem", border: "1px solid #cbd5e1", fontSize: "0.9rem" }}
                        />
                        {documentUrl && (
                          <button
                            type="button"
                            onClick={() => {
                              const fullUrl = documentUrl.startsWith("http")
                                ? documentUrl
                                : `${window.location.origin}${documentUrl}`;
                              setQrModalData({ url: fullUrl, title: title || "Tài liệu Tour" });
                            }}
                            style={{
                              padding: "0.75rem 1rem",
                              borderRadius: "0.75rem",
                              background: "#0f172a",
                              color: "white",
                              border: "none",
                              cursor: "pointer",
                              fontSize: "0.85rem",
                              fontWeight: 700,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "0.25rem",
                              whiteSpace: "nowrap"
                            }}
                          >
                            📷 QR
                          </button>
                        )}
                        <label style={{ padding: "0.75rem 1rem", background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: "0.75rem", cursor: "pointer", fontSize: "0.85rem", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", whiteSpace: "nowrap" }}>
                          {documentUploading ? "..." : "📁 Tải"}
                          <input type="file" accept=".pdf,.doc,.docx" onChange={handleDocumentUpload} style={{ display: "none" }} disabled={documentUploading} />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="modern-card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
                    <div>
                      <h4 style={{ margin: 0, color: "#0f172a", fontSize: "1.1rem", fontWeight: 800 }}>🏨 Giá theo khách sạn và loại phòng</h4>
                      <small style={{ color: "#64748b" }}>Không bắt buộc. Dùng cho tour có nhiều hạng lưu trú.</small>
                    </div>
                    <button type="button" onClick={() => setAccommodationPrices([...accommodationPrices, { hotel_stars: 3, room_type: "Phòng tiêu chuẩn", guests_per_room: 2, adult_price: baseAdultPrice || 0, child_price: priceChild || 0, single_supplement: 0 }])} style={{ padding: "0.55rem 1rem", border: 0, borderRadius: "0.6rem", background: "#0ea5e9", color: "white", fontWeight: 700, cursor: "pointer" }}>＋ Thêm phương án</button>
                  </div>
                  {accommodationPrices.length === 0 ? <div style={{ padding: "1.5rem", border: "1px dashed #cbd5e1", borderRadius: "0.75rem", color: "#64748b", textAlign: "center" }}>Tour đang dùng giá tiêu chuẩn, chưa phân hạng khách sạn.</div> : accommodationPrices.map((option, index) => (
                    <div key={index} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "0.65rem", padding: "0.9rem", marginBottom: "0.75rem", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "0.75rem", alignItems: "end" }}>
                      {[
                        ["Hạng sao", "hotel_stars", "number"], ["Loại phòng", "room_type", "text"], ["Khách/phòng", "guests_per_room", "number"], ["Giá người lớn", "adult_price", "number"], ["Giá trẻ em", "child_price", "number"], ["Phụ thu phòng đơn", "single_supplement", "number"]
                      ].map(([label, field, type]) => <label key={field} style={{ fontSize: "0.76rem", fontWeight: 700, color: "#475569" }}>{label}{["adult_price", "child_price", "single_supplement"].includes(field) ? <CurrencyInput value={(option as any)[field]} onChange={(value) => { const next = [...accommodationPrices]; (next[index] as any)[field] = value; setAccommodationPrices(next); }} style={{ width: "100%", marginTop: "0.35rem", padding: "0.6rem", border: "1px solid #cbd5e1", borderRadius: "0.5rem" }} /> : <input type={type} min={field === "hotel_stars" || field === "guests_per_room" ? 1 : 0} max={field === "hotel_stars" ? 5 : undefined} value={(option as any)[field]} onChange={(e) => { const next = [...accommodationPrices]; (next[index] as any)[field] = type === "number" ? Number(e.target.value) : e.target.value; setAccommodationPrices(next); }} style={{ width: "100%", marginTop: "0.35rem", padding: "0.6rem", border: "1px solid #cbd5e1", borderRadius: "0.5rem" }} />}</label>)}
                      <button type="button" onClick={() => setAccommodationPrices(accommodationPrices.filter((_, i) => i !== index))} style={{ padding: "0.6rem", border: 0, borderRadius: "0.5rem", background: "#fee2e2", color: "#dc2626", cursor: "pointer" }}>✕</button>
                    </div>
                  ))}
                </div>

                <div className="modern-card">
                  <h4 style={{ margin: "0 0 1rem", color: "#0f172a", fontSize: "1.1rem", fontWeight: 800 }}>📋 Chính sách và điều kiện Tour</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1rem" }}>
                    {[
                      ["Giá Tour bao gồm", priceIncludes, setPriceIncludes, "Các dịch vụ, vé, bữa ăn đã bao gồm..."],
                      ["Giá Tour không bao gồm", priceExcludes, setPriceExcludes, "Chi phí cá nhân, VAT, phụ thu..."],
                      ["Điều khoản hoàn – huỷ", cancellationPolicy, setCancellationPolicy, "Mốc thời gian và mức phí hoàn/huỷ..."],
                      ["Điều kiện thanh toán", paymentTerms, setPaymentTerms, "Đặt cọc, thời hạn thanh toán phần còn lại..."]
                    ].map(([label, value, setter, placeholder]) => <label key={label as string} style={{ fontWeight: 700, color: "#1e293b" }}>{label as string}<textarea value={value as string} onChange={(e) => (setter as any)(e.target.value)} placeholder={placeholder as string} rows={5} style={{ width: "100%", marginTop: "0.4rem", padding: "0.8rem", border: "1px solid #cbd5e1", borderRadius: "0.65rem", font: "inherit", fontWeight: 400 }} /></label>)}
                    <label style={{ gridColumn: "1 / -1", fontWeight: 800, color: "#dc2626" }}>Lưu ý quan trọng (hiển thị màu đỏ cuối nội dung)<textarea value={importantNote} onChange={(e) => setImportantNote(e.target.value)} placeholder="Các lưu ý bắt buộc khách phải đọc trước khi đặt Tour..." rows={4} style={{ width: "100%", marginTop: "0.4rem", padding: "0.8rem", border: "1px solid #fca5a5", background: "#fff7f7", color: "#b91c1c", borderRadius: "0.65rem", font: "inherit" }} /></label>
                  </div>
                </div>

                {/* Departure Points Card */}
                <div className="modern-card">
                  <h4 style={{ margin: "0 0 1rem 0", color: "#0f172a", fontSize: "1.1rem", fontWeight: 800 }}>📍 Điểm đi / Điểm đến chi tiết</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.25rem" }}>
                    <div>
                      <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: 700, color: "#1e293b" }}>Điểm khởi hành</label>
                      <select
                        value={departurePointId}
                        onChange={(e) => setDeparturePointId(e.target.value !== "" ? Number(e.target.value) : "")}
                        style={{ width: "100%", padding: "0.75rem 1rem", borderRadius: "0.75rem", border: "1px solid #cbd5e1", background: "white" }}
                      >
                        <option value="">-- Chưa xác định --</option>
                        {provincesList.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: 700, color: "#1e293b" }}>Điểm đến trong nước</label>
                      <select
                        value={destinationDomesticId}
                        onChange={(e) => setDestinationDomesticId(e.target.value !== "" ? Number(e.target.value) : "")}
                        disabled={isInternational}
                        style={{ width: "100%", padding: "0.75rem 1rem", borderRadius: "0.75rem", border: "1px solid #cbd5e1", background: isInternational ? "#e2e8f0" : "white", cursor: isInternational ? "not-allowed" : "pointer" }}
                      >
                        <option value="">-- Chưa xác định --</option>
                        {provincesList.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: 700, color: "#1e293b" }}>Điểm đến nước ngoài</label>
                      <select
                        value={destinationForeignId}
                        onChange={(e) => setDestinationForeignId(e.target.value !== "" ? Number(e.target.value) : "")}
                        disabled={!isInternational}
                        style={{ width: "100%", padding: "0.75rem 1rem", borderRadius: "0.75rem", border: "1px solid #cbd5e1", background: !isInternational ? "#e2e8f0" : "white", cursor: !isInternational ? "not-allowed" : "pointer" }}
                      >
                        <option value="">-- Chưa xác định --</option>
                        {countriesList.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div style={{ marginTop: "1.25rem", borderTop: "1px dashed #e2e8f0", paddingTop: "1.25rem" }}>
                    <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: 700, color: "#1e293b" }}>Lộ trình / Tuyến đường (Nếu đi qua nhiều địa điểm)</label>
                    <input
                      type="text"
                      placeholder="Ví dụ: Hà Nội - Vân Nam - Lộ Tây - Côn Minh - Lệ Giang"
                      value={locationStr}
                      onChange={(e) => setLocationStr(e.target.value)}
                      style={{ width: "100%", padding: "0.75rem 1rem", borderRadius: "0.75rem", border: "1px solid #cbd5e1" }}
                    />
                    <small style={{ color: "#64748b", marginTop: "0.25rem", display: "block" }}>
                      * Bỏ trống nếu muốn tự động lấy theo Điểm đến đã chọn ở trên.
                    </small>
                  </div>
                </div>

                {/* Daily vs Weekly vs Custom Departures Card */}
                <div className="modern-card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", borderBottom: "1px solid #f1f5f9", paddingBottom: "0.75rem", flexWrap: "wrap", gap: "1rem" }}>
                    <h4 style={{ margin: 0, color: "#0f172a", fontSize: "1.1rem", fontWeight: 800 }}>📅 Quản lý ngày khởi hành</h4>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      {[
                        { value: "custom", label: "🗓️ Tùy chọn ngày" },
                        { value: "weekly", label: "🔄 Hàng tuần" },
                        { value: "daily", label: "☀️ Hàng ngày" }
                      ].map((item) => (
                        <button
                          key={item.value}
                          type="button"
                          onClick={() => setDepartureType(item.value as any)}
                          style={{
                            padding: "0.4rem 0.85rem",
                            borderRadius: "0.5rem",
                            fontSize: "0.85rem",
                            fontWeight: 700,
                            border: departureType === item.value ? "none" : "1px solid #cbd5e1",
                            background: departureType === item.value ? "var(--primary)" : "white",
                            color: departureType === item.value ? "white" : "#475569",
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                            flexShrink: 0
                          }}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {(departureType === "daily" || departureType === "weekly") && (
                    /* PERIODIC PRICING fields */
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem", background: "#f8fafc", padding: "1.25rem", borderRadius: "0.75rem", border: "1px solid #e2e8f0", marginBottom: departureType === "weekly" ? "1.25rem" : "0" }}>
                      <div>
                        <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: 700, color: "#1e293b" }}>
                          {departureType === "daily" ? "Giá tour hàng ngày (VNĐ)" : "Giá tour hàng tuần (VNĐ)"}
                        </label>
                        <CurrencyInput
                          value={priceDaily}
                          onChange={setPriceDaily}
                          style={{ width: "100%", padding: "0.75rem 1rem", borderRadius: "0.75rem", border: "1px solid #cbd5e1", background: "white" }}
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: 700, color: "#1e293b" }}>
                          {departureType === "daily" ? "Giá khuyến mại hàng ngày (VNĐ)" : "Giá khuyến mại hàng tuần (VNĐ)"}
                        </label>
                        <CurrencyInput
                          value={pricePromoDaily}
                          onChange={setPricePromoDaily}
                          style={{ width: "100%", padding: "0.75rem 1rem", borderRadius: "0.75rem", border: "1px solid #cbd5e1", background: "white" }}
                        />
                      </div>
                    </div>
                  )}

                  {departureType === "weekly" && (
                    /* WEEKLY RECURRING DAYS OF WEEK */
                    <div style={{ background: "#f8fafc", padding: "1.25rem", borderRadius: "0.75rem", border: "1px solid #e2e8f0" }}>
                      <label style={{ display: "block", marginBottom: "0.75rem", fontWeight: 700, color: "#1e293b", fontSize: "0.95rem" }}>
                        Chọn ngày khởi hành định kỳ hàng tuần:
                      </label>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "1.25rem" }}>
                        {[
                          { label: "Thứ 2", value: 1 },
                          { label: "Thứ 3", value: 2 },
                          { label: "Thứ 4", value: 3 },
                          { label: "Thứ 5", value: 4 },
                          { label: "Thứ 6", value: 5 },
                          { label: "Thứ 7", value: 6 },
                          { label: "Chủ nhật", value: 0 }
                        ].map((day) => {
                          const isChecked = recurringDays.includes(day.value);
                          return (
                            <label key={day.value} style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", fontWeight: 600, color: "#334155", cursor: "pointer" }}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setRecurringDays([...recurringDays, day.value]);
                                  } else {
                                    setRecurringDays(recurringDays.filter((d) => d !== day.value));
                                  }
                                }}
                                style={{ width: "1.1rem", height: "1.1rem", accentColor: "var(--primary)" }}
                              />
                              {day.label}
                            </label>
                          );
                        })}
                      </div>
                      <small style={{ color: "#64748b", marginTop: "0.75rem", display: "block", lineHeight: "1.4" }}>
                        * Hệ thống sẽ tự động hiển thị lịch khởi hành cho khách chọn vào các ngày tương ứng trong 90 ngày tới. Mức giá sẽ áp dụng theo giá mặc định của tour.
                      </small>
                    </div>
                  )}

                  {departureType === "custom" && (
                    /* CUSTOM DEPARTURES BUILDER */
                    <div>
                      <div style={{ background: "#f8fafc", padding: "1.25rem", borderRadius: "0.75rem", border: "1px solid #e2e8f0", marginBottom: "1.25rem", display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr auto", gap: "1rem", alignItems: "end" }}>
                        <div>
                          <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: 700, color: "#1e293b" }}>Chọn ngày khởi hành</label>
                          <input
                            type="date"
                            value={customDate}
                            onChange={(e) => setCustomDate(e.target.value)}
                            style={{ width: "100%", padding: "0.6rem 0.75rem", borderRadius: "0.5rem", border: "1px solid #cbd5e1" }}
                          />
                        </div>
                        <div>
                          <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: 700, color: "#1e293b" }}>Giá bán (VNĐ)</label>
                          <CurrencyInput
                            value={customPrice}
                            onChange={setCustomPrice}
                            style={{ width: "100%", padding: "0.6rem 0.75rem", borderRadius: "0.5rem", border: "1px solid #cbd5e1" }}
                          />
                        </div>
                        <div>
                          <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: 700, color: "#1e293b" }}>Giá KM (VNĐ)</label>
                          <CurrencyInput
                            value={customPromoPrice}
                            onChange={setCustomPromoPrice}
                            style={{ width: "100%", padding: "0.6rem 0.75rem", borderRadius: "0.5rem", border: "1px solid #cbd5e1" }}
                          />
                        </div>
                        <div>
                          <button
                            type="button"
                            onClick={handleAddDepartureDate}
                            style={{ padding: "0.65rem 1.25rem", background: "#16a34a", color: "white", border: "none", borderRadius: "0.5rem", fontWeight: 700, cursor: "pointer" }}
                          >
                            ➕ Thêm
                          </button>
                        </div>
                      </div>

                      {/* Departures List */}
                      {customDepartures.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "2rem", color: "#94a3b8", border: "1px dashed #cbd5e1", borderRadius: "0.75rem", fontStyle: "italic" }}>
                          Chưa có ngày khởi hành tùy chọn nào. Hãy chọn ngày ở trên và thêm vào danh sách.
                        </div>
                      ) : (
                        <div style={{ maxHeight: "250px", overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: "0.75rem" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.9rem" }}>
                            <thead>
                              <tr style={{ background: "#f1f5f9", borderBottom: "1px solid #cbd5e1" }}>
                                <th style={{ padding: "0.75rem" }}>Ngày khởi hành</th>
                                <th style={{ padding: "0.75rem" }}>Giá vé gốc</th>
                                <th style={{ padding: "0.75rem" }}>Giá khuyến mại</th>
                                <th style={{ padding: "0.75rem", textAlign: "center" }}>Hành động</th>
                              </tr>
                            </thead>
                            <tbody>
                              {customDepartures.map((item, idx) => (
                                <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                  <td style={{ padding: "0.75rem", fontWeight: 700, color: "#0f172a" }}>🗓️ {item.date}</td>
                                  <td style={{ padding: "0.75rem" }}>{formatPrice(item.price)}</td>
                                  <td style={{ padding: "0.75rem", color: "#16a34a", fontWeight: 600 }}>{formatPrice(item.promo_price)}</td>
                                  <td style={{ padding: "0.75rem", textAlign: "center" }}>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveDepartureDate(item.date)}
                                      style={{ background: "#fee2e2", color: "#ef4444", border: "none", padding: "0.3rem 0.6rem", borderRadius: "0.375rem", cursor: "pointer", fontSize: "0.8rem", fontWeight: 700 }}
                                    >
                                      Xóa
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Status Toggles Card */}
                <div className="modern-card">
                  <h4 style={{ margin: "0 0 1.25rem 0", color: "#0f172a", fontSize: "1.1rem", fontWeight: 800 }}>⚙️ Cài đặt trạng thái hiển thị</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.5rem" }}>
                    
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", background: "#f8fafc", padding: "1rem", borderRadius: "0.75rem", border: "1px solid #e2e8f0" }}>
                      <label className="switch-container">
                        <input
                          type="checkbox"
                          className="switch-input"
                          checked={isFeatured}
                          onChange={(e) => setIsFeatured(e.target.checked)}
                        />
                        <div className="switch-track">
                          <div className="switch-thumb"></div>
                        </div>
                      </label>
                      <div>
                        <strong style={{ display: "block", fontSize: "0.9rem", color: "#1e293b" }}>⭐ Nổi bật</strong>
                        <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Hiển thị trang chủ</span>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", background: "#f8fafc", padding: "1rem", borderRadius: "0.75rem", border: "1px solid #e2e8f0" }}>
                      <label className="switch-container">
                        <input
                          type="checkbox"
                          className="switch-input"
                          checked={isPromo}
                          onChange={(e) => setIsPromo(e.target.checked)}
                        />
                        <div className="switch-track">
                          <div className="switch-thumb"></div>
                        </div>
                      </label>
                      <div>
                        <strong style={{ display: "block", fontSize: "0.9rem", color: "#1e293b" }}>🔥 Khuyến mãi</strong>
                        <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Hiện huy hiệu “Đang giảm giá” trên Tour</span>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", background: "#f8fafc", padding: "1rem", borderRadius: "0.75rem", border: "1px solid #e2e8f0" }}>
                      <label className="switch-container">
                        <input
                          type="checkbox"
                          className="switch-input"
                          checked={isActive}
                          onChange={(e) => setIsActive(e.target.checked)}
                        />
                        <div className="switch-track">
                          <div className="switch-thumb"></div>
                        </div>
                      </label>
                      <div>
                        <strong style={{ display: "block", fontSize: "0.9rem", color: "#1e293b" }}>🟢 Kích hoạt</strong>
                        <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Cho phép hiển thị/đặt vé</span>
                      </div>
                    </div>

                  </div>
                </div>

              </div>
            )}

            {/* ----------------- TAB 3: ALBUM & LỊCH TRÌNH ----------------- */}
            {activeTab === "seo" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                
                {/* Images, Banner and Gallery Card */}
                <div className="modern-card" style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1.25rem" }}>
                  
                  {/* Banner image */}
                  <div>
                    <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: 700, color: "#1e293b" }}>Hình ảnh đại diện (Banner chính)</label>
                    <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                      <input
                        type="text"
                        value={image}
                        onChange={(e) => setImage(e.target.value)}
                        placeholder="URL hình ảnh hoặc tải lên ở bên cạnh"
                        style={{ flexGrow: 1, padding: "0.75rem 1rem", borderRadius: "0.75rem", border: "1px solid #cbd5e1" }}
                      />
                      <label style={{ padding: "0.75rem 1.25rem", background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: "0.75rem", cursor: "pointer", fontSize: "0.9rem", fontWeight: 700, whiteSpace: "nowrap" }}>
                        {uploading ? "Đang tải..." : "📁 Tải ảnh lên"}
                        <input type="file" accept="image/*" onChange={handleBannerUpload} style={{ display: "none" }} disabled={uploading} />
                      </label>
                    </div>
                    {image && (
                      <div style={{ marginTop: "1rem", position: "relative", display: "inline-block" }}>
                        <img src={image} alt="Banner Preview" style={{ width: "320px", height: "160px", objectFit: "cover", borderRadius: "0.75rem", border: "1px solid #cbd5e1" }} />
                        <button type="button" onClick={() => setImage("")} style={{ position: "absolute", top: "0.5rem", right: "0.5rem", background: "#ef4444", color: "white", border: "none", borderRadius: "50%", width: "24px", height: "24px", cursor: "pointer", fontWeight: "bold" }}>✕</button>
                      </div>
                    )}
                  </div>

                  {/* Album Gallery Builder (Grid style) */}
                  <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "1.25rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
                      <h4 style={{ margin: 0, color: "#0f172a", fontSize: "1.1rem", fontWeight: 800 }}>📸 Album hình ảnh Tour (Gallery)</h4>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <label style={{ padding: "0.5rem 1rem", background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: "0.5rem", cursor: "pointer", fontSize: "0.82rem", fontWeight: 700 }}>
                          {galleryUploading ? "Đang tải..." : "📁 Chọn nhiều ảnh từ máy"}
                          <input type="file" accept="image/*" multiple onChange={handleGalleryUpload} style={{ display: "none" }} disabled={galleryUploading} />
                        </label>
                        <button type="button" onClick={handleAddGalleryUrl} style={{ padding: "0.5rem 1rem", background: "white", border: "1px solid #cbd5e1", borderRadius: "0.5rem", fontSize: "0.82rem", fontWeight: 700, cursor: "pointer" }}>
                          🔗 Thêm ô URL ảnh
                        </button>
                      </div>
                    </div>

                    {galleryList.length === 0 ? (
                      <div style={{ textAlign: "center", padding: "3rem 1.5rem", color: "#94a3b8", border: "1px dashed #cbd5e1", borderRadius: "0.75rem", fontStyle: "italic" }}>
                        Chưa có ảnh gallery nào được thêm. Hãy tải lên hoặc chèn URL.
                      </div>
                    ) : (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1.25rem" }}>
                        {galleryList.map((gImg, idx) => (
                          <div key={idx} style={{ background: "#f8fafc", padding: "0.75rem", border: gImg.is_primary ? "2px solid #16a34a" : "1px solid #e2e8f0", borderRadius: "0.75rem", position: "relative" }}>
                            
                            <div style={{ position: "relative", aspectRatio: "4/3", overflow: "hidden", borderRadius: "0.5rem", marginBottom: "0.5rem", border: "1px solid #e2e8f0" }}>
                              <img src={gImg.url || "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80"} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                              <button
                                type="button"
                                onClick={() => handleRemoveGalleryImage(idx)}
                                style={{ position: "absolute", top: "0.25rem", right: "0.25rem", background: "#ef4444", color: "white", border: "none", borderRadius: "50%", width: "24px", height: "24px", cursor: "pointer", fontWeight: "bold" }}
                                title="Xóa ảnh"
                              >
                                ✕
                              </button>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", marginBottom: "0.5rem" }}>
                              <input
                                type="radio"
                                id={`primary-gallery-${idx}`}
                                name="primary-gallery"
                                checked={gImg.is_primary}
                                onChange={() => handleSetPrimaryGalleryImage(idx)}
                              />
                              <label htmlFor={`primary-gallery-${idx}`} style={{ fontSize: "0.8rem", fontWeight: gImg.is_primary ? 700 : 500, color: gImg.is_primary ? "#16a34a" : "#475569", cursor: "pointer" }}>
                                🌟 Ảnh chính đại diện
                              </label>
                            </div>

                            <input
                              type="text"
                              value={gImg.url}
                              onChange={(e) => handleGalleryUrlChange(idx, e.target.value)}
                              placeholder="URL hình ảnh"
                              style={{ width: "100%", padding: "0.35rem 0.5rem", border: "1px solid #cbd5e1", borderRadius: "0.375rem", fontSize: "0.75rem" }}
                            />

                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>

                {/* Description Editor Card (NOTION-LIKE RICH TEXT EDITOR OVER TEXTAREA) */}
                <div className="modern-card">
                  <h4 style={{ margin: "0 0 1rem 0", color: "#0f172a", fontSize: "1.1rem", fontWeight: 800 }}>📝 Mô tả giới thiệu Tour</h4>
                  
                  <RichTextToolbar onInsert={(start, end) => {
                    if (descTextareaRef.current) {
                      const updated = handleInsertTag(descTextareaRef.current, start, end);
                      setDescription(updated);
                    }
                  }} />
                  
                  <textarea
                    ref={descTextareaRef}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Nhập nội dung mô tả giới thiệu chung về chuyến đi (hỗ trợ viết mã HTML)..."
                    rows={12}
                    style={{
                      width: "100%",
                      padding: "1rem",
                      border: "1px solid #cbd5e1",
                      borderBottomLeftRadius: "0.75rem",
                      borderBottomRightRadius: "0.75rem",
                      fontFamily: "monospace",
                      fontSize: "0.92rem",
                      outline: "none"
                    }}
                  />
                </div>

                {/* Notes Editor Card */}
                <div className="modern-card">
                  <h4 style={{ margin: "0 0 1rem 0", color: "#0f172a", fontSize: "1.1rem", fontWeight: 800 }}>📝 Lưu ý hành trình (Điều khoản, bao gồm, visa...)</h4>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Nhập các thông tin lưu ý dành cho khách hàng (ví dụ: Giá bao gồm, Giá chưa bao gồm, Lưu ý khác, Thủ tục visa...)"
                    rows={8}
                    style={{
                      width: "100%",
                      padding: "1rem",
                      border: "1px solid #cbd5e1",
                      borderRadius: "0.75rem",
                      fontFamily: "inherit",
                      fontSize: "0.92rem",
                      outline: "none"
                    }}
                  />
                </div>

                {/* Itinerary Timeline Header */}
                <div className="modern-card">
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem", marginBottom: "1.25rem" }}>
                    <div>
                      <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: 700, color: "#1e293b" }}>Tiêu đề chương trình Lịch trình</label>
                      <input
                        type="text"
                        value={scheduleTitle}
                        onChange={(e) => setScheduleTitle(e.target.value)}
                        placeholder="Ví dụ: Chương trình Lịch trình Chi Tiết"
                        style={{ width: "100%", padding: "0.75rem 1rem", borderRadius: "0.75rem", border: "1px solid #cbd5e1" }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: 700, color: "#1e293b" }}>Tiêu đề lịch trình (en)</label>
                      <input
                        type="text"
                        value={scheduleTitleEn}
                        onChange={(e) => setScheduleTitleEn(e.target.value)}
                        placeholder="English Schedule Title"
                        style={{ width: "100%", padding: "0.75rem 1rem", borderRadius: "0.75rem", border: "1px solid #cbd5e1" }}
                      />
                    </div>
                    <div style={{ gridColumn: "span 2" }}>
                      <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: 700, color: "#1e293b" }}>Icon Lịch trình (schedule_icon)</label>
                      <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                        <input
                          type="text"
                          value={scheduleIcon}
                          onChange={(e) => setScheduleIcon(e.target.value)}
                          placeholder="URL Icon Lịch trình"
                          style={{ flexGrow: 1, padding: "0.75rem 1rem", borderRadius: "0.75rem", border: "1px solid #cbd5e1" }}
                        />
                        <label style={{ padding: "0.75rem 1.25rem", background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: "0.75rem", cursor: "pointer", fontSize: "0.9rem", fontWeight: 700 }}>
                          {iconUploading ? "Tải lên..." : "📁 Chọn Icon"}
                          <input type="file" accept="image/*" onChange={handleIconUpload} style={{ display: "none" }} disabled={iconUploading} />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Itinerary Timeline Days accordion list (VERTICAL TIMELINE ACCORDION INTERFACE) */}
                <div className="modern-card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                    <h4 style={{ margin: 0, color: "#0f172a", fontSize: "1.1rem", fontWeight: 800 }}>📅 Danh sách ngày lịch trình chi tiết</h4>
                    <button
                      type="button"
                      onClick={handleAddItineraryDay}
                      style={{ padding: "0.5rem 1.25rem", background: "#16a34a", color: "white", border: "none", borderRadius: "0.5rem", fontWeight: 700, cursor: "pointer" }}
                    >
                      ➕ Thêm ngày đi
                    </button>
                  </div>

                  {itineraryList.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "2rem", color: "#94a3b8", border: "1px dashed #cbd5e1", borderRadius: "0.75rem", fontStyle: "italic" }}>
                      Chưa cấu hình lịch trình chi tiết. Click "Thêm ngày đi" để bắt đầu thiết lập.
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                      {itineraryList.map((item, idx) => {
                        const isOpen = expandedDays[idx];
                        return (
                          <div key={idx} style={{ border: "1px solid #e2e8f0", borderRadius: "0.75rem", background: "white", overflow: "hidden" }}>
                            
                            {/* Accordion Day Header */}
                            <div
                              onClick={() => setExpandedDays((prev) => ({ ...prev, [idx]: !prev[idx] }))}
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                padding: "0.85rem 1.25rem",
                                background: isOpen ? "#f0fdf4" : "#f8fafc",
                                borderBottom: isOpen ? "1px solid #e2e8f0" : "none",
                                cursor: "pointer",
                                userSelect: "none"
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                                <span style={{ width: "24px", height: "24px", background: "#16a34a", color: "white", borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "0.78rem", fontWeight: 800 }}>
                                  {item.day}
                                </span>
                                <strong style={{ color: "#1e293b", fontSize: "0.95rem" }}>
                                  {item.title || `Ngày thứ ${item.day}`}
                                </strong>
                                {item.title_en && (
                                  <span style={{ color: "#64748b", fontSize: "0.85rem", fontStyle: "italic" }}>
                                    ({item.title_en})
                                  </span>
                                )}
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }} onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItineraryDay(idx)}
                                  style={{ background: "#fee2e2", color: "#ef4444", border: "none", padding: "0.25rem 0.5rem", borderRadius: "0.375rem", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer" }}
                                >
                                  Xóa ngày
                                </button>
                                <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>{isOpen ? "▲" : "▼"}</span>
                              </div>
                            </div>

                            {/* Accordion Day Body */}
                            {isOpen && (
                              <div style={{ padding: "1.25rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem", background: "white" }}>
                                
                                <div>
                                  <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: 700, color: "#475569", fontSize: "0.85rem" }}>Tiêu đề ngày</label>
                                  <input
                                    type="text"
                                    value={item.title || ""}
                                    onChange={(e) => handleItineraryChange(idx, "title", e.target.value)}
                                    placeholder="Ví dụ: Hà Nội - Sapa"
                                    required
                                    style={{ width: "100%", padding: "0.6rem 0.75rem", borderRadius: "0.5rem", border: "1px solid #cbd5e1" }}
                                  />
                                </div>

                                <div>
                                  <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: 700, color: "#475569", fontSize: "0.85rem" }}>Tiêu đề ngày (tiếng Anh)</label>
                                  <input
                                    type="text"
                                    value={item.title_en || ""}
                                    onChange={(e) => handleItineraryChange(idx, "title_en", e.target.value)}
                                    placeholder="English Day Title"
                                    style={{ width: "100%", padding: "0.6rem 0.75rem", borderRadius: "0.5rem", border: "1px solid #cbd5e1" }}
                                  />
                                </div>

                                <div>
                                  <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: 700, color: "#475569", fontSize: "0.85rem" }}>Nghỉ đêm</label>
                                  <input
                                    type="text"
                                    value={item.overnight || ""}
                                    onChange={(e) => handleItineraryChange(idx, "overnight", e.target.value)}
                                    placeholder="Ví dụ: Khách sạn 4* tại Đại Lý"
                                    style={{ width: "100%", padding: "0.6rem 0.75rem", borderRadius: "0.5rem", border: "1px solid #cbd5e1" }}
                                  />
                                </div>

                                <div>
                                  <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: 700, color: "#475569", fontSize: "0.85rem" }}>Bữa ăn</label>
                                  <input
                                    type="text"
                                    value={item.meals || ""}
                                    onChange={(e) => handleItineraryChange(idx, "meals", e.target.value)}
                                    placeholder="Ví dụ: Sáng/Trưa/Tối"
                                    style={{ width: "100%", padding: "0.6rem 0.75rem", borderRadius: "0.5rem", border: "1px solid #cbd5e1" }}
                                  />
                                </div>

                                <div>
                                  <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: 700, color: "#475569", fontSize: "0.85rem" }}>Số thứ tự sắp xếp ngày (Mặc định bằng số Ngày)</label>
                                  <input
                                    type="number"
                                    value={item.sort_order ?? item.day ?? 0}
                                    onChange={(e) => handleItineraryChange(idx, "sort_order", Number(e.target.value))}
                                    style={{ width: "100%", padding: "0.6rem 0.75rem", borderRadius: "0.5rem", border: "1px solid #cbd5e1" }}
                                  />
                                </div>

                                <div>
                                  <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: 700, color: "#475569", fontSize: "0.85rem" }}>Đường dẫn Icon ngày</label>
                                  <div style={{ display: "flex", gap: "0.5rem" }}>
                                    <input
                                      type="text"
                                      value={item.icon || ""}
                                      onChange={(e) => handleItineraryChange(idx, "icon", e.target.value)}
                                      placeholder="URL icon/hình ảnh nhỏ đại diện ngày"
                                      style={{ flexGrow: 1, padding: "0.6rem 0.75rem", borderRadius: "0.5rem", border: "1px solid #cbd5e1" }}
                                    />
                                    <label style={{ padding: "0.6rem 0.85rem", background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: "0.5rem", cursor: "pointer", fontSize: "0.8rem", fontWeight: 700, whiteSpace: "nowrap" }}>
                                      {dayIconUploading[idx] ? "..." : "📁 Tải"}
                                      <input type="file" accept="image/*" onChange={(e) => handleDayIconUpload(e, idx)} style={{ display: "none" }} disabled={dayIconUploading[idx]} />
                                    </label>
                                  </div>
                                </div>

                                <div style={{ gridColumn: "span 2" }}>
                                  <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: 700, color: "#475569", fontSize: "0.85rem" }}>Chi tiết lịch trình hoạt động ngày</label>
                                  
                                  <RichTextToolbar onInsert={(start, end) => {
                                    const textarea = dayTextareaRefs.current[idx];
                                    if (textarea) {
                                      const updated = handleInsertTag(textarea, start, end);
                                      handleItineraryChange(idx, "content", updated);
                                    }
                                  }} />

                                  <textarea
                                    ref={(el) => { dayTextareaRefs.current[idx] = el; }}
                                    value={item.content || ""}
                                    onChange={(e) => handleItineraryChange(idx, "content", e.target.value)}
                                    placeholder="Mô tả chi tiết các địa điểm tham quan, lịch trình ăn uống nghỉ ngơi..."
                                    rows={6}
                                    required
                                    style={{
                                      width: "100%",
                                      padding: "0.75rem",
                                      border: "1px solid #cbd5e1",
                                      borderBottomLeftRadius: "0.5rem",
                                      borderBottomRightRadius: "0.5rem",
                                      fontSize: "0.9rem",
                                      outline: "none"
                                    }}
                                  />
                                </div>

                              </div>
                            )}

                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* Bottom Actions Row */}
            <div style={{ display: "flex", gap: "1rem", borderTop: "1px solid #cbd5e1", paddingTop: "1.5rem", marginTop: "1.5rem", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                style={{ padding: "0.75rem 1.5rem", background: "white", border: "1px solid #cbd5e1", borderRadius: "0.75rem", fontWeight: 700, cursor: "pointer", color: "#334155" }}
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                style={{ padding: "0.75rem 2.5rem", background: "#16a34a", color: "white", border: "none", borderRadius: "0.75rem", fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 12px rgba(22,163,74,0.25)" }}
              >
                {editTourId ? "✓ Cập nhật Tour" : "➕ Thêm Tour Mới"}
              </button>
            </div>

          </form>
        </div>
      ) : (
        /* ------------------------------------------------------------- */
        /* TOUR LIST TABLE (MODERN METADATA, INTERACTIVE TOGGLES) */
        /* ------------------------------------------------------------- */
        <div>
          {/* Header Row */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
            <div>
              <h2 style={{ fontSize: "1.75rem", fontWeight: 800, color: "#0f172a" }}>
                ✈️ Danh sách Tour du lịch
              </h2>
              <p style={{ color: "#64748b", fontSize: "0.95rem" }}>
                Tìm kiếm, lọc danh mục, chỉnh sửa hoặc bật tắt trực tiếp các tham số thuộc tính của Tour
              </p>
            </div>
            
            <div style={{ display: "flex", gap: ".75rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
              {["super_admin", "manager"].includes(currentRole) && <button onClick={handleSyncAllToCrm} disabled={syncingCrm} style={{ padding: "0.65rem 1.2rem", background: "#2563eb", color: "white", border: "none", borderRadius: "0.75rem", fontWeight: 700, cursor: syncingCrm ? "wait" : "pointer" }}>{syncingCrm ? "Đang đồng bộ..." : "↻ Chuyển tour sang CRM"}</button>}
              <button onClick={handleOpenAddForm} style={{ padding: "0.65rem 1.5rem", background: "#16a34a", color: "white", border: "none", borderRadius: "0.75rem", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.5rem", boxShadow: "0 4px 12px rgba(22,163,74,0.2)" }}>➕ Thêm Tour Mới</button>
            </div>
          </div>
          {crmMessage && <div style={{ padding: ".85rem 1rem", marginBottom: "1rem", borderRadius: 10, background: crmMessage.includes("lỗi") || crmMessage.includes("Không") ? "#fef2f2" : "#eff6ff", color: crmMessage.includes("lỗi") || crmMessage.includes("Không") ? "#b91c1c" : "#1d4ed8", fontWeight: 600 }}>{crmMessage}</div>}

          {currentRole === "sale" && <section style={{ marginBottom: "1.25rem", padding: "1.15rem 1.25rem", borderRadius: "1rem", border: "1px solid #bfdbfe", background: "linear-gradient(135deg,#eff6ff 0%,#f8fafc 58%,#fff7ed 100%)", display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: "1rem", alignItems: "center", boxShadow: "0 8px 24px rgba(15,23,42,.06)" }}>
            <div style={{ display: "flex", gap: ".9rem", alignItems: "flex-start" }}>
              <span aria-hidden style={{ width: 46, height: 46, borderRadius: 13, display: "grid", placeItems: "center", flex: "0 0 auto", background: "#2563eb", color: "white", fontSize: "1.3rem" }}>🧭</span>
              <div><div style={{ display: "flex", gap: ".5rem", alignItems: "center", flexWrap: "wrap" }}><strong style={{ color: "#0f172a", fontSize: "1.03rem" }}>Tour mẫu dành cho nhân viên Sale</strong><span style={{ padding: ".2rem .5rem", borderRadius: 999, background: "#dbeafe", color: "#1d4ed8", fontWeight: 800, fontSize: ".7rem" }}>KHÔNG HIỂN THỊ NGOÀI WEBSITE</span></div><p style={{ margin: ".35rem 0 0", color: "#475569", lineHeight: 1.55 }}>Mẫu Hà Nội – Hạ Long đã có giá người lớn, trẻ em, dịch vụ bao gồm/không bao gồm, điều khoản và lịch trình 2 ngày. Dùng mẫu rồi thay nội dung để tạo Tour nhanh hơn.</p></div>
            </div>
            <button type="button" onClick={handleOpenSaleDemo} style={{ border: 0, borderRadius: ".75rem", padding: ".75rem 1rem", background: "#2563eb", color: "white", fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap", boxShadow: "0 5px 14px rgba(37,99,235,.22)" }}>✨ Dùng Tour mẫu</button>
          </section>}

          {/* Filtering and Sorting Section (Screenshot 1 Align) */}
          <div className="modern-card" style={{ display: "grid", gridTemplateColumns: "1.2fr 0.9fr 0.9fr 0.9fr 0.9fr 0.8fr 0.7fr auto", gap: "0.75rem", alignItems: "end", flexWrap: "wrap" }}>
            
            <div>
              <label style={{ display: "block", marginBottom: "0.3rem", fontWeight: 700, fontSize: "0.82rem", color: "#475569" }}>Tìm tên Tour</label>
              <input
                type="text"
                placeholder="Nhập tên hoặc slug..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "0.5rem", border: "1px solid #cbd5e1" }}
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "0.3rem", fontWeight: 700, fontSize: "0.82rem", color: "#475569" }}>Điểm khởi hành</label>
              <select
                value={departureFilter}
                onChange={(e) => setDepartureFilter(e.target.value)}
                style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "0.5rem", border: "1px solid #cbd5e1", background: "white" }}
              >
                <option value="">Tất cả</option>
                {provincesList.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "0.3rem", fontWeight: 700, fontSize: "0.82rem", color: "#475569" }}>Điểm đến</label>
              <select
                value={destinationFilter}
                onChange={(e) => setDestinationFilter(e.target.value)}
                style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "0.5rem", border: "1px solid #cbd5e1", background: "white" }}
              >
                <option value="">Tất cả</option>
                <optgroup label="Tỉnh thành (Trong nước)">
                  {provincesList.map((p) => (
                    <option key={`p-${p.id}`} value={p.id}>{p.name}</option>
                  ))}
                </optgroup>
                <optgroup label="Quốc gia (Nước ngoài)">
                  {countriesList.map((c) => (
                    <option key={`c-${c.id}`} value={c.id}>{c.name}</option>
                  ))}
                </optgroup>
              </select>
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "0.3rem", fontWeight: 700, fontSize: "0.82rem", color: "#475569" }}>Loại hình</label>
              <select
                value={intlFilter}
                onChange={(e) => setIntlFilter(e.target.value)}
                style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "0.5rem", border: "1px solid #cbd5e1", background: "white" }}
              >
                <option value="">Tất cả</option>
                <option value="domestic">Trong nước</option>
                <option value="international">Nước ngoài</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "0.3rem", fontWeight: 700, fontSize: "0.82rem", color: "#475569" }}>Trạng thái</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "0.5rem", border: "1px solid #cbd5e1", background: "white" }}
              >
                <option value="">Tất cả</option>
                <option value="active">Đang hoạt động</option>
                <option value="inactive">Tắt / Ngừng</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "0.3rem", fontWeight: 700, fontSize: "0.82rem", color: "#475569" }}>Sắp xếp theo</label>
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value)}
                style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "0.5rem", border: "1px solid #cbd5e1", background: "white" }}
              >
                <option value="id">ID</option>
                <option value="title">Tên Tour</option>
                <option value="price">Giá bán</option>
                <option value="sort_order">Thứ tự hiển thị</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "0.3rem", fontWeight: 700, fontSize: "0.82rem", color: "#475569" }}>Thứ tự</label>
              <select
                value={sortDirection}
                onChange={(e) => setSortDirection(e.target.value)}
                style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "0.5rem", border: "1px solid #cbd5e1", background: "white" }}
              >
                <option value="desc">Giảm dần (Z-A)</option>
                <option value="asc">Tăng dần (A-Z)</option>
              </select>
            </div>

            <div style={{ display: "flex", gap: "0.35rem" }}>
              <button
                type="button"
                onClick={handleResetFilters}
                style={{ padding: "0.55rem 0.9rem", background: "#cbd5e1", color: "#334155", border: "none", borderRadius: "0.5rem", fontWeight: 700, cursor: "pointer" }}
              >
                🔄 Đặt lại
              </button>
            </div>

          </div>

          {/* Table display */}
          {filteredTours.length === 0 ? (
            <div className="modern-card" style={{ textAlign: "center", padding: "4rem 1.5rem", color: "#94a3b8", fontStyle: "italic" }}>
              Không tìm thấy tour nào khớp với cấu hình lọc tìm kiếm.
            </div>
          ) : (
            <div className="modern-card" style={{ padding: 0, overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.9rem" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "1px solid #cbd5e1" }}>
                    <th style={{ padding: "1rem 0.75rem", width: "40px" }}>#</th>
                    <th style={{ padding: "1rem 0.75rem", width: "80px" }}>Ảnh</th>
                    <th style={{ padding: "1rem 0.75rem" }}>Tên Tour / Điểm đến</th>
                    <th style={{ padding: "1rem 0.75rem" }}>Nơi khởi hành</th>
                    <th style={{ padding: "1rem 0.75rem" }}>Loại Tour</th>
                    <th style={{ padding: "1rem 0.75rem" }}>Thời lượng</th>
                    <th style={{ padding: "1rem 0.75rem" }}>Giá chính thức</th>
                    <th style={{ padding: "1rem 0.75rem", textAlign: "center" }}>Khuyến mãi</th>
                    <th style={{ padding: "1rem 0.75rem", textAlign: "center", width: "80px" }}>Sắp xếp</th>
                    <th style={{ padding: "1rem 0.75rem", textAlign: "center", width: "90px" }}>Kích hoạt</th>
                    <th style={{ padding: "1rem 0.75rem", textAlign: "center", width: "100px" }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTours.map((tour, idx) => (
                    <tr key={tour.id} style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.2s" }} onMouseEnter={(e) => { e.currentTarget.style.background = "#f8fafc"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}>
                      
                      <td style={{ padding: "1rem 0.75rem", color: "#64748b", fontWeight: 700 }}>
                        {idx + 1}
                      </td>

                      <td style={{ padding: "1rem 0.75rem" }}>
                        <img
                          src={(() => {
                            const rawImages = tour.images || [];
                            const primaryImg = rawImages.find((img) => img.is_primary);
                            const bannerImg = rawImages.find((img) => img.image_type === "banner");
                            const chosenImg = primaryImg || bannerImg || rawImages[0];
                            return chosenImg ? chosenImg.url : tour.image;
                          })()}
                          alt={tour.title}
                          style={{ width: "70px", height: "45px", objectFit: "cover", borderRadius: "0.375rem", border: "1px solid #cbd5e1" }}
                          onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80" }}
                        />
                      </td>

                      <td style={{ padding: "1rem 0.75rem" }}>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <span style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.92rem" }}>
                            {tour.title}
                          </span>
                          {tour.title_en && (
                            <span style={{ fontSize: "0.78rem", color: "#64748b", fontStyle: "italic" }}>
                              {tour.title_en}
                            </span>
                          )}
                          <span style={{ fontSize: "0.78rem", color: "#94a3b8" }}>
                            📍 {tour.location}
                          </span>
                          <span style={{ fontSize: ".72rem", color: tour.crm_tour_id ? "#059669" : "#94a3b8", marginTop: 3 }}>{tour.crm_tour_id ? `✓ CRM: ${tour.crm_tour_id}` : `CMS: ${tour.tour_code || tour.id}`}</span>
                        </div>
                      </td>

                      <td style={{ padding: "1rem 0.75rem", fontWeight: 600, color: "#334155" }}>
                        {tour.departure_point ? (
                          <span>🏢 {tour.departure_point.name}</span>
                        ) : (
                          <span style={{ color: "#94a3b8", fontStyle: "italic" }}>Chưa cấu hình</span>
                        )}
                      </td>

                      <td style={{ padding: "1rem 0.75rem" }}>
                        <label className="switch-container">
                          <input
                            type="checkbox"
                            className="switch-input"
                            checked={tour.is_international}
                            onChange={() => handleToggleField(tour.id, "is_international", tour.is_international)}
                          />
                          <div className="switch-track">
                            <div className="switch-thumb"></div>
                          </div>
                        </label>
                        <span style={{ fontSize: "0.78rem", fontWeight: 700, color: tour.is_international ? "#3b82f6" : "#16a34a", marginLeft: "0.5rem" }}>
                          {tour.is_international ? "Quốc tế" : "Trong nước"}
                        </span>
                      </td>

                      <td style={{ padding: "1rem 0.75rem", fontWeight: 700, color: "#475569" }}>
                        ⏱️ {tour.duration}
                      </td>

                      <td style={{ padding: "1rem 0.75rem", fontWeight: 800, color: "#0f172a" }}>
                        {formatPrice(tour.price)}
                      </td>

                      <td style={{ padding: "1rem 0.75rem", textAlign: "center" }}>
                        <label className="switch-container">
                          <input
                            type="checkbox"
                            className="switch-input"
                            checked={tour.is_promo}
                            onChange={() => handleToggleField(tour.id, "is_promo", tour.is_promo)}
                          />
                          <div className="switch-track">
                            <div className="switch-thumb"></div>
                          </div>
                        </label>
                      </td>

                      <td style={{ padding: "1rem 0.75rem", textAlign: "center", fontWeight: 800, color: "#64748b" }}>
                        {tour.sort_order}
                      </td>

                      <td style={{ padding: "1rem 0.75rem", textAlign: "center" }}>
                        <label className="switch-container">
                          <input
                            type="checkbox"
                            className="switch-input"
                            checked={tour.is_active}
                            onChange={() => handleToggleField(tour.id, "is_active", tour.is_active)}
                          />
                          <div className="switch-track">
                            <div className="switch-thumb"></div>
                          </div>
                        </label>
                      </td>

                      <td style={{ padding: "1rem 0.75rem", textAlign: "center" }}>
                        <div style={{ display: "flex", justifyContent: "center", gap: "0.4rem" }}>
                          {(["super_admin", "manager", "editor"].includes(currentRole) || (currentRole === "sale" && tour.created_by_id === currentUserId)) && <button
                            onClick={() => handleOpenEditForm(tour)}
                            style={{ background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: "0.375rem", width: "30px", height: "30px", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                            title="Chỉnh sửa Tour"
                          >
                            ✏️
                          </button>}
                          <button
                            onClick={() => handleDeleteTour(tour.id)}
                            style={{ background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: "0.375rem", width: "30px", height: "30px", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                            title="Xóa Tour"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── QR Code Modal ── */}
      {qrModalData && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.75)",
            backdropFilter: "blur(8px)",
            zIndex: 1100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem"
          }}
          onClick={() => setQrModalData(null)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "400px",
              background: "white",
              borderRadius: "1.5rem",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              padding: "2.5rem 2rem",
              textAlign: "center",
              position: "relative"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "1.2rem", fontWeight: 800, color: "#0f172a" }}>
              📱 Mã QR Chương Trình Tour
            </h4>
            <p style={{ margin: "0 0 1.5rem 0", fontSize: "0.85rem", color: "#64748b", fontWeight: 600, lineHeight: 1.4 }}>
              {qrModalData.title}
            </p>
            
            <div style={{ background: "#f8fafc", padding: "1.5rem", borderRadius: "1rem", display: "inline-block", border: "1px solid #e2e8f0", marginBottom: "1.5rem" }}>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrModalData.url)}`}
                alt="Tour Program QR Code"
                style={{ width: "220px", height: "220px", display: "block" }}
              />
            </div>
            
            <p style={{ fontSize: "0.8rem", wordBreak: "break-all", color: "#475569", background: "#f1f5f9", padding: "0.75rem", borderRadius: "0.5rem", margin: "0 0 1.5rem 0", lineHeight: 1.4 }}>
              <a href={qrModalData.url} target="_blank" rel="noopener noreferrer" style={{ color: "#2563eb", fontWeight: 600, textDecoration: "underline" }}>
                {qrModalData.url}
              </a>
            </p>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
              <button
                type="button"
                onClick={() => handleCopyQR(qrModalData.url)}
                style={{
                  padding: "0.75rem",
                  borderRadius: "0.75rem",
                  background: "#eff6ff",
                  color: "#1d4ed8",
                  border: "1px solid #bfdbfe",
                  fontWeight: 700,
                  cursor: "pointer",
                  fontSize: "0.85rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.25rem"
                }}
              >
                📋 Sao chép
              </button>
              <button
                type="button"
                onClick={() => handleDownloadQR(qrModalData.url, qrModalData.title)}
                style={{
                  padding: "0.75rem",
                  borderRadius: "0.75rem",
                  background: "#f0fdf4",
                  color: "#15803d",
                  border: "1px solid #bbf7d0",
                  fontWeight: 700,
                  cursor: "pointer",
                  fontSize: "0.85rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.25rem"
                }}
              >
                💾 Tải ảnh
              </button>
            </div>

            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                type="button"
                onClick={() => setQrModalData(null)}
                style={{
                  flex: 1,
                  padding: "0.75rem",
                  borderRadius: "0.75rem",
                  background: "#f1f5f9",
                  color: "#334155",
                  border: "none",
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                Đóng
              </button>
              <a
                href={`https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&data=${encodeURIComponent(qrModalData.url)}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  flex: 1,
                  padding: "0.75rem",
                  borderRadius: "0.75rem",
                  background: "var(--primary)",
                  color: "white",
                  border: "none",
                  fontWeight: 700,
                  cursor: "pointer",
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                Tải QR Lớn
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ToursManager() {
  return (
    <Suspense fallback={
      <div style={{ display: "flex", justifyContent: "center", padding: "8rem 2rem" }}>
        <div className="admin-spinner"></div>
      </div>
    }>
      <ToursManagerContent />
    </Suspense>
  );
}
