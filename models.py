"""
SmartLog Europe: Core Logistics Data Models
Django ORM implementation for PostgreSQL 14+ with PostGIS.
Fully compliant with 001_smartlog_core_mvp_marketplace_schema.sql.
"""

from django.contrib.gis.db import models
from django.core.validators import MinValueValidator, MaxValueValidator, RegexValidator
from django.db.models import F, Q
from django.utils import timezone


# ============================================================================
# 1. ENUMS & DOMAIN TYPES
# ============================================================================

class ClientType(models.TextChoices):
    INDIVIDUAL = 'individual', 'B2C Client (Private Shipping / Moving)'
    COMPANY = 'company', 'B2B Client (SMB, VAT Payer)'
    SOLO_CARRIER = 'solo_carrier', 'Self-Employed Carrier on Exchange'


class DriverType(models.TextChoices):
    SELF_EMPLOYED = 'self_employed', 'Sole Proprietorship (Gewerbe / Solo-Selbstständige)'
    COMPANY_EMPLOYEE = 'company_employee', 'Fleet Company Staff Driver'


class DriverStatus(models.TextChoices):
    AVAILABLE = 'available', 'Free to Accept Orders'
    ON_TRIP = 'on_trip', 'On Duty / Executing Delivery'
    OFF_DUTY = 'off_duty', 'Rest Period / Mandatory Break'
    INACTIVE = 'inactive', 'Account Blocked or Suspended'


class OrderStatus(models.TextChoices):
    DRAFT = 'draft', 'Order Draft Created by Customer'
    PUBLISHED = 'published', 'Listed on Marketplace Exchange'
    CONFIRMED = 'confirmed', 'Matched & Mutually Confirmed'
    IN_TRANSIT = 'in_transit', 'Cargo Picked Up, in Transit'
    DELIVERED = 'delivered', 'Reached Destination, e-POD Uploaded'
    CANCELLED = 'cancelled', 'Order Cancelled'


class MatchStatus(models.TextChoices):
    PENDING = 'pending', 'Waiting for Carrier Selection / Mutual Accept'
    BOTH_CONFIRMED = 'both_confirmed', 'Both Parties Confirmed Readiness'
    REJECTED = 'rejected', 'Offer Rejected by Either Party'


class ExecutorType(models.TextChoices):
    FOP_DRIVER = 'fop_driver', 'Solo Courier / Independent Driver'
    CARRIER_COMPANY = 'carrier_company', 'Transport Company / Subcontractor Fleet'


class CargoType(models.TextChoices):
    BOX = 'box', 'Box'
    PALLET = 'pallet', 'Pallet'
    PARCEL = 'parcel', 'Parcel'
    BULK = 'bulk', 'Bulk'
    FRAGILE = 'fragile', 'Fragile'
    OTHER = 'other', 'Other'


class DeliveryStatus(models.TextChoices):
    PLANNED = 'planned', 'Scheduled for Execution'
    IN_TRANSIT = 'in_transit', 'Vehicle Moving on Route'
    DELIVERED = 'delivered', 'Successfully Delivered'
    CANCELLED = 'cancelled', 'Trip Aborted'


class DelayStatus(models.TextChoices):
    ON_TIME = 'on_time', 'On Time or Ahead of Schedule'
    DELAYED = 'delayed', 'Behind SLA Schedule'


class DelayReason(models.TextChoices):
    TRAFFIC = 'traffic', 'Highway Traffic Congestion (Stau)'
    WEATHER = 'weather', 'Weather Force Majeure'
    LOADING_DELAY = 'loading_delay', 'Ramp Waiting Time at Origin'
    CUSTOMER_DELAY = 'customer_delay', 'Unloading Delay at Destination'
    VEHICLE_ISSUE = 'vehicle_issue', 'Breakdown or Technical Issue'
    ROUTE_ISSUE = 'route_issue', 'Deviation or Road Closure'
    OTHER = 'other', 'Other Reasons'


