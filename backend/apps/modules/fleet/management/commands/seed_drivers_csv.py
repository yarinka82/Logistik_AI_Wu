
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import date

from users.models import User, DriverProfile
from apps.modules.fleet.models import Vehicle

DEMO_PASSWORD = "Test1234!"

# driver_ref, driver_type, full_name, phone_number, base_city,
# driving_license_categories, driving_license_expiry_date,
# code_95_categories, code_95_expiry_date, has_adr, adr_expiry_date,
# avg_customer_rating, total_reviews_count, service_compliance_rate,
# status, default_vehicle_plate, is_confirmed_by_employer
DRIVERS_DATA = [
    ("DR-0042", "self_employed", "Hans Schmidt", "+49 170 1112233", "Hamburg",
     "B, BE", date(2031, 8, 15), "", None, False, None,
     5.00, 18, 100.00, "available", "VH-0018", True),
    ("DR-0043", "company_employee", "Marek Kowalski", "+49 170 2223344", "Berlin",
     "B, BE, C1, C1E, C, CE", date(2029, 4, 10), "C1, C, CE", date(2028, 4, 10), False, None,
     4.85, 64, 94.50, "on_trip", "VH-0021", True),
    ("DR-0044", "self_employed", "Stefan Weber", "+49 170 3334455", "München",
     "B, C1, C", date(2027, 11, 30), "C1, C", date(2027, 10, 15), True, date(2027, 11, 10),
     4.95, 92, 98.00, "available", "VH-0030", True),
    ("DR-0045", "company_employee", "Lukas Becker", "+49 170 4445566", "Köln",
     "B, BE, C1, C1E", date(2030, 1, 20), "C1, C1E", date(2028, 12, 5), False, None,
     4.70, 31, 89.00, "off_duty", "VH-0014", True),
    ("DR-0046", "self_employed", "Florian Wagner", "+49 170 5556677", "Leipzig",
     "B, BE", date(2033, 3, 15), "", None, False, None,
     5.00, 0, 100.00, "available", "VH-0041", False),
    ("DR-0047", "self_employed", "Dirk Hoffmann", "+49 170 6667788", "Frankfurt am Main",
     "B, C1, C, CE", date(2028, 6, 30), "C1, C, CE", date(2026, 5, 10), False, None,
     4.60, 45, 91.20, "inactive", "VH-0025", False),
    ("DR-0048", "company_employee", "Jan Schneider", "+49 170 7778899", "Stuttgart",
     "B, BE, C1, C1E", date(2029, 9, 15), "C1, C1E", date(2027, 9, 15), False, None,
     3.85, 28, 74.50, "available", "VH-0019", True),
]


class Command(BaseCommand):
    help = "Наповнює базу тестовими водіями з фіксованого набору даних (DR-0042..DR-0048)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear", action="store_true",
            help="Видалити існуючі DriverProfile з цими driver_ref перед створенням",
        )

    def handle(self, *args, **options):
        if options["clear"]:
            refs = [row[0] for row in DRIVERS_DATA]
            deleted, _ = DriverProfile.objects.filter(driver_ref__in=refs).delete()
            self.stdout.write(f"🗑️  Видалено {deleted} записів")

        for (
            driver_ref, driver_type, full_name, phone_number, base_city,
            license_categories, license_expiry, code95_categories, code95_expiry,
            has_adr, adr_expiry, rating, reviews_count, compliance_rate,
            status, default_vehicle_plate, is_confirmed,
        ) in DRIVERS_DATA:
            email = f"{driver_ref.lower().replace('-', '')}@example.de"
            username = driver_ref.lower().replace("-", "_")

            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    "username": username,
                    "role": User.Role.DRIVER,
                    "phone": phone_number,
                },
            )
            if created:
                user.set_password(DEMO_PASSWORD)
                user.save()

            default_vehicle = None
            if default_vehicle_plate:
                default_vehicle = Vehicle.objects.filter(plate_number__icontains=default_vehicle_plate).first()
                if not default_vehicle:
                    self.stdout.write(
                        self.style.WARNING(
                            f"  ⚠ Vehicle {default_vehicle_plate} не знайдено для {driver_ref}, пропускаю прив'язку"
                        )
                    )

            profile, profile_created = DriverProfile.objects.update_or_create(
                driver_ref=driver_ref,
                defaults={
                    "user": user,
                    "full_name": full_name,
                    "driver_type": driver_type,
                    "base_city": base_city,
                    "driving_license_categories": license_categories,
                    "driving_license_expiry_date": license_expiry,
                    "code_95_categories": code95_categories or None,
                    "code_95_expiry_date": code95_expiry,
                    "has_adr": has_adr,
                    "adr_expiry_date": adr_expiry,
                    "avg_customer_rating": rating,
                    "total_reviews_count": reviews_count,
                    "service_compliance_rate": compliance_rate,
                    "status": status,
                    "default_vehicle": default_vehicle,
                    "is_confirmed_by_employer": is_confirmed,
                    "confirmed_at": timezone.now() if is_confirmed else None,
                    "is_carrier_company": False,
                    "also_drives": True,
                    "is_test": True,
                    "driver_license_number": driver_ref.replace("DR-", "DL-"),
                },
            )
            action = "Створено" if profile_created else "Оновлено"
            self.stdout.write(f"  ✅ {action}: {full_name} ({driver_ref}, {status})")

        self.stdout.write(self.style.SUCCESS(f"\nГотово! Пароль для всіх демо-акаунтів: {DEMO_PASSWORD}"))