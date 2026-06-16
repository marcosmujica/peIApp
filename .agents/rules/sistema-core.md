# PeIApp — Reglas del Sistema Core

> **Propósito**: Este documento describe con precisión total la arquitectura, estructura, entidades, endpoints, lógica de negocio y convenciones del sistema PeIApp. Con esta información se puede reconstruir el sistema completo desde cero.

---

## 1. Visión General del Producto

**PeIApp** es una aplicación financiera personal/empresarial para gestión de ingresos, gastos, cobros y pagos. Está orientada a emprendedores y pequeños negocios de Latinoamérica (Uruguay, Argentina, Brasil).

### Funcionalidades Core
- Gestión de billeteras (wallets) personales, de negocio y compartidas
- Creación de tickets (transacciones) de ingreso y gasto
- Sistema de cobros con "PeiLinks" (links públicos para que terceros paguen/reprogramen)
- Chat en tiempo real por ticket vía WebSocket
- Clasificación automática de rubros con IA (Gemini)
- Consultas inteligentes a billeteras con función PostgreSQL `pg_ia_query`
- Notificaciones push (Expo), SMS (Twilio) y WhatsApp
- Reportes diarios automáticos por cron
- Tickets recurrentes con frecuencias configurables
- Sistema de onboarding con tipos de negocio
- Listas de distribución de contactos
- Metas financieras por billetera
- Paneles configurables por billetera
- Categorías personalizables por billetera
- Miembros/colaboradores por billetera con roles
- Dashboard con resumen financiero
- Calendario de vencimientos
- Historial de tickets
- Contactos integrados del teléfono
- Conciliación de billeteras compartidas
- Transferencias entre billeteras
- Procedimiento de cobro configurable
- Versión web pública para ver/pagar tickets (PeiLink)

---

## 2. Arquitectura del Sistema

### Monorepo con 5 proyectos independientes:

```
proyecto-root/
├── server/              # API Backend principal (NestJS)
├── wss-server/          # Servidor WebSocket (NestJS + Socket.IO)
├── notification-service/# Servicio de notificaciones (Express.js)
├── ticket-web/          # Web pública de tickets/PeiLinks (Vite + React)
├── app/                 # App móvil (Expo/React Native)
└── logs/                # Directorio compartido de logs
```

### Stack Tecnológico

| Componente | Tecnología | Versión/Info |
|---|---|---|
| Backend API | NestJS 11 + TypeORM | Puerto 3000 |
| WebSocket Server | NestJS 11 + Socket.IO + @nestjs/websockets | Puerto 3001 (env: WSS_PORT) |
| Notification Service | Express.js + Node.js puro | Puerto 4000 |
| Ticket Web | Vite + React 19 + TypeScript | Puerto 5173 (dev) |
| App Móvil | Expo 55 + React Native 0.83 + React 19 | Puerto 8081 (Metro) |
| Base de Datos Principal | PostgreSQL remoto | Host: db.peiapp.tech |
| Base de Datos Notificaciones | PostgreSQL remoto | Host: db.peiapp.tech, DB: peiapp_notifications |
| ORM | TypeORM 0.3.28 | synchronize: false |
| Auth | JWT (passport-jwt) | 7 días expiración |
| AI | Google Gemini 2.5 Flash | Vía REST API |
| Push Notifications | Expo Push + SMS via Twilio | |
| State Management (App) | Zustand 5 | |
| Estilos App | NativeWind (TailwindCSS 3 para RN) | |
| Navegación App | React Navigation 7 (native-stack + bottom-tabs) | |
| Logging Backend | nestjs-pino + pino-pretty | Archivos en ../logs/ |

---

## 3. Base de Datos — Esquema Completo (PostgreSQL)