class IncidentType(models.TextChoices):
    NONE = 'None', 'None'
    TRAFFIC_STAU = 'Traffic_Stau', 'Traffic Stau'
    WEATHER_FORCE_MAJEURE = 'Weather_Force_Majeure', 'Weather Force Majeure'
    DOCK_WAITING = 'Dock_Waiting', 'Dock Waiting'
    VEHICLE_BREAKDOWN = 'Vehicle_Breakdown', 'Vehicle Breakdown'
    DRIVER_ROUTE_DEVIATION = 'Driver_Route_Deviation', 'Driver Route Deviation'
    CARGO_HANDLING_DAMAGE = 'Cargo_Handling_Damage', 'Cargo Handling Damage'
    PAPERWORK_CMR_ERROR = 'Paperwork_CMR_Error', 'Paperwork CMR Error'


class CostType(models.TextChoices):
    FUEL = 'fuel', 'Fuel & Energy'
    MAINTENANCE = 'maintenance', 'Fleet Maintenance'
    WORK_REWARD = 'work_reward', 'Driver Work Reward'
    OTHER = 'other', 'Other Operating Costs'


class DocumentType(models.TextChoices):
    ELECTRONIC_CMR = 'electronic_cmr', 'e-CMR Consignment Note'
    DELIVERY_PHOTO = 'delivery_photo', 'Photo Proof of Cargo Delivery'
    DAMAGE_ACT = 'damage_act', 'Damage Inspection Report'
    WEIGHT_TICKET = 'weight_ticket', 'Weight Station Ticket'
    INVOICE = 'invoice', 'Commercial Freight Invoice'


class DocumentStatus(models.TextChoices):
    PENDING = 'pending', 'Awaiting Verification'
    CONFIRMED = 'confirmed', 'Approved by Accounting / Customer'
    REJECTED = 'rejected', 'Rejected / Requires Re-upload'


ALLOWED_COST_SUBTYPES = [
    # fuel
    'diesel', 'petrol', 'adblue', 'electricity', 'cng_lng',
    # maintenance
    'scheduled_service', 'tech_inspection', 'repair', 'tires', 'washing',
    # work_reward
    'trip_fee', 'base_salary', 'per_diem', 'bonus', 'driver_allowance',
    # other
    'tolls', 'parking', 'fines', 'claims', 'insurance', 'ferry_bridge'
]


# ============================================================================
# 2. EU EXPANSION MODULE: COUNTRIES & TAX COMPLIANCE
# ============================================================================

class SupportedCountry(models.Model):
    country_code = models.CharField(
        max_length=2,
        primary_key=True,
        validators=[RegexValidator(r'^[A-Z]{2}$', 'Country code must be 2 uppercase Latin letters')],
        help_text="ISO 3166-1 alpha-2"
    )
    country_name = models.CharField(max_length=100)
    is_active = models.BooleanField(default=False)
    activated_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'supported_countries'
        verbose_name_plural = 'Supported Countries'
        constraints = [
            models.CheckConstraint(
                check=models.Q(country_code__regex=r'^[A-Z]{2}$'),
                name='chk_country_code_format'
            )
        ]

    def __str__(self):
        return f"{self.country_code} - {self.country_name}"


class VatRate(models.Model):
    vat_rate_id = models.SmallAutoField(primary_key=True)
    country = models.ForeignKey(
        SupportedCountry,
        on_delete=models.CASCADE,
        related_name='vat_rates',
        db_column='country_code'
    )
    standard_rate_pct = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        validators=[MinValueValidator(0.00)]
    )
    valid_from = models.DateField()
    valid_to = models.DateField(null=True, blank=True)

    class Meta:
        db_table = 'vat_rates'
        constraints = [
            models.CheckConstraint(
                check=models.Q(standard_rate_pct__gte=0.00),
                name='chk_vat_rate_positive'
            ),
            models.CheckConstraint(
                check=models.Q(valid_to__isnull=True) | models.Q(valid_to__gt=models.F('valid_from')),
                name='chk_vat_rate_period'
            ),
            models.UniqueConstraint(
                fields=['country'],
                condition=models.Q(valid_to__isnull=True),
                name='idx_vat_rates_current_per_country'
            )
        ]

    def __str__(self):
        return f"{self.country_id}: {self.standard_rate_pct}%"


