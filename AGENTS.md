# PeiApp — AGENTS.md

> Guía para agentes de IA que trabajan en este repositorio. Define la estructura, reglas y contexto necesarios para contribuir correctamente.

---

## Descripción del Proyecto

**PeiApp** es una plataforma financiera para emprendedores y pequeños negocios de Latinoamérica. Permite gestionar ingresos, gastos, cobros y pagos mediante billeteras digitales, tickets financieros, links de cobro públicos (PeiLinks), chat en tiempo real, clasificación AI de rubros y reportes automáticos.

---

## Estructura del Monorepo

```
.
├── server/                  # API REST principal (NestJS 11)
│   ├── src/
│   │   ├── ai/              # Módulo de IA (Gemini: predicción rubros, consultas AI)
│   │   ├── auth/            # Módulo de autenticación (OTP por SMS, JWT)
│   │   ├── cron/            # Tareas programadas (reportes, alertas, inactividad)
│   │   ├── helpdesk/        # Módulo de soporte/ayuda
│   │   ├── notifications/   # Servicio interno de notificaciones (push/SMS proxy)
│   │   ├── tickets/         # Módulo de tickets/transacciones (core del negocio)
│   │   │   └── entities/    # Ticket, TicketDetail, TicketLog, TicketChat, RecurringTicket
│   │   ├── users/           # Módulo de usuarios
│   │   │   └── entities/    # User
│   │   ├── wallets/         # Módulo de billeteras
│   │   │   ├── entities/    # Wallet, WalletMember, WalletDistributionList, WalletGoal, WalletPanel, WalletCategory
│   │   │   ├── constants/   # Constantes de billeteras
│   │   │   └── dto/         # DTOs de billeteras
│   │   ├── app.module.ts    # Módulo raíz
│   │   ├── main.ts          # Entry point API (puerto 3000)
│   │   ├── main-cron.ts     # Entry point Cron standalone
│   │   └── constants.ts     # SYSTEM_WALLET_NAME, SYSTEM_EXPENSES_WALLET_NAME
│   └── .env
│
├── wss-server/              # Servidor WebSocket (NestJS 11 + Socket.IO)
│   ├── src/
│   │   ├── tickets/
│   │   │   └── chat.gateway.ts  # WebSocket Gateway (eventos: joinTicket, sendMessage, newMessage)
│   │   └── (misma estructura que server/)
│   └── .env
│
├── notification-service/    # Servicio de notificaciones (Express.js + Node.js)
│   ├── index.js             # Archivo único: push Expo, SMS Twilio, cache de usuarios
│   └── .env
│
├── ticket-web/              # Web pública de PeiLinks (Vite + React 19 + TS)
│   ├── src/
│   │   ├── App.tsx          # Componente único: ver/pagar/reprogramar/cancelar ticket
│   │   └── App.css          # Estilos
│   └── vite.config.ts
│
├── app/                     # App móvil (Expo 55 + React Native 0.83)
│   ├── src/
│   │   ├── api/             # Clientes HTTP y WebSocket
│   │   │   ├── api.client.ts    # Axios con interceptors (auth, loading, 401 logout)
│   │   │   ├── socket.config.ts # Socket.IO singleton
│   │   │   ├── tickets.api.ts   # API de tickets
│   │   │   ├── wallets.api.ts   # API de billeteras
│   │   │   ├── auth.api.ts      # API de auth
│   │   │   ├── users.api.ts     # API de usuarios
│   │   │   ├── ai.api.ts        # API de IA
│   │   │   ├── helpdesk.api.ts  # API de helpdesk
│   │   │   └── dashboard.api.ts # API de dashboard
│   │   ├── components/      # Componentes reutilizables (UI, wallet, contacts, dashboard, layout)
│   │   ├── constants/       # Tema (colors, fonts, spacing)
│   │   ├── db/              # Base de datos local (SQLite/Dexie) con cola de sync
│   │   ├── navigation/      # Navegación (React Navigation 7)
│   │   │   ├── AppNavigator.tsx        # Auth check
│   │   │   ├── AuthNavigator.tsx       # Login/OTP
│   │   │   ├── OnboardingNavigator.tsx # Onboarding
│   │   │   ├── RootNavigator.tsx       # Stack principal post-auth
│   │   │   └── MainTabNavigator.tsx    # Bottom tabs (5 tabs)
│   │   ├── screens/         # Pantallas por feature
│   │   │   ├── auth/        # Login, verificación OTP
│   │   │   ├── calendar/    # Calendario de vencimientos
│   │   │   ├── chat/        # Chat en tiempo real por ticket
│   │   │   ├── dashboard/   # Dashboard financiero
│   │   │   ├── history/     # Historial de tickets
│   │   │   ├── legal/       # Términos y condiciones
│   │   │   ├── main/        # Home, Settings, Contacts, Videos, etc.
│   │   │   ├── movement/    # Detalle de movimiento
│   │   │   ├── movements/   # Crear movimiento, carga rápida, recurrentes
│   │   │   ├── onboarding/  # Flujo de onboarding
│   │   │   ├── wallets/     # Billeteras, settings, transfer, split, AI, categories
│   │   │   └── welcome/     # Pantalla de bienvenida
│   │   ├── services/        # Servicios (contactos, notificaciones, sync)
│   │   ├── storage/         # Persistencia local de datos
│   │   └── store/           # Zustand stores (auth, app, contacts, ui)
│   ├── app.config.js        # Configuración Expo con buildId dinámico
│   ├── .env                 # Variables de entorno
│   ├── .env.development     # URLs localhost
│   └── .env.production      # URLs producción
│
└── logs/                    # Directorio compartido de logs
```

