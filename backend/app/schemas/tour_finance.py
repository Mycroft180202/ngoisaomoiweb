from typing import Literal
from pydantic import BaseModel, Field, model_validator


class CommissionRule(BaseModel):
    commission_type: Literal["per_day", "per_guest", "percentage", "per_booking"] = "percentage"
    commission_value: float = Field(default=0, ge=0, allow_inf_nan=False)
    commission_children: bool = True
    commission_infants: bool = False

    @model_validator(mode="after")
    def valid_rate(self):
        if self.commission_type == "percentage" and self.commission_value >= 100:
            raise ValueError("Hoa hồng theo phần trăm phải nhỏ hơn 100%")
        return self


class PartnerCommission(CommissionRule):
    partner_code: str = Field(min_length=1, max_length=100)


class TourFinanceConfig(BaseModel):
    net_cost_adult: float = Field(default=0, ge=0, allow_inf_nan=False)
    net_cost_child: float = Field(default=0, ge=0, allow_inf_nan=False)
    net_cost_infant: float = Field(default=0, ge=0, allow_inf_nan=False)
    fixed_cost: float = Field(default=0, ge=0, allow_inf_nan=False)
    tax_percent: float = Field(default=0, ge=0, le=100, allow_inf_nan=False)
    profit_percent: float = Field(default=0, ge=0, le=100, allow_inf_nan=False)
    commission_type: Literal["per_day", "per_guest", "percentage", "per_booking"] = "per_day"
    commission_value: float = Field(default=160000, ge=0, allow_inf_nan=False)
    commission_children: bool = True
    commission_infants: bool = False
    own_commission: CommissionRule = Field(default_factory=CommissionRule)
    partner_overrides: list[PartnerCommission] = Field(default_factory=list)
    revenue_basis: Literal["confirmed", "paid"] = "confirmed"

    @model_validator(mode="after")
    def valid_commission(self):
        codes = [rule.partner_code.strip().upper() for rule in self.partner_overrides]
        if any(not code for code in codes) or len(codes) != len(set(codes)):
            raise ValueError("Mã đối tác không được trống hoặc trùng nhau")
        for rule, code in zip(self.partner_overrides, codes):
            rule.partner_code = code
        for rule in [self, *self.partner_overrides]:
            rate = rule.commission_value if rule.commission_type == "percentage" else 0
            own_rate = self.own_commission.commission_value if self.own_commission.commission_type == "percentage" else 0
            if rate + own_rate >= 100:
                raise ValueError("Tổng hoa hồng phần trăm phải nhỏ hơn 100%")
        if self.commission_type == "percentage" and self.commission_value >= 100:
            raise ValueError("Hoa hồng theo phần trăm phải nhỏ hơn 100%")
        return self