# ============================================================================
# 3. CORE LOGISTICS ENTITIES
# ============================================================================

class Client(models.Model):
    client_id = models.CharField(max_length=32, primary_key=True, help_text="C-### or CL-YYYY-######")
    client_type = models.CharField(max_length=20, choices=ClientType.choices, default=ClientType.COMPANY)
    full_legal_name = models.CharField(max_length=150)
    vat_id = models.CharField(max_length=30, null=True, blank=True, help_text="USt-IdNr in Germany")
    tax_number = models.CharField(max_length=30, null=True, blank=True, help_text="Steuernummer")
    contact_email = models.CharField(max_length=100)
    contact_phone = models.CharField(max_length=30)
    billing_street = models.CharField(max_length=255)
    billing_postal_code = models.CharField(max_length=10, help_text="PLZ")
    billing_city = models.CharField(max_length=100)
    billing_country = models.ForeignKey(
        SupportedCountry,
        on_delete=models.RESTRICT,
        db_column='billing_country'
    )
    is_verified = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    # [2026-09-16] Журнал верифікації: хто і коли фактично підтвердив клієнта.
    # Раніше is_verified був "голим" прапорцем без аудиту — хто натиснув
    # "верифікувати" і коли, встановити було неможливо.
    verified_by = models.CharField(
        max_length=150, null=True, blank=True,
        help_text="Email/ID співробітника або системи, що верифікувала клієнта"
    )
    verified_at = models.DateTimeField(
        null=True, blank=True,
        help_text="Дата й час фактичної верифікації"
    )
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'clients'
        indexes = [
            models.Index(fields=['billing_country', 'client_type'], name='idx_clients_country_type'),
        ]
        constraints = [
            models.CheckConstraint(
                check=(
                    (models.Q(client_type='company') & (models.Q(vat_id__isnull=False) | models.Q(tax_number__isnull=False))) |
                    models.Q(client_type__in=['individual', 'solo_carrier'])
                ),
                name='chk_company_tax_compliance'
            ),
            # [2026-09-16] Узгодженість журналу верифікації: обидва поля або
            # порожні разом (ще не верифікований), або заповнені разом
            # (верифікований) — не можна мати is_verified=True без
            # verified_by/verified_at, і навпаки.
            models.CheckConstraint(
                check=(
                    (models.Q(is_verified=False) & models.Q(verified_by__isnull=True) & models.Q(verified_at__isnull=True)) |
                    (models.Q(is_verified=True) & models.Q(verified_by__isnull=False) & models.Q(verified_at__isnull=False))
                ),
                name='chk_client_verification_log'
            )
        ]

    def __str__(self):
        return f"{self.client_id} - {self.full_legal_name}"


