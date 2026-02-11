
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Text, Numeric
from sqlalchemy.orm import relationship, declarative_base
import datetime

Base = declarative_base()

class Category(Base):
    __tablename__ = "categories"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    slug = Column(String(100), unique=True, index=True)
    icon = Column(String(20))
    products = relationship("Product", back_populates="category")

class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey("categories.id"))
    name = Column(String(255), nullable=False)
    description = Column(Text)
    base_price = Column(Numeric(12, 2), nullable=False)
    discount_price = Column(Numeric(12, 2))
    is_hot = Column(Boolean, default=False)
    is_new = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    category = relationship("Category", back_populates="products")
    variants = relationship("ProductVariant", back_populates="product", cascade="all, delete-orphan")

class ProductVariant(Base):
    __tablename__ = "product_variants"
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"))
    size = Column(String(50))
    color = Column(String(50))
    stock = Column(Integer, default=0)
    
    product = relationship("Product", back_populates="variants")
