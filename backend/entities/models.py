
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Text, Numeric, CheckConstraint
from sqlalchemy.orm import relationship, declarative_base
import datetime

# Order.status: pending | confirmed | paid | shipped | completed | cancelled
ORDER_STATUS_VALUES = ("pending", "confirmed", "paid", "shipped", "completed", "cancelled")
BLOG_STATUS_VALUES = ("draft", "review", "scheduled", "published")

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
    external_source = Column(String(64))  # e.g. "salework" for sync
    external_product_id = Column(String(128))  # external system id/code
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow)

    category = relationship("Category", back_populates="products")
    variants = relationship("ProductVariant", back_populates="product", cascade="all, delete-orphan")
    images = relationship("ProductImage", back_populates="product", cascade="all, delete-orphan")
    combo_components = relationship(
        "ComboItem",
        foreign_keys="ComboItem.combo_product_id",
        back_populates="combo_product",
        cascade="all, delete-orphan",
    )

class ProductVariant(Base):
    __tablename__ = "product_variants"
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"))
    sku = Column(String(64), unique=True, index=True)
    external_sku_id = Column(String(128))  # Salework _id for sync
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
    images = relationship("ProductVariantImage", back_populates="variant", cascade="all, delete-orphan")


class ProductImage(Base):
    __tablename__ = "product_images"
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    image_url = Column(Text, nullable=False)
    alt_text = Column(Text)
    sort_order = Column(Integer, default=0)
    is_primary = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    product = relationship("Product", back_populates="images")


class ProductVariantImage(Base):
    __tablename__ = "product_variant_images"
    id = Column(Integer, primary_key=True, index=True)
    variant_id = Column(Integer, ForeignKey("product_variants.id"), nullable=False, index=True)
    image_url = Column(Text, nullable=False)
    alt_text = Column(Text)
    sort_order = Column(Integer, default=0)
    is_primary = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    variant = relationship("ProductVariant", back_populates="images")


class ComboItem(Base):
    __tablename__ = "combo_items"
    combo_product_id = Column(Integer, ForeignKey("products.id"), primary_key=True)
    component_variant_id = Column(Integer, ForeignKey("product_variants.id"), primary_key=True)
    quantity = Column(Integer, nullable=False, default=1)

    combo_product = relationship("Product", foreign_keys=[combo_product_id], back_populates="combo_components")
    component_variant = relationship("ProductVariant")

class Collection(Base):
    __tablename__ = "collections"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    slug = Column(String(120), unique=True, index=True, nullable=False)
    description = Column(Text)
    cover_image = Column(Text)
    is_active = Column(Boolean, default=True)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow)

    items = relationship("CollectionProduct", back_populates="collection", cascade="all, delete-orphan")


class CollectionProduct(Base):
    __tablename__ = "collection_products"
    collection_id = Column(Integer, ForeignKey("collections.id"), primary_key=True)
    product_id = Column(Integer, ForeignKey("products.id"), primary_key=True)
    sort_order = Column(Integer, default=0)

    collection = relationship("Collection", back_populates="items")
    product = relationship("Product")


class Customer(Base):
    """
    Khách hàng (Phase A.2). email unique cho đăng nhập sau (Phase C).
    password_hash, default_address dùng khi có tài khoản.
    """
    __tablename__ = "customers"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255))
    phone = Column(String(30))
    email = Column(String(255), unique=True)
    password_hash = Column(Text)
    default_address = Column(Text)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow)

    orders = relationship("Order", back_populates="customer")


class AdminUser(Base):
    """
    Tài khoản đăng nhập CMS (PIPELINE_ADMIN_AUTH).
    Bảng `admin_users` trong `database/init.sql` / `database/migrate.sql`.
    Thêm / đổi mật khẩu / khóa tài khoản thực hiện trực tiếp trên database.
    """
    __tablename__ = "admin_users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(Text, nullable=False)
    full_name = Column(String(255))
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    last_login_at = Column(DateTime, nullable=True)


class Order(Base):
    """
    Đơn hàng. Các field theo pipeline:
    - subtotal: tổng tiền hàng chưa giảm giá.
    - discount_total: tổng tiền giảm (voucher, khuyến mãi).
    - shipping_fee: phí vận chuyển (sau khi áp rule giảm ship nếu có).
    - total_amount: tổng tiền khách phải trả.
    - status: pending | confirmed | paid | shipped | completed | cancelled.
    """
    __tablename__ = "orders"
    __table_args__ = (
        CheckConstraint(
            f"status IN ({', '.join(repr(s) for s in ORDER_STATUS_VALUES)})",
            name="orders_status_check",
        ),
    )
    id = Column(Integer, primary_key=True, index=True)
    order_code = Column(String(32), unique=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True, index=True)
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

    customer = relationship("Customer", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")

class OrderItem(Base):
    """
    Dòng đơn hàng. Lưu snapshot tại thời điểm đặt:
    - product_id, variant_id: tham chiếu sản phẩm/biến thể.
    - product_name, variant_label: tên hiển thị khi xem lịch sử, không phụ thuộc join.
    - quantity, unit_price, line_total: số lượng, đơn giá, tổng dòng.
    """
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


class Voucher(Base):
    """
    Mã giảm giá (Phase A.3).
    type: percent | fixed. value: % hoặc số tiền. max_discount: trần giảm (percent).
    display_name + image_url: dùng cho "khuyến mãi sản phẩm" hiển thị trên trang chủ.
    """
    __tablename__ = "vouchers"
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(64), unique=True, nullable=False, index=True)
    display_name = Column(String(255))
    image_url = Column(Text)
    type = Column(String(20), nullable=False, default="fixed")
    value = Column(Numeric(12, 2), nullable=False)
    min_order_total = Column(Numeric(12, 2), default=0)
    max_discount = Column(Numeric(12, 2))
    usage_limit = Column(Integer)
    used_count = Column(Integer, default=0)
    valid_from = Column(DateTime)
    valid_to = Column(DateTime)
    is_active = Column(Boolean, default=True)
    auto_apply = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow)

    __table_args__ = (
        CheckConstraint("type IN ('percent', 'fixed', 'product')", name="vouchers_type_check"),
    )


class ShippingRule(Base):
    """
    Quy tắc phí ship (Phase A.4). Admin đổi ngưỡng và giá thoải mái.
    Chọn rule: min_order_total lớn nhất mà ≤ cart_total.
    discount_type: percent | fixed | free. discount_value: % hoặc số tiền (free thì 0).
    """
    __tablename__ = "shipping_rules"
    id = Column(Integer, primary_key=True, index=True)
    min_order_total = Column(Numeric(12, 2), default=0)
    base_fee = Column(Numeric(12, 2), default=0)
    discount_type = Column(String(20), nullable=False, default="fixed")
    discount_value = Column(Numeric(12, 2), default=0)
    is_active = Column(Boolean, default=True)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow)

    __table_args__ = (
        CheckConstraint(
            "discount_type IN ('percent', 'fixed', 'free')",
            name="shipping_rules_discount_type_check",
        ),
    )


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


class Blog(Base):
    __tablename__ = "blogs"
    __table_args__ = (
        CheckConstraint(
            f"status IN ({', '.join(repr(s) for s in BLOG_STATUS_VALUES)})",
            name="blogs_status_check",
        ),
    )
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, nullable=False, index=True)
    content = Column(Text, nullable=False)
    thumbnail = Column(Text)
    author = Column(String(100))
    category = Column(String(50))
    status = Column(String(20), default="draft")
    is_published = Column(Boolean, default=False)
    scheduled_at = Column(DateTime)
    reviewed_at = Column(DateTime)
    published_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow)