class Vehicle(models.Model):
    vehicle_id = models.CharField(max_length=32, primary_key=True, help_text="VH-####")
    license_plate = models.CharField(max_length=20, unique=True)
    vehicle_type = models.CharField(max_length=32)
    gross_vehicle_weight_kg = models.IntegerField(validators=[MinValueValidator(1)])
    payload_capacity_kg = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0.01)])
    pallet_capacity = models.IntegerField(default=0, validators=[MinValueValidator(0)])
    fuel_type = models.CharField(max_length=20, default='diesel')
    euro_emission_class = models.CharField(max_length=10, default='Euro_6', help_text="For German LKW-Maut")
    tuv_inspection_expiry_date = models.DateField(help_text="Mandatory inspection HU/AU")
    is_active = models.BooleanField(default=True)
    is_test = models.BooleanField(default=False)
    # [2026-09-16] Прямий зв'язок з юридичним власником/оператором ТЗ:
    # компанія-перевізник (client_type='company') або сам самозайнятий
    # перевізник як власна юр. особа (client_type='solo_carrier'). Раніше
    # зв'язок "чиє це авто" можна було встановити лише непрямим ланцюжком
    # Vehicle <- Driver.default_vehicle <- Driver.linked_client, що показує
    # лише ПОТОЧНЕ ЗАКРІПЛЕННЯ водія, а не юридичну власність, і не працює
    # для авто зовнішніх carrier_company, які взагалі не реєструють власних
    # водіїв у drivers.
    owner_client = models.ForeignKey(
        Client,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='owner_client_id',
        help_text="Юридичний власник/оператор транспортного засобу (clients.client_id)"
    )
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'vehicles'
        indexes = [
            models.Index(fields=['owner_client'], name='idx_vehicles_owner_client_id'),
        ]
        constraints = [
            models.CheckConstraint(check=models.Q(gross_vehicle_weight_kg__gt=0), name='chk_vehicle_gvw_positive'),
            models.CheckConstraint(check=models.Q(payload_capacity_kg__gt=0), name='chk_vehicle_payload_positive'),
            models.CheckConstraint(check=models.Q(pallet_capacity__gte=0), name='chk_vehicle_pallet_non_negative'),
        ]

    def __str__(self):
        return f"{self.vehicle_id} ({self.license_plate})"


class Driver(models.Model):
    driver_id = models.CharField(max_length=32, primary_key=True, help_text="DR-####")
    linked_client = models.ForeignKey(
        Client,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='linked_client_id'
    )
    driver_type = models.CharField(max_length=20, choices=DriverType.choices, default=DriverType.SELF_EMPLOYED)
    full_name = models.CharField(max_length=100)
    phone_number = models.CharField(max_length=30)
    base_city = models.CharField(max_length=100)
    driving_license_categories = models.CharField(max_length=50, help_text="B, BE, C1, C1E, C, CE")
    driving_license_expiry_date = models.DateField()
    code_95_categories = models.CharField(max_length=50, null=True, blank=True, help_text="EU Code 95 (BKrFQG)")
    code_95_expiry_date = models.DateField(null=True, blank=True)
    has_adr = models.BooleanField(default=False)
    adr_expiry_date = models.DateField(null=True, blank=True)
    avg_customer_rating = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        default=5.00,
        validators=[MinValueValidator(1.00), MaxValueValidator(5.00)]
    )
    total_reviews_count = models.IntegerField(default=0, validators=[MinValueValidator(0)])
    service_compliance_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=100.00,
        validators=[MinValueValidator(0.00), MaxValueValidator(100.00)]
    )
    status = models.CharField(max_length=20, choices=DriverStatus.choices, default=DriverStatus.AVAILABLE)
    default_vehicle = models.ForeignKey(
        Vehicle,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='default_vehicle_id'
    )
    is_verified = models.BooleanField(default=False)
    is_test = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'drivers'
        constraints = [
            models.CheckConstraint(
                check=models.Q(avg_customer_rating__gte=1.00) & models.Q(avg_customer_rating__lte=5.00),
                name='chk_driver_rating_range'
            ),
            models.CheckConstraint(
                check=models.Q(total_reviews_count__gte=0),
                name='chk_driver_reviews_non_negative'
            ),
            models.CheckConstraint(
                check=models.Q(service_compliance_rate__gte=0.00) & models.Q(service_compliance_rate__lte=100.00),
                name='chk_driver_compliance_range'
            ),
            models.CheckConstraint(
                check=(
                    (models.Q(code_95_categories__isnull=True) & models.Q(code_95_expiry_date__isnull=True)) |
                    (models.Q(code_95_categories__isnull=False) & models.Q(code_95_expiry_date__isnull=False))
                ),
                name='chk_driver_code95_consistency'
            ),
            models.CheckConstraint(
                check=(
                    (models.Q(has_adr=False) & models.Q(adr_expiry_date__isnull=True)) |
                    (models.Q(has_adr=True) & models.Q(adr_expiry_date__isnull=False))
                ),
                name='chk_driver_adr_consistency'
            )
        ]

    def __str__(self):
        return f"{self.driver_id} - {self.full_name}"

    # ------------------------------------------------------------------
    # DB-рівневий тригер, що НЕ виражений як Django CheckConstraint, бо
    # звіряє дані ІНШОЇ таблиці (clients) — стандартний CHECK constraint
    # не має доступу до інших таблиць. Застосовується на рівні БД (001_
    # smartlog_core_mvp_marketplace_schema.sql, §5.6) і має дублюватись
    # у логіці Django-сервісного шару (clean()/save() або serializer),
    # інакше помилка виникне лише при фактичному INSERT/UPDATE в БД:
    #
    #   trg_validate_driver_linked_client (§5.6, додано 2026-09-20):
    #       linked_client повинен посилатись на Client правильного типу
    #       відповідно до driver_type:
    #         driver_type='self_employed'    -> linked_client.client_type
    #                                            повинен бути 'solo_carrier'
    #                                            (linked_client обов'язковий,
    #                                            NULL не допускається)
    #         driver_type='company_employee' -> linked_client, якщо заданий,
    #                                            повинен бути 'company';
    #                                            NULL тимчасово допускається
    #                                            (водій зареєстрований, ще
    #                                            не підтверджений власником
    #                                            компанії)
    #
    #   Це також знімає потребу в окремому FK на Client в auth-шарі
    #   (DriverProfile) — доступ до білінгових даних самозайнятого водія
    #   йде через єдиний ланцюжок Driver.linked_client -> Client, який
    #   тепер гарантовано веде на клієнта правильного типу.
    # ------------------------------------------------------------------


