-- ============================================================================
-- SMARTLOG EUROPE: CONSOLIDATED CORE LOGISTICS PLATFORM SCHEMA (v2)
-- Target Database: PostgreSQL 14+ with PostGIS Extension
-- Domain: Marketplace Matching, Fleet, PostGIS Routes & Tracking,
--         EU Multi-Country Compliance, Costs (Freelance/SMB) & Live Analytics
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. EXTENSIONS
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS postgis;

-- ----------------------------------------------------------------------------
-- 1. ENUMS & DOMAIN TYPES
-- ----------------------------------------------------------------------------

-- 1.1. Counterparty & Client Segmentation
CREATE TYPE client_type_enum AS ENUM (
    'individual',          -- B2C client (private shipping / moving)
    'company',             -- B2B client (SMB, VAT payer)
    'solo_carrier'         -- Self-employed carrier registered on exchange
);

-- 1.2. Driver Employment Model
CREATE TYPE driver_type_enum AS ENUM (
    'self_employed',       -- Sole proprietorship (Gewerbe / Solo-Selbstständige)
    'company_employee'     -- Fleet company staff driver
);

-- 1.3. Driver Operational Status
CREATE TYPE driver_status_enum AS ENUM (
    'available',           -- Free to accept orders
    'on_trip',             -- On duty / executing delivery
    'off_duty',            -- Rest period / mandatory break
    'inactive'             -- Account blocked or suspended
);

