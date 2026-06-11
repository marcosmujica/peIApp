---
name: peiapp-system
description: >
  Skill para reconstruir, mantener y operar el sistema PeiApp completo: una plataforma financiera
  con API NestJS, WebSocket server, servicio de notificaciones, app Expo/React Native y web pública
  de tickets. Incluye todas las instrucciones necesarias para recrear el sistema desde cero.
---

# PeiApp System Skill

## Objetivo

Esta skill contiene toda la información necesaria para:
1. **Reconstruir** el sistema PeiApp completo desde cero
2. **Mantener** el sistema existente siguiendo las convenciones establecidas
3. **Operar** todos los servicios en desarrollo y producción

---

## Resumen del Sistema

PeiApp es una plataforma financiera para emprendedores y pequeños negocios de Latinoamérica que gestiona ingresos, gastos, cobros y pagos.

### Componentes (5 proyectos)

| # | Proyecto | Tecnología | Puerto | Descripción |
|---|----------|------------|--------|-------------|
| 1 | `server/` | NestJS 11 + TypeORM + PostgreSQL | 3000 | API REST principal |
| 2 | `wss-server/` | NestJS 11 + Socket.IO | 3001 | WebSocket server para chat en tiempo real |
| 3 | `notification-service/` | Express.js (Node.js puro) | 4000 | Push notifications (Expo), SMS (Twilio) |
| 4 | `ticket-web/` | Vite + React 19 + TypeScript | 5173 | Web pública de PeiLinks (ver/pagar tickets) |
| 5 | `app/` | Expo 55 + React Native 0.83 | 8081 | App móvil Android/iOS |

---

## Instrucciones de Reconstrucción

### Paso 1: Crear la estructura del monorepo

```bash
mkdir peiapp-monorepo && cd peiapp-monorepo
git init
mkdir logs
```

### Paso 2: Server (API Backend)

```bash
npx -y @nestjs/cli new server --package-manager npm --skip-git
cd server
```

**Dependencias:**
```bash
npm install @nestjs/config @nestjs/jwt @nestjs/passport @nestjs/schedule @nestjs/typeorm \
  bcrypt class-transformer class-validator date-fns multer nestjs-pino passport passport-jwt \
  pg pino-http pino-pretty reflect-metadata rxjs socket.io typeorm uuid @google/generative-ai
```

**Módulos a crear:**
1. `auth` — Autenticación OTP + JWT. Entidades: `PhoneOtp`, usa `User`
2. `users` — CRUD de usuarios. Entidad: `User`
3. `wallets` — Billeteras. Entidades: `Wallet`, `WalletMember`, `WalletDistributionList`, `WalletGoal`, `WalletPanel`, `WalletCategory`
4. `tickets` — Tickets/transacciones. Entidades: `Ticket`, `TicketDetail`, `TicketLog`, `TicketChat`, `RecurringTicket`
5. `ai` — Clasificación de rubros con Gemini + consultas AI
6. `helpdesk` — Soporte. Entidad: `HelpDesk`
7. `notifications` — Proxy de notificaciones (push/SMS)
8. `cron` — Tareas programadas (reportes, alertas, inactividad)

**Configuración del AppModule:**
- `ScheduleModule.forRoot()`
- `LoggerModule.forRoot()` con pino-pretty + archivo
- `ConfigModule.forRoot({ isGlobal: true })`
- `TypeOrmModule.forRootAsync()` con PostgreSQL, `synchronize: false`, `autoLoadEntities: true`

**Main.ts:**
- `NestExpressApplication`
- `enableCors()`
- `ValidationPipe({ transform: true, whitelist: true })`
- `json({ limit: '100mb' })`, `urlencoded({ limit: '100mb', extended: true })`
- `useStaticAssets(join(process.cwd(), 'public'))`
- Puerto: `process.env.PORT ?? 3000`

**Main-Cron.ts:**
- `createApplicationContext(AppModule)` (sin HTTP server)
- `process.env.ENABLE_CRON = 'true'`

### Paso 3: WSS Server

Clonar la estructura del server, agregar:
- `@nestjs/platform-socket.io` y `@nestjs/websockets`
- `ChatGateway` en `tickets/chat.gateway.ts` con `@WebSocketGateway({ cors: { origin: '*' } })`
- Eventos: `joinTicket`, `sendMessage` → `newMessage`
- Puerto: `process.env.WSS_PORT ?? 3001`

### Paso 4: Notification Service

```bash
mkdir notification-service && cd notification-service
npm init -y
npm install cors dotenv expo-server-sdk express morgan pg
```

Crear `index.js` con:
- 2 PostgreSQL pools: `mainDb` (BD principal) y `notifDb` (BD notificaciones)
- Cache en memoria de usuarios (`Map`)
- Rutas: `/addUser`, `/updateuser`, `/send`, `/send-sms`
- Puerto: `process.env.PORT || 4000`

### Paso 5: Ticket Web

```bash
npx -y create-vite ticket-web --template react-ts
cd ticket-web
npm install axios date-fns framer-motion lucide-react
```

- SPA single-page en `App.tsx`
- Extrae `shortId` de la URL
- API: `https://api.peiapp.tech/tickets/public/{shortId}`
- Vistas: Details, Pay, Reschedule, Cancel
- Configurar `vite.config.ts` con `allowedHosts: ['t.pei.uy']`

### Paso 6: App Expo

```bash
npx -y create-expo-app@latest app --template blank-typescript
cd app
```

