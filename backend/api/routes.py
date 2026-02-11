
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..service.crud import ProductService, OrderService
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os

router = APIRouter()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://unbee_user:unbee_password@db/unbee_db")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/products")
def list_products(category: str = None, db: Session = Depends(get_db)):
    return ProductService.get_products(db, category)

@router.get("/orders")
def list_orders(db: Session = Depends(get_db)):
    return OrderService.get_all_orders(db)

@router.post("/orders")
def place_order(order_data: dict, db: Session = Depends(get_db)):
    return OrderService.create_order(db, order_data)