---

## Reglas para Contribuir

### 1. Base de Datos
- **NUNCA** usar `synchronize: true` en TypeORM. Los cambios de esquema se hacen manualmente con SQL.
- Nombres de columnas en `snake_case`, propiedades TypeScript en `camelCase`.
- Todas las PK son UUID autogenerados.
- Usar soft delete (`deleted_at`) en todas las entidades que lo soporten.
- Los saldos de billeteras se recalculan desde `ticket_details`, no se suman incrementalmente.

### 2. Tickets
- Cada ticket crea 1 o 2 `ticket_details` (owner + receiver opcional).
- El `type` (income/expense) en `ticket_details` se invierte entre owner y receiver.
- Los IDs con prefijo `local_` o `remote_mock_` son datos de fallback y no deben procesarse en la BD.
- `shortId` se genera solo cuando `generatePeilink=true` o `helpToCollect=true`.
- El `shortId` es de 6 caracteres alfanuméricos aleatorios.

### 3. Billeteras del Sistema
- `mycollects` ("Cobros sin Billetera") y `mypays` ("Pagos sin Billetera") son billeteras del sistema.
- Se crean automáticamente durante el onboarding.
- **No deben eliminarse ni renombrarse**.

### 4. API
- Todos los endpoints autenticados usan `@UseGuards(AuthGuard('jwt'))`.
- El userId se obtiene de `req.user.sub` (UUID interno, no el teléfono).
- CORS está habilitado globalmente sin restricción de origen.
- Body limit: 100MB para soportar uploads de imágenes.
- Validation: `class-validator` con `whitelist: true` y `transform: true`.

### 5. Notificaciones
- El servidor backend NO envía notificaciones directamente.
- Usa el `NotificationsService` que decide entre Expo Push y SMS.
- El notification-service standalone corre en puerto 4000.

### 6. WebSocket
- El wss-server es un proyecto NestJS separado con sus propias entidades.
- **No agregar endpoints REST al wss-server** (solo el gateway de chat).
- El chat gateway guarda mensajes en BD y hace broadcast a la sala del ticket.

### 7. App Móvil
- Usar alias `@/` para imports desde `src/`.
- State management: **Zustand** (no Context API, no Redux).
- API calls en archivos `*.api.ts` en `src/api/`.
- Estilos: NativeWind (TailwindCSS para RN) + StyleSheet.create.
- Iconos: Ionicons de `@expo/vector-icons`.
- Fuentes: Inter, Plus Jakarta Sans.

### 8. Variables de Entorno
- No commitear credenciales reales (los .env actuales son de dev).
- La app usa `APP_ENV` para seleccionar entre `.env.development` y `.env.production`.
- Variables de Expo deben tener prefijo `EXPO_PUBLIC_`.

### 9. Logs
- Todos los servicios loguean a `../logs/` (directorio compartido en la raíz del monorepo).
- Backend: `logs/server.log`
- WSS: `logs/wss-server.log`, `logs/chat.log`
- Notificaciones: `logs/notifications.log`
- Cron: `logs/daily_reports.log`
- IA: `logs/ia-request.log`, `logs/ia-query.log`

---

## Comandos de Desarrollo

| Servicio | Directorio | Comando | Puerto |
|----------|------------|---------|--------|
| API Backend | `server/` | `npm run start:dev` | 3000 |
| WebSocket Server | `wss-server/` | `npm run start:dev` | 3001 |
| Notification Service | `notification-service/` | `npm run start` | 4000 |
| Ticket Web | `ticket-web/` | `npm run dev` | 5173 |
| App Expo | `app/` | `npm run start` | 8081 |
| Cron (standalone) | `server/` | `npm run start:cron:dev` | N/A |

---

## Dominios de Producción

| Servicio | URL |
|----------|-----|
| API Backend | `https://api.peiapp.tech` |
| WebSocket Server | `https://wss.peiapp.tech` |
| Ticket Web (PeiLinks) | `https://t.peiapp.tech` |
| Base de Datos | `db.peiapp.tech:5432` |
| Landing Page | `https://www.peiapp.tech` |

---

## Reglas de Documentación del Sistema

Para documentación detallada del esquema de base de datos, endpoints, lógica de negocio, rubros y todas las convenciones, consultar:

📄 **[.agents/rules/sistema-core.md](.agents/rules/sistema-core.md)** — Documento maestro del sistema
