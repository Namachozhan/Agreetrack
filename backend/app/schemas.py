from datetime import date, datetime
from pydantic import BaseModel, ConfigDict, Field

class CustomerIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    phone: str = ""
    village: str = ""
    notes: str = ""

class CustomerOut(CustomerIn):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class EquipmentIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    category: str = "Tractor"
    registration_number: str = ""
    rate_type: str = "hour"
    rate: float = Field(ge=0)
    availability: str = "Available"
    notes: str = ""

class EquipmentOut(EquipmentIn):
    id: int
    model_config = ConfigDict(from_attributes=True)

class RentalIn(BaseModel):
    customer_id: int
    equipment_id: int
    start_date: date
    end_date: date | None = None
    quantity: float = Field(gt=0)
    rate_type: str = "hour"
    rate: float = Field(ge=0)
    status: str = "Booked"
    notes: str = ""

class RentalOut(BaseModel):
    id: int
    customer_id: int
    equipment_id: int
    start_date: date
    end_date: date | None
    quantity: float
    rate_type: str
    rate: float
    total_amount: float
    status: str
    notes: str
    customer_name: str
    equipment_name: str
