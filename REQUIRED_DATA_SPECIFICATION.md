# Required Data for SmartLog Europe

**Document Type:** Business Data Catalog & Analytical Data Dictionary  
**Scope:** Dispatch-Free Marketplace, Fleet Telematics, EU Tax/Transport Compliance, Financial P&L, Predictive ML  
**Methodology:** 3-Tier Priority Classification: Critical / Important / Advanced

## 1. Customers & Counterparties (`clients`)

Облік B2B корпоративних замовників, B2C клієнтів та самозайнятих перевізників як зареєстрованих контрагентів біржі.

| Field | Business Purpose | Required | Data Type | Source | Used For (KPI & Business Decisions) |
|---|---|---|---|---|---|
| `client_id` | Унікальний бізнес-ідентифікатор контрагента | Tier 1 (Critical) | `VARCHAR(32)` | System / Auto-gen | Primary Key; облік LTV, CAC, Retention |
| `client_type` | Сегментація контрагента (`individual`, `company`, `solo_carrier`) | Tier 1 (Critical) | `ENUM` | User Profile (Reg) | Права доступу на біржі, автоматичні податкові правила |
| `full_legal_name` | Юридична назва фірми або ПІБ фізичної особи | Tier 1 (Critical) | `VARCHAR(150)` | KYC Form | Формування e-CMR та комерційних інвойсів |
| `vat_id` | Номер платника ПДВ (USt-IdNr у Німеччині / VIES у ЄС) | Tier 1 (Critical)* | `VARCHAR(30)` | Tax Document | EU Reverse Charge (0% ПДВ), перевірка легальності B2B |
| `tax_number` | Національний податковий номер (Steuernummer) | Tier 1 (Critical)* | `VARCHAR(30)` | Tax Document | Локальна податкова звітність у Finanzamt |
| `billing_country` | Країна податкової реєстрації (ISO Alpha-2) | Tier 1 (Critical) | `CHAR(2)` | Address lookup | FK -> `supported_countries`, автоматичне визначення ПДВ |
| `billing_postal_code` | Поштовий індекс платника (PLZ) | Tier 1 (Critical) | `VARCHAR(10)` | Address lookup | Регіональний аналіз попиту, маршрутизація рахунків |
| `is_verified` | Допуск профілю до публікації / взяття замовлень | Tier 1 (Critical) | `BOOLEAN` | Admin KYC Check | Зниження ризику шахрайства на відкритому маркетплейсі |
| `payment_terms_days` | Допустима відстрочка платежу для B2B клієнта | Tier 2 (Important) | `INTEGER` | Contract Terms | Контроль дебіторської заборгованості, ризик касових розривів |
| `credit_limit_eur` | Максимальний кредитний ліміт замовника | Tier 2 (Important) | `NUMERIC(12,2)` | ERP / Accounting | Автоматичне блокування нових замовлень боржників |

> *Обов'язково для суб'єктів з `client_type = 'company'`.*

## 2. Commercial Orders & Marketplace Matching (`orders`)

Фіксація комерційних умов вантажоперевезення та процес узгодження між сторонами без участі диспетчера.

