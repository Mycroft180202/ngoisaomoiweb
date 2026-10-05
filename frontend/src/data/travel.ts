export const navigation = [
  { label: "Du lịch trong nước", href: "/tours?type=domestic" },
  { label: "Du lịch nước ngoài", href: "/tours?type=international" },
  { label: "Tour nổi bật", href: "/#featured-tours" },
  { label: "Tin tức", href: "/news" },
  { label: "Tra cứu đơn hàng", href: "/lookup" },
  { label: "Liên hệ", href: "/contact" },
];

export const hero = {
  kicker: "New Star Tour",
  title: "Khám phá tour trong nước và quốc tế theo cách hiện đại hơn.",
  description:
    "Trang UI mới giữ phong cách sang, thoáng và mobile-first, nhưng đã được bơm lại nội dung thật từ New Star Tour: menu, điểm đến, dịch vụ, tin tức và thông tin liên hệ.",
  primaryCta: { label: "Xem tour nổi bật", href: "/#featured-tours" },
  secondaryCta: { label: "Liên hệ ngay", href: "/contact" },
};

export const quickAccess = [
  "Phú Quốc",
  "Đà Nẵng",
  "Nha Trang",
  "Đà Lạt",
  "Miền Bắc",
  "Miền Trung",
  "Miền Nam",
];

export const serviceHighlights = [
  "Đảm bảo giá tốt",
  "Thương hiệu uy tín",
  "Hỗ trợ 24/7",
  "Nhiều ưu đãi",
  "Lịch trình linh hoạt",
];

