from sqlalchemy import DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, DeclarativeBase, relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid
import datetime
from enum import Enum


class UserRole(str, Enum):
    USER = 'user'
    ADMIN = 'admin'


class Base(DeclarativeBase):
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    created_at = mapped_column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    updated_at = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now()
    )


class User(Base):
    __tablename__ = "users"

    username: Mapped[str] = mapped_column(
        unique=True,
        nullable=False,
        index=True
    )

    phone_number: Mapped[str] = mapped_column(
        unique=True,
        nullable=False
    )
    role: Mapped[UserRole] = mapped_column(default=UserRole.USER)
    phone_number: Mapped[str] = mapped_column(nullable=False)

    participation_in_chats: Mapped[list['ChatParticipant']] = relationship(back_populates="user")
    messages: Mapped[list["Message"]] = relationship(back_populates="sender")


class Chat(Base):
    __tablename__ = "chats"

    is_group: Mapped[bool] = mapped_column(default=False)
    title: Mapped[str | None]
    avatar: Mapped[str | None]
    description: Mapped[str | None]

    chat_participants: Mapped[list['ChatParticipant']] = relationship(back_populates="chat")
    chat_messages: Mapped[list['Message']] = relationship(back_populates="chat", cascade="all, delete-orphan")


class ChatParticipant(Base):
    __tablename__ = "chat_participants"

    __table_args__ = (
        UniqueConstraint("chat_id", "user_id"),
    )

    chat_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("chats.id", ondelete="CASCADE"))
    chat: Mapped['Chat'] = relationship(back_populates="chat_participants")

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    user: Mapped['User'] = relationship(back_populates="participation_in_chats")

    joined_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), 
        default=lambda: datetime.datetime.now(datetime.UTC), 
    )


class Message(Base):
    __tablename__ = "messages"
    
    chat_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("chats.id"), index=True)
    chat: Mapped['Chat'] = relationship(back_populates="chat_messages")

    sender_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
    sender: Mapped['User'] = relationship(back_populates="messages")

    text: Mapped[str] = mapped_column(nullable=False)

    sent_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.datetime.now(datetime.UTC),
        index=True
    )
