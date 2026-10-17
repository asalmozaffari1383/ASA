from django.contrib import admin

from .models import CompanyPartner, ServiceCard


@admin.register(ServiceCard)
class ServiceCardAdmin(admin.ModelAdmin):
    list_display = ["title", "position", "is_active", "updated_at"]
    list_editable = ["position", "is_active"]
    search_fields = ["title", "description"]
    list_filter = ["is_active"]


@admin.register(CompanyPartner)
class CompanyPartnerAdmin(admin.ModelAdmin):
    list_display = ["name", "position", "is_active", "updated_at"]
    list_editable = ["position", "is_active"]
    search_fields = ["name"]
    list_filter = ["is_active"]
