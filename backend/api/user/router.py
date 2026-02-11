
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ...service.user.product_service import UserProductService
from ...database_config import get_db

router = APIRouter()

@router.get("/products")
def get_products(category: str = None, db: Session = Depends(get_db)):
    return UserProductService.get_active_products(db, category)