export const featuredTours = [
  {
    slug: "phu-quoc-3n2d",
    title: "Phú Quốc 3N2Đ",
    route: "Daily tour / Bắc Đảo",
    duration: "3N2Đ",
    price: "Liên hệ",
    tag: "Hot",
    type: "domestic",
    description: "Trải nghiệm Đảo Ngọc Phú Quốc với lịch trình 3 ngày 2 đêm đầy thú vị. Khám phá Bắc Đảo hoang sơ, vui chơi giải trí tại VinWonders, tham quan Safari và thưởng thức ẩm thực hải sản tươi ngon độc đáo của địa phương.",
    highlights: [
      "Xe đưa đón sân bay và tham quan đời mới nhất",
      "Khách sạn 4 sao trung tâm sát biển sang trọng",
      "Vé tham quan các điểm du lịch nổi tiếng Bắc Đảo",
      "Hướng dẫn viên chuyên nghiệp, am hiểu địa phương suốt tuyến",
      "Bảo hiểm du lịch trọn gói mức bồi thường 50.000.000đ/vụ"
    ],
    itinerary: [
      {
        day: "Ngày 1",
        title: "Đón sân bay Phú Quốc - Khám phá Đông Đảo",
        activities: [
          "Xe và HDV đón khách tại sân bay Phú Quốc đưa về nhận phòng khách sạn nghỉ ngơi.",
          "Chiều khởi hành đi tham quan Đông Đảo: Vườn tiêu suối đá, Cơ sở sản xuất rượu sim rừng.",
          "Tham quan Dinh Cậu - biểu tượng tâm linh tôn nghiêm của ngư dân đảo Ngọc.",
          "Ăn tối tại nhà hàng biển và tự do khám phá chợ đêm Bạch Đằng."
        ]
      },
      {
        day: "Ngày 2",
        title: "Khám phá Bắc Đảo hoang sơ - Thành phố không ngủ Grand World",
        activities: [
          "Ăn sáng buffet tại khách sạn. Khởi hành đi Bắc Đảo xuyên rừng quốc gia Phú Quốc.",
          "Ghé thăm Mũi Gành Dầu - ngắm hải giới Việt Nam - Campuchia và bãi tắm hoang sơ.",
          "Chiều tối tự do vui chơi tại Grand World Phú Quốc: Xem show tinh hoa Việt Nam, đi thuyền trên sông Venice thu nhỏ (chi phí tự túc).",
          "Thưởng thức bữa tối và xem trình diễn nhạc nước sắc màu Venice rực rỡ."
        ]
      },
      {
        day: "Ngày 3",
        title: "Mua sắm đặc sản - Tiễn sân bay Phú Quốc",
        activities: [
          "Ăn sáng, tự do tắm biển hoặc sử dụng các dịch vụ tiện ích tại khách sạn.",
          "Ghé thăm nhà thùng nước mắm truyền thống lâu đời nổi tiếng Phú Quốc.",
          "Mua sắm đặc sản Ngọc Trai làm quà lưu niệm.",
          "Xe tiễn đoàn ra sân bay Phú Quốc, HDV chào tạm biệt và kết thúc hành trình."
        ]
      }
    ],
    images: [
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1505764706515-aa95265c5abc?auto=format&fit=crop&w=900&q=80"
    ]
  },
  {
    slug: "thanh-hoa-sam-son-2n1d",
    title: "Thanh Hóa - Sầm Sơn",
    route: "Suối Cá Thần • Thiền Viện Trúc Lâm",
    duration: "2N1Đ",
    price: "Từ 1.490.000đ",
    tag: "Nội địa",
    type: "domestic",
    description: "Hành trình nghỉ dưỡng và tâm linh thú vị đưa quý khách đến với bãi biển Sầm Sơn thơ mộng, khám phá danh thắng Suối Cá Thần Cẩm Lương độc đáo và chiêm bái Thiền Viện Trúc Lâm Hàm Rồng tôn nghiêm.",
    highlights: [
      "Xe du lịch đời mới đưa đón suốt hành trình từ Hà Nội",
      "Khách sạn tiêu chuẩn 3-4 sao gần biển Sầm Sơn tiện nghi",
      "Thực đơn các bữa ăn đậm đà hương vị hải sản xứ Thanh",
      "Vé tham quan các điểm trong chương trình",
      "Bảo hiểm du lịch an toàn suốt chuyến đi"
    ],
    itinerary: [
      {
        day: "Ngày 1",
        title: "Hà Nội - Suối Cá Thần Cẩm Lương - Sầm Sơn",
        activities: [
          "Xe đón đoàn tại Hà Nội khởi hành đi Thanh Hóa.",
          "Tham quan khu du lịch Suối Cá Thần Cẩm Lương ngắm hàng nghìn con cá lạ bơi lội dày đặc.",
          "Di chuyển về Sầm Sơn, ăn trưa và nhận phòng khách sạn.",
          "Chiều tự do tắm biển Sầm Sơn, đón sóng lộng gió.",
          "Ăn tối hải sản và tự do dạo chơi phố biển bằng xe điện."
        ]
      },
      {
        day: "Ngày 2",
        title: "Đền Độc Cước - Hòn Trống Mái - Đền Cô Tiên - Hà Nội",
        activities: [
          "Ăn sáng, tham quan núi Trường Lệ: Chiêm bái Đền Độc Cước cổ kính, ngắm Hòn Trống Mái biểu tượng tình yêu thủy chung, viếng Đền Cô Tiên linh thiêng.",
          "Ăn trưa tại nhà hàng, trả phòng khách sạn.",
          "Trên đường về Hà Nội ghé thăm Thiền Viện Trúc Lâm Hàm Rồng yên bình.",
          "Mua đặc sản nem chua Thanh Hóa, bánh gai làm quà.",
          "Về đến Hà Nội, xe trả khách tại điểm hẹn ban đầu."
        ]
      }
    ],
    images: [
      "https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=80"
    ]
  },
  {
    slug: "singapore-malaysia-4n3d",
    title: "Singapore - Malaysia",
    route: "Tour ghép quốc tế",
    duration: "4N3Đ",
    price: "Liên hệ",
    tag: "Quốc tế",
    type: "international",
    description: "Hành trình liên tuyến khám phá hai quốc gia Đông Nam Á hiện đại và quyến rũ. Chiêm ngưỡng Singapore siêu hiện đại với Marina Bay Sands, Garden by the Bay và trải nghiệm văn hóa đa dạng tại Kuala Lumpur - Malaysia.",
    highlights: [
      "Vé máy bay khứ hồi quốc tế kèm hành lý ký gửi",
      "Khách sạn tiêu chuẩn 3-4 sao trung tâm đầy đủ tiện nghi",
      "Vé vào cổng các điểm tham quan theo lịch trình",
      "Các bữa ăn chính chất lượng mang hương vị địa phương",
      "Hướng dẫn viên chuyên nghiệp nói tiếng Việt đi theo từ Việt Nam"
    ],
    itinerary: [
      {
        day: "Ngày 1",
        title: "Việt Nam - Singapore - City Tour ấn tượng",
        activities: [
          "HDV đón đoàn tại sân bay làm thủ tục đáp chuyến bay đi Singapore.",
          "Đến sân bay Changi, xe đưa đoàn đi tham quan: Công viên sư tử biển Merlion Park, Nhà hát Esplanade hình trái sầu riêng.",
          "Ăn tối và tự do khám phá Singapore về đêm với tour du thuyền sông Singapore (chi phí tự túc)."
        ]
      },
      {
        day: "Ngày 2",
        title: "Gardens by the Bay - Đảo Sentosa - Nhập cảnh Malaysia",
        activities: [
          "Tham quan siêu công viên Gardens by the Bay với các siêu cây năng lượng độc đáo.",
          "Di chuyển sang Đảo Sentosa, chụp hình check-in với biểu tượng Universal Studio.",
          "Khởi hành qua cửa khẩu đường bộ nhập cảnh vào Johor Bahru - Malaysia.",
          "Ăn tối và nghỉ đêm tại khách sạn Johor Bahru."
        ]
      },
      {
        day: "Ngày 3",
        title: "Johor Bahru - Thủ đô Kuala Lumpur - Tháp Đôi Petronas",
        activities: [
          "Ăn sáng, trả phòng. Khởi hành đi thủ đô Kuala Lumpur.",
          "Tham quan Cung điện Hoàng Gia, Quảng trường Độc Lập.",
          "Check-in chụp hình kỷ niệm trước Tháp đôi Petronas - niềm tự hào của người dân Malaysia.",
          "Thưởng thức bữa tối đặc sản địa phương và nhận phòng nghỉ ngơi."
        ]
      },
      {
        day: "Ngày 4",
        title: "Động Batu - Thành phố thông minh Putrajaya - Tiễn sân bay",
        activities: [
          "Tham quan Động Batu - thánh địa Ấn Độ giáo nổi tiếng với những bậc thang rực rỡ màu sắc.",
          "Khám phá thành phố mới Putrajaya - trung tâm hành chính thông minh của Malaysia.",
          "Xe đưa đoàn ra sân bay quốc tế Kuala Lumpur làm thủ tục đáp chuyến bay về Việt Nam.",
          "Đến sân bay Việt Nam, HDV chia tay đoàn và kết thúc chương trình."
        ]
      }
    ],
    images: [
      "https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=900&q=80"
    ]
  },
  {
    slug: "sapa-lao-cai-3n2d",
    title: "Sapa - Lào Cai",
    route: "Tour ghép khởi hành thường xuyên",
    duration: "3N2Đ",
    price: "Từ 2.090.000đ",
    tag: "Nổi bật",
    type: "domestic",
    description: "Thoát khỏi ồn ào đô thị để đến với Sapa - thị trấn trong sương thơ mộng. Chinh phục đỉnh Fansipan huyền thoại, dạo chơi bản Cát Cát xinh đẹp và trải nghiệm nét văn hóa vùng cao Tây Bắc đặc sắc.",
    highlights: [
      "Xe giường nằm chất lượng cao khứ hồi Hà Nội - Sapa",
      "Khách sạn view núi mây tuyệt đẹp ngay trung tâm",
      "Các bữa ăn chính ngon miệng với đặc sản núi rừng Tây Bắc",
      "Vé tham quan Bản Cát Cát và các danh thắng",
      "Hỗ trợ tư vấn đặt vé cáp treo Fansipan nhanh chóng"
    ],
    itinerary: [
      {
        day: "Ngày 1",
        title: "Hà Nội - Sapa - Bản Cát Cát mộc mạc",
        activities: [
          "Xe đón quý khách khởi hành đi Sapa qua tuyến đường cao tốc Nội Bài - Lào Cai.",
          "Trưa đến thị trấn Sapa, ăn trưa và nhận phòng khách sạn nghỉ ngơi.",
          "Chiều HDV đưa quý khách đi bộ tham quan Bản Cát Cát của người H’mông - tìm hiểu nghề dệt lanh và phong tục truyền thống.",
          "Ăn tối lẩu cá hồi đặc sản và tự do tham quan nhà thờ đá Sapa."
        ]
      },
      {
        day: "Ngày 2",
        title: "Chinh phục đỉnh Fansipan - Nóc nhà Đông Dương",
        activities: [
          "Ăn sáng. Xe đưa đoàn đến ga cáp treo Fansipan.",
          "Trải nghiệm cáp treo 3 dây đạt kỷ lục thế giới, ngắm thung lũng Mường Hoa thơ mộng bên dưới.",
          "Chinh phục đỉnh cao 3.143m ngắm biển mây ngập tràn (chi phí vé cáp treo tự túc).",
          "Chiều tự do tham quan núi Hàm Rồng hoặc check-in các quán cafe view thung lũng đẹp mắt."
        ]
      },
      {
        day: "Ngày 3",
        title: "Sapa tự do khám phá - Hà Nội",
        activities: [
          "Ăn sáng buffet tại khách sạn. Quý khách tự do đi chợ Sapa mua sắm sản vật địa phương.",
          "Ăn trưa, trả phòng khách sạn.",
          "Chiều xe đón đoàn khởi hành về lại Hà Nội.",
          "Tối đoàn về đến Hà Nội, kết thúc chuyến đi tốt đẹp."
        ]
      }
    ],
    images: [
      "https://images.unsplash.com/photo-1505764706515-aa95265c5abc?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=900&q=80"
    ]
  },
  {
    slug: "can-tho-ca-mau-bac-lieu-soc-trang-4n3d",
    title: "Cần Thơ - Cà Mau - Bạc Liêu - Sóc Trăng",
    route: "Khám phá miền Tây sông nước",
    duration: "4N3Đ",
    price: "Liên hệ",
    tag: "Miền Tây",
    type: "domestic",
    description: "Hành trình đưa quý khách du ngoạn lục tỉnh Nam Kỳ, ghé thăm bến Ninh Kiều trứ danh, chinh phục Cột mốc tọa độ Quốc gia Đất Mũi Cà Mau xa xôi, viếng nhà Công tử Bạc Liêu cổ kính và chiêm bái những ngôi chùa Khmer độc đáo ở Sóc Trăng.",
    highlights: [
      "Xe du lịch máy lạnh đời mới vận chuyển suốt tuyến",
      "Khách sạn tiêu chuẩn 3 sao trung tâm tiện nghi",
      "Vé tham quan, cano khứ hồi đi Đất Mũi Cà Mau",
      "Ăn uống đặc sản miền Tây: Cá lóc nướng trui, lẩu mắm...",
      "Hướng dẫn viên miền Tây nhiệt tình, dí dỏm và chu đáo"
    ],
    itinerary: [
      {
        day: "Ngày 1",
        title: "TP.HCM - Sóc Trăng - Bạc Liêu danh tiếng",
        activities: [
          "Xe và HDV đón khách tại điểm hẹn khởi hành đi miền Tây.",
          "Đến Sóc Trăng viếng Chùa Chén Kiểu, Chùa Dơi độc đáo của đồng bào Khmer.",
          "Di chuyển về Bạc Liêu, tham quan nhà Công tử Bạc Liêu nghe giai thoại ly kỳ.",
          "Ăn tối và nghỉ đêm tại Bạc Liêu."
        ]
      },
      {
        day: "Ngày 2",
        title: "Bạc Liêu - Cột mốc tọa độ Mũi Cà Mau - TP. Cà Mau",
        activities: [
          "Ăn sáng, khởi hành đi Năm Căn - Cà Mau.",
          "Trải nghiệm cano len lỏi giữa rừng đước bạt ngàn đến Đất Mũi Cà Mau.",
          "Chụp ảnh lưu niệm tại Cột mốc tọa độ quốc gia, biểu tượng Mũi tàu Cà Mau.",
          "Quay về TP. Cà Mau ăn tối và tự do khám phá chợ đêm Cà Mau."
        ]
      },
      {
        day: "Ngày 3",
        title: "Cà Mau - Cần Thơ - Bến Ninh Kiều thơ mộng",
        activities: [
          "Ăn sáng, trả phòng. Di chuyển về TP. Cần Thơ gạo trắng nước trong.",
          "Tham quan Thiền Viện Trúc Lâm Phương Nam - ngôi chùa lớn nhất miền Tây.",
          "Nhận phòng khách sạn, chiều tự do dạo chơi Bến Ninh Kiều.",
          "Bữa tối đặc biệt trên du thuyền Cần Thơ sang trọng nghe đờn ca tài tử."
        ]
      },
      {
        day: "Ngày 4",
        title: "Chợ nổi Cái Răng náo nhiệt - Vườn trái cây - TP.HCM",
        activities: [
          "Sáng sớm thuyền đưa đoàn đi tham quan Chợ nổi Cái Răng - nét văn hóa mua bán trên sông độc đáo.",
          "Ghé thăm vườn trái cây trĩu quả theo mùa và cơ sở sản xuất hủ tiếu truyền thống.",
          "Ăn trưa, khởi hành về lại điểm hẹn ban đầu.",
          "Chào tạm biệt đoàn và hẹn gặp lại."
        ]
      }
    ],
    images: [
      "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1505764706515-aa95265c5abc?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=80"
    ]
  },
  {
    slug: "dubai-abu-dhabi-5n4d",
    title: "Dubai - Abu Dhabi",
    route: "Tour quốc tế cao cấp",
    duration: "5N4Đ",
    price: "Liên hệ",
    tag: "Premium",
    type: "international",
    description: "Khám phá vương quốc xa hoa bậc nhất thế giới Dubai và thủ đô Abu Dhabi tráng lệ. Trải nghiệm xe địa hình vượt sa mạc Safari, chiêm ngưỡng tòa tháp cao nhất thế giới Burj Khalifa và thánh đường Hồi giáo Sheikh Zayed lộng lẫy.",
    highlights: [
      "Vé máy bay khứ hồi hàng không 5 sao cao cấp kèm hành lý",
      "Visa nhập cảnh Dubai trọn gói nhanh chóng",
      "Khách sạn tiêu chuẩn 4-5 sao đẳng cấp thế giới",
      "Trải nghiệm vượt sa mạc bằng xe 2 cầu Land Cruiser chuyên dụng",
      "Thưởng thức buffet BBQ sa mạc và xem múa bụng truyền thống Belly Dance"
    ],
    itinerary: [
      {
        day: "Ngày 1",
        title: "Việt Nam - Đáp chuyến bay sang vương quốc Dubai",
        activities: [
          "Đoàn tập trung tại sân bay làm thủ tục đi Dubai.",
          "Đến sân bay quốc tế Dubai, xe và HDV đón đoàn đưa về nhận phòng khách sạn 5 sao nghỉ ngơi."
        ]
      },
      {
        day: "Ngày 2",
        title: "Dubai Cổ Kính - Taxi nước - Tháp Burj Khalifa kỷ lục",
        activities: [
          "Khám phá khu phố cổ Bastakyah, đi thuyền gỗ Abra taxi nước qua vịnh lạch Dubai.",
          "Mua sắm tại chợ Vàng Gold Souk và chợ Gia Vị Spice Souk sầm uất.",
          "Chiều tham quan trung tâm thương mại Dubai Mall khổng lồ.",
          "Chụp hình check-in tháp Burj Khalifa cao 828m, xem trình diễn nhạc nước Water Fountain lôi cuốn."
        ]
      },
      {
        day: "Ngày 3",
        title: "Đảo Cọ Palm Jumeirah - Trải nghiệm Sa mạc Safari kịch tính",
        activities: [
          "Trải nghiệm tàu điện một ray Monorail ngắm Đảo Cọ Palm Jumeirah - kỳ quan nhân tạo thế giới.",
          "Chiều xuất phát đi sa mạc Safari bằng Land Cruiser vượt cát cảm giác mạnh.",
          "Cưỡi lạc đà, vẽ henna, ăn tối BBQ buffet tại trại sa mạc và thưởng thức múa lửa nghệ thuật dưới bầu trời đêm."
        ]
      },
      {
        day: "Ngày 4",
        title: "Khám phá thủ đô Abu Dhabi tráng lệ - Thánh đường lớn",
        activities: [
          "Khởi hành đi Abu Dhabi - thủ đô giàu có của UAE.",
          "Ghé thăm Thánh đường Hồi giáo Sheikh Zayed Grand Mosque lộng lẫy dát vàng và cẩm thạch trắng.",
          "Check-in bên ngoài khách sạn cung điện Emirates Palace siêu sang.",
          "Ăn tối và quay về Dubai nghỉ đêm."
        ]
      },
      {
        day: "Ngày 5",
        title: "Dubai - Mua sắm tự do - Về lại Việt Nam",
        activities: [
          "Ăn sáng, tự do dạo chơi hoặc mua sắm chà là đặc sản tại chợ địa phương.",
          "Làm thủ tục trả phòng, xe tiễn đoàn ra sân bay Dubai đáp chuyến bay về Việt Nam.",
          "Về đến Việt Nam, kết thúc chương trình du lịch hoàng gia tuyệt đẹp."
        ]
      }
    ],
    images: [
      "https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=80"
    ]
  }
];