class Route(models.Model):
    route_id = models.CharField(max_length=32, primary_key=True, help_text="RT-#####")
    route_name = models.CharField(max_length=150, null=True, blank=True)
    planned_geometry = models.LineStringField(srid=4326)
    planned_distance_km = models.DecimalField(max_digits=8, decimal_places=2, validators=[MinValueValidator(0.01)])
    origin_country = models.ForeignKey(
        SupportedCountry,
        on_delete=models.RESTRICT,
        related_name='routes_origin',
        db_column='origin_country'
    )
    destination_country = models.ForeignKey(
        SupportedCountry,
        on_delete=models.RESTRICT,
        related_name='routes_destination',
        db_column='destination_country'
    )
    is_cross_border = models.GeneratedField(
        expression=~models.Q(origin_country=models.F('destination_country')),
        output_field=models.BooleanField(),
        db_persist=True
    )
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'routes'
        indexes = [
            models.Index(fields=['is_cross_border'], name='idx_routes_cross_border'),
        ]
        constraints = [
            models.CheckConstraint(check=models.Q(planned_distance_km__gt=0), name='chk_route_distance_positive')
        ]

    def __str__(self):
        return f"{self.route_id} - {self.route_name}"


class Order(models.Model):
    order_id = models.CharField(max_length=32, primary_key=True, help_text="SL-YYYY-######")
    order_date = models.DateField()
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='orders', db_column='client_id')
    status = models.CharField(max_length=20, choices=OrderStatus.choices, default=OrderStatus.PUBLISHED)
    amount_eur = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0.00)])
    vat_rate_pct = models.DecimalField(max_digits=4, decimal_places=2, default=19.00)
    is_reverse_charge = models.BooleanField(default=False)

    origin_address = models.CharField(max_length=255)
    origin_city = models.CharField(max_length=100)
    origin_postal_code = models.CharField(max_length=10)
    origin_country = models.ForeignKey(SupportedCountry, on_delete=models.RESTRICT, related_name='orders_origin', db_column='origin_country')
    origin_location = models.PointField(srid=4326, null=True, blank=True)

    destination_address = models.CharField(max_length=255)
    destination_city = models.CharField(max_length=100)
    destination_postal_code = models.CharField(max_length=10)
    destination_country = models.ForeignKey(SupportedCountry, on_delete=models.RESTRICT, related_name='orders_destination', db_column='destination_country')
    destination_location = models.PointField(srid=4326, null=True, blank=True)

    pickup_at = models.DateTimeField()
    planned_delivery_at = models.DateTimeField()
    cargo_type = models.CharField(max_length=20, choices=CargoType.choices)
    cargo_weight_kg = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0.01)])
    cargo_units = models.IntegerField(validators=[MinValueValidator(1)])
    adr_required = models.BooleanField(default=False)

    # Two-Sided Matching & Dispatch-Free Engine
    executor_type = models.CharField(max_length=20, choices=ExecutorType.choices, null=True, blank=True)
    executor_id = models.CharField(max_length=32, null=True, blank=True)
    executor_name = models.CharField(max_length=255, null=True, blank=True)
    shipper_confirmed = models.BooleanField(default=False)
    shipper_confirmed_at = models.DateTimeField(null=True, blank=True)
    carrier_confirmed = models.BooleanField(default=False)
    carrier_confirmed_at = models.DateTimeField(null=True, blank=True)
    match_status = models.CharField(max_length=20, choices=MatchStatus.choices, default=MatchStatus.PENDING)

    is_test = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'orders'
        indexes = [
            models.Index(fields=['client'], name='idx_orders_client_id'),
            models.Index(fields=['status', 'order_date'], name='idx_orders_status_date'),
            models.Index(
                fields=['match_status'],
                name='idx_orders_match_status',
                condition=~models.Q(match_status='both_confirmed')
            ),
            models.Index(fields=['client', '-order_date', 'order_id'], name='idx_orders_client_tracking'),
        ]
        constraints = [
            models.CheckConstraint(check=models.Q(amount_eur__gte=0.00), name='chk_order_amount_non_negative'),
            models.CheckConstraint(check=models.Q(cargo_weight_kg__gt=0), name='chk_order_cargo_weight_positive'),
            models.CheckConstraint(check=models.Q(cargo_units__gte=1), name='chk_order_cargo_units_positive'),
            models.CheckConstraint(check=models.Q(planned_delivery_at__gte=models.F('pickup_at')), name='chk_order_time_window'),
            models.CheckConstraint(
                check=~models.Q(match_status='both_confirmed') | (models.Q(shipper_confirmed=True) & models.Q(carrier_confirmed=True)),
                name='chk_order_match_consistency'
            ),
            models.CheckConstraint(
                check=models.Q(is_reverse_charge=False) | models.Q(vat_rate_pct=0.00),
                name='chk_reverse_charge_zero_vat'
            )
        ]

    def __str__(self):
        return f"{self.order_id} ({self.status})"

    # ------------------------------------------------------------------
    # DB-рівневі тригери, що НЕ виражені як Django CheckConstraint, бо
    # звіряють дані ІНШОЇ таблиці (drivers) — стандартний Postgres/Django
    # CHECK constraint не має доступу до інших таблиць, лише до полів
    # свого рядка. Обидва застосовуються на рівні БД (001_smartlog_core_
    # mvp_marketplace_schema.sql, §5.4-5.5) і мають дублюватись у логіці
    # Django-сервісного шару (наприклад, у clean()/save() або у serializer),
    # інакше помилка виникне лише при фактичному INSERT/UPDATE в БД:
    #
    #   trg_validate_order_executor (§5.4): якщо executor_type='fop_driver',
    #       executor_id повинен існувати в drivers.
    #   trg_validate_order_adr_compliance (§5.5, додано 2026-09-16): якщо
    #       adr_required=True І executor_type='fop_driver', виконавець
    #       повинен мати drivers.has_adr=True. Для executor_type=
    #       'carrier_company' перевірка НЕ виконується (платформа не
    #       реєструє водіїв/сертифікати зовнішніх компаній-перевізників).
    # ------------------------------------------------------------------


