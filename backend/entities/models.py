
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Text, Numeric
from sqlalchemy.orm import relationship, declarative_base
import datetime

Base = declarative_base()

class Category(Base):
    __tablename__ = "categories"
    id = Column(Integer, primary_key=True, index=True)
    parent_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    name = Column(String(100), nullable=False)
    slug = Column(String(100), unique=True, index=True)
    icon = Column(String(20))
    image_url = Column(Text)
    description = Column(Text)
    is_active = Column(Boolean, default=True)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow)

    parent = relationship("Category", remote_side=[id])
    products = relationship("Product", back_populates="category")

class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey("categories.id"))
    name = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, index=True)
    description = Column(Text)
    base_price = Column(Numeric(12, 2), nullable=False)
    discount_price = Column(Numeric(12, 2))
    currency = Column(String(3), default="VND")
    kind = Column(String(20), default="single")  # single | combo
    is_active = Column(Boolean, default=True)
    is_hot = Column(Boolean, default=False)
    is_new = Column(Boolean, default=True)
    is_sale = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    category = relationship("Category", back_populates="products")
    variants = relationship("ProductVariant", back_populates="product", cascade="all, delete-orphan")

class ProductVariant(Base):
    __tablename__ = "product_variants"
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"))
    sku = Column(String(64), unique=True, index=True)
    size = Column(String(50))
    color = Column(String(50))
    material = Column(String(80))
    stock = Column(Integer, default=0)
    price_override = Column(Numeric(12, 2))
    discount_price_override = Column(Numeric(12, 2))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    product = relationship("Product", back_populates="variants")

class Order(Base):
    __tablename__ = "orders"
    id = Column(Integer, primary_key=True, index=True)
    order_code = Column(String(32), unique=True, index=True)
    customer_name = Column(String(255), nullable=False)
    phone = Column(String(30), nullable=False)
    email = Column(String(255))
    address = Column(Text, nullable=False)
    note = Column(Text)
    status = Column(String(20), default="pending")
    subtotal = Column(Numeric(12, 2), default=0)
    discount_total = Column(Numeric(12, 2), default=0)
    shipping_fee = Column(Numeric(12, 2), default=0)
    total_amount = Column(Numeric(12, 2), default=0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow)

    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")

class OrderItem(Base):
    __tablename__ = "order_items"
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    variant_id = Column(Integer, ForeignKey("product_variants.id"), nullable=True)
    product_name = Column(String(255), nullable=False)
    variant_label = Column(String(120))
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Numeric(12, 2), nullable=False)
    line_total = Column(Numeric(12, 2), nullable=False)

    order = relationship("Order", back_populates="items")

class Banner(Base):
    __tablename__ = "banners"
    id = Column(Integer, primary_key=True, index=True)
    slot = Column(String, nullable=False, index=True)
    sort_order = Column(Integer, default=0)
    image_url = Column(Text, nullable=False)
    title = Column(Text)
    subtitle = Column(Text)
    link_url = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow)
