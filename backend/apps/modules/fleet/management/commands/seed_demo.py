
from datetime import date, timedelta
from django.core.management.base import BaseCommand
from django.db import transaction


from users.models import (
    AccountantProfile,
    CarrierCompanyProfile,
    ClientCompanyProfile,
    ClientIndividualProfile,
    DriverProfile,
    User,
)
from apps.modules.fleet.models import Vehicle

DEMO_PASSWORD = "Test1234!"


class Command(BaseCommand):
    help = "Наповнює базу демо-даними: клієнти, перевізники, штатні водії, авто."

    def handle(self, *args, **options):
        with transaction.atomic():
            self.stdout.write("Створюю замовників-фірм...")
            self.create_client_companies()

            self.stdout.write("Створюю приватних замовників...")
            self.create_client_individuals()

            self.stdout.write(
                "Створюю компанію-перевізника зі штатом і автопарком..."
            )
            carrier_company = self.create_carrier_with_fleet()

            self.stdout.write("Створюю водія-одноосібника...")
            self.create_solo_driver()

            self.stdout.write("Створюю бухгалтера...")
            self.create_accountant(carrier_company)

        self.stdout.write(
            self.style.SUCCESS(
                f"\nГотово! Пароль для всіх демо-акаунтів: {DEMO_PASSWORD}"
            )
        )

    def _get_or_create_user(
        self, email: str, username: str, role: str
    ) -> tuple[User, bool]:
        user, created = User.objects.get_or_create(
            email=email,
            defaults={"username": username, "role": role},
        )
        if created:
            user.set_password(DEMO_PASSWORD)
            user.save()
        return user, created

    def create_client_companies(self):
        companies = [
            (
                "spedition-mueller@example.de",
                "spedition_mueller",
                "Spedition Müller GmbH",
                "DE123456789",
            ),
            (
                "logi-bauer@example.de",
                "logi_bauer",
                "Bauer Logistik GmbH",
                "DE98765432",
            ),
        ]
        for email, username, name, reg_number in companies:
            user, created = self._get_or_create_user(
                email, username, User.Role.CLIENT_COMPANY
            )
            if created:
                ClientCompanyProfile.objects.create(
                    user=user,
                    company_name=name,
                    company_registration_number=reg_number,
                )
                self.stdout.write(f"  + {name} ({email})")

    def create_client_individuals(self):
        people = [
            ("anna.schmidt@example.de", "anna_schmidt", "Anna Schmidt"),
            ("thomas.weber@example.de", "thomas_weber", "Thomas Weber"),
        ]
        for email, username, full_name in people:
            user, created = self._get_or_create_user(
                email, username, User.Role.CLIENT_INDIVIDUAL
            )
            if created:
                ClientIndividualProfile.objects.create(
                    user=user, full_name=full_name
                )
                self.stdout.write(f"  + {full_name} ({email})")

    def create_carrier_with_fleet(self) -> CarrierCompanyProfile:
        # Creating a user with the role of CARRIER_COMPANY
        carrier_user, created = self._get_or_create_user(
            "fracht-team@example.de",
            "fracht_team",
            User.Role.CARRIER_COMPANY,
        )

        # Creating a CarrierCompanyProfile profile
        carrier_company, profile_created = (
            CarrierCompanyProfile.objects.get_or_create(
                user=carrier_user,
                defaults={
                    "company_name": "Fracht Team Spedition GmbH",
                    "company_registration_number": "HRB-998877",
                },
            )
        )
        if profile_created:
            self.stdout.write(f"  + Компанія-перевізник: fracht-team@example.de")

        # Full-time drivers
        staff = [
            (
                "stefan.koch@example.de",
                "stefan_koch",
                "Stefan Koch",
                "DL-4471829",
            ),
            (
                "mikhail.ivanov@example.de",
                "mikhail_ivanov",
                "Mikhail Ivanov",
                "DL-5583920",
            ),
            (
                "piotr.kowalski@example.de",
                "piotr_kowalski",
                "Piotr Kowalski",
                "DL-6692031",
            ),
        ]
        staff_profiles = []
        for email, username, full_name, license_number in staff:
            user, created = self._get_or_create_user(
                email, username, User.Role.DRIVER
            )
            if created:
                profile = DriverProfile.objects.create(
                    user=user,
                    full_name=full_name,
                    driver_license_number=license_number,
                    employer=carrier_company,
                    is_confirmed_by_employer=True,
                )
                self.stdout.write(f"    + штатний водій: {full_name} ({email})")
            else:
                profile = user.driver_profile
            staff_profiles.append(profile)

        # MOTOR POOL
        today = date.today()
        # plate, brand, model, driver, insurance_exp, tech_exp, gvw_kg, payload_kg, pallets
        vehicles = [
            (
                "B-FR-1023",
                "MAN",
                "TGX",
                staff_profiles[0],
                today + timedelta(days=400),
                today + timedelta(days=400),
                40000,
                24000,
                33,
            ),
            (
                "B-FR-2044",
                "Mercedes-Benz",
                "Actros",
                staff_profiles[1],
                today + timedelta(days=12),
                today + timedelta(days=200),
                40000,
                25000,
                33,
            ),
            (
                "B-FR-3087",
                "Scania",
                "R450",
                staff_profiles[2],
                today - timedelta(days=5),
                today + timedelta(days=20),
                40000,
                24500,
                33,
            ),
            (
                "B-FR-4099",
                "Volvo",
                "FH16",
                None,
                today + timedelta(days=180),
                today + timedelta(days=180),
                44000,
                27000,
                33,
            ),
        ]
        for (
            plate,
            brand,
            model,
            driver,
            insurance_exp,
            tech_exp,
            gvw,
            payload,
            pallets,
        ) in vehicles:
            vehicle, created = Vehicle.objects.get_or_create(
                plate_number=plate,
                defaults={
                    "carrier": carrier_company,
                    "brand": brand,
                    "model": model,
                    "assigned_driver": driver,
                    "insurance_expiry": insurance_exp,
                    "tech_inspection_expiry": tech_exp,
                    "gross_vehicle_weight_kg": gvw,
                    "payload_capacity_kg": payload,
                    "pallet_capacity": pallets,
                    "vehicle_type": "truck",
                    "is_test": True,
                },
            )
            if created:
                self.stdout.write(f"    + авто: {plate} ({brand} {model})")

        return carrier_company

    def create_solo_driver(self):
        user, created = self._get_or_create_user(
            "hans.zimmer@example.de", "hans_zimmer", User.Role.DRIVER
        )
        if created:
            # Single driver without employer
            DriverProfile.objects.create(
                user=user,
                full_name="Hans Zimmermann",
                driver_license_number="DL-1102938",
            )
            self.stdout.write(f"  + Водій-одноосібник: hans.zimmer@example.de")

    def create_accountant(self, carrier_company: CarrierCompanyProfile):
        user, created = self._get_or_create_user(
            "buchhaltung@example.de", "buchhaltung", User.Role.ACCOUNTANT
        )
        if created:
            AccountantProfile.objects.create(
                user=user, full_name="Julia Fischer"
            )
            self.stdout.write(f"  + Бухгалтер: buchhaltung@example.de")
            
            
#   docker compose exec -it app python manage.py seed_demo