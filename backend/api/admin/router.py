
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ...service.admin.admin_service import AdminService
from ...database_config import get_db

router = APIRouter()

@router.get("/orders")
def get_orders(db: Session = Depends(get_db)):
    return AdminService.get_all_orders(db)

@router.post("/products")
def create_product(data: dict, db: Session = Depends(get_db)):
    return AdminService.create_product(db, data)
