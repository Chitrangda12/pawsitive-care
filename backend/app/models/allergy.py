from sqlalchemy import Column, Integer, String, ForeignKey, Enum as SAEnum, DateTime, func, Table
from sqlalchemy.orm import relationship
from app.database import Base
import enum


class AllergyCategory(str, enum.Enum):
    FOOD = "food"
    ENVIRONMENTAL = "environmental"
    MEDICATION = "medication"
    CONTACT = "contact"
    SENSITIVITY = "sensitivity"


class AllergySeverity(str, enum.Enum):
    MILD = "mild"
    MODERATE = "moderate"
    SEVERE = "severe"


# Association table for Many-to-Many relationship between Dogs and Allergies
dog_allergy = Table(
    "dog_allergy",
    Base.metadata,
    Column("dog_id", Integer, ForeignKey("dogs.id", ondelete="CASCADE"), primary_key=True),
    Column("allergy_id", Integer, ForeignKey("allergies.id", ondelete="CASCADE"), primary_key=True),
)


class Allergy(Base):
    """Allergy Master Table"""
    __tablename__ = "allergies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    category = Column(SAEnum(AllergyCategory), nullable=False)
    description = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationship back to dogs that have this allergy
    dogs = relationship("Dog", secondary=dog_allergy, back_populates="allergies")