-- 1.4. Marketplace Order Lifecycle
CREATE TYPE order_status_enum AS ENUM (
    'draft',               -- Order draft created by customer
    'published',           -- Listed on the marketplace exchange
    'confirmed',           -- Matched & mutually confirmed (== PM's "ASSIGNED")
    'in_transit',          -- Cargo picked up, in transit
    'delivered',           -- Driver marked as delivered (e-POD uploaded)
    -- [2026-09-23] PM spec: окремий крок "Затверджено" бухгалтером/замовником
    -- ПІСЛЯ delivered, перед виставленням рахунку. Названо 'closed', а не
    -- 'confirmed' — те ім'я вже зайняте станом підтвердження matching-у вище,
    -- і повторне використання створило б плутанину в аналітиці.
    'closed',               -- Customer/accountant confirmed, invoice-ready
    'cancelled'            -- Order cancelled
);

-- 1.5. Two-Sided Matching State (No Dispatcher Engine)
CREATE TYPE match_status_enum AS ENUM (
    'pending',             -- Waiting for carrier selection / mutual accept
    'both_confirmed',      -- Both parties confirmed readiness
    'rejected'             -- Offer rejected by either party
);

-- 1.6. Assigned Executor Type
CREATE TYPE executor_type_enum AS ENUM (
    'fop_driver',          -- Solo courier / independent driver
    'carrier_company'      -- Transport company / subcontractor fleet
);

-- 1.7. Cargo Classification
CREATE TYPE cargo_type_enum AS ENUM (
    'box',
    'pallet',
    'parcel',
    'bulk',
    'fragile',
    'other'
);

-- 1.8. Physical Delivery Execution Status
CREATE TYPE delivery_status_enum AS ENUM (
    'planned',             -- Scheduled for execution
    'in_transit',          -- Vehicle moving on route
    'delivered',           -- Successfully delivered
    'cancelled'            -- Trip aborted
);

-- 1.9. Punctuality Status
CREATE TYPE delay_status_enum AS ENUM (
    'on_time',             -- On time or ahead of schedule
    'delayed'              -- Behind SLA schedule
);

-- 1.10. Operational Delay Reasons
CREATE TYPE delay_reason_enum AS ENUM (
    'traffic',             -- Highway traffic congestion (Stau)
    'weather',             -- Weather force majeure
    'loading_delay',       -- Ramp waiting time at origin
    'customer_delay',      -- Unloading delay at destination
    'vehicle_issue',       -- Breakdown or technical issue
    'route_issue',         -- Deviation or road closure
    'other'                -- Other reasons
);

-- 1.11. Delivery Incidents (Compliance Impact)
CREATE TYPE incident_type_enum AS ENUM (
    'None',
    'Traffic_Stau',
    'Weather_Force_Majeure',
    'Dock_Waiting',
    'Vehicle_Breakdown',
    'Driver_Route_Deviation',
    'Cargo_Handling_Damage',
    'Paperwork_CMR_Error'
);

-- 1.12. Core Cost Categories
CREATE TYPE cost_type_enum AS ENUM (
    'fuel',
    'maintenance',
    'work_reward',
    'other'
);

-- 1.13. Transport & Shipment Documents
CREATE TYPE document_type_enum AS ENUM (
    'electronic_cmr',      -- e-CMR consignment note
    'delivery_photo',      -- Photo proof of cargo delivery
    'damage_act',          -- Damage inspection report
    'weight_ticket',       -- Weight station ticket
    'invoice'              -- Commercial freight invoice
);

-- 1.14. Document Verification Status
CREATE TYPE document_status_enum AS ENUM (
    'pending',             -- Awaiting verification
    'confirmed',           -- Approved by accounting / customer
    'rejected'             -- Rejected / requires re-upload
);

-- ----------------------------------------------------------------------------
-- 2. EU EXPANSION MODULE: COUNTRIES & TAX COMPLIANCE
-- ----------------------------------------------------------------------------

-- 2.1. Supported EU Countries Registry
CREATE TABLE supported_countries (
    country_code   CHAR(2) PRIMARY KEY,                         -- ISO 3166-1 alpha-2
    country_name   VARCHAR(100) NOT NULL,
    is_active      BOOLEAN NOT NULL DEFAULT FALSE,              -- Operational status
    activated_at   TIMESTAMPTZ,
    CONSTRAINT chk_country_code_format CHECK (country_code ~ '^[A-Z]{2}$')
);

INSERT INTO supported_countries (country_code, country_name, is_active, activated_at) VALUES
    ('DE', 'Germany',     TRUE,  CURRENT_TIMESTAMP),
    ('AT', 'Austria',     FALSE, NULL),
    ('BE', 'Belgium',     FALSE, NULL),
    ('BG', 'Bulgaria',    FALSE, NULL),
    ('HR', 'Croatia',     FALSE, NULL),
    ('CY', 'Cyprus',      FALSE, NULL),
    ('CZ', 'Czechia',     FALSE, NULL),
    ('DK', 'Denmark',     FALSE, NULL),
    ('EE', 'Estonia',     FALSE, NULL),
    ('FI', 'Finland',     FALSE, NULL),
    ('FR', 'France',      FALSE, NULL),
    ('GR', 'Greece',      FALSE, NULL),
    ('HU', 'Hungary',     FALSE, NULL),
    ('IE', 'Ireland',     FALSE, NULL),
    ('IT', 'Italy',       FALSE, NULL),
    ('LV', 'Latvia',      FALSE, NULL),
    ('LT', 'Lithuania',   FALSE, NULL),
    ('LU', 'Luxembourg',  FALSE, NULL),
    ('MT', 'Malta',       FALSE, NULL),
    ('NL', 'Netherlands', FALSE, NULL),
    ('PL', 'Poland',      FALSE, NULL),
    ('PT', 'Portugal',    FALSE, NULL),
    ('RO', 'Romania',     FALSE, NULL),
    ('SK', 'Slovakia',    FALSE, NULL),
    ('SI', 'Slovenia',    FALSE, NULL),
    ('ES', 'Spain',       FALSE, NULL),
    ('SE', 'Sweden',      FALSE, NULL)
ON CONFLICT (country_code) DO NOTHING;

-- 2.2. VAT Rates History & Cross-Border Rules
CREATE TABLE vat_rates (
    vat_rate_id        SMALLINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    country_code       CHAR(2) NOT NULL REFERENCES supported_countries(country_code) ON UPDATE CASCADE,
    standard_rate_pct  NUMERIC(4,2) NOT NULL CHECK (standard_rate_pct >= 0.00),
    valid_from         DATE NOT NULL,
    valid_to           DATE,
    CONSTRAINT chk_vat_rate_period CHECK (valid_to IS NULL OR valid_to > valid_from)
);

CREATE UNIQUE INDEX idx_vat_rates_current_per_country
    ON vat_rates(country_code) WHERE valid_to IS NULL;

INSERT INTO vat_rates (country_code, standard_rate_pct, valid_from) VALUES
    ('DE', 19.00, '2007-01-01')
ON CONFLICT DO NOTHING;

-- ----------------------------------------------------------------------------
-- 3. CORE LOGISTICS ENTITIES
-- ----------------------------------------------------------------------------

-- 3.1. Clients & Counterparties (clients)
CREATE TABLE clients (
    client_id           VARCHAR(32) PRIMARY KEY,                         -- C-### or CL-YYYY-######
    client_type         client_type_enum NOT NULL DEFAULT 'company',
    full_legal_name     VARCHAR(150) NOT NULL,
    vat_id              VARCHAR(30),                                     -- USt-IdNr
    tax_number          VARCHAR(30),                                     -- Steuernummer
    contact_email       VARCHAR(100) NOT NULL,
    contact_phone       VARCHAR(30) NOT NULL,
    billing_street      VARCHAR(255) NOT NULL,
    billing_postal_code VARCHAR(10) NOT NULL,                            -- PLZ
    billing_city        VARCHAR(100) NOT NULL,
    billing_country     CHAR(2) NOT NULL REFERENCES supported_countries(country_code) ON UPDATE CASCADE,
    is_verified         BOOLEAN NOT NULL DEFAULT FALSE,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    -- [2026-09-16] Журнал верифікації: хто і коли фактично підтвердив клієнта
    -- (раніше було відсутнє — is_verified був "голим" прапорцем без аудиту).
    verified_by         VARCHAR(150),                                    -- Email/ID співробітника або системи, що верифікувала
    verified_at          TIMESTAMPTZ,                                     -- Дата й час фактичної верифікації
    created_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_company_tax_compliance CHECK (
        (client_type = 'company' AND (vat_id IS NOT NULL OR tax_number IS NOT NULL)) OR
        (client_type IN ('individual', 'solo_carrier'))
    ),
    -- [2026-09-16] Узгодженість журналу верифікації: обидва поля або порожні
    -- разом (ще не верифікований), або заповнені разом (верифікований).
    CONSTRAINT chk_client_verification_log CHECK (
        (is_verified = FALSE AND verified_by IS NULL AND verified_at IS NULL) OR
        (is_verified = TRUE  AND verified_by IS NOT NULL AND verified_at IS NOT NULL)
    )
);

-- 3.2. Fleet Vehicles (vehicles)
CREATE TABLE vehicles (
    vehicle_id                  VARCHAR(32) PRIMARY KEY,                 -- VH-####
    license_plate               VARCHAR(20) NOT NULL UNIQUE,
    vehicle_type                VARCHAR(32) NOT NULL,
    gross_vehicle_weight_kg     INTEGER NOT NULL CHECK (gross_vehicle_weight_kg > 0),
    payload_capacity_kg         NUMERIC(10,2) NOT NULL CHECK (payload_capacity_kg > 0),
    pallet_capacity             INTEGER NOT NULL DEFAULT 0 CHECK (pallet_capacity >= 0),
    fuel_type                   VARCHAR(20) NOT NULL DEFAULT 'diesel',
    euro_emission_class         VARCHAR(10) NOT NULL DEFAULT 'Euro_6',   -- For German LKW-Maut
    tuv_inspection_expiry_date  DATE NOT NULL,                           -- Mandatory inspection (HU/AU)
    is_active                   BOOLEAN NOT NULL DEFAULT TRUE,
    is_test                     BOOLEAN NOT NULL DEFAULT FALSE,
    -- [2026-09-16] Прямий зв'язок з юридичним власником/оператором ТЗ:
    -- компанія-перевізник (client_type='company') або сам самозайнятий
    -- перевізник як власна юр. особа (client_type='solo_carrier'). Раніше
    -- зв'язок "чиє це авто" можна було встановити лише непрямим ланцюжком
    -- vehicles.vehicle_id <- drivers.default_vehicle_id -> drivers.linked_client_id,
    -- що показує лише ПОТОЧНЕ ЗАКРІПЛЕННЯ водія, а не юридичну власність,
    -- і не працює для авто зовнішніх carrier_company, які взагалі не
    -- реєструють власних водіїв у drivers.
    owner_client_id              VARCHAR(32) REFERENCES clients(client_id) ON UPDATE CASCADE ON DELETE SET NULL,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3.3. Drivers & Self-Employed Couriers (drivers)
CREATE TABLE drivers (
    driver_id                   VARCHAR(32) PRIMARY KEY,                 -- DR-####
    linked_client_id            VARCHAR(32) NOT NULL REFERENCES clients(client_id) ON UPDATE CASCADE ON DELETE RESTRICT,
    driver_type                 driver_type_enum NOT NULL DEFAULT 'self_employed',
    full_name                   VARCHAR(100) NOT NULL,
    phone_number                VARCHAR(30) NOT NULL,
    base_city                   VARCHAR(100) NOT NULL,
    driving_license_categories  VARCHAR(50) NOT NULL,                    -- B, BE, C1, C1E, C, CE
    driving_license_expiry_date DATE NOT NULL,
    code_95_categories          VARCHAR(50),                             -- EU Code 95 (BKrFQG)
    code_95_expiry_date         DATE,
    has_adr                     BOOLEAN NOT NULL DEFAULT FALSE,
    adr_expiry_date             DATE,
    avg_customer_rating         NUMERIC(3,2) NOT NULL DEFAULT 5.00 CHECK (avg_customer_rating BETWEEN 1.00 AND 5.00),
    total_reviews_count         INTEGER NOT NULL DEFAULT 0 CHECK (total_reviews_count >= 0),
    service_compliance_rate     NUMERIC(5,2) NOT NULL DEFAULT 100.00 CHECK (service_compliance_rate BETWEEN 0.00 AND 100.00),
    status                      driver_status_enum NOT NULL DEFAULT 'available',
    -- [2026-09-23] Аудит авто-блокування (PM spec §6.2 "Саморегуляція біржі"):
    -- заповнюються тригером fn_evaluate_driver_auto_block, коли status -> 'inactive'
    -- автоматично через низький рейтинг або скарги на шахрайство.
    blocked_at                  TIMESTAMPTZ,
    blocked_reason               TEXT,
    default_vehicle_id          VARCHAR(32) REFERENCES vehicles(vehicle_id) ON UPDATE CASCADE ON DELETE SET NULL,
    is_verified                 BOOLEAN NOT NULL DEFAULT FALSE,
    is_test                     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_driver_code95_consistency CHECK (
        (code_95_categories IS NULL AND code_95_expiry_date IS NULL) OR
        (code_95_categories IS NOT NULL AND code_95_expiry_date IS NOT NULL)
    ),
    CONSTRAINT chk_driver_adr_consistency CHECK (
        (has_adr = FALSE AND adr_expiry_date IS NULL) OR
        (has_adr = TRUE AND adr_expiry_date IS NOT NULL)
    )
);

-- [2026-09-23, ВИПРАВЛЕННЯ] Окрема таблиця routes (планові PostGIS-коридори,
-- planned_geometry, planned_distance_km, origin/destination_country,
-- is_cross_border) ВИДАЛЕНА — це було зайве дублювання: маршрут і геодані
-- вже повністю фіксуються на боці deliveries/orders:
--   - deliveries.planned_distance_km / actual_distance_km — планова й
--     фактична відстань КОНКРЕТНОГО рейсу (це головне джерело правди,
--     не довідник коридору);
--   - orders.origin_location / destination_location — GPS-точки забору й
--     вивантаження (PostGIS Point);
--   - delivery_track_points — реальний GPS-трек під час рейсу;
--   - orders.origin_country / destination_country — вже використовуються
--     для крос-кордонної VAT-логіки (trg_set_order_vat_rate), is_cross_border
--     на рівні routes був точним дублікатом цієї ж перевірки.
-- route_id лишається на deliveries як звичайний довідниковий код
-- (RT-#####) без окремої FK-таблиці — один менший JOIN-вузол менше на
-- кожен запит v_deliveries_analytics і менше індексів для підтримки при
-- зростанні кількості користувачів/рейсів.

-- 3.4. Orders with Spatial Points & Two-Sided Matching (orders)
CREATE TABLE orders (
    order_id                    VARCHAR(32) PRIMARY KEY,                 -- SL-YYYY-######
    order_date                  DATE NOT NULL,
    client_id                   VARCHAR(32) NOT NULL REFERENCES clients(client_id) ON UPDATE CASCADE,
    status                      order_status_enum NOT NULL DEFAULT 'published',
    amount_eur                  NUMERIC(12,2) NOT NULL CHECK (amount_eur >= 0.00),
    vat_rate_pct                NUMERIC(4,2) NOT NULL DEFAULT 19.00,
    is_reverse_charge           BOOLEAN NOT NULL DEFAULT FALSE,

    origin_address              VARCHAR(255) NOT NULL,
    origin_city                 VARCHAR(100) NOT NULL,
    origin_postal_code          VARCHAR(10) NOT NULL,
    origin_country               CHAR(2) NOT NULL REFERENCES supported_countries(country_code) ON UPDATE CASCADE,
    origin_location              GEOMETRY(Point, 4326),                   -- Pickup GPS coordinates
    destination_address          VARCHAR(255) NOT NULL,
    destination_city             VARCHAR(100) NOT NULL,
    destination_postal_code      VARCHAR(10) NOT NULL,
    destination_country          CHAR(2) NOT NULL REFERENCES supported_countries(country_code) ON UPDATE CASCADE,
    destination_location         GEOMETRY(Point, 4326),                   -- Delivery GPS coordinates

    pickup_at                    TIMESTAMPTZ NOT NULL,
    planned_delivery_at          TIMESTAMPTZ NOT NULL,
    cargo_type                   cargo_type_enum NOT NULL,
    cargo_weight_kg               NUMERIC(10,2) NOT NULL CHECK (cargo_weight_kg > 0),
    cargo_units                   INTEGER NOT NULL CHECK (cargo_units >= 1),
    adr_required                  BOOLEAN NOT NULL DEFAULT FALSE,

    -- Two-Sided Matching & Dispatch-Free Engine
    executor_type                 executor_type_enum,
    executor_id                   VARCHAR(32),                             -- DR-#### or C-###
    executor_name                 VARCHAR(255),
    shipper_confirmed             BOOLEAN NOT NULL DEFAULT FALSE,
    shipper_confirmed_at          TIMESTAMPTZ,
    carrier_confirmed             BOOLEAN NOT NULL DEFAULT FALSE,
    carrier_confirmed_at          TIMESTAMPTZ,
    match_status                  match_status_enum NOT NULL DEFAULT 'pending',

    -- [2026-09-23] Журнал фінального підтвердження (status='closed'), окремо
    -- від shipper/carrier_confirmed вище (ті — про підтвердження виконавця
    -- ДО рейсу, ці — про приймання результату ПІСЛЯ delivered).
    closed_by                     VARCHAR(150),                            -- Email/ID замовника чи бухгалтера, що затвердив
    closed_at                     TIMESTAMPTZ,

    is_test                       BOOLEAN NOT NULL DEFAULT FALSE,
    created_at                     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_order_time_window CHECK (planned_delivery_at >= pickup_at),
    CONSTRAINT chk_order_match_consistency CHECK (
        match_status <> 'both_confirmed' OR (shipper_confirmed = TRUE AND carrier_confirmed = TRUE)
    ),
    CONSTRAINT chk_reverse_charge_zero_vat CHECK (
        is_reverse_charge = FALSE OR vat_rate_pct = 0.00
    ),
    -- [2026-09-23] Узгодженість журналу закриття: обидва поля або порожні
    -- разом, або заповнені разом — той самий патерн, що й chk_client_verification_log.
    CONSTRAINT chk_order_closed_log CHECK (
        (status <> 'closed' AND closed_by IS NULL AND closed_at IS NULL) OR
        (status = 'closed'  AND closed_by IS NOT NULL AND closed_at IS NOT NULL)
    )
    -- Примітка: колонки client_name тут НІКОЛИ не було — перевірено 2026-09-16.
    -- Ім'я клієнта завжди отримується через JOIN clients ON orders.client_id = clients.client_id.
);

-- 3.5. Physical Deliveries Execution (deliveries)
CREATE TABLE deliveries (
    delivery_id                 VARCHAR(32) PRIMARY KEY,                 -- DL-YYYY-######
    order_id                    VARCHAR(32) NOT NULL REFERENCES orders(order_id) ON UPDATE CASCADE,
    -- [2026-09-23, ВИПРАВЛЕННЯ] route_id — плоский довідниковий код коридору
    -- (RT-#####), БЕЗ FK на окрему таблицю routes (таблицю видалено — див.
    -- коментар перед §3.4 вище). Планова/фактична відстань і геодані рейсу
    -- вже тут же нижче (planned_distance_km, actual_distance_km) та в
    -- orders.origin/destination_location + delivery_track_points.
    route_id                    VARCHAR(32) NOT NULL,                    -- RT-#####
    driver_id                   VARCHAR(32) REFERENCES drivers(driver_id) ON UPDATE CASCADE,
    vehicle_id                  VARCHAR(32) REFERENCES vehicles(vehicle_id) ON UPDATE CASCADE,
    delivery_status             delivery_status_enum NOT NULL DEFAULT 'planned',
    planned_start_time          TIMESTAMPTZ NOT NULL,
    actual_start_time           TIMESTAMPTZ,
    planned_end_time            TIMESTAMPTZ NOT NULL,
    actual_end_time             TIMESTAMPTZ,
    planned_distance_km         NUMERIC(8,2) NOT NULL CHECK (planned_distance_km > 0),
    actual_distance_km          NUMERIC(8,2) CHECK (actual_distance_km >= 0),
    planned_duration_minutes    INTEGER,
    delivery_duration_minutes   INTEGER,
    delay_minutes               INTEGER DEFAULT 0,
    delay_status                delay_status_enum DEFAULT 'on_time',
    delay_reason                delay_reason_enum,
    incident_type               incident_type_enum NOT NULL DEFAULT 'None',
    is_driver_liable            BOOLEAN NOT NULL DEFAULT FALSE,
    customer_rating_stars       NUMERIC(2,1) CHECK (customer_rating_stars BETWEEN 1.0 AND 5.0),
    customer_feedback_comment   TEXT,
    proof_of_delivery_url       VARCHAR(255),
    is_test                     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_delivery_time_window CHECK (planned_end_time > planned_start_time)
);

-- 3.6. Live Telematics & GPS Track Points (delivery_track_points)
CREATE TABLE delivery_track_points (
    track_point_id  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    delivery_id     VARCHAR(32) NOT NULL REFERENCES deliveries(delivery_id) ON UPDATE CASCADE ON DELETE CASCADE,
    recorded_at     TIMESTAMPTZ NOT NULL,
    location        GEOMETRY(Point, 4326) NOT NULL,
    speed_kmh       NUMERIC(5,2)
);

-- 3.7. Electronic Documentation & File URLs Metadata (shipment_documents)
-- NOTE: Physical files (PDF, JPG, PNG) are stored in S3/MinIO. PostgreSQL stores only URLs / Object Keys.
CREATE TABLE shipment_documents (
    document_id                 VARCHAR(32) PRIMARY KEY,                 -- DOC-YYYY-######
    delivery_id                 VARCHAR(32) NOT NULL REFERENCES deliveries(delivery_id) ON UPDATE CASCADE ON DELETE CASCADE,
    document_type               document_type_enum NOT NULL,
    document_url                TEXT NOT NULL,                           -- S3 Pre-signed URL or CDN public path
    s3_object_key                VARCHAR(512),                            -- Key in S3 bucket (e.g., 'documents/2026/cmr_DL101.pdf')
    file_name                    VARCHAR(255) NOT NULL,                   -- Original filename (e.g., 'cmr_scan.pdf')
    file_size_bytes               BIGINT,                                  -- File size in bytes for storage tracking
    mime_type                     VARCHAR(100) NOT NULL DEFAULT 'application/pdf', -- 'application/pdf', 'image/jpeg'
    verification_status           document_status_enum NOT NULL DEFAULT 'pending',
    signed_by_name                 VARCHAR(100),
    signed_at                      TIMESTAMPTZ,
    signature_geo_location         GEOMETRY(Point, 4326),                   -- e-POD signature coordinates
    rejection_reason               TEXT,
    created_at                     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3.8. Operating & Vehicle Costs (costs)
CREATE TABLE costs (
    cost_id             VARCHAR(32) PRIMARY KEY,                         -- CS-YYYY-######
    cost_date           DATE NOT NULL,
    cost_type           cost_type_enum NOT NULL,
    cost_subtype        VARCHAR(32) NOT NULL,
    is_repair           BOOLEAN NOT NULL DEFAULT FALSE,                  -- Explicit PM repair flag
    cost_amount_eur     NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (cost_amount_eur >= 0.00),
    driver_payout_eur   NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (driver_payout_eur >= 0.00),
    delivery_id         VARCHAR(32) REFERENCES deliveries(delivery_id) ON UPDATE CASCADE ON DELETE SET NULL,
    driver_id           VARCHAR(32) REFERENCES drivers(driver_id) ON UPDATE CASCADE ON DELETE SET NULL,
    vehicle_id          VARCHAR(32) REFERENCES vehicles(vehicle_id) ON UPDATE CASCADE ON DELETE SET NULL,
    is_private_expense  BOOLEAN NOT NULL DEFAULT FALSE,                  -- Driver personal expense isolation
    fuel_liters         NUMERIC(8,2) CHECK (fuel_liters >= 0),
    notes               TEXT,
    is_test             BOOLEAN NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_is_repair_only_for_maintenance CHECK (
        is_repair = FALSE OR cost_type = 'maintenance'
    ),
    CONSTRAINT chk_cost_subtype_domain CHECK (
        cost_subtype IN (
            -- fuel
            'diesel', 'petrol', 'adblue', 'electricity', 'cng_lng',
            -- maintenance
            'scheduled_service', 'tech_inspection', 'repair', 'tires', 'washing',
            -- work_reward
            'trip_fee', 'base_salary', 'per_diem', 'bonus', 'driver_allowance',
            -- other
            'tolls', 'parking', 'fines', 'claims', 'insurance', 'ferry_bridge'
        )
    )
);

-- 3.9. [2026-09-23] Fraud/Trust Complaints (fraud_reports) — PM spec §6.2
-- "Саморегуляція біржі": клієнт натискає "Повідомити про шахрайство" на
-- водієві. НЕ для скарг на замовників і НЕ для захисту від зовнішніх атак
-- (підбір паролів, DDoS, сканування) — це інфраструктурне питання, свідомо
-- залишене поза цією бізнес-БД (рішення власника продукту 2026-09-23).
-- MVP-спрощення: рахуємо СУМАРНУ кількість скарг на водія, а не "2 поспіль",
-- як буквально написано в ТЗ PM — послідовність замовлень тут не
-- відстежується окремо, щоб не ускладнювати. Якщо точна семантика
-- "поспіль" критична — дай знати, доробимо.
CREATE TABLE fraud_reports (
    report_id           VARCHAR(32) PRIMARY KEY,                        -- FR-YYYY-######
    reported_driver_id  VARCHAR(32) NOT NULL REFERENCES drivers(driver_id) ON UPDATE CASCADE ON DELETE CASCADE,
    reporter_client_id  VARCHAR(32) NOT NULL REFERENCES clients(client_id) ON UPDATE CASCADE,
    order_id             VARCHAR(32) REFERENCES orders(order_id) ON UPDATE CASCADE ON DELETE SET NULL,
    reason               TEXT NOT NULL,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_fraud_reports_driver ON fraud_reports(reported_driver_id);

-- ----------------------------------------------------------------------------
-- 4. INDEXES & SPATIAL ACCELERATION
-- ----------------------------------------------------------------------------

CREATE INDEX idx_clients_country_type ON clients(billing_country, client_type);

-- [2026-09-16] Індекс для нового FK vehicles.owner_client_id (пошук усіх авто конкретного власника)
CREATE INDEX idx_vehicles_owner_client_id ON vehicles(owner_client_id);

CREATE INDEX idx_orders_client_id ON orders(client_id);
CREATE INDEX idx_orders_status_date ON orders(status, order_date);
CREATE INDEX idx_orders_match_status ON orders(match_status) WHERE match_status <> 'both_confirmed';
CREATE INDEX idx_orders_origin_loc ON orders USING GIST(origin_location);
CREATE INDEX idx_orders_dest_loc ON orders USING GIST(destination_location);
CREATE INDEX idx_orders_client_tracking ON orders(client_id, order_date DESC, order_id);

CREATE INDEX idx_deliveries_order_id ON deliveries(order_id);
CREATE INDEX idx_deliveries_route_id ON deliveries(route_id);
CREATE INDEX idx_deliveries_driver_status ON deliveries(driver_id, delivery_status);
CREATE INDEX idx_deliveries_vehicle_status ON deliveries(vehicle_id, delivery_status);
CREATE INDEX idx_deliveries_actual_end ON deliveries(actual_end_time);

CREATE INDEX idx_track_points_delivery ON delivery_track_points(delivery_id, recorded_at);
CREATE INDEX idx_track_points_geom ON delivery_track_points USING GIST(location);

CREATE INDEX idx_shipment_docs_delivery ON shipment_documents(delivery_id);
CREATE INDEX idx_shipment_docs_status ON shipment_documents(verification_status);

CREATE INDEX idx_costs_delivery_id ON costs(delivery_id);
CREATE INDEX idx_costs_driver_date ON costs(driver_id, cost_date);
CREATE INDEX idx_costs_vehicle_date ON costs(vehicle_id, cost_date);
CREATE INDEX idx_costs_is_repair ON costs(is_repair);
CREATE INDEX idx_costs_subtype ON costs(cost_subtype);

-- ----------------------------------------------------------------------------
-- 5. INTEGRITY TRIGGERS & REAL-TIME EVENT BUS (MODULES 3.1 & 3.7)
-- ----------------------------------------------------------------------------

-- 5.1. Validate Client Country Activation
CREATE OR REPLACE FUNCTION trg_validate_client_country() RETURNS TRIGGER AS $$
DECLARE
    v_is_active BOOLEAN;
BEGIN
    SELECT is_active INTO v_is_active FROM supported_countries WHERE country_code = NEW.billing_country;
    IF NOT COALESCE(v_is_active, FALSE) THEN
        RAISE EXCEPTION 'Country % is not yet activated for platform operations', NEW.billing_country;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_before_client_country_check ON clients;
CREATE TRIGGER trg_before_client_country_check
    BEFORE INSERT OR UPDATE OF billing_country ON clients
    FOR EACH ROW EXECUTE FUNCTION trg_validate_client_country();

-- 5.2. Validate Order Origin & Destination Countries
CREATE OR REPLACE FUNCTION trg_validate_order_countries() RETURNS TRIGGER AS $$
DECLARE
    v_origin_active BOOLEAN;
    v_dest_active   BOOLEAN;
BEGIN
    SELECT is_active INTO v_origin_active FROM supported_countries WHERE country_code = NEW.origin_country;
    SELECT is_active INTO v_dest_active   FROM supported_countries WHERE country_code = NEW.destination_country;

    IF NOT COALESCE(v_origin_active, FALSE) THEN
        RAISE EXCEPTION 'origin_country % is not yet activated for operations', NEW.origin_country;
    END IF;
    IF NOT COALESCE(v_dest_active, FALSE) THEN
        RAISE EXCEPTION 'destination_country % is not yet activated for operations', NEW.destination_country;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_before_order_countries_check ON orders;
CREATE TRIGGER trg_before_order_countries_check
    BEFORE INSERT OR UPDATE OF origin_country, destination_country ON orders
    FOR EACH ROW EXECUTE FUNCTION trg_validate_order_countries();

-- 5.3. Dynamic VAT Assignment & Cross-Border Reverse Charge Rule
CREATE OR REPLACE FUNCTION trg_set_order_vat_rate() RETURNS TRIGGER AS $$
DECLARE
    v_rate NUMERIC(4,2);
BEGIN
    IF NEW.origin_country <> NEW.destination_country THEN
        NEW.is_reverse_charge := TRUE;
        NEW.vat_rate_pct := 0.00;
        RETURN NEW;
    END IF;

    IF NEW.is_reverse_charge THEN
        NEW.vat_rate_pct := 0.00;
        RETURN NEW;
    END IF;

    SELECT standard_rate_pct INTO v_rate
    FROM vat_rates
    WHERE country_code = NEW.origin_country
      AND valid_from <= NEW.order_date
      AND (valid_to IS NULL OR valid_to > NEW.order_date)
    ORDER BY valid_from DESC
    LIMIT 1;

    IF v_rate IS NULL THEN
        RAISE EXCEPTION 'No VAT rate defined for country % on date %', NEW.origin_country, NEW.order_date;
    END IF;

    NEW.vat_rate_pct := v_rate;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_before_order_vat_rate ON orders;
CREATE TRIGGER trg_before_order_vat_rate
    BEFORE INSERT OR UPDATE OF origin_country, destination_country, order_date, is_reverse_charge ON orders
    FOR EACH ROW EXECUTE FUNCTION trg_set_order_vat_rate();

-- 5.4. Validate Assigned Driver Existence (Matching Engine)
CREATE OR REPLACE FUNCTION trg_validate_order_executor() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.executor_type = 'fop_driver' AND NEW.executor_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM drivers WHERE driver_id = NEW.executor_id) THEN
            RAISE EXCEPTION 'executor_id % not found in drivers (executor_type = fop_driver)', NEW.executor_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_before_order_executor_check ON orders;
CREATE TRIGGER trg_before_order_executor_check
    BEFORE INSERT OR UPDATE OF executor_type, executor_id ON orders
    FOR EACH ROW EXECUTE FUNCTION trg_validate_order_executor();

-- 5.5. [2026-09-16] Validate ADR Compliance of Assigned fop_driver Executor
-- Закриває прогалину: adr_required=TRUE на замовленні раніше ніяк не звірявся
-- з drivers.has_adr виконавця на рівні БД. Побудовано за тим самим принципом,
-- що й 5.4 (trg_validate_order_executor): перевірка спрацьовує ЛИШЕ для
-- executor_type='fop_driver' — для 'carrier_company' перевірка НЕ виконується,
-- бо платформа не реєструє водіїв/сертифікати зовнішніх компаній-перевізників
-- (та сама архітектурна межа, що й у 5.4).
CREATE OR REPLACE FUNCTION trg_validate_order_adr_compliance() RETURNS TRIGGER AS $$
DECLARE
    v_has_adr BOOLEAN;
BEGIN
    IF NEW.adr_required = TRUE AND NEW.executor_type = 'fop_driver' AND NEW.executor_id IS NOT NULL THEN
        SELECT has_adr INTO v_has_adr FROM drivers WHERE driver_id = NEW.executor_id;

        IF v_has_adr IS NULL THEN
            -- Водія взагалі не знайдено — цю помилку вже ловить trg_validate_order_executor,
            -- тут лише захисний дубль на випадок іншого порядку виконання тригерів.
            RAISE EXCEPTION 'executor_id % not found in drivers (adr compliance check)', NEW.executor_id;
        END IF;

        IF NOT v_has_adr THEN
            RAISE EXCEPTION 'Order % requires adr_required = TRUE, but driver % does not hold a valid ADR certificate (has_adr = FALSE)',
                NEW.order_id, NEW.executor_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_before_order_adr_check ON orders;
CREATE TRIGGER trg_before_order_adr_check
    BEFORE INSERT OR UPDATE OF executor_type, executor_id, adr_required ON orders
    FOR EACH ROW EXECUTE FUNCTION trg_validate_order_adr_compliance();

-- 5.6. [2026-09-23, ЗАМІНЮЄ РІШЕННЯ ВІД 2026-09-20] Validate driver_type <-> linked_client_id Type Consistency
-- Business rule (джерело: технічне завдання Product Manager, "Logistik.docx",
-- розділ 7.1/9): найманого водія в системі СТВОРЮЄ власник фірми через свій
-- кабінет (кнопка "+ Додати водія" -> система сама шле SMS з посиланням і
-- тимчасовим PIN для входу). Окремої форми самостійної реєстрації для
-- найманого водія в продукті НЕМАЄ — на /register лише 3 ролі: замовник,
-- приватний водій (self_employed), фірма.
-- Тому linked_client_id ЗАВЖДИ відомий у момент створення запису driver і
-- ЗАВЖДИ обов'язковий (NOT NULL на рівні колонки, див. вище):
--   driver_type = 'self_employed'    -> clients.client_type = 'solo_carrier'
--   driver_type = 'company_employee' -> clients.client_type = 'company'
-- Це скасовує попередній дозвіл на тимчасовий linked_client_id = NULL для
-- company_employee (рішення 2026-09-20) і, як наслідок, знімає потребу в
-- окремому модулі запитів на доступ (Design_App_Users_Access_Control...) —
-- той модуль лишається в Project Knowledge як задокументована, але
-- відхилена альтернатива.
CREATE OR REPLACE FUNCTION trg_validate_driver_linked_client() RETURNS TRIGGER AS $$
DECLARE
    v_client_type client_type_enum;
BEGIN
    -- linked_client_id тепер NOT NULL на рівні колонки, але лишаємо явну
    -- перевірку в тригері як другий рубіж захисту (defense in depth) —
    -- на випадок майбутньої зміни схеми, що послабить NOT NULL.
    IF NEW.linked_client_id IS NULL THEN
        RAISE EXCEPTION 'driver % must have linked_client_id set at creation time (owner-created record, PM spec)', NEW.driver_id;
    END IF;

    SELECT client_type INTO v_client_type FROM clients WHERE client_id = NEW.linked_client_id;

    IF v_client_type IS NULL THEN
        RAISE EXCEPTION 'linked_client_id % not found in clients', NEW.linked_client_id;
    END IF;

    IF NEW.driver_type = 'self_employed' AND v_client_type <> 'solo_carrier' THEN
        RAISE EXCEPTION 'self_employed driver % must link to a client with client_type=solo_carrier, got % (client %)',
            NEW.driver_id, v_client_type, NEW.linked_client_id;
    END IF;

    IF NEW.driver_type = 'company_employee' AND v_client_type <> 'company' THEN
        RAISE EXCEPTION 'company_employee driver % must link to a client with client_type=company, got % (client %)',
            NEW.driver_id, v_client_type, NEW.linked_client_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_before_driver_linked_client_check ON drivers;
CREATE TRIGGER trg_before_driver_linked_client_check
    BEFORE INSERT OR UPDATE OF driver_type, linked_client_id ON drivers
    FOR EACH ROW EXECUTE FUNCTION trg_validate_driver_linked_client();

-- 5.7. Real-Time WebSocket Push Notifications (PostgreSQL NOTIFY)
CREATE OR REPLACE FUNCTION trg_notify_delivery_status_change() RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') OR (NEW.delivery_status IS DISTINCT FROM OLD.delivery_status) THEN
        PERFORM pg_notify(
            'delivery_status_channel',
            json_build_object(
                'delivery_id', NEW.delivery_id,
                'order_id', NEW.order_id,
                'delivery_status', NEW.delivery_status,
                'updated_at', NEW.updated_at
            )::text
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_after_delivery_status_notify ON deliveries;
CREATE TRIGGER trg_after_delivery_status_notify
    AFTER INSERT OR UPDATE OF delivery_status ON deliveries
    FOR EACH ROW EXECUTE FUNCTION trg_notify_delivery_status_change();

-- ----------------------------------------------------------------------------
-- 6. POSTGIS SPATIAL ROUTE ANALYSIS FUNCTIONS
-- ----------------------------------------------------------------------------

-- 6.1. Build Actual LineString Trajectory from Telematics Points
CREATE OR REPLACE FUNCTION build_actual_route_geometry(p_delivery_id VARCHAR)
RETURNS GEOMETRY AS $$
    SELECT ST_MakeLine(location ORDER BY recorded_at)
    FROM delivery_track_points
    WHERE delivery_id = p_delivery_id;
$$ LANGUAGE sql STABLE;

-- [2026-09-23, ВИПРАВЛЕННЯ] Функцію is_route_deviated() видалено разом з
-- таблицею routes (вона порівнювала фактичний трек саме з
-- routes.planned_geometry, якої більше немає). "Відхилення від маршруту"
-- у поточній MVP-логіці фіксує сам водій/бекенд через
-- incident_type = 'Driver_Route_Deviation' (§4.3 deliveries), а не окрема
-- геометрична перевірка — це той самий сигнал, без зайвого PostGIS-навантаження.

-- ----------------------------------------------------------------------------
-- 7. LIVE ANALYTICAL VIEWS (ZERO-LAG OPERATIONAL REPORTING)
-- ----------------------------------------------------------------------------

-- 7.1. Operational Deliveries & Distance Deviation Monitoring (Specs 05a / 05b)
CREATE OR REPLACE VIEW v_deliveries_analytics AS
SELECT
    d.delivery_id,
    d.order_id,
    d.route_id,
    d.driver_id,
    d.vehicle_id,
    d.delivery_status,
    d.planned_start_time,
    d.actual_start_time,
    d.planned_end_time,
    d.actual_end_time,
    d.planned_distance_km,
    d.actual_distance_km,
    (d.actual_distance_km - d.planned_distance_km) AS distance_deviation_km,
    ROUND(
        ((d.actual_distance_km - d.planned_distance_km) / NULLIF(d.planned_distance_km, 0)) * 100,
        2
    ) AS distance_deviation_pct,
    d.delay_minutes,
    d.delay_status,
    d.delay_reason,
    d.incident_type,
    d.is_driver_liable,
    d.customer_rating_stars,
    d.proof_of_delivery_url,
    d.is_test
FROM deliveries d;

-- 7.2. Live Customer Order Tracking View
CREATE OR REPLACE VIEW v_customer_order_tracking AS
SELECT
    o.order_id,
    o.client_id,
    o.status         AS order_status,
    o.match_status,
    o.origin_city,
    o.origin_country,
    o.destination_city,
    o.destination_country,
    o.pickup_at,
    o.planned_delivery_at,
    d.delivery_id,
    d.delivery_status,
    d.actual_start_time,
    d.actual_end_time,
    d.delay_minutes,
    d.delay_status
FROM orders o
LEFT JOIN deliveries d ON d.order_id = o.order_id;

-- 7.3. Solo Carrier Net Take-Home Earnings View (Spec 04a)
CREATE OR REPLACE VIEW v_driver_net_income AS
SELECT
    c.driver_id,
    d.full_name,
    d.driver_type,
    SUM(c.driver_payout_eur) AS total_gross_payout_eur,
    SUM(CASE WHEN c.is_private_expense = FALSE THEN c.cost_amount_eur ELSE 0 END) AS corporate_operating_expenses_eur,
    SUM(CASE WHEN c.is_private_expense = TRUE THEN c.cost_amount_eur ELSE 0 END) AS private_driver_expenses_eur,
    (SUM(c.driver_payout_eur) - SUM(c.cost_amount_eur)) AS net_driver_take_home_eur
FROM costs c
JOIN drivers d ON c.driver_id = d.driver_id
GROUP BY c.driver_id, d.full_name, d.driver_type;

-- 7.4. Delivery Margin & Profitability P&L View
CREATE OR REPLACE VIEW v_delivery_profitability AS
SELECT
    d.delivery_id,
    o.order_id,
    o.amount_eur AS gross_revenue_eur,
    COALESCE(SUM(c.cost_amount_eur) FILTER (WHERE c.is_private_expense = FALSE), 0.00) AS direct_operating_costs_eur,
    COALESCE(SUM(c.driver_payout_eur), 0.00) AS driver_reward_eur,
    (o.amount_eur
        - COALESCE(SUM(c.cost_amount_eur) FILTER (WHERE c.is_private_expense = FALSE), 0.00)
        - COALESCE(SUM(c.driver_payout_eur), 0.00)) AS net_gross_profit_eur,
    ROUND(
        ((o.amount_eur
            - COALESCE(SUM(c.cost_amount_eur) FILTER (WHERE c.is_private_expense = FALSE), 0.00)
            - COALESCE(SUM(c.driver_payout_eur), 0.00)) / NULLIF(o.amount_eur, 0)) * 100,
        2
    ) AS gross_margin_pct
FROM deliveries d
JOIN orders o ON d.order_id = o.order_id
LEFT JOIN costs c ON d.delivery_id = c.delivery_id
GROUP BY d.delivery_id, o.order_id, o.amount_eur;

-- ----------------------------------------------------------------------------
-- 8. SMART SKIP ENGINE: DRIVER RATINGS & COMPLIANCE (SPEC 03a)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION trg_update_driver_ratings() RETURNS TRIGGER AS $$
DECLARE
    v_driver_id VARCHAR(32) := NEW.driver_id;
    v_curr_compliance NUMERIC(5,2);
    v_avg_rating NUMERIC(3,2);
    v_total_reviews INTEGER;
    v_on_time_rate NUMERIC;
    v_incident_free_rate NUMERIC;
    v_pod_rate NUMERIC;
    v_compliance_score NUMERIC(5,2);
BEGIN
    IF v_driver_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Smart Skip: Bypass heavy 90-day window aggregation on standard incident-free trips
    SELECT service_compliance_rate INTO v_curr_compliance
    FROM drivers WHERE driver_id = v_driver_id;

    IF v_curr_compliance = 100.00
       AND (NEW.delay_minutes = 0 OR NEW.delay_minutes IS NULL)
       AND NEW.is_driver_liable = FALSE
       AND NEW.incident_type = 'None'
       AND NEW.customer_rating_stars IS NULL THEN
        RETURN NEW;
    END IF;

    -- 1. Recalculate Average Customer Rating (Stars 1.0 - 5.0)
    SELECT
        COALESCE(ROUND(AVG(customer_rating_stars), 2), 5.00),
        COUNT(customer_rating_stars)
    INTO v_avg_rating, v_total_reviews
    FROM deliveries
    WHERE driver_id = v_driver_id AND customer_rating_stars IS NOT NULL;

    -- 2. Recalculate 90-Day Rolling Window Technical Metrics (OTR, IFR, PODR)
    SELECT
        ROUND((COUNT(*) FILTER (
            WHERE actual_end_time <= planned_end_time
               OR (actual_end_time > planned_end_time AND is_driver_liable = FALSE)
        )::NUMERIC / NULLIF(COUNT(*), 0)) * 100, 2),
        ROUND((COUNT(*) FILTER (WHERE is_driver_liable = FALSE)::NUMERIC / NULLIF(COUNT(*), 0)) * 100, 2),
        ROUND((COUNT(*) FILTER (
            WHERE proof_of_delivery_url IS NOT NULL AND incident_type != 'Paperwork_CMR_Error'
        )::NUMERIC / NULLIF(COUNT(*), 0)) * 100, 2)
    INTO v_on_time_rate, v_incident_free_rate, v_pod_rate
    FROM deliveries
    WHERE driver_id = v_driver_id
      AND delivery_status = 'delivered'
      AND actual_end_time >= CURRENT_DATE - INTERVAL '90 days';

    -- 3. Apply Weighted Formula (40% OTR + 40% IFR + 20% PODR)
    v_compliance_score := ROUND(
        (0.40 * COALESCE(v_on_time_rate, 100.00)) +
        (0.40 * COALESCE(v_incident_free_rate, 100.00)) +
        (0.20 * COALESCE(v_pod_rate, 100.00)),
        2
    );

    -- 4. Update Profile in drivers Table
    UPDATE drivers
    SET avg_customer_rating = v_avg_rating,
        total_reviews_count = v_total_reviews,
        service_compliance_rate = v_compliance_score,
        updated_at = CURRENT_TIMESTAMP
    WHERE driver_id = v_driver_id;

    -- 5. [2026-09-23] Перевірка порогу авто-блокування (PM spec §6.2) одразу
    -- після оновлення рейтингу — див. 8.1 нижче.
    PERFORM fn_evaluate_driver_auto_block(v_driver_id);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_after_delivery_update ON deliveries;
CREATE TRIGGER trg_after_delivery_update
    AFTER INSERT OR UPDATE OF delivery_status, customer_rating_stars, is_driver_liable, incident_type, proof_of_delivery_url
    ON deliveries
    FOR EACH ROW EXECUTE FUNCTION trg_update_driver_ratings();

-- 8.1. [2026-09-23] No-Admin Trust Engine: Auto-Block on Low Rating or Fraud
-- Reports (PM spec §6.2 "Саморегуляція біржі"). Спрацьовує з двох джерел:
--   a) trg_update_driver_ratings вище — щоразу після перерахунку рейтингу;
--   b) trg_after_fraud_report_insert нижче — щоразу при новій скарзі.
-- Пороги (3.20 зірки, 2 скарги) захардкоджені в MVP; якщо знадобиться їх
-- міняти без релізу — винести в окрему конфігураційну таблицю пізніше.
-- ВІДОМЕ ОБМЕЖЕННЯ: якщо адміністратор вручну розблокує водія (Story 7),
-- а показники (рейтинг/кількість скарг) ще не покращились — наступна ж
-- подія знову заблокує його автоматично. Свідомо не вирішую це зараз
-- (потребує окремого поля "manual override" і рішення, як довго воно діє).
CREATE OR REPLACE FUNCTION fn_evaluate_driver_auto_block(p_driver_id VARCHAR) RETURNS VOID AS $$
DECLARE
    v_rating       NUMERIC(3,2);
    v_report_count INTEGER;
    v_reason       TEXT := NULL;
BEGIN
    SELECT avg_customer_rating INTO v_rating
    FROM drivers WHERE driver_id = p_driver_id AND status <> 'inactive';

    IF NOT FOUND THEN
        RETURN;  -- вже неактивний (заблокований) або запису не існує
    END IF;

    SELECT COUNT(*) INTO v_report_count
    FROM fraud_reports WHERE reported_driver_id = p_driver_id;

    IF v_rating < 3.20 THEN
        v_reason := 'auto_block: avg_customer_rating ' || v_rating || ' < 3.20';
    ELSIF v_report_count >= 2 THEN
        v_reason := 'auto_block: fraud_reports_count ' || v_report_count || ' >= 2';
    END IF;

    IF v_reason IS NOT NULL THEN
        UPDATE drivers
        SET status = 'inactive', blocked_at = CURRENT_TIMESTAMP, blocked_reason = v_reason
        WHERE driver_id = p_driver_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trg_fraud_report_autoblock() RETURNS TRIGGER AS $$
BEGIN
    PERFORM fn_evaluate_driver_auto_block(NEW.reported_driver_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_after_fraud_report_insert ON fraud_reports;
CREATE TRIGGER trg_after_fraud_report_insert
    AFTER INSERT ON fraud_reports
    FOR EACH ROW EXECUTE FUNCTION trg_fraud_report_autoblock();

-- ----------------------------------------------------------------------------
-- 9. БУФЕРНА ТАБЛИЦЯ STAGING (МАСОВИЙ ІМПОРТ З CSV)
-- ----------------------------------------------------------------------------

CREATE UNLOGGED TABLE staging_costs (LIKE costs INCLUDING DEFAULTS);
ALTER TABLE staging_costs ALTER COLUMN cost_id DROP NOT NULL;

-- ----------------------------------------------------------------------------
-- 10. ОПЕРАЦІЙНІ РЕКОМЕНДАЦІЇ ДЛЯ DEVOPS ТА ІНФРАСТРУКТУРИ
-- ----------------------------------------------------------------------------
-- 10.1. Пул з'єднань (Connection Pooling):
--       Налаштуйте PgBouncer у транзакційному режимі (transaction mode) для сервісу бекенду на FastAPI.
-- 10.2. Захист від блокувань довгими транзакціями:
--       ALTER ROLE smartlog_app SET statement_timeout = '15s';
--       ALTER ROLE smartlog_app SET idle_in_transaction_session_timeout = '30s';
-- 10.3. Пагінація через ключі (Keyset Pagination за індексом idx_orders_client_tracking):
--       SELECT * FROM orders WHERE client_id = $1 AND (order_date, order_id) < ($2, $3)
--       ORDER BY order_date DESC, order_id DESC LIMIT 20;
-- 10.4. Інструкція з активації розширення на країни ЄС (Runbook):
--       Щоб активувати операційну діяльність в Австрії (AT) або Польщі (PL):
--         INSERT INTO vat_rates (country_code, standard_rate_pct, valid_from)
--         VALUES ('AT', 20.00, CURRENT_DATE);
--         UPDATE supported_countries SET is_active = TRUE, activated_at = CURRENT_TIMESTAMP
--         WHERE country_code = 'AT';
-- 10.5. [2026-09-16] Відомі відкриті прогалини (не входять у цю ревізію,
--       винесені на наступну ітерацію MVP):
--       - vehicles.owner_client_id: для авто штатних водіїв (company_employee)
--         немає client-запису, що представляв би саму операційну компанію-
--         власника автопарку — потрібно завести такий запис у clients.
--       - Відсутній довідник тарифів LKW-Maut (toll_rates) за euro_emission_class
--         і gross_vehicle_weight_kg — потрібен для точного розрахунку дорожніх зборів.
--       - drivers: немає DB-рівневої перевірки протермінованості driving_license_expiry_date,
--         code_95_expiry_date, adr_expiry_date відносно поточної дати (лише
--         перевірка парності полів через CHECK, не самих дат).