| Field | Business Purpose | Required | Data Type | Source | Used For (KPI & Business Decisions) |
|---|---|---|---|---|---|
| `order_id` | Унікальний номер замовлення (`SL-YYYY-######`) | Tier 1 (Critical) | `VARCHAR(32)` | System / Auto-gen | Primary Key; наскрізний трекінг відправлення |
| `order_date` | Календарна дата оформлення заявки замовником | Tier 1 (Critical) | `DATE` | User session | Аналіз сезонності, часові ряди попиту (Demand Forecasting) |
| `client_id` | Ідентифікатор замовника послуги | Tier 1 (Critical) | `VARCHAR(32)` | Session state | FK -> `clients`; аналіз прибутковості клієнтів |
| `status` | Статус життєвого циклу (`draft` ... `delivered`, `cancelled`) | Tier 1 (Critical) | `ENUM` | State Machine | Конверсія воронки заявок, відсоток скасувань |
| `amount_eur` | Вартість перевезення без ПДВ (Gross Revenue) | Tier 1 (Critical) | `NUMERIC(12,2)` | Order Quote | Дохід, Unit Economics, розрахунок чистої маржі |
| `vat_rate_pct` | Ставка ПДВ (19.00% у DE або 0.00% Reverse Charge) | Tier 1 (Critical) | `NUMERIC(4,2)` | Trigger / Auto-calc | Податковий комплаєнс у Німеччині та ЄС |
| `origin_location` | GPS-координати точки забору (WGS 84 Point) | Tier 1 (Critical) | `Point (PostGIS)` | Geocoding API | Просторова фільтрація: пошук замовлень поруч із авто |
| `destination_location` | GPS-координати точки вивантаження (WGS 84 Point) | Tier 1 (Critical) | `Point (PostGIS)` | Geocoding API | Побудова лінії маршруту та розрахунок відстані |
| `pickup_at` | Планові дата і час подачі під завантаження | Tier 1 (Critical) | `TIMESTAMPTZ` | Customer entry | SLA завантаження, виявлення запізнень на старті |
| `planned_delivery_at` | Узгоджений дедлайн доставки вантажу отримувачу | Tier 1 (Critical) | `TIMESTAMPTZ` | Customer entry | Розрахунок On-Time Delivery Rate (OTR), штрафи за простій |
| `cargo_type` | Класифікатор вантажу (`box`, `pallet`, `bulk` тощо) | Tier 1 (Critical) | `ENUM` | Order Form | Підбір типу кузова авто: тент, рефрижератор, фургон |
| `cargo_weight_kg` | Фактична маса вантажу в кілограмах | Tier 1 (Critical) | `NUMERIC(10,2)` | Order Form | Запобігання перевантаженню шасі та штрафам BAG |
| `cargo_units` | Кількість палет / місць / коробок | Tier 1 (Critical) | `INTEGER` | Order Form | Розрахунок коефіцієнта використання місткості авто |
| `shipper_confirmed` | Підтвердження готовності замовником | Tier 1 (Critical) | `BOOLEAN` | Marketplace UI | Усунення диспетчера: двосторонній контракт |
| `carrier_confirmed` | Натискання водієм кнопки "Перевезу" | Tier 1 (Critical) | `BOOLEAN` | Driver App | Автоматичне бронювання рейсу без дзвінків |
| `adr_required` | Ознака небезпечного вантажу (ADR) | Tier 2 (Important) | `BOOLEAN` | Order Form | Фільтрація допущених водіїв та сертифікованих авто |

## 3. Fleet & Vehicles (`vehicles`)

Забезпечення відповідності німецьким стандартам StVZO, розрахунок дорожнього збору Toll Collect (LKW-Maut) та технічний контроль.

| Field | Business Purpose | Required | Data Type | Source | Used For (KPI & Business Decisions) |
|---|---|---|---|---|---|
| `vehicle_id` | Унікальний системний код авто (`VH-####`) | Tier 1 (Critical) | `VARCHAR(32)` | Fleet Registry | Primary Key автопарку; зв'язок із рейсами та ТО |
| `license_plate` | Державний номерний знак, наприклад `B-SL 2026` | Tier 1 (Critical) | `VARCHAR(20)` | Tech Passport | Автоматичний облік на плакатах Toll Collect / Maut |
| `gross_vehicle_weight_kg` | Повна конструктивна маса автомобіля (GVW) в кг | Tier 1 (Critical) | `INTEGER` | Vehicle spec | Вагові обмеження на мостах, тарифікація Maut у DE |
| `payload_capacity_kg` | Максимальна корисна вантажопідйомність | Tier 1 (Critical) | `NUMERIC(10,2)` | Vehicle spec | Валідація: `orders.cargo_weight_kg <= payload` |
| `pallet_capacity` | Місткість стандартних європалет (1200x800) | Tier 1 (Critical) | `INTEGER` | Vehicle spec | Контроль завантаження кузова, Capacity Utilization % |
| `euro_emission_class` | Екологічний стандарт (`Euro_6`, `EV` тощо) | Tier 1 (Critical) | `VARCHAR(10)` | Tech Passport | Розрахунок ставки дорожнього збору Maut та зон Umweltzone |
| `tuv_inspection_expiry_date` | Термін дії технічного огляду TÜV (HU/AU) | Tier 1 (Critical) | `DATE` | Inspection card | Автоматичне блокування виходу несправного авто на маршрут |
| `fuel_type` | Тип пального (`diesel`, `electricity`, `cng_lng`) | Tier 2 (Important) | `VARCHAR(20)` | Tech Passport | Аналіз енергоефективності, ESG-звітність CO2 |
| `fuel_consumption_nominal` | Паспортна норма витрати пального на 100 км | Tier 3 (Advanced) | `NUMERIC(5,2)` | OEM specs | Baseline для моделі виявлення аномальних списань пального |

