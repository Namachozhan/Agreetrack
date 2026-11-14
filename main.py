from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from .database import Base, engine, get_db
from . import models, schemas

Base.metadata.create_all(bind=engine)

app = FastAPI(title="AgriTrack API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict this when deploying separate frontend origins.
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
def health():
    return {"status": "ok", "service": "agritrack-backend"}

@app.get("/api/dashboard")
def dashboard(db: Session = Depends(get_db)):
    return {
        "customers": db.scalar(select(func.count(models.Customer.id))) or 0,
        "equipment": db.scalar(select(func.count(models.Equipment.id))) or 0,
        "active_rentals": db.scalar(select(func.count(models.Rental.id)).where(models.Rental.status.in_(["Booked", "In Progress"]))) or 0,
        "revenue": round(db.scalar(select(func.coalesce(func.sum(models.Rental.total_amount), 0)).where(models.Rental.status == "Completed")) or 0, 2),
    }

@app.get("/api/customers", response_model=list[schemas.CustomerOut])
def list_customers(db: Session = Depends(get_db)):
    return db.scalars(select(models.Customer).order_by(models.Customer.name)).all()

@app.post("/api/customers", response_model=schemas.CustomerOut, status_code=201)
def create_customer(payload: schemas.CustomerIn, db: Session = Depends(get_db)):
    item = models.Customer(**payload.model_dump())
    db.add(item); db.commit(); db.refresh(item)
    return item

@app.get("/api/equipment", response_model=list[schemas.EquipmentOut])
def list_equipment(db: Session = Depends(get_db)):
    return db.scalars(select(models.Equipment).order_by(models.Equipment.name)).all()

@app.post("/api/equipment", response_model=schemas.EquipmentOut, status_code=201)
def create_equipment(payload: schemas.EquipmentIn, db: Session = Depends(get_db)):
    item = models.Equipment(**payload.model_dump())
    db.add(item); db.commit(); db.refresh(item)
    return item

@app.get("/api/rentals", response_model=list[schemas.RentalOut])
def list_rentals(db: Session = Depends(get_db)):
    rows = db.execute(
        select(models.Rental, models.Customer.name, models.Equipment.name)
        .join(models.Customer, models.Rental.customer_id == models.Customer.id)
        .join(models.Equipment, models.Rental.equipment_id == models.Equipment.id)
        .order_by(models.Rental.start_date.desc())
    ).all()
    return [
        schemas.RentalOut(
            id=r.id, customer_id=r.customer_id, equipment_id=r.equipment_id,
            start_date=r.start_date, end_date=r.end_date, quantity=r.quantity,
            rate_type=r.rate_type, rate=r.rate, total_amount=r.total_amount,
            status=r.status, notes=r.notes, customer_name=customer_name,
            equipment_name=equipment_name
        )
        for r, customer_name, equipment_name in rows
    ]

@app.post("/api/rentals", response_model=schemas.RentalOut, status_code=201)
def create_rental(payload: schemas.RentalIn, db: Session = Depends(get_db)):
    customer = db.get(models.Customer, payload.customer_id)
    equipment = db.get(models.Equipment, payload.equipment_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    if not equipment:
        raise HTTPException(status_code=404, detail="Equipment not found")
    if equipment.availability != "Available":
        raise HTTPException(status_code=409, detail="Equipment is not marked Available")
    item = models.Rental(**payload.model_dump(), total_amount=round(payload.quantity * payload.rate, 2))
    db.add(item)
    equipment.availability = "Rented"
    db.commit(); db.refresh(item)
    return schemas.RentalOut(
        id=item.id, customer_id=item.customer_id, equipment_id=item.equipment_id,
        start_date=item.start_date, end_date=item.end_date, quantity=item.quantity,
        rate_type=item.rate_type, rate=item.rate, total_amount=item.total_amount,
        status=item.status, notes=item.notes, customer_name=customer.name,
        equipment_name=equipment.name
    )

@app.patch("/api/rentals/{rental_id}/status", response_model=schemas.RentalOut)
def update_rental_status(rental_id: int, status: str, db: Session = Depends(get_db)):
    item = db.get(models.Rental, rental_id)
    if not item:
        raise HTTPException(status_code=404, detail="Rental not found")
    if status not in {"Booked", "In Progress", "Completed", "Cancelled"}:
        raise HTTPException(status_code=400, detail="Invalid status")
    item.status = status
    if status in {"Completed", "Cancelled"}:
        equipment = db.get(models.Equipment, item.equipment_id)
        if equipment:
            equipment.availability = "Available"
    db.commit(); db.refresh(item)
    return schemas.RentalOut(
        id=item.id, customer_id=item.customer_id, equipment_id=item.equipment_id,
        start_date=item.start_date, end_date=item.end_date, quantity=item.quantity,
        rate_type=item.rate_type, rate=item.rate, total_amount=item.total_amount,
        status=item.status, notes=item.notes,
        customer_name=item.customer.name, equipment_name=item.equipment.name
    )
