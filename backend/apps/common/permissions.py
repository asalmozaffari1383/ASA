"""DRF permission classes driven by the dynamic User booleans (RBAC).

Authorization in this system is *not* tied to the coarse ``role`` label — it is
decided by the per-user boolean flags on the User model (``can_manage_financial``
etc.), so a CEO can grant or revoke a capability without changing someone's role.
Each class below maps one-to-one to a flag; views compose them as needed.
"""

from rest_framework.permissions import BasePermission


class _DynamicPermission(BasePermission):
    """Base class: authenticated *and* the named boolean flag is True."""

    flag_attr: str = ""
    message = "شما دسترسی لازم برای انجام این عملیات را ندارید."

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and getattr(user, self.flag_attr, False)
        )


class CanManageFinancial(_DynamicPermission):
    flag_attr = "can_manage_financial"
    message = "شما دسترسی مدیریت امور مالی را ندارید."


class CanFillBaleForms(_DynamicPermission):
    flag_attr = "can_fill_bale_forms"
    message = "شما دسترسی تکمیل فرم‌های بله را ندارید."


class CanDoInspection(_DynamicPermission):
    flag_attr = "can_do_inspection"
    message = "شما دسترسی انجام بازرسی را ندارید."


class CanIssueCertificate(_DynamicPermission):
    flag_attr = "can_issue_certificate"
    message = "شما دسترسی صدور گواهی‌نامه را ندارید."


class IsCEO(BasePermission):
    """User management is reserved for the CEO (or a Django superuser)."""

    message = "تنها مدیرعامل به این بخش دسترسی دارد."

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and (user.is_superuser or user.role == user.Role.CEO)
        )