## 4. Drivers & Compliance Engine (`drivers`)

Кваліфікація водіїв, легальність праці за стандартами ЄС та дворівневий алгоритм оцінювання.

| Field | Business Purpose | Required | Data Type | Source | Used For (KPI & Business Decisions) |
|---|---|---|---|---|---|
| `driver_id` | Унікальний ідентифікатор виконавця (`DR-####`) | Tier 1 (Critical) | `VARCHAR(32)` | System / Auto-gen | Primary Key; зв'язок із рейсами та виплатами |
| `driver_type` | Модель співпраці (`self_employed` vs `company_employee`) | Tier 1 (Critical) | `ENUM` | Contract | Розділення розрахунків: винагорода ФОП чи зарплатна відомість |
| `full_name` | Прізвище та ім'я водія | Tier 1 (Critical) | `VARCHAR(100)` | ID Document | Обов'язковий реквізит міжнародної накладної e-CMR |
| `phone_number` | Контактний мобільний телефон водія | Tier 1 (Critical) | `VARCHAR(30)` | Driver Profile | Екстрений зв'язок замовника з водієм |
| `driving_license_categories` | Перелік відкритих категорій прав (`B`, `BE`, `C1`, `C`, `CE`) | Tier 1 (Critical) | `VARCHAR(50)` | Driving License | Автоматична перевірка права керування конкретним авто |
| `driving_license_expiry_date` | Термін дії посвідчення водія | Tier 1 (Critical) | `DATE` | Driving License | Заборона призначення на рейс із простроченими правами |
| `status` | Операційний стан (`available`, `on_trip`, `off_duty`) | Tier 1 (Critical) | `ENUM` | Driver App | Швидкий пошук доступних виконавців на біржі |
| `code_95_expiry_date` | Термін дії кваліфікаційного сертифіката BKrFQG | Tier 2 (Important) | `DATE` | Code 95 card | Легальний допуск до комерційних рейсів вантажівками >3.5т у ЄС |
| `has_adr` | Наявність допуску до небезпечних вантажів | Tier 2 (Important) | `BOOLEAN` | ADR Certificate | Допуск до замовлень із прапорцем `adr_required = TRUE` |
| `avg_customer_rating` | Середній клієнтський бал за зірочками (1.00-5.00) | Tier 2 (Important) | `NUMERIC(3,2)` | Trigger / Deliveries | Публічний авторитет водія на відкритому маркетплейсі |
| `service_compliance_rate` | Технічний рейтинг надійності за 90 днів (0-100%) | Tier 2 (Important) | `NUMERIC(5,2)` | Smart Skip Trigger | Допуск до автопризначення замовлень в 1 клік без перевірок |
| `tachograph_drive_remaining_min` | Залишок допустимого часу за кермом (Reg. EC 561) | Tier 3 (Advanced) | `INTEGER` | Tachograph IoT API | Запобігання зриву дедлайну через обов'язковий відстій |

## 5. Physical Execution & Telematics (`deliveries` & `delivery_track_points`)

Фактичне виконання рейсу, просторовий коридор PostGIS, розрахунок запізнень та e-документи.