**Dependencias principales:**
```bash
npx expo install expo-camera expo-constants expo-contacts expo-device expo-document-picker \
  expo-file-system expo-font expo-image expo-image-picker expo-media-library expo-notifications \
  expo-secure-store expo-sharing expo-splash-screen expo-sqlite expo-status-bar expo-system-ui
npm install @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs \
  react-native-screens react-native-safe-area-context react-native-gesture-handler \
  axios zustand socket.io-client nativewind tailwindcss uuid react-native-qrcode-svg \
  react-native-svg react-native-webview react-native-youtube-iframe \
  @react-native-async-storage/async-storage @react-native-community/datetimepicker \
  @expo-google-fonts/inter @expo-google-fonts/plus-jakarta-sans
```

**Estructura de navegación:**
```
AppNavigator → Auth? → Onboarding? → RootNavigator → MainTabs (5 tabs) + Stack screens
```

**Stores Zustand:**
- `auth.store.ts` — Token JWT, datos de usuario, hydrate desde SecureStore
- `ui.store.ts` — Loading overlay global, toasts
- `app.store.ts` — Estado general
- `contacts.store.ts` — Contactos del teléfono

---

## Base de Datos

Ver esquema completo en: **[.agents/rules/sistema-core.md](../.agents/rules/sistema-core.md)** (sección 3)

### Tablas principales:
1. `users` — Usuarios con phone, push settings, preferences
2. `phone_otps` — OTPs de verificación (bcrypt hash)
3. `wallets` — Billeteras con balances, thresholds, AI questions
4. `wallet_members` — Miembros con roles (owner/admin/operator/viewer)
5. `wallet_distribution_lists` — Listas de contactos
6. `wallets_goals` — Metas financieras
7. `wallets_panels` — Paneles configurables
8. `wallets_categories` — Categorías de ingreso/gasto
9. `tickets` — Transacciones con status, PeiLink, amounts
10. `ticket_details` — Detalle por participante (owner/receiver)
11. `ticket_logs` — Historial de acciones
12. `ticket_chat` — Chat por ticket
13. `recurring_tickets` — Tickets recurrentes
14. `helpdesk` — Mensajes de soporte
15. `notification_logs` — Logs de notificaciones (BD separada)

---

## API Endpoints

Ver lista completa en: **[.agents/rules/sistema-core.md](../.agents/rules/sistema-core.md)** (sección 4)

### Resumen:
- **Auth**: `POST /auth/request-otp`, `POST /auth/verify-otp`
- **Users**: `GET/PATCH /users/:id`, `POST /users/:id/avatar`
- **Wallets**: CRUD + onboarding + members + reconcile + recalculate
- **Tickets**: CRUD + payments + chat + logs + public PeiLinks + recurring
- **AI**: `POST /ai/predict-rubro`, `POST /ai/ask-wallet`
- **HelpDesk**: `POST /helpdesk`
- **Cron**: `GET /cron/test-daily-report`

---

## Rubros Predefinidos

### Gastos (20)
`alquiler_expensas`, `servicios_basicos`, `internet_telefonia`, `sueldos_jornales`, `compra_mercaderia`, `transporte_viajes`, `salud_farmacia`, `impuestos_tasas`, `mantenimiento_reparaciones`, `entretenimiento_ocio`, `comisiones_bancarias`, `alimentacion`, `ropa_vestimenta`, `aportes_patronales`, `recreacion`, `asesoramiento_externo`, `publicidad_promociones`, `tarjetas_credito`, `viajes_vacaciones`, `distribucion_envios`

### Ingresos (12)
`salarios_adelantos`, `honorarios_profesionales`, `ventas_mercaderias`, `cobros_servicios`, `comisiones_ventas`, `cobros_extraordinarios`, `intereses_rentas`, `reembolso_gastos`, `regalos_premios`, `cobros_varios`, `adelantos_clientes`, `ahorro_emergencia`

---

## Variables de Entorno

Ver configuración completa en: **[.agents/rules/sistema-core.md](../.agents/rules/sistema-core.md)** (sección 10)

### Resumen de puertos:
- Server: 3000
- WSS: 3001
- Notifications: 4000
- Ticket Web: 5173
- Expo Metro: 8081

---

## Operaciones

### Levantar todos los servicios (desarrollo)
```bash
# Terminal 1: API
cd server && npm run start:dev

# Terminal 2: WebSocket
cd wss-server && npm run start:dev

# Terminal 3: Notificaciones
cd notification-service && npm run start

# Terminal 4: Web de tickets
cd ticket-web && npm run dev

# Terminal 5: App móvil
cd app && npm run start
```

### Build APK (producción)
```bash
cd app
APP_ENV=production npx eas build --platform android --profile production
```

### Build Ticket Web (producción)
```bash
cd ticket-web
npm run build
```

---

## Lógica de Negocio Clave

1. **Auth**: OTP de 6 dígitos → bcrypt hash → JWT con `sub: userId` (UUID)
2. **Onboarding**: Crea billeteras del sistema (`mycollects`, `mypays`) + billetera según tipo de negocio
3. **Tickets**: Crean `ticket_details` para cada participante con tipos invertidos (income↔expense)
4. **PeiLinks**: `shortId` de 6 chars → URL pública `t.pei.uy/t/{shortId}`
5. **Balance**: Recalculado desde `ticket_details`, no incremental
6. **AI**: Gemini 2.5 Flash clasifica rubros + `pg_ia_query()` para consultas inteligentes
7. **Cron**: Proceso standalone separado con `ENABLE_CRON=true`
8. **Notificaciones**: Cascada: Expo Push → SMS Twilio → WhatsApp (log)

---

## Referencias

- 📄 [.agents/rules/sistema-core.md](../.agents/rules/sistema-core.md) — Documento maestro con esquemas de BD, endpoints y lógica detallada
- 📄 [AGENTS.md](../AGENTS.md) — Reglas para agentes que contribuyen al repositorio