export const domesticDestinations = ["Phú Quốc", "Hà Nội", "Ninh Bình", "Sapa - Lào Cai", "Hà Giang", "Sầm Sơn"];
export const internationalDestinations = ["Myanmar", "Trung Quốc", "Nhật Bản", "Singapore", "Malaysia", "Bhutan"];

export const testimonials = [
  { 
    quote: "Tư vấn nhanh, lịch trình rõ ràng, hỗ trợ khá tận tâm trước và trong chuyến đi.", 
    author: "Minh Anh", 
    role: "Khách hàng",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&h=150&q=80"
  },
  { 
    quote: "Tour đa dạng trong nước và quốc tế, dễ tìm theo điểm đến mình muốn.", 
    author: "Hoàng Nam", 
    role: "Khách hàng",
    avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=150&h=150&q=80"
  },
  { 
    quote: "Phần chăm sóc khách hàng và hotline làm mình yên tâm hơn khi đặt tour.", 
    author: "Thu Hà", 
    role: "Khách hàng",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80"
  },
  { 
    quote: "Thông tin doanh nghiệp, chi nhánh và liên hệ được trình bày khá đầy đủ.", 
    author: "Quang Huy", 
    role: "Khách hàng",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80"
  },
];

export const news = [
  {
    slug: "sam-son-doi-moi-dien-mao-do-thi-bien",
    title: "Sầm Sơn đổi mới diện mạo đô thị biển",
    date: "12 Jun 2026",
    summary: "Thành phố biển Sầm Sơn đang trải qua đợt nâng cấp cơ sở hạ tầng toàn diện nhằm hướng tới trở thành đô thị du lịch biển đẳng cấp khu vực.",
    image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80",
    content: [
      "Những năm gần đây, thành phố Sầm Sơn (tỉnh Thanh Hóa) đang chuyển mình mạnh mẽ với hàng loạt dự án hạ tầng giao thông và đô thị quy mô lớn. Không còn hình ảnh xô bồ, Sầm Sơn ngày nay khoác lên mình diện mạo khang trang, hiện đại và văn minh hơn.",
      "Hệ thống đường ven biển Hồ Xuân Hương đã được cải tạo toàn diện, tạo không gian đi bộ rộng rãi và thoáng mát cho du khách. Bên cạnh đó, các đại lộ quảng trường biển lớn kết hợp nhạc nước quy mô đang trở thành điểm vui chơi ban đêm lý tưởng thu hút hàng vạn người tham gia.",
      "Với việc đầu tư đồng bộ từ nhà nước cùng sự tham gia của các tập đoàn du lịch lớn, Sầm Sơn hứa hẹn sẽ không chỉ là điểm đến mùa hè mà còn là đô thị biển sôi động bốn mùa, mang lại trải nghiệm du lịch văn minh, an toàn và cao cấp cho du khách trong nước lẫn quốc tế."
    ]
  },
  {
    slug: "kham-pha-khu-du-lich-sam-son-mua-cao-diem",
    title: "Khám phá khu du lịch Sầm Sơn mùa cao điểm",
    date: "18 Jun 2026",
    summary: "Những kinh nghiệm bỏ túi cực kỳ hữu ích giúp bạn và gia đình có một chuyến du lịch Sầm Sơn trọn vẹn, tránh tình trạng quá tải và 'chặt chém'.",
    image: "https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=600&q=80",
    content: [
      "Mùa hè là thời điểm Sầm Sơn chào đón hàng triệu lượt khách du lịch tìm về tránh nóng. Để có chuyến đi thư thái và an toàn trong những ngày cao điểm này, việc chuẩn bị kỹ lưỡng các thông tin dịch vụ là điều vô cùng cần thiết.",
      "Đầu tiên, hãy ưu tiên đặt phòng khách sạn trước ít nhất từ 2-4 tuần để tránh tình trạng cháy phòng hoặc giá phòng tăng cao. Nên chọn các cơ sở lưu trú uy tín ở khu vực bãi A, B hoặc C nếu muốn thuận tiện tắm biển, hoặc khu FLC nếu cần không gian yên tĩnh, sang trọng.",
      "Về ăn uống, du khách nên chọn các nhà hàng có niêm yết giá rõ ràng hoặc hỏi kỹ giá cả trước khi gọi món. Hãy tận dụng hệ thống hotline phản ánh của UBND thành phố Sầm Sơn nếu gặp bất kỳ hành vi ép giá hay gian lận thương mại nào. Sự chủ động này sẽ giúp bạn có một kỳ nghỉ thật vui vẻ và trọn vẹn."
    ]
  },
  {
    slug: "den-co-tien-va-hanh-trinh-tim-ve-dau-an-dia-phuong",
    title: "Đền Cô Tiên và hành trình tìm về dấu ấn địa phương",
    date: "24 Jun 2026",
    summary: "Tìm hiểu truyền thuyết ly kỳ về Đền Cô Tiên tọa lạc trên đỉnh hòn Đầu Voi thuộc dãy núi Trường Lệ, điểm tâm linh nổi tiếng của Sầm Sơn.",
    image: "https://images.unsplash.com/photo-1505764706515-aa95265c5abc?auto=format&fit=crop&w=600&q=80",
    content: [
      "Nằm nép mình cuối dãy núi Trường Lệ thơ mộng, Đền Cô Tiên là một trong những điểm di tích lịch sử tâm linh được du khách yêu thích nhất khi tới Sầm Sơn. Ngôi đền cổ kính rêu phong hướng mặt ra đại dương bao la, mang lại cảm giác thanh bình, tự tại.",
      "Theo truyền thuyết dân gian, đền thờ một người con gái làm nghề bốc thuốc chữa bệnh cứu người, sau đó cùng chồng hóa thân bay về trời. Để tưởng nhớ công đức của bà, người dân địa phương đã lập đền thờ phụng tại đỉnh hòn Đầu Voi, nơi đất trời giao thoa linh thiêng.",
      "Đến viếng đền Cô Tiên, du khách không chỉ được chiêm bái, cầu bình an cho gia đình mà còn được thả hồn vào tiếng sóng vỗ rì rào bên rặng thông già, chiêm ngưỡng toàn cảnh bãi biển Sầm Sơn từ trên cao. Đây thực sự là điểm dừng chân giúp xoa dịu tâm hồn sau những lo toan, bộn bề của cuộc sống thường nhật."
    ]
  }
];