class Delivery(models.Model):
    delivery_id = models.CharField(max_length=32, primary_key=True, help_text="DL-YYYY-######")
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='deliveries', db_column='order_id')
    route = models.ForeignKey(Route, on_delete=models.RESTRICT, related_name='deliveries', db_column='route_id')
    driver = models.ForeignKey(Driver, on_delete=models.SET_NULL, null=True, blank=True, related_name='deliveries', db_column='driver_id')
    vehicle = models.ForeignKey(Vehicle, on_delete=models.SET_NULL, null=True, blank=True, related_name='deliveries', db_column='vehicle_id')
    delivery_status = models.CharField(max_length=20, choices=DeliveryStatus.choices, default=DeliveryStatus.PLANNED)
    planned_start_time = models.DateTimeField()
    actual_start_time = models.DateTimeField(null=True, blank=True)
    planned_end_time = models.DateTimeField()
    actual_end_time = models.DateTimeField(null=True, blank=True)
    planned_distance_km = models.DecimalField(max_digits=8, decimal_places=2, validators=[MinValueValidator(0.01)])
    actual_distance_km = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True, validators=[MinValueValidator(0.00)])
    planned_duration_minutes = models.IntegerField(null=True, blank=True)
    delivery_duration_minutes = models.IntegerField(null=True, blank=True)
    delay_minutes = models.IntegerField(default=0)
    delay_status = models.CharField(max_length=20, choices=DelayStatus.choices, default=DelayStatus.ON_TIME)
    delay_reason = models.CharField(max_length=32, choices=DelayReason.choices, null=True, blank=True)
    incident_type = models.CharField(max_length=32, choices=IncidentType.choices, default=IncidentType.NONE)
    is_driver_liable = models.BooleanField(default=False)
    customer_rating_stars = models.DecimalField(
        max_digits=2,
        decimal_places=1,
        null=True,
        blank=True,
        validators=[MinValueValidator(1.0), MaxValueValidator(5.0)]
    )
    customer_feedback_comment = models.TextField(null=True, blank=True)
    proof_of_delivery_url = models.CharField(max_length=255, null=True, blank=True)
    is_test = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'deliveries'
        indexes = [
            models.Index(fields=['order'], name='idx_deliveries_order_id'),
            models.Index(fields=['route'], name='idx_deliveries_route_id'),
            models.Index(fields=['driver', 'delivery_status'], name='idx_deliveries_driver_status'),
            models.Index(fields=['vehicle', 'delivery_status'], name='idx_deliveries_vehicle_status'),
            models.Index(fields=['actual_end_time'], name='idx_deliveries_actual_end'),
        ]
        constraints = [
            models.CheckConstraint(check=models.Q(planned_distance_km__gt=0), name='chk_delivery_planned_dist_pos'),
            models.CheckConstraint(check=models.Q(actual_distance_km__isnull=True) | models.Q(actual_distance_km__gte=0), name='chk_delivery_actual_dist_nonneg'),
            models.CheckConstraint(check=models.Q(planned_end_time__gt=models.F('planned_start_time')), name='chk_delivery_time_window'),
        ]

    def __str__(self):
        return f"{self.delivery_id} - Order {self.order_id}"