### 3.1 Tabla `users`
```sql
CREATE TABLE users (
  user_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone         VARCHAR(20) UNIQUE NOT NULL,     -- Número E.164 sin +
  display_name  VARCHAR(255),
  avatar_url    VARCHAR(255),
  country       VARCHAR(255) DEFAULT 'AR',
  currency      VARCHAR(255) DEFAULT 'USD',
  default_payment_procedure TEXT,
  gender        VARCHAR(255),
  age           INTEGER,
  push_enabled  BOOLEAN DEFAULT TRUE,
  theme         VARCHAR(255) DEFAULT 'light',
  default_wallet_id VARCHAR(255),
  notification_id   VARCHAR(255),              -- ExponentPushToken[...]
  preferred_notification_time VARCHAR(5) DEFAULT '09:00',
  daily_reports_enabled       BOOLEAN DEFAULT TRUE,
  monthly_reports_enabled     BOOLEAN DEFAULT TRUE,
  transaction_notifications_enabled BOOLEAN DEFAULT TRUE,
  last_access   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ                     -- Soft delete
);
```

### 3.2 Tabla `phone_otps`
```sql
CREATE TABLE phone_otps (
  otp_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES users(user_id),
  otp_hash   VARCHAR(255) NOT NULL,            -- bcrypt hash del código 6 dígitos
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.3 Tabla `wallets`
```sql
CREATE TABLE wallets (
  wallet_id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                    VARCHAR(80) NOT NULL,
  type                    VARCHAR(20) NOT NULL,  -- personal|business|shared|mymoney|mypays|mycollects|products|otro|negocio_productos|negocio_servicios|compartido|community
  currency                VARCHAR(3) DEFAULT 'USD',
  default_payment_method  VARCHAR(500),
  default_transaction_type VARCHAR(10) DEFAULT 'expense', -- income|expense
  help_to_collect         BOOLEAN DEFAULT FALSE,
  balance                 DECIMAL(14,2) DEFAULT 0,
  total_incomes           DECIMAL(14,2) DEFAULT 0,
  total_expenses          DECIMAL(14,2) DEFAULT 0,
  pending_incomes         DECIMAL(14,2) DEFAULT 0,
  pending_expenses        DECIMAL(14,2) DEFAULT 0,
  avatar_url              TEXT,
  warning_threshold       DECIMAL(14,2) DEFAULT 0,
  alert_threshold         DECIMAL(14,2) DEFAULT 0,
  include_in_general_balance BOOLEAN DEFAULT TRUE,
  owner_id                UUID REFERENCES users(user_id),
  ai_questions            JSONB,               -- Array de strings con preguntas AI preconfiguradas
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW(),
  deleted_at              TIMESTAMPTZ           -- Soft delete
);
```

**Tipos de Wallet:**
- `mycollects` → "Cobros sin Billetera" (wallet sistema, se crea automáticamente)
- `mypays` → "Pagos sin Billetera" (wallet sistema, se crea automáticamente)
- `personal` → Billetera personal
- `negocio_productos` → Negocio de productos
- `negocio_servicios` → Negocio de servicios
- `compartido` / `shared` → Billetera compartida
- `community` → Comunidad

### 3.4 Tabla `wallet_members`
```sql
CREATE TABLE wallet_members (
  member_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id  UUID REFERENCES wallets(wallet_id),
  user_id    UUID REFERENCES users(user_id),
  role       VARCHAR(20) NOT NULL,             -- owner|admin|operator|viewer
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE (wallet_id, user_id)
);
```

### 3.5 Tabla `wallet_distribution_lists`
```sql
CREATE TABLE wallet_distribution_lists (
  list_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id  UUID REFERENCES wallets(wallet_id),
  name       VARCHAR(100) NOT NULL,
  contacts   JSON,                             -- [{name: string, phone: string}]
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
```

### 3.6 Tabla `wallets_goals`
```sql
CREATE TABLE wallets_goals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id       UUID REFERENCES wallets(wallet_id) ON DELETE CASCADE,
  name            VARCHAR(150) NOT NULL,
  target_amount   DECIMAL(14,2) DEFAULT 0,
  current_amount  DECIMAL(14,2) DEFAULT 0,
  deadline        TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.7 Tabla `wallets_panels`
```sql
CREATE TABLE wallets_panels (
  panel_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  panel_name    VARCHAR(100) NOT NULL,
  is_enabled    BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  wallet_id     UUID REFERENCES wallets(wallet_id) ON DELETE CASCADE
);
```

### 3.8 Tabla `wallets_categories`
```sql
CREATE TABLE wallets_categories (
  category_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_key VARCHAR(100) NOT NULL,
  type         VARCHAR(10) NOT NULL,           -- income|expense
  is_enabled   BOOLEAN DEFAULT TRUE,
  wallet_id    UUID REFERENCES wallets(wallet_id) ON DELETE CASCADE
);
```

### 3.9 Tabla `tickets`
```sql
CREATE TABLE tickets (
  ticket_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        UUID REFERENCES users(user_id),
  amount          DECIMAL(14,2) NOT NULL,
  initial_amount  DECIMAL(14,2),
  amount_paid     DECIMAL(14,2) DEFAULT 0,
  currency        VARCHAR(3) DEFAULT 'USD',
  description     VARCHAR(255),
  due_date        TIMESTAMPTZ NOT NULL,
  initial_due_date TIMESTAMPTZ,
  status          VARCHAR(20) DEFAULT 'completed',  -- pending|completed|cancelled
  type            VARCHAR(20) DEFAULT 'ticket',     -- ticket|transfer|adjustment
  payment_method  VARCHAR(50),
  payment_procedure TEXT,
  private_note    TEXT,
  comment         TEXT,
  generate_peilink BOOLEAN DEFAULT FALSE,
  help_to_collect BOOLEAN DEFAULT FALSE,
  expenses        DECIMAL(14,2) DEFAULT 0,
  expenses_detail TEXT,
  reference       VARCHAR(100),
  attachment_url  TEXT,
  source          VARCHAR(50) DEFAULT 'app',
  source_info     TEXT,
  owner_rating    INTEGER,
  participant_rating INTEGER,
  short_id        VARCHAR(10),                      -- ID corto para PeiLinks públicos
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ                       -- Soft delete
);
```

### 3.10 Tabla `ticket_details`
```sql
CREATE TABLE ticket_details (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id    UUID REFERENCES tickets(ticket_id) ON DELETE CASCADE,
  user_id      UUID REFERENCES users(user_id),
  wallet_id    UUID REFERENCES wallets(wallet_id),
  role         VARCHAR(255) NOT NULL,              -- owner|receiver
  type         VARCHAR(20) NOT NULL,               -- income|expense
  rubro        VARCHAR(255),
  description  VARCHAR(255),
  private_note TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
```

**IMPORTANTE**: Cada ticket genera 1 o 2 registros en `ticket_details`:
- Un `ticket_detail` con role=`owner` para el dueño del ticket
- Un `ticket_detail` con role=`receiver` para el destinatario (si existe `toUser`)
- El `type` indica si es `income` o `expense` para cada participante (se invierten: si para el owner es `income`, para el receiver es `expense`)

### 3.11 Tabla `ticket_logs`
```sql
CREATE TABLE ticket_logs (
  log_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id      UUID REFERENCES tickets(ticket_id),
  user_id        UUID,                            -- UUID del usuario que realizó la acción (o 'sistema')
  action         VARCHAR(100) NOT NULL,           -- ticket_created|payment_received|due_date_changed|cancelled|payment_agreement_sent
  old_value      TEXT,
  new_value      TEXT NOT NULL,
  payment_method VARCHAR(50),
  comment        TEXT,
  attachment_url TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.12 Tabla `ticket_chat`
```sql
CREATE TABLE ticket_chat (
  chat_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id       UUID REFERENCES tickets(ticket_id),
  sender_id       UUID REFERENCES users(user_id),
  message         TEXT,
  sender_name     VARCHAR(100),
  attachment_url  TEXT,
  attachment_type VARCHAR(20),                   -- image|file|etc
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.13 Tabla `recurring_tickets`
```sql
CREATE TABLE recurring_tickets (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id              UUID REFERENCES users(user_id),
  wallet_id             UUID REFERENCES wallets(wallet_id),
  amount                DECIMAL(14,2) NOT NULL,
  currency              VARCHAR(3) NOT NULL,
  description           VARCHAR(255) NOT NULL,
  payment_procedure     TEXT,
  private_note          TEXT,
  comment               TEXT,
  help_to_collect       BOOLEAN DEFAULT FALSE,
  frequency             VARCHAR(50) NOT NULL,     -- weekly|biweekly|monthly|bimonthly|semi-annually|yearly
  total_installments    INTEGER NOT NULL,
  current_installment   INTEGER DEFAULT 0,
  last_generated_date   TIMESTAMPTZ,
  next_generation_date  TIMESTAMPTZ NOT NULL,
  is_active             BOOLEAN DEFAULT TRUE,
  category_id           VARCHAR(255),
  rubro                 VARCHAR(255),
  type                  VARCHAR(20) DEFAULT 'ticket',
  participants          JSONB,                    -- Array de participantes
  short_id              VARCHAR(10),
  to_wallet_id          VARCHAR(255),
  to_rubro              VARCHAR(255),
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.14 Tabla `helpdesk`
```sql
CREATE TABLE helpdesk (
  id         SERIAL PRIMARY KEY,
  user_id    UUID,
  message    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.15 Tabla `notification_logs` (BD: peiapp_notifications)
```sql
CREATE TABLE notification_logs (
  id         SERIAL PRIMARY KEY,
  user_id    VARCHAR(50),
  content    TEXT,
  type       VARCHAR(20),                        -- push|whatsapp|sms
  status     VARCHAR(20),                        -- pending|sent|logged_only|mocked|error|invalid_token
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 4. API Endpoints

### 4.1 Auth (`/auth`)
| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/auth/request-otp` | No | Solicitar OTP. Body: `{phoneNumber, country?, currency?}` |
| POST | `/auth/verify-otp` | No | Verificar OTP. Body: `{phoneNumber, code}`. Retorna `{access_token, user}` |

**Flujo de Auth**:
1. El phone number se limpia de caracteres no-numéricos
2. Si el usuario no existe, se crea automáticamente
3. Se genera OTP de 6 dígitos, se hashea con bcrypt y se guarda
4. Si `OTP_MOCK=true`, se muestra en console.log. Si no, se envía SMS vía notification-service
5. Al verificar, se retorna JWT con `sub: userId` (UUID interno, NO el teléfono)
6. El token expira en 7 días
7. `needsOnboarding` se calcula como: `!user.defaultWalletId || !user.displayName || user.displayName === 'Unknown User'`

### 4.2 Users (`/users`)
| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/users/:id` | No | Obtener perfil de usuario |
| PATCH | `/users/:id` | No | Actualizar perfil. Body: `{displayName?, country?, currency?, pushEnabled?, defaultPaymentProcedure?, gender?, age?, theme?, defaultWalletId?, notificationId?, preferredNotificationTime?, lastAccess?}` |
| POST | `/users/:id/avatar` | No | Upload avatar (multipart). Field: `file`. Guarda en `./public/uploads/avatars/` |

### 4.3 Wallets (`/wallets`)
| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/wallets/create` | JWT | Crear billetera. Body: `{name, type, currency?, defaultPaymentMethod?, defaultTransactionType?, helpToCollect?, warningThreshold?, alertThreshold?, includeInGeneralBalance?}` |
| POST | `/wallets/onboarding` | JWT | Setup inicial. Body: `{businessType}` (`none`/`services`/`products`/`both`). Crea wallets del sistema + wallet del tipo de negocio |
| GET | `/wallets/mine` | JWT | Obtener billeteras del usuario con todos sus datos relacionados |
| GET | `/wallets/summary` | JWT | Dashboard summary con balance total |
| PUT | `/wallets/:walletId` | JWT | Actualizar billetera. Body: `{name?, defaultPaymentMethod?, defaultTransactionType?, helpToCollect?, avatarUrl?, distributionLists?, warningThreshold?, alertThreshold?, includeInGeneralBalance?, goals?, enabledPanels?, enabledCategories?}` |
| POST | `/wallets/:walletId/members` | JWT | Actualizar miembros. Body: `{members: [{userId, displayName}]}` |
| GET | `/wallets/:walletId/members` | JWT | Obtener miembros |
| POST | `/wallets/:id/avatar` | JWT | Upload avatar de billetera |
| POST | `/wallets/:walletId/reconcile` | JWT | Conciliación. Body: `{settlements: [{fromId, toId, amount}]}` |
| POST | `/wallets/recalculate-all` | JWT | Recalcular saldos de todas las billeteras del usuario |
| POST | `/wallets` | No | Legacy: crear billetera sin auth |
| GET | `/wallets/user/:userId` | No | Legacy: obtener wallets por userId |

### 4.4 Tickets (`/tickets`)
| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/tickets` | JWT | Crear ticket |
| GET | `/tickets/my` | JWT | Obtener tickets del usuario |
| GET | `/tickets/payments/my` | JWT | Obtener payment logs del usuario |
| PATCH | `/tickets/:id` | JWT | Actualizar ticket |
| GET | `/tickets/wallet/:walletId` | JWT | Tickets por billetera |
| POST | `/tickets/:id/chat` | JWT | Agregar mensaje de chat |
| GET | `/tickets/:id/chat` | JWT | Obtener mensajes de chat |
| GET | `/tickets/:id/logs` | JWT | Obtener logs del ticket |
| POST | `/tickets/:id/payment` | JWT | Registrar pago. Body: `{amount, paymentMethod, description?, attachmentUrl?}` |
| PATCH | `/tickets/:id/due-date` | JWT | Cambiar fecha de vencimiento |
| POST | `/tickets/:id/cancel` | JWT | Cancelar ticket |
| POST | `/tickets/chat/upload` | No | Upload archivo de chat (multipart) |

**Tickets Públicos (PeiLink, sin auth):**
| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/tickets/public/:shortId` | No | Ver ticket público |
| PATCH | `/tickets/public/:shortId/due-date` | No | Cambiar fecha pública |
| POST | `/tickets/public/:shortId/payment` | No | Registrar pago público |
| POST | `/tickets/public/:shortId/cancel` | No | Cancelar ticket público |

**Tickets Recurrentes:**
| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/tickets/recurring` | JWT | Crear ticket recurrente |
| GET | `/tickets/recurring/my` | JWT | Obtener recurrentes del usuario |
| PATCH | `/tickets/recurring/:id` | JWT | Actualizar recurrente |
| POST | `/tickets/recurring/:id/toggle` | JWT | Activar/desactivar |
| DELETE | `/tickets/recurring/:id` | JWT | Eliminar recurrente |

### 4.5 AI (`/ai`)
| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/ai/predict-rubro` | No | Predecir rubro. Body: `{description, type, allowedRubros?}` |
| POST | `/ai/ask-wallet` | No | Pregunta AI a billetera. Body: `{walletData, userData, question}`. Usa función PostgreSQL `pg_ia_query()` |

### 4.6 HelpDesk (`/helpdesk`)
| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/helpdesk` | No | Crear mensaje de soporte. Body: `{userId?, message}` |

### 4.7 Cron (`/cron`)
| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/cron/test-daily-report?hour=09:00` | No | Test de reporte diario |

### 4.8 Notification Service (`http://localhost:4000`)
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/addUser` | Agregar usuario a cache. Body: `{userId}` |
| POST | `/updateuser` | Refrescar usuario en cache. Body: `{userId}` |
| POST | `/send` | Enviar notificación push/whatsapp. Body: `{userId, content, title?}` |
| POST | `/send-sms` | Enviar SMS vía Twilio. Body: `{phone, content, title?}` |

---

## 5. Lógica de Negocio Crítica

### 5.1 Creación de Tickets
1. Se crea el registro en `tickets`
2. Se crean 1 o 2 registros en `ticket_details`:
   - Owner detail: role=`owner`, type según lo que el owner define
   - Receiver detail (si hay `toUser`): role=`receiver`, type invertido
3. Se crea un `ticket_log` con action=`ticket_created`
4. Si `generatePeilink=true` o `helpToCollect=true`, se genera un `shortId` aleatorio de 6 chars
5. Se recalculan los saldos de las billeteras involucradas
6. Se envía notificación al destinatario si existe
7. IDs con prefijo `local_` o `remote_mock_` se tratan como mocks y no se procesan en BD

### 5.2 Billeteras del Sistema
Al hacer onboarding, se crean automáticamente:
- **"Cobros sin Billetera"** (type: `mycollects`) — Constante: `SYSTEM_WALLET_NAME`
- **"Pagos sin Billetera"** (type: `mypays`) — Constante: `SYSTEM_EXPENSES_WALLET_NAME`

### 5.3 Recálculo de Saldos
El balance de una billetera se recalcula sumando:
- `totalIncomes`: Suma de `amount` de tickets completados donde el detail tiene type=`income`
- `totalExpenses`: Suma de `amount` de tickets completados donde el detail tiene type=`expense`
- `pendingIncomes`: Suma de `amount` de tickets pendientes tipo income
- `pendingExpenses`: Suma de `amount` de tickets pendientes tipo expense
- `balance = totalIncomes - totalExpenses`

### 5.4 PeiLinks (Links Públicos)
- Se genera un `shortId` de 6 caracteres alfanuméricos
- La URL pública es: `{WEB_SHARE_URL}/t/{shortId}`
- El ticket-web permite: ver detalle, registrar pago, cambiar fecha, cancelar
- No requiere autenticación

### 5.5 Clasificación de Rubros con IA
- Usa Gemini 2.5 Flash vía REST API (no SDK)
- Temperatura: 0.1 (muy determinístico)
- Si falla, intenta fallback
- Si no encuentra match exacto, busca match parcial, luego usa rubro genérico ("otros")
- Logs se guardan en `logs/ia-request.log`

### 5.6 Consultas AI a Billeteras
- Usa función PostgreSQL `pg_ia_query(question, walletId, userId)`
- La función está definida en la base de datos, no en el código
- Logs se guardan en `logs/ia-query.log`

### 5.7 Cron Jobs (Proceso Standalone)
Se ejecuta como proceso separado con `npm run start:cron`.
Solo actúa si `ENABLE_CRON=true` en las variables de entorno.

| Cron | Horario | Descripción |
|------|---------|-------------|
| Reportes Diarios | Cada hora en punto (`0 * * * *`) | Busca usuarios con `preferredNotificationTime` que coincida con la hora actual y envía resumen financiero |
| Acuerdos de Pago | 10:00 AM diario | Revisa tickets pendientes y envía alertas: 1 día antes (medium), día del vencimiento (high), 2 días después (critical) |
| Usuarios Inactivos | 10:00 AM diario | Si un usuario no creó tickets en 3 días, envía notificación motivacional |

---

## 6. WebSocket Server (wss-server)

### Estructura
Es un clon del `server/` con las mismas entidades y módulos, pero su único propósito adicional es el **Chat Gateway** (`chat.gateway.ts`).

### Gateway de Chat
- Decorado con `@WebSocketGateway({ cors: { origin: '*' } })`
- Puerto: 3001 (env: WSS_PORT)

**Eventos:**
| Evento | Dirección | Descripción |
|--------|-----------|-------------|
| `joinTicket` | Client → Server | Cliente se une a la sala del ticket |
| `sendMessage` | Client → Server | Enviar mensaje de chat |
| `newMessage` | Server → Room | Broadcast de nuevo mensaje a todos en la sala |

**Flujo de sendMessage:**
1. Si viene con `chatId` real (no temporal), solo hace broadcast sin guardar
2. Si no tiene `chatId` o es temporal (`temp-*`), guarda en BD y hace broadcast
3. En el primer mensaje de la sesión por ticket, envía notificación push al otro participante

### Logging
- Logs en `logs/chat.log`

---

## 7. Notification Service

### Arquitectura
- Servicio Express.js standalone en Node.js puro (sin TypeScript)
- Archivo único: `index.js`
- Se conecta a 2 bases de datos PostgreSQL:
  - `mainDb`: Base principal de PeIApp (solo lectura de usuarios)
  - `notifDb`: Base de notificaciones (`peiapp_notifications`)
- Mantiene un cache en memoria de usuarios (`Map`)

### Flujo de Notificación Push (`/send`)
1. Buscar usuario en cache o BD
2. Si tiene `notificationId` (Expo Push Token):
   - Validar token con `Expo.isExpoPushToken()`
   - Si `ENABLE_NOTIFICATIONS=true`, enviar vía Expo SDK
   - Si no, solo loguear
3. Si no tiene token: enviar SMS vía Twilio (si habilitado)
4. Registrar todo en `notification_logs`

### Flujo de SMS (`/send-sms`)
1. Si `SMS_MOCK=true`: simular
2. Si `ENABLE_NOTIFICATIONS!=true`: solo loguear
3. Si no: enviar vía Twilio REST API

---

## 8. App Móvil (Expo/React Native)

### Navegación
```
AppNavigator
├── AuthNavigator (si no hay token)
│   ├── Welcome
│   ├── Login (OTP)
│   └── Verify OTP
├── OnboardingNavigator (si needsOnboarding)
└── RootNavigator (autenticado)
    ├── MainTabs
    │   ├── Inicio (HomeNavigator)
    │   ├── Billeteras (WalletsNavigator)
    │   ├── Historial (HistoryScreen) → Tab label: "Tickets"
    │   ├── Calendario (CalendarScreen) → Tab label: "Agenda"
    │   └── Menu (MoreMenuScreen) → Tab label: "Más"
    ├── AddMovementModal (fullScreenModal)
    ├── QuickEntry (fullScreenModal)
    ├── MovementSuccess (fade)
    ├── ChatDetail
    ├── Settings
    ├── WalletSettings
    ├── ContactDetail
    ├── Contactos
    ├── AIQuestions
    ├── WalletCategories
    ├── Transfer
    ├── Dashboard
    ├── SplitWallet
    ├── RecurringTickets
    ├── EditRecurringTicket (fullScreenModal)
    ├── Videos
    ├── TermsAndConditions
    └── PaymentRecords
```

### API Client (`api.client.ts`)
- Base URL: `EXPO_PUBLIC_API_URL` (prod: `https://api.peiapp.tech`, dev: `http://localhost:3000`)
- Timeout: 15 segundos
- Interceptor de request: agrega Bearer token desde Zustand store
- Interceptor de response:
  - 401 → Logout automático
  - Timeout/sin respuesta → Alert con URL fallida + toast de warning
- Loading overlay global gestionado con contador de requests activos

### WebSocket Client (`socket.config.ts`)
- URL: `EXPO_PUBLIC_WSS_URL` (prod: `https://wss.peiapp.tech`, dev: `http://localhost:3001`)
- Transportes: `['websocket', 'polling']`
- Reconexión: 5 intentos, delay 1s
- Singleton pattern

### State Management (Zustand)
- `auth.store.ts` → Token, usuario, hydrate, login/logout
- `app.store.ts` → Estado general de la app
- `contacts.store.ts` → Contactos del teléfono
- `ui.store.ts` → Loading overlay, toasts

### Persistencia Local
- Token/User: `expo-secure-store` (nativo) o `localStorage` (web)
- DB local: Interfaz `ILocalDB` con adapters para SQLite (nativo) y Dexie (web)
- Cola de sincronización offline: `SyncQueueItem` con estados pending/syncing/done/error

### Configuración de Build (app.config.js)
- Build ID: `{version} ({YYYYMMDD}-{gitShortHash})` → Se muestra debajo de T&C
- Package Android: `com.marcosmujica.peiapp`
- EAS Project ID: `e68496e5-32ba-4b72-96f7-63cbd0010ed6`
- Plugins: expo-font, expo-image, expo-secure-store, expo-sharing, expo-sqlite

### Colores de la App
- Primary: `#196342` (verde oscuro)
- Background: `#f2f2f0` (gris claro)
- Tab inactive: `#9f9f93`
- Tab active: `#196342`

---

## 9. Ticket Web (PeiLink)

### Stack
- Vite + React 19 + TypeScript
- Estilos: Vanilla CSS (`App.css`)
- Animaciones: Framer Motion
- Iconos: Lucide React
- Fechas: date-fns (locale `es`)
- HTTP: Axios

### Funcionalidad
- SPA single-page que carga un ticket público por `shortId`
- Extrae shortId de: `?id=xxx` o `/t/xxx`
- API Base: `https://api.peiapp.tech`
- Vistas: Details, Pay, Reschedule, Cancel
- Dominio: `t.peiapp.tech`

---

## 10. Variables de Entorno

### server/.env y wss-server/.env
```
DATABASE_HOST=db.peiapp.tech
DATABASE_PORT=5432
DATABASE_NAME=peiapp_dev
DATABASE_USER=db_user_peiapp_dev
DATABASE_PASSWORD=Z7mQ4vK9T2rX8pL5nW3s
JWT_SECRET=peiapp-super-secret-jwt-key-change-in-prod
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=peiapp-refresh-secret-change-in-prod
JWT_REFRESH_EXPIRES_IN=30d
OTP_TTL_MINUTES=10
OTP_MOCK=false
PORT=3000                      # WSS usa WSS_PORT=3001
GEMINI_API_KEY=AIzaSy...
AVATAR_BASE_URL=https://api.peiapp.tech
NOTIFICATION_SERVER_URL=http://localhost:4000/send
WEB_SHARE_URL=https://t.peiapp.tech
```

### notification-service/.env
```
PORT=4000
MAIN_DB_HOST/PORT/NAME/USER/PASSWORD → misma BD principal
NOTIF_DB_HOST/PORT/NAME/USER/PASSWORD → BD peiapp_notifications
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM_NUMBER=...
SMS_MOCK=false
ENABLE_NOTIFICATIONS=true
```

### app/.env
```
EXPO_PUBLIC_API_URL=https://api.peiapp.tech
EXPO_PUBLIC_WSS_URL=https://wss.peiapp.tech
EXPO_PUBLIC_AVATARS_URL=https://api.peiapp.tech
EXPO_PUBLIC_WEB_SHARE_URL=https://t.peiapp.tech
EXPO_PUBLIC_API_TIMEOUT=15000
APP_ENV=production
```

---

## 11. Dominios de Producción

| Servicio | Dominio |
|----------|---------|
| API Backend | `api.peiapp.tech` |
| WebSocket Server | `wss.peiapp.tech` |
| Ticket Web (PeiLink) | `t.peiapp.tech` |
| Base de Datos | `db.peiapp.tech` |
| Landing Page | `www.peiapp.tech` |

---

## 12. Convenciones de Código

### Backend (NestJS)
- Patrón Module/Controller/Service/Entity
- Entidades TypeORM con decoradores `@Entity`, `@Column`, etc.
- Column names en snake_case, propiedades en camelCase
- UUIDs como primary keys (generados por DB)
- Soft delete con `@DeleteDateColumn`
- Logging con nestjs-pino (console + archivo)
- Validación con `class-validator` + `ValidationPipe` global
- CORS habilitado globalmente
- Body limit: 100MB (para uploads de imágenes)
- Static assets servidos desde `./public`

### App (React Native / Expo)
- Alias `@/` para `src/`
- Componentes funcionales con React hooks
- Stores Zustand (no Context API ni Redux)
- API calls en archivos `*.api.ts` dentro de `src/api/`
- Navegación tipada con ParamList genéricos
- Estilos con StyleSheet.create + NativeWind
- Fuente: Inter + Plus Jakarta Sans (Google Fonts)
- Iconos: @expo/vector-icons (Ionicons)

### Comandos de Desarrollo
```bash
# Server API (Puerto 3000)
cd server && npm run start:dev

# WSS Server (Puerto 3001)
cd wss-server && npm run start:dev

# Notification Service (Puerto 4000)
cd notification-service && npm run start

# Ticket Web (Puerto 5173)
cd ticket-web && npm run dev

# App Expo (Puerto 8081)
cd app && npm run start

# Cron Standalone
cd server && npm run start:cron:dev
```

---

## 13. Rubros (Categorías) Predefinidos

### Gastos
alquiler_expensas, servicios_basicos, internet_telefonia, sueldos_jornales, compra_mercaderia, transporte_viajes, salud_farmacia, impuestos_tasas, mantenimiento_reparaciones, entretenimiento_ocio, comisiones_bancarias, alimentacion, ropa_vestimenta, aportes_patronales, recreacion, asesoramiento_externo, publicidad_promociones, tarjetas_credito, viajes_vacaciones, distribucion_envios

### Ingresos
salarios_adelantos, honorarios_profesionales, ventas_mercaderias, cobros_servicios, comisiones_ventas, cobros_extraordinarios, intereses_rentas, reembolso_gastos, regalos_premios, cobros_varios, adelantos_clientes, ahorro_emergencia

---

## 14. Currencies Soportados
- `USD` — Dólares (default)
- `UYU` — Pesos Uruguayos
- `ARS` — Pesos Argentinos
- `BRL` — Reales