| Field | Business Purpose | Required | Data Type | Source | Used For (KPI & Business Decisions) |
|---|---|---|---|---|---|
| `delivery_id` | Унікальний номер доставки (`DL-YYYY-######`) | Tier 1 (Critical) | `VARCHAR(32)` | System / Auto-gen | Primary Key рейсу; зв'язок із витратами `costs` |
| `order_id` | Посилання на комерційне замовлення | Tier 1 (Critical) | `VARCHAR(32)` | FK -> `orders` | Зв'язок фізичного рейсу з доходом та клієнтом |
| `route_id` | Призначений логістичний коридор (`RT-#####`) | Tier 1 (Critical) | `VARCHAR(32)` | FK -> `routes` | Аналіз завантаженості та прибутковості напрямків |
| `driver_id` | Призначений водій-виконавець | Tier 1 (Critical) | `VARCHAR(32)` | FK -> `drivers` | Облік виробітку та перерахунок рейтингу водія |
| `vehicle_id` | Задіяний у рейсі автомобіль | Tier 1 (Critical) | `VARCHAR(32)` | FK -> `vehicles` | Облік пробігу та зносу конкретного шасі |
| `delivery_status` | Поточний стан (`planned`, `in_transit`, `delivered`...) | Tier 1 (Critical) | `ENUM` | App / State Machine | Трекінг статусу, тригер WebSocket-повідомлень |
| `actual_start_time` | Фактичний виїзд зі складу після завантаження | Tier 1 (Critical) | `TIMESTAMPTZ` | GPS Geofence / App | Базова точка розрахунку фактичної тривалості рейсу |
| `actual_end_time` | Фактична передача товару отримувачу | Tier 1 (Critical) | `TIMESTAMPTZ` | e-POD signature | Фіксація факту завершення рейсу, обчислення затримки |
| `planned_distance_km` | Оптимальна планова відстань маршруту | Tier 1 (Critical) | `NUMERIC(8,2)` | Routing Engine | Базовий норматив для розрахунку планової собівартості |
| `actual_distance_km` | Фактичний пробіг за одометром або GPS | Tier 1 (Critical) | `NUMERIC(8,2)` | Odometer / GPS | `distance_deviation_km`, перевитрата пального та Maut |
| `delay_minutes` | Зафіксоване запізнення у хвилинах | Tier 1 (Critical) | `INTEGER` | Auto-calculated | Пунктуальність рейсу, виявлення проблемних маршрутів |
| `is_driver_liable` | Ознака вини водія у збої / запізненні | Tier 1 (Critical) | `BOOLEAN` | Support / Telematics | Захист водія від втрати рейтингу через зовнішні затори |
| `incident_type` | Код збою (`Traffic_Stau`, `Weather`, `Breakdown`...) | Tier 1 (Critical) | `ENUM` | Dispatcher / System | Обчислення Incident-Free Rate (IFR) комплаєнсу |
| `proof_of_delivery_url` | Фото підписаної накладної або підпис клієнта (e-POD) | Tier 1 (Critical) | `VARCHAR(255)` | S3 Object Store | Розрахунок POD Compliance Rate (PODR), закриття накладної |
| `location` (`track_point`) | Дискретні GPS-точки руху вантажівки | Tier 2 (Important) | `Point (PostGIS)` | GPS IoT-tracker | Функція `is_route_deviated()`, карта руху на дашборді |
| `dock_dwell_time_min` | Час простою авто під рампою завантаження/вивантаження | Tier 3 (Advanced) | `INTEGER` | Geofence events | Виявлення складів із системними затримками для штрафних тарифів |

## 6. Financial Costs & Freelance Accounting (`costs`)

Єдиний простір фінансового обліку для відокремлення персональних витрат самозайнятого перевізника від офіційного звіту компанії.

| Field | Business Purpose | Required | Data Type | Source | Used For (KPI & Business Decisions) |
|---|---|---|---|---|---|
| `cost_id` | Номер платіжного чека (`CS-YYYY-######`) | Tier 1 (Critical) | `VARCHAR(32)` | System / Auto-gen | Primary Key фінансової операції |
| `cost_date` | Календарна дата оплати / нарахування | Tier 1 (Critical) | `DATE` | Bank / Receipt | Побудова фінансових звітів P&L за періодами |
| `cost_type` | Основна стаття (`fuel`, `maintenance`, `work_reward`, `other`) | Tier 1 (Critical) | `ENUM` | Category selector | Структура витрат компанії, виявлення перевитрат |
| `cost_subtype` | Стандартизований підтип (`diesel`, `tolls`, `scheduled_service`) | Tier 1 (Critical) | `VARCHAR(32)` | Subcategory | Факторний аналіз собівартості без вільного тексту |
| `cost_amount_eur` | Сума за чеком у євро | Tier 1 (Critical) | `NUMERIC(12,2)` | Receipt / Invoice | Прямі операційні витрати (Direct Costs) рейсу |
| `driver_payout_eur` | Нарахована винагорода водію за рейс | Tier 1 (Critical) | `NUMERIC(12,2)` | Trip settlement | Cost of Labor, маржинальність перевезення |
| `delivery_id` | Прив'язка до рейсу (`NULL` для постійних витрат автопарку) | Tier 1 (Critical) | `VARCHAR(32)` | FK -> `deliveries` | Собівартість рейсу: Direct Cost per Delivery |
| `is_private_expense` | Прапорець особистої витрати/штрафу водія-ФОП | Tier 1 (Critical) | `BOOLEAN` | Driver App | Розрахунок заробітку самозайнятого "в кишеню" |
| `fuel_liters` | Обсяг заправленого пального в літрах | Tier 2 (Important) | `NUMERIC(8,2)` | Fuel card API | Фактична паливна ефективність: літрів на 100 км |
| `is_repair` | Прапорець позапланового аварійного ремонту вузлів | Tier 2 (Important) | `BOOLEAN` | Workshop invoice | Статистика надійності марок і моделей автопарку |

