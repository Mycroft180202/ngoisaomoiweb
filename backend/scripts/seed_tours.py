import sys
import os

# Add the current directory to python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import app.models.base

from app.core.database import SessionLocal
from app.models.country import Country
from app.models.province import ProvinceCity
from app.models.duration import TourDuration
from app.models.category import TourCategory
from app.models.tag import TourTag
from app.models.guide import TourGuide
from app.models.tour import Tour, Itinerary, TourImage

def seed_tours():
    db = SessionLocal()
    try:
        print("Starting seed_tours script...")
        
        # 1. Get Vietnam country
        vietnam = db.query(Country).filter(Country.slug == "viet-nam").first()
        if not vietnam:
            vietnam = Country(
                name="Việt Nam", 
                slug="viet-nam", 
                image="https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=600&q=80"
            )
            db.add(vietnam)
            db.commit()
            db.refresh(vietnam)
            print("Created Country Vietnam.")

        # 2. Seed missing provinces: Hà Giang, Lào Cai (Sapa), Quảng Ninh (Hạ Long), Đà Nẵng, Phú Quốc
        provinces_to_seed = [
            ("Hà Giang", "ha-giang", "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80"),
            ("Lào Cai", "lao-cai", "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80"),
            ("Quảng Ninh", "quang-ninh", "https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=600&q=80"),
            ("Đà Nẵng", "da-nang", "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=600&q=80"),
            ("Phú Quốc", "phu-quoc", "https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=600&q=80")
        ]
        
        provinces = {}
        for name, slug, img in provinces_to_seed:
            prov = db.query(ProvinceCity).filter(ProvinceCity.slug == slug).first()
            if not prov:
                prov = ProvinceCity(name=name, slug=slug, country_id=vietnam.id, image=img)
                db.add(prov)
                db.commit()
                db.refresh(prov)
                print(f"Created Province City: {slug}")
            provinces[slug] = prov

        # 3. Seed guides if missing
        guides_to_seed = [
            ("Nguyễn Văn Hùng", "0912345678", "hung.nv@startour.vn", "5 năm kinh nghiệm dẫn tour Hà Giang và Tây Bắc."),
            ("Trần Thị Lan", "0987654321", "lan.tt@startour.vn", "Chuyên gia tour di sản miền Trung: Đà Nẵng, Hội An, Huế."),
            ("Lê Anh Tuấn", "0905678910", "tuan.la@startour.vn", "Chuyên tour nghỉ dưỡng biển đảo Nha Trang, Phú Quốc.")
        ]
        
        guides = {}
        for name, phone, email, bio in guides_to_seed:
            guide = db.query(TourGuide).filter(TourGuide.email == email).first()
            if not guide:
                guide = TourGuide(name=name, phone=phone, email=email, bio=bio, avatar="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80")
                db.add(guide)
                db.commit()
                db.refresh(guide)
                print(f"Created Tour Guide: {email}")
            guides[name] = guide

        # 4. Fetch durations and categories
        d_3d2n = db.query(TourDuration).filter(TourDuration.days == 3, TourDuration.nights == 2).first()
        if not d_3d2n:
            d_3d2n = TourDuration(name="3 ngày 2 đêm", days=3, nights=2)
            db.add(d_3d2n)
            db.commit()
            db.refresh(d_3d2n)

        d_4d3n = db.query(TourDuration).filter(TourDuration.days == 4, TourDuration.nights == 3).first()
        if not d_4d3n:
            d_4d3n = TourDuration(name="4 ngày 3 đêm", days=4, nights=3)
            db.add(d_4d3n)
            db.commit()
            db.refresh(d_4d3n)

        cat_ghep = db.query(TourCategory).filter(TourCategory.slug == "tour-ghep-doan").first()
        if not cat_ghep:
            cat_ghep = TourCategory(name="Tour ghép đoàn", slug="tour-ghep-doan", description="Tour ghép lẻ khởi hành hàng ngày/hàng tuần")
            db.add(cat_ghep)
            db.commit()
            db.refresh(cat_ghep)

        cat_nghi_duong = db.query(TourCategory).filter(TourCategory.slug == "tour-nghi-duong").first()
        if not cat_nghi_duong:
            cat_nghi_duong = TourCategory(name="Tour nghỉ dưỡng", slug="tour-nghi-duong", description="Các tour tập trung vào trải nghiệm resort nghỉ dưỡng cao cấp")
            db.add(cat_nghi_duong)
            db.commit()
            db.refresh(cat_nghi_duong)

        # Tags
        tags = db.query(TourTag).all()
        if not tags:
            t1 = TourTag(name="Giá Tốt", slug="gia-tot")
            t2 = TourTag(name="Bán Chạy", slug="ban-chay")
            db.add_all([t1, t2])
            db.commit()
            tags = [t1, t2]

        # 5. Define 5 Tours
        tours_data = [
            {
                "slug": "tour-ha-giang-lung-cu-dong-van-3d2n",
                "title": "Tour Hà Giang - Lũng Cú - Đồng Văn - Sông Nho Quế",
                "description": "Hành trình khám phá vùng đất địa đầu Tổ quốc kì vĩ với những thửa ruộng bậc thang, Đèo Mã Pí Lèng hùng vĩ và đi thuyền trên dòng sông Nho Quế xanh mướt.",
                "price": 2500000.0,
                "duration": "3 ngày 2 đêm",
                "location": "Hà Giang, Việt Nam",
                "category": "Tour ghép đoàn",
                "region": "Miền Bắc",
                "is_featured": True,
                "province_id": provinces["ha-giang"].id,
                "country_id": vietnam.id,
                "duration_id": d_3d2n.id,
                "category_id": cat_ghep.id,
                "guide_id": guides["Nguyễn Văn Hùng"].id,
                "image": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=80",
                "itinerary": [
                    {"day": 1, "title": "Hà Nội - Hà Giang - Quản Bạ - Yên Minh", "content": "Khởi hành từ Hà Nội. Đến Quản Bạ, dừng chân chụp ảnh tại Cổng trời Quản Bạ và chiêm ngưỡng Núi Đôi Cô Tiên tròn trịa, thơ mộng. Di chuyển đến thị trấn Yên Minh nhận phòng nghỉ ngơi."},
                    {"day": 2, "title": "Yên Minh - Đồng Văn - Lũng Cú - Mã Pí Lèng - Sông Nho Quế", "content": "Ghé thăm Dinh thự vua Mèo Vương Chính Đức. Check-in Cột cờ Lũng Cú kì vĩ. Chinh phục Đèo Mã Pí Lèng - một trong 'tứ đại đỉnh đèo'. Trải nghiệm đi thuyền trên sông Nho Quế đi qua Hẻm vực Tu Sản sâu nhất Đông Nam Á."},
                    {"day": 3, "title": "Đồng Văn - Mèo Vạc - Hà Nội", "content": "Tham quan chợ phiên Đồng Văn đầy sắc màu văn hóa Tây Bắc. Mua sắm đặc sản tam giác mạch làm quà. Lên xe trở về Hà Nội. Kết thúc tour tốt đẹp."}
                ],
                "images": [
                    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=80",
                    "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=900&q=80"
                ]
            },
            {
                "slug": "tour-sapa-cat-cat-fansipan-3d2n",
                "title": "Tour Sapa - Cát Cát - Hàm Rồng - Đỉnh Fansipan",
                "description": "Trải nghiệm thành phố trong sương Sapa kì ảo, chinh phục nóc nhà Đông Dương Fansipan và ghé thăm cuộc sống đơn sơ, bình lặng tại bản Cát Cát.",
                "price": 2850000.0,
                "duration": "3 ngày 2 đêm",
                "location": "Lào Cai, Việt Nam",
                "category": "Tour ghép đoàn",
                "region": "Miền Bắc",
                "is_featured": True,
                "province_id": provinces["lao-cai"].id,
                "country_id": vietnam.id,
                "duration_id": d_3d2n.id,
                "category_id": cat_ghep.id,
                "guide_id": guides["Nguyễn Văn Hùng"].id,
                "image": "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=900&q=80",
                "itinerary": [
                    {"day": 1, "title": "Hà Nội - Sapa - Khám phá bản Cát Cát", "content": "Xe đưa đoàn dọc đường cao tốc Nội Bài - Lào Cai lên Sapa. Chiều tham quan Bản Cát Cát của người Mông, tìm hiểu phong tục dệt vải và ngắm Thác thủy điện do người Pháp xây dựng."},
                    {"day": 2, "title": "Chinh phục đỉnh Fansipan - Nóc nhà Đông Dương", "content": "Đi cáp treo Fansipan hiện đại nhất thế giới lên đỉnh cao 3.143m. Ngắm nhìn biển mây bồng bềnh phủ trắng dãy Hoàng Liên Sơn, lễ Phật cầu an tại cụm chùa tâm linh trên đỉnh núi."},
                    {"day": 3, "title": "Núi Hàm Rồng - Mua sắm - Hà Nội", "content": "Tham quan KDL Núi Hàm Rồng, chụp hình vườn hoa trung tâm, ngắm toàn cảnh Sapa trong sương từ Sân Mây. Trưa trả phòng xe đón trở về Hà Nội."}
                ],
                "images": [
                    "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=900&q=80",
                    "https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=900&q=80"
                ]
            },
            {
                "slug": "tour-da-nang-ngu-hanh-son-hoi-an-bana-4d3n",
                "title": "Tour Đà Nẵng - Ngũ Hành Sơn - Phố cổ Hội An - Bà Nà Hills",
                "description": "Tận hưởng thiên đường miền Trung xinh đẹp với những bãi biển cát trắng mịn màng, khám phá phố cổ Hội An hoài cổ lung linh đèn lồng và vui chơi giải trí trên đỉnh Bà Nà Hills.",
                "price": 4990000.0,
                "duration": "4 ngày 3 đêm",
                "location": "Đà Nẵng, Việt Nam",
                "category": "Tour ghép đoàn",
                "region": "Miền Trung",
                "is_featured": True,
                "province_id": provinces["da-nang"].id,
                "country_id": vietnam.id,
                "duration_id": d_4d3n.id,
                "category_id": cat_ghep.id,
                "guide_id": guides["Trần Thị Lan"].id,
                "image": "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=900&q=80",
                "itinerary": [
                    {"day": 1, "title": "Đón sân bay Đà Nẵng - Ngũ Hành Sơn - Hội An", "content": "Đón khách từ sân bay Đà Nẵng. Buổi chiều tham quan danh thắng Ngũ Hành Sơn lịch sử. Tối tham quan Phố cổ Hội An lung linh sắc đèn lồng, thưởng thức ẩm thực đặc sản cao lầu, mỳ Quảng."},
                    {"day": 2, "title": "Chinh phục Bà Nà Hills - Cầu Vàng nổi tiếng", "content": "Đi cáp treo đạt nhiều kỷ lục lên đỉnh Bà Nà. Dạo bước trên Cầu Vàng được nâng đỡ bởi đôi bàn tay khổng lồ giữa sương mù. Vui chơi tại Fantasy Park và tham quan hầm rượu cổ Debay."},
                    {"day": 3, "title": "Bán đảo Sơn Trà - Biển Mỹ Khê", "content": "Viếng Chùa Linh Ứng Sơn Trà ngắm Tượng Phật Bà Quan Âm cao 67m hướng ra biển lớn. Buổi chiều tự do tắm biển Mỹ Khê - một trong những bãi biển đẹp nhất hành tinh."},
                    {"day": 4, "title": "Mua sắm đặc sản chợ Hàn - Tiễn khách", "content": "Ghé chợ Hàn hoặc chợ Cồn mua sắm hải sản khô, bánh tráng cuốn làm quà. Xe tiễn khách ra sân bay Đà Nẵng, kết thúc lịch trình."}
                ],
                "images": [
                    "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=900&q=80",
                    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=80"
                ]
            },
            {
                "slug": "tour-nghi-duong-phu-quoc-hon-thom-3d2n",
                "title": "Tour nghỉ dưỡng Phú Quốc - Hòn Thơm - Sunset Sanato",
                "description": "Nghỉ dưỡng thiên đường đảo ngọc Phú Quốc với làn nước biển trong xanh tựa ngọc bích, chụp ảnh hoàng hôn rực rỡ tại Sunset Sanato và trải nghiệm cáp treo vượt biển Hòn Thơm cực đỉnh.",
                "price": 3450000.0,
                "duration": "3 ngày 2 đêm",
                "location": "Kiên Giang (Phú Quốc), Việt Nam",
                "category": "Tour nghỉ dưỡng",
                "region": "Miền Nam",
                "is_featured": True,
                "province_id": provinces["phu-quoc"].id,
                "country_id": vietnam.id,
                "duration_id": d_3d2n.id,
                "category_id": cat_nghi_duong.id,
                "guide_id": guides["Lê Anh Tuấn"].id,
                "image": "https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=900&q=80",
                "itinerary": [
                    {"day": 1, "title": "Đón sân bay Phú Quốc - Check-in Sunset Sanato", "content": "Đón khách từ sân bay Phú Quốc. Nhận phòng khách sạn nghỉ ngơi. Chiều tham quan Sunset Sanato Beach Club để chụp những tấm hình hoàng hôn Phú Quốc nghệ thuật hoàng hôn huyền ảo bên mô hình voi chân dài."},
                    {"day": 2, "title": "Cáp treo Hòn Thơm - Lặn ngắm san hô Nam Đảo", "content": "Trải nghiệm cáp treo 3 dây vượt biển dài nhất thế giới sang đảo Hòn Thơm. Tham quan công viên nước Aquatopia hoành tráng. Chiều đi cano ngắm 4 đảo hoang sơ, lặn ngắm san hô tự nhiên tại hòn Mây Rút."},
                    {"day": 3, "title": "Chùa Hộ Quốc - Bãi Sao - Tiễn sân bay", "content": "Dâng hương tại thiền viện Trúc Lâm Hộ Quốc ngắm nhìn biển cả. Tự do tắm biển, dạo chơi trên cát trắng mịn tại Bãi Sao nổi tiếng. Tiễn khách ra sân bay kết thúc hành trình."}
                ],
                "images": [
                    "https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=900&q=80",
                    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=80"
                ]
            },
            {
                "slug": "tour-vinh-ha-long-du-thuyen-luxury-3d2n",
                "title": "Tour du thuyền 5 sao Vịnh Hạ Long - Vịnh Lan Hạ",
                "description": "Nghỉ dưỡng sang trọng trên du thuyền 5 sao chuẩn quốc tế, tận hưởng bữa tiệc hoàng hôn lãng mạn giữa đại dương xanh mát và chèo thuyền Kayak tham quan hang động tự nhiên ngàn năm tuổi.",
                "price": 3900000.0,
                "duration": "3 ngày 2 đêm",
                "location": "Quảng Ninh, Việt Nam",
                "category": "Tour nghỉ dưỡng",
                "region": "Miền Bắc",
                "is_featured": True,
                "province_id": provinces["quang-ninh"].id,
                "country_id": vietnam.id,
                "duration_id": d_3d2n.id,
                "category_id": cat_nghi_duong.id,
                "guide_id": guides["Nguyễn Văn Hùng"].id,
                "image": "https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=900&q=80",
                "itinerary": [
                    {"day": 1, "title": "Hà Nội - Hạ Long - Check-in Du thuyền 5 sao", "content": "Xe Limousine đón từ Hà Nội đến cảng tàu du lịch quốc tế Hạ Long. Lên tàu nhận phòng, thưởng thức đồ uống chào mừng. Ăn trưa buffet sang trọng khi tàu đi qua hòn Trống Mái, hòn Đỉnh Hương."},
                    {"day": 2, "title": "Khám phá Hang Sửng Sốt - Chèo Kayak tại hang Luồn", "content": "Khám phá Hang Sửng Sốt rộng lớn và lộng lẫy bậc nhất vịnh. Tham gia chèo thuyền Kayak hoặc đi đò nan ngắm cảnh thiên nhiên thơ mộng tại hang Luồn. Tham gia lớp học nấu món ăn truyền thống trên boong du thuyền lúc hoàng hôn."},
                    {"day": 3, "title": "Tập Thái Cực Quyền - Đảo Ti Tốp - Hà Nội", "content": "Tập Tai Chi đón bình minh trên boong tàu. Leo núi chụp ảnh toàn cảnh vịnh tại đảo Ti Tốp hoặc thư giãn trên bãi tắm. Check-out và ăn trưa sớm trước khi tàu cập cảng trở về Hà Nội."}
                ],
                "images": [
                    "https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=900&q=80",
                    "https://images.unsplash.com/photo-1505764706515-aa95265c5abc?auto=format&fit=crop&w=900&q=80"
                ]
            }
        ]

        # 6. Add tours to database if slug not exists
        for tour_dict in tours_data:
            existing = db.query(Tour).filter(Tour.slug == tour_dict["slug"]).first()
            if existing:
                print(f"Tour with slug '{tour_dict['slug']}' already exists, skipping.")
                continue

            db_tour = Tour(
                slug=tour_dict["slug"],
                title=tour_dict["title"],
                description=tour_dict["description"],
                price=tour_dict["price"],
                duration=tour_dict["duration"],
                location=tour_dict["location"],
                category=tour_dict["category"],
                region=tour_dict["region"],
                is_featured=tour_dict["is_featured"],
                province_id=tour_dict["province_id"],
                country_id=tour_dict["country_id"],
                duration_id=tour_dict["duration_id"],
                category_id=tour_dict["category_id"],
                guide_id=tour_dict["guide_id"],
                image=tour_dict["image"]
            )
            
            # Associate tags
            db_tour.tags = tags
            
            db.add(db_tour)
            db.commit()
            db.refresh(db_tour)
            print(f"Created Tour: {db_tour.slug} (ID: {db_tour.id})")

            # Add itineraries
            for iti in tour_dict["itinerary"]:
                db_iti = Itinerary(
                    tour_id=db_tour.id,
                    day=iti["day"],
                    title=iti["title"],
                    content=iti["content"]
                )
                db.add(db_iti)

            # Add images
            for idx, img_url in enumerate(tour_dict["images"]):
                db_img = TourImage(
                    tour_id=db_tour.id,
                    url=img_url,
                    image_type="gallery",
                    is_primary=(idx == 0),
                    order_index=idx
                )
                db.add(db_img)

            db.commit()
            print(f"Seeded itineraries and images for: {db_tour.slug}")

        print("Seeding tours successfully completed!")
    except Exception as e:
        print(f"Error seeding tours: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_tours()