class DeliveryTrackPoint(models.Model):
    track_point_id = models.BigAutoField(primary_key=True)
    delivery = models.ForeignKey(Delivery, on_delete=models.CASCADE, related_name='track_points', db_column='delivery_id')
    recorded_at = models.DateTimeField()
    location = models.PointField(srid=4326)
    speed_kmh = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)

    class Meta:
        db_table = 'delivery_track_points'
        indexes = [
            models.Index(fields=['delivery', 'recorded_at'], name='idx_track_points_delivery'),
        ]


class ShipmentDocument(models.Model):
    document_id = models.CharField(max_length=32, primary_key=True, help_text="DOC-YYYY-######")
    delivery = models.ForeignKey(Delivery, on_delete=models.CASCADE, related_name='documents', db_column='delivery_id')
    document_type = models.CharField(max_length=30, choices=DocumentType.choices)
    document_url = models.TextField(help_text="S3 Pre-signed URL or CDN public path")
    s3_object_key = models.CharField(max_length=512, null=True, blank=True, help_text="Key in S3 bucket (e.g. documents/2026/cmr_DL101.pdf)")
    file_name = models.CharField(max_length=255, help_text="Original filename")
    file_size_bytes = models.BigIntegerField(null=True, blank=True, help_text="File size in bytes")
    mime_type = models.CharField(max_length=100, default='application/pdf', help_text="MIME type (e.g. application/pdf, image/jpeg)")
    verification_status = models.CharField(max_length=20, choices=DocumentStatus.choices, default=DocumentStatus.PENDING)
    signed_by_name = models.CharField(max_length=100, null=True, blank=True)
    signed_at = models.DateTimeField(null=True, blank=True)
    signature_geo_location = models.PointField(srid=4326, null=True, blank=True, help_text="e-POD signature GPS")
    rejection_reason = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'shipment_documents'
        indexes = [
            models.Index(fields=['delivery'], name='idx_shipment_docs_delivery'),
            models.Index(fields=['verification_status'], name='idx_shipment_docs_status'),
        ]