## 7. Predictive Analytics & AI Data Assets (Tier 3 Data Requirements)

Дані для майбутнього переходу від описового аналізу до машинного навчання, відповідно до завдань Команди 4.

### Traffic Congestion Index (Індекс дорожніх заторів)

- **Параметри:** швидкість руху потоку відносно вільної дороги на ділянках автобанів.
- **Джерело:** TomTom / Here Traffic API.
- **Модель:** Delay Probability Classifier для прогнозування ймовірності та тривалості запізнення ще на етапі публікації замовлення.

### Weather Severity Logs (Метеорологічні показники)

- **Параметри:** опади, снігопад, ожеледиця, сила бокового вітру на автобанах.
- **Модель:** динамічне коригування планового часу в дорозі та автоматичне зняття вини з водія (`is_driver_liable = FALSE`).

### Empty Miles Reduction Indicator (Коефіцієнт усунення порожнього пробігу)

- **Параметри:** відстань від точки розвантаження попереднього замовлення до точки забору наступного вантажу.
- **Модель:** Smart Backhaul Recommender для пропозиції попутних вантажів у радіусі 30 км для ліквідації порожніх рейсів.

## 8. Матриця ключових бізнес-показників (SmartLog Europe KPI Matrix)

| Домен | Назва KPI | Формула розрахунку | Необхідні поля |
|---|---|---|---|
| Operations | On-Time Delivery Rate (OTR) | `Deliveries On-Time (or liable = FALSE) / Total Completed Deliveries * 100` | `actual_end_time`, `planned_end_time`, `is_driver_liable` |
| Operations | Incident-Free Rate (IFR) | `Deliveries with is_driver_liable = FALSE / Total Completed Deliveries * 100` | `is_driver_liable`, `incident_type` |
| Operations | Distance Deviation % | `(actual_distance_km - planned_distance_km) / planned_distance_km * 100` | `actual_distance_km`, `planned_distance_km` |
| Financial | Gross Profit per Delivery | `amount_eur - SUM(Direct Costs) - driver_payout_eur` | `orders.amount_eur`, `costs.cost_amount_eur`, `driver_payout_eur` |
| Financial | Gross Margin % | `Gross Profit per Delivery / orders.amount_eur * 100` | `orders.amount_eur`, прямі витрати рейсу |
| Financial | Solo Driver Net Take-Home | `SUM(payout) - SUM(corporate_costs) - SUM(private_costs)` | `costs.driver_payout_eur`, `cost_amount_eur`, `is_private_expense` |
| Fleet | Capacity Utilization % | `orders.cargo_units / vehicles.pallet_capacity * 100` | `orders.cargo_units`, `vehicles.pallet_capacity` |
| Fleet | Specific Fuel Cost (EUR/km) | `SUM(fuel costs) / deliveries.actual_distance_km` | `costs.cost_amount_eur`, `deliveries.actual_distance_km` |

## Risks

**Ризик перевантаження водіїв формами введення:** спроба змусити водія чи замовника вносити специфічні координати чи розрахунки затримок вручну призведе до саботажу або фіктивних даних.

**Мітигація:** координати визначаються автоматично через пошук адрес (Geocoding API), затримки обчислюються системою на льоту, а водій натискає лише кнопку "Перевезу" та фотографує накладну в додатку.