export const contactOffices = [
  {
    name: "Trụ sở chính",
    address: "Tầng 2, tòa nhà 139 - 141 đường Nghi Tàm, phường Tây Hồ, TP. Hà Nội, Việt Nam",
    phones: ["024.3717.0668", "024.3717.2299"],
    hotlines: ["0367.535.688", "08666.57199", "0913.223.821"],
    email: "sales@newstartour.vn",
  },
  {
    name: "Chi nhánh Bắc Ninh",
    address: "No.02.22 Khu đô thị mới Đạo Sử, Lương Tài, Bắc Ninh",
    phones: ["0222.365.1666", "0222.626.1999", "0222.6262.555"],
    hotlines: ["08666.57199", "0812.998.919", "0333.655.567", "0913.223.821"],
    email: "sales@newstartour.vn",
  },
  {
    name: "Văn phòng Phú Quốc",
    address: "Bãi Trường, Phú Quốc, Kiên Giang, Việt Nam",
    phones: ["0825.888.499", "0913.223.821"],
    hotlines: ["08666.57199", "0333.655.567"],
    email: "dieuhanhpq@newstartour.vn",
  },
];

export const footerLinks = [
  "Tour du lịch trong nước",
  "Tour du lịch quốc tế",
  "Tour ghép Hạ Long",
  "Tour ghép Đà Nẵng",
  "Tour ghép SaPa",
  "Tour ghép Hà Nội",
  "Tin tức",
  "Tuyển dụng",
];
export const domesticRegions = [
  {
    title: "Miền Bắc",
    provinces: [
      "Lạng Sơn", "Điện Biên", "Hà Giang", "Hạ Long - Quảng Ninh", 
      "Hà Nội", "Hải Phòng", "Hòa Bình", "Ninh Bình", 
      "Sapa - Lào Cai", "Thanh Hóa"
    ]
  },
  {
    title: "Miền Trung",
    provinces: [
      "Đà Lạt", "Huế - Đà Nẵng - Hội An", "Lý Sơn - Quảng Ngãi", 
      "Mũi Né - Bình Thuận", "Nghệ An - Hà Tĩnh", "Nha Trang", 
      "Quảng Bình - Quảng Trị", "Quy Nhơn - Bình Định", "Tây Nguyên", 
      "Tuy Hòa - Phú Yên"
    ]
  },
  {
    title: "Miền Nam",
    provinces: [
      "Côn Đảo", "TP Hồ Chí Minh", "Phú Quốc", "Miền Tây", "Vũng Tàu"
    ]
  },
  {
    title: "Sản phẩm đặc biệt",
    provinces: []
  }
];

