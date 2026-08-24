from django.contrib import admin
from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from events.views import (
    EventViewSet,
    PaymentViewSet,
    TicketViewSet,
    UserViewSet,
    SupportTicketViewSet,
    change_password,
    health,
    mpesa_callback,
    signup,
    stk_push,
    user_detail,
)

router = DefaultRouter()
router.register("events", EventViewSet, basename="event")
router.register("tickets", TicketViewSet, basename="ticket")
router.register("payments", PaymentViewSet, basename="payment")
router.register("users", UserViewSet, basename="user")
router.register("support-tickets", SupportTicketViewSet, basename="support-ticket")

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/health/", health, name="health"),
    path("api/v1/auth/signup/", signup, name="signup"),
    path("api/v1/auth/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/v1/auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/v1/auth/me/", user_detail, name="user-detail"),
    path("api/v1/auth/change-password/", change_password, name="change-password"),
    path("api/v1/", include(router.urls)),
    path("api/v1/payments/mpesa/stk-push/", stk_push, name="mpesa-stk-push"),
    path("api/v1/payments/mpesa/callback/", mpesa_callback, name="mpesa-callback"),
]
