from rest_framework.permissions import BasePermission


class IsAdminRole(BasePermission):
    message = "Administrator access is required."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == "admin"
        )


class IsEventManager(BasePermission):
    message = "Administrator or event organizer access is required."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in {"admin", "organizer"}
        )
