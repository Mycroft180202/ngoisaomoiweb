from typing import Literal
from pydantic import BaseModel, Field, model_validator


class TourFinanceConfig(BaseModel):
    net_cost_adult: float = Field(default=0, ge=0, allow_inf_nan=False)
    net_cost_child: float = Field(default=0, ge=0, allow_inf_nan=False)
    net_cost_infant: float = Field(default=0, ge=0, allow_inf_nan=False)
    fixed_cost: float = Field(default=0, ge=0, allow_inf_nan=False)
    tax_percent: float = Field(default=0, ge=0, le=100, allow_inf_nan=False)
    profit_percent: float = Field(default=0, ge=0, le=100, allow_inf_nan=False)
    commission_type: Literal["per_day", "per_guest", "percentage", "per_booking"] = "per_day"
    commission_value: float = Field(default=0, ge=0, allow_inf_nan=False)
    commission_children: bool = True
    commission_infants: bool = False
    revenue_basis: Literal["confirmed", "paid"] = "confirmed"

    @model_validator(mode="after")
    def valid_commission(self):
        if self.commission_type == "percentage" and self.commission_value >= 100:
            raise ValueError("Hoa hồng theo phần trăm phải nhỏ hơn 100%")
        return self