export const internationalContinents = [
  {
    title: "Châu Á",
    countries: [
      "Campuchia", "Thái Lan", "Singapore", "Malaysia", "Indonesia", 
      "Myanmar", "Philippines", "Lào", "Trung Quốc", "Hongkong - Macao", 
      "Đài Loan", "Hàn Quốc", "Nhật Bản", "Maldives", "Ấn Độ - Nepal", 
      "Bhutan", "Dubai - Abu Dhabi"
    ]
  },
  {
    title: "Châu Âu",
    countries: [
      "Pháp", "Bỉ", "Hà Lan", "Đức", "Thụy Sỹ", "Ý", "Ba Lan", 
      "Hungaria", "Slovakia", "Áo", "Séc", "Liên bang Nga", 
      "Vương quốc Anh", "Hy Lạp", "Thổ Nhĩ Kỳ"
    ]
  },
  {
    title: "Châu Úc",
    countries: [
      "Australia", "New Zealand"
    ]
  },
  {
    title: "Châu Mỹ - Châu Phi",
    countries: [
      "Hoa Kỳ", "Canada", "Cuba", "Nam Phi", "Ai Cập"
    ]
  },
  {
    title: "Tour đặc biệt",
    countries: [
      "Tour Free&Easy", "Tour du thuyền", "Tour cao cấp", "Tour theo mùa"
    ]
  }
];