class Cost(models.Model):
    cost_id = models.CharField(max_length=32, primary_key=True, help_text="CS-YYYY-######")
    cost_date = models.DateField()
    cost_type = models.CharField(max_length=20, choices=CostType.choices)
    cost_subtype = models.CharField(max_length=32)
    is_repair = models.BooleanField(default=False)
    cost_amount_eur = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, validators=[MinValueValidator(0.00)])
    driver_payout_eur = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, validators=[MinValueValidator(0.00)])
    delivery = models.ForeignKey(Delivery, on_delete=models.SET_NULL, null=True, blank=True, related_name='costs', db_column='delivery_id')
    driver = models.ForeignKey(Driver, on_delete=models.SET_NULL, null=True, blank=True, related_name='costs', db_column='driver_id')
    vehicle = models.ForeignKey(Vehicle, on_delete=models.SET_NULL, null=True, blank=True, related_name='costs', db_column='vehicle_id')
    is_private_expense = models.BooleanField(default=False)
    fuel_liters = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True, validators=[MinValueValidator(0.00)])
    notes = models.TextField(null=True, blank=True)
    is_test = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'costs'
        indexes = [
            models.Index(fields=['delivery'], name='idx_costs_delivery_id'),
            models.Index(fields=['driver', 'cost_date'], name='idx_costs_driver_date'),
            models.Index(fields=['vehicle', 'cost_date'], name='idx_costs_vehicle_date'),
            models.Index(fields=['is_repair'], name='idx_costs_is_repair'),
            models.Index(fields=['cost_subtype'], name='idx_costs_subtype'),
        ]
        constraints = [
            models.CheckConstraint(check=models.Q(cost_amount_eur__gte=0.00), name='chk_cost_amount_nonneg'),
            models.CheckConstraint(check=models.Q(driver_payout_eur__gte=0.00), name='chk_driver_payout_nonneg'),
            models.CheckConstraint(
                check=models.Q(fuel_liters__isnull=True) | models.Q(fuel_liters__gte=0.00),
                name='chk_cost_fuel_liters_nonneg'
            ),
            models.CheckConstraint(
                check=models.Q(is_repair=False) | models.Q(cost_type='maintenance'),
                name='chk_is_repair_only_for_maintenance'
            ),
            models.CheckConstraint(
                check=models.Q(cost_subtype__in=ALLOWED_COST_SUBTYPES),
                name='chk_cost_subtype_domain'
            )
        ]

    def __str__(self):
        return f"{self.cost_id} - {self.cost_type} ({self.cost_amount_eur} EUR)"