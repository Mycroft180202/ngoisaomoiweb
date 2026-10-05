from pydantic import BaseModel

class DurationBase(BaseModel):
    name: str
    days: int
    nights: int

class DurationCreate(DurationBase):
    pass

class DurationResponse(DurationBase):
    id: int

    class Config:
        from_attributes = True
