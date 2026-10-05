from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class NavigationMenu(Base):
    __tablename__ = "navigation_menus"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    url = Column(String, nullable=False)
    parent_id = Column(Integer, ForeignKey("navigation_menus.id", ondelete="CASCADE"), nullable=True)
    order_index = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)

    parent = relationship("NavigationMenu", remote_side=[id], backref="children")
