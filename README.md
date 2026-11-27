# Job Board

API REST para una bolsa de trabajo. Permite que empleadores publiquen y administren ofertas, y que candidatos busquen ofertas publicadas y se postulen a ellas.

El repositorio contiene únicamente el backend. No incluye frontend, Docker, CI ni configuración de despliegue.

## 1. Descripción del proyecto

Job Board resuelve la necesidad de conectar dos roles:

- **EMPLOYER**: publica puestos de trabajo y revisa las postulaciones recibidas.
- **CANDIDATE**: consulta las ofertas disponibles y envía su postulación.

La API expone autenticación con JWT, autorización por rol, validación de datos con Zod y persistencia en PostgreSQL mediante TypeORM.

## 2. Funcionalidades implementadas

- Registro de usuarios con los roles `EMPLOYER` y `CANDIDATE`.
- Nombre de empresa obligatorio para empleadores y rechazado para candidatos.
- Login con token JWT y consulta del usuario autenticado.
- Creación, edición y cambio de estado de ofertas.
- Listado público de ofertas publicadas con filtros, búsqueda y paginación.
- Detalle público de oferta con el nombre de la empresa.
- CORS configurable por orígenes permitidos, incluido el origen local de Vite.
- Listado de ofertas propias para empleadores.
- Postulación de candidatos a ofertas publicadas.
- Listado de postulaciones propias y de postulaciones por oferta.
- Restricción de base de datos para evitar postulaciones duplicadas.

No se incluyen CV, estados de postulación, mensajería ni tokens de refresco.

## 3. Tecnologías

| Área | Tecnología |
|---|---|
| Lenguaje | TypeScript en modo estricto |
| Runtime | Node.js |
| HTTP | Express 4 |
| ORM | TypeORM 0.3 |
| Base de datos | PostgreSQL |
| Validación | Zod 4 |
| Autenticación | jsonwebtoken |
| Hash de contraseñas | bcryptjs |
| Tests | Vitest 2 y Supertest |
| Carga de entorno | dotenv |
| Ejecución en desarrollo | tsx |

## 4. Arquitectura

El código está organizado por módulos funcionales y separado por capas:

```text
src/
  app.ts                 construcción de la app y montaje de routers
  main.ts                arranque del servidor y conexión a la base
  config/                variables de entorno y logger
  db/                    data source y migraciones
  middlewares/           CORS, autenticación, roles, validación, carga de oferta y errores
  modules/
    auth/                registro, login y usuario autenticado
    users/               entidad y repositorio de usuarios
    offers/              ofertas
    applications/        postulaciones
  shared/                errores y constantes de dominio
```

Responsabilidades:

- **routes**: definen rutas HTTP y encadenan middlewares.
- **controllers**: leen request/response, obtienen la identidad autenticada y devuelven códigos HTTP.
- **services**: contienen las reglas de negocio y construyen los DTOs de respuesta.
- **repositories**: concentran las consultas con TypeORM.
- **entities**: definen tablas, columnas, relaciones e índices.
- **schemas**: validan y normalizan datos con Zod.
- **middlewares**: resuelven CORS, autenticación, autorización, validación y errores.

`app.ts` se mantiene separado de `main.ts` para que los tests puedan crear la aplicación sin iniciar un servidor.

## 5. Roles y permisos

| Acción | EMPLOYER | CANDIDATE |
|---|---:|---:|
| Registrarse con `companyName` | Sí, obligatorio | No, campo no permitido |
| Buscar ofertas publicadas | Sí | Sí |
| Ver detalle público de una oferta | Sí | Sí |
| Crear ofertas | Sí | No |
| Ver ofertas propias | Sí | No |
| Editar ofertas propias | Sí | No |
| Cambiar estado de ofertas propias | Sí | No |
| Postularse a una oferta | No | Sí |
| Ver postulaciones propias | No | Sí |
| Ver postulaciones de una oferta propia | Sí | No |

Un empleador solo puede editar o consultar postulaciones de sus propias ofertas. El `employerId` y el `candidateId` se obtienen siempre del usuario autenticado, nunca del cuerpo de la solicitud.

## 6. Endpoints

Todas las rutas responden JSON. Las rutas protegidas esperan el encabezado `Authorization: Bearer <token>`. Los parámetros de ID son UUID.

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| `POST` | `/api/auth/register` | Público | Registro de usuario |
| `POST` | `/api/auth/login` | Público | Inicio de sesión |
| `GET` | `/api/auth/me` | JWT | Usuario autenticado |
| `GET` | `/api/offers` | Público | Ofertas `PUBLISHED` con búsqueda, filtros y paginación |
| `GET` | `/api/offers/:id` | Público | Detalle de una oferta `PUBLISHED` |
| `POST` | `/api/offers` | JWT `EMPLOYER` | Crea una oferta con estado `PUBLISHED` |
| `GET` | `/api/me/offers` | JWT `EMPLOYER` | Ofertas propias, con cualquier estado |
| `PATCH` | `/api/offers/:id` | JWT `EMPLOYER` propietario | Edición parcial de la oferta |
| `PATCH` | `/api/offers/:id/status` | JWT `EMPLOYER` propietario | Cambio de estado |
| `POST` | `/api/offers/:offerId/applications` | JWT `CANDIDATE` | Postulación a una oferta publicada |
| `GET` | `/api/me/applications` | JWT `CANDIDATE` | Postulaciones propias |
| `GET` | `/api/offers/:offerId/applications` | JWT `EMPLOYER` propietario | Postulaciones de una oferta propia |

Filtros disponibles en `GET /api/offers`: `category`, `seniority`, `workMode`, `workday` y `contractType`.

Búsqueda y paginación en `GET /api/offers`:

- `q`: texto a buscar en título, descripción y nombre de empresa (`ILIKE`, sin discriminar mayúsculas).
- `page`: página solicitada, desde `1`; valor por defecto `1`.
- `limit`: elementos por página, entre `1` y `50`; valor por defecto `10`.

La respuesta incluye `{ offers, pagination }`, con `page`, `limit`, `total`, `totalPages`, `hasNext` y `hasPrevious`. Una página fuera de rango devuelve `200` con `offers: []`.

Transiciones permitidas en `PATCH /api/offers/:id/status`:

- `PUBLISHED` → `PAUSED` o `CLOSED`
- `PAUSED` → `PUBLISHED` o `CLOSED`
- `CLOSED` → sin transiciones

Las respuestas usan los envelopes `{ user }`, `{ token, user }`, `{ offers, pagination }` en el listado público, `{ offers }` en el listado propio, `{ offer }`, `{ applications }` y `{ application }`, según corresponda.

### Ejemplos

Registro de empleador:

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "empleador@ejemplo.com",
    "password": "password123",
    "role": "EMPLOYER",
    "companyName": "Empresa Ejemplo"
  }'
```

Respuesta `201`:

```json
{
  "token": "<jwt>",
  "user": {
    "id": "<uuid>",
    "email": "empleador@ejemplo.com",
    "role": "EMPLOYER"
  }
}
```

Login:

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"empleador@ejemplo.com","password":"password123"}'
```

Creación de oferta:

```bash
curl -X POST http://localhost:3000/api/offers \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <token>' \
  -d '{
    "title": "Desarrollador TypeScript",
    "description": "Desarrollo de APIs con Node.js y TypeScript",
    "category": "TECHNOLOGY_SYSTEMS",
    "seniority": "JUNIOR",
    "workMode": "REMOTE",
    "workday": "FULL_TIME",
    "contractType": "EMPLOYMENT"
  }'
```

Búsqueda paginada de ofertas públicas:

```bash
curl 'http://localhost:3000/api/offers?q=typescript&workMode=REMOTE&page=1&limit=10'
```

Postulación con un token de candidato:

```bash
curl -X POST http://localhost:3000/api/offers/<offer-uuid>/applications \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <token-candidato>' \
  -d '{"candidateName":"Ana Pérez","phone":"+5491112345678"}'
```

Respuesta `201`:

```json
{
  "application": {
    "id": "<uuid>",
    "offerId": "<offer-uuid>",
    "candidateName": "Ana Pérez",
    "phone": "+5491112345678",
    "createdAt": "2026-01-01T00:00:00.000Z"
  }
}
```

## 7. Modelo de datos

| Entidad | Campos principales | Relaciones |
|---|---|---|
| `User` | `id`, `email`, `password_hash`, `role`, `company_name`, `created_at` | `1:N` con `Offer` y `Application` |
| `Offer` | `id`, `employer_id`, `title`, `description`, categoría, seniority, modalidad, jornada, contrato, `status`, `created_at`, `updated_at` | `N:1` con `User`, `1:N` con `Application` |
| `Application` | `id`, `offer_id`, `candidate_id`, `candidate_name`, `phone`, `created_at` | `N:1` con `Offer` y `User` |

Restricciones relevantes:

- `UQ_users_email` en `users.email`.
- `CK_users_company_name_required_for_employer`: exige `company_name` no nulo y no vacío para `EMPLOYER`; los candidatos pueden tenerlo en `NULL`.
- `UQ_applications_offer_candidate` en `(offer_id, candidate_id)`.
- Foreign keys con `ON DELETE RESTRICT` en `offers.employer_id`, `applications.offer_id` y `applications.candidate_id`.
- Índices: `IDX_offers_status_category`, `IDX_offers_employer_id`, `IDX_applications_offer_id` e `IDX_applications_candidate_id`.

Enums definidos en `src/shared/constants/work-offer-values.ts`:

| Enum | Valores |
|---|---|
| `user_role` | `EMPLOYER`, `CANDIDATE` |
| `offer_status` | `PUBLISHED`, `PAUSED`, `CLOSED` |
| `job_category` | `TECHNOLOGY_SYSTEMS`, `ADMINISTRATION`, `SALES_COMMERCIAL`, `CUSTOMER_SERVICE`, `MARKETING_COMMUNICATION`, `DESIGN_MULTIMEDIA`, `HUMAN_RESOURCES`, `FINANCE_ACCOUNTING`, `LOGISTICS_TRANSPORT`, `PRODUCTION_OPERATIONS`, `GASTRONOMY_TOURISM`, `HEALTH`, `EDUCATION`, `CONSTRUCTION_TRADES`, `LEGAL`, `OTHER` |
| `seniority` | `NO_EXPERIENCE`, `TRAINEE`, `JUNIOR`, `SEMI_SENIOR`, `SENIOR`, `LEADER_MANAGER` |
| `work_mode` | `REMOTE`, `ONSITE`, `HYBRID` |
| `workday` | `FULL_TIME`, `PART_TIME` |
| `contract_type` | `EMPLOYMENT`, `TEMPORARY_CONTRACT`, `FREELANCE_PROJECT`, `INTERNSHIP` |

## 8. Validaciones y seguridad

- Los schemas de Zod para registro, creación/edición de ofertas y postulación son estrictos: rechazan campos no declarados. El login y los filtros de query ignoran campos extra.
- El registro usa una unión discriminada por `role`: `companyName` es obligatorio para `EMPLOYER` y no está permitido para `CANDIDATE`.
- Las contraseñas se almacenan con bcryptjs y 10 rondas de salt. `password_hash` nunca se devuelve.
- Los JWT se firman con HS256, expiran en 1 hora y no tienen refresco.
- `authenticate` verifica el token y recupera el usuario desde la base de datos antes de poblar `req.user`.
- `requireRole` aplica autorización por rol y `loadOwnedOffer` verifica la propiedad de la oferta.
- Los DTOs se construyen por whitelist. Las ofertas públicas incluyen `companyName`, pero no exponen email ni datos del empleador.
- Las postulaciones no incluyen relaciones completas ni datos privados. `candidateId` solo se expone en la consulta del empleador.
- La duplicación de postulaciones se controla con `UQ_applications_offer_candidate`. El servicio traduce la violación `23505` de esa constraint a `409 ALREADY_APPLIED`, sin depender de un pre-check.
- Las ofertas inexistentes, no publicadas o ajenas se devuelven como `404` para no revelar información.
- CORS solo responde a orígenes explícitos de `CORS_ALLOWED_ORIGINS`; no usa comodines ni habilita credenciales de cookies.

Errores:

```json
{
  "error": {
    "code": "ALREADY_APPLIED",
    "message": "Ya te postulaste a esta oferta"
  }
}
```

Códigos habituales: `VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `INVALID_JSON` e `INTERNAL_ERROR`. Códigos de dominio: `EMAIL_ALREADY_EXISTS`, `INVALID_CREDENTIALS`, `INVALID_STATUS_TRANSITION` y `ALREADY_APPLIED`.

## 9. Configuración local

Requisitos:

- npm.
- PostgreSQL disponible localmente.
- Node.js 18 o superior. Se recomienda **Node.js 22 LTS**: es la versión del entorno de desarrollo verificado y coincide con `@types/node` 22. El mínimo real está determinado por dependencias como `tsx` y `vitest`, que requieren Node 18 o superior.

Instalación:

```bash
npm install
cp .env.example .env
```

En Windows, copiar `.env.example` como `.env`. Completar `DB_PASSWORD` y `JWT_SECRET` en el archivo local. `CORS_ALLOWED_ORIGINS` ya incluye `http://localhost:5173`; en producción debe reemplazarse por los orígenes reales del frontend.

Variables de entorno:

| Variable | Descripción | Valor por defecto |
|---|---|---|
| `NODE_ENV` | Entorno de ejecución | `development` |
| `PORT` | Puerto HTTP | `3000` |
| `DB_HOST` | Host de PostgreSQL | Obligatoria |
| `DB_PORT` | Puerto de PostgreSQL | `5432` |
| `DB_USER` | Usuario de PostgreSQL | Obligatoria |
| `DB_PASSWORD` | Contraseña de PostgreSQL | Obligatoria |
| `DB_NAME` | Base de desarrollo | Obligatoria |
| `DB_SSL` | Habilita TLS en la conexión (`true`/`false`) | `false` |
| `TEST_DB_NAME` | Base exclusiva de tests | `job_board_db_test` |
| `JWT_SECRET` | Secreto para firmar JWT | Obligatoria |
| `CORS_ALLOWED_ORIGINS` | Orígenes CORS permitidos, separados por coma | `http://localhost:5173` |

Ejemplo ficticio, sin valores reales:

```dotenv
NODE_ENV=development
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_USER=jobboard_user
DB_PASSWORD=valor-ficticio
DB_NAME=job_board_db
DB_SSL=false
TEST_DB_NAME=job_board_db_test
JWT_SECRET=secreto-ficticio-cambiar
CORS_ALLOWED_ORIGINS=http://localhost:5173
```

Ejecución:

```bash
npm run dev
```

Otros comandos:

```bash
npm run build
npm start
npm run typecheck
```

## 10. Base de datos y migraciones

Crear las bases de desarrollo y testing:

```bash
createdb job_board_db
createdb job_board_db_test
```

Comandos disponibles, según `package.json`:

```bash
npm run migration:run
npm run migration:revert
npm run migration:generate -- -n NombreMigracion
```

`npm run migration:run` aplica las migraciones pendientes sobre `DB_NAME`, es decir, la base de desarrollo configurada. `synchronize` y `migrationsRun` están en `false` en el data source; los cambios de esquema se realizan únicamente mediante migraciones.

Migraciones actuales:

- `InitialSchema1764038400000`: crea los enums, las tablas `users`, `offers` y `applications`, las foreign keys, las constraints únicas y los índices.
- `AddCompanyName1795584000000`: agrega `users.company_name`, completa el valor de empleadores existentes y agrega la restricción condicional antes de exigirlo.

Aislamiento de tests:

- Vitest configura `DB_NAME=job_board_db_test` y un JWT de prueba.
- El helper de tests valida que `TEST_DB_NAME` sea `job_board_db_test`.
- Los tests de integración se omiten si no hay `DB_PASSWORD` o si la base de testing no es la esperada.
- Los tests crean y eliminan su propio esquema; no modifican `job_board_db`.

## 11. Tests

Ejecutar la suite:

```bash
npm test
```

Modo watch:

```bash
npm run test:watch
```

Tests unitarios:

- Schemas y servicios de `auth`, `offers` y `applications`.
- Generación y verificación de tokens.
- Hash de contraseñas.
- Validación de variables de entorno.
- Guard de base de datos de testing.

Tests de integración:

- Autenticación HTTP.
- Ofertas, búsqueda, paginación y autorización de ofertas.
- Postulaciones, incluida la verificación de concurrencia.
- CORS y preflight `OPTIONS`.
- Migraciones.
- Conexión a PostgreSQL y rutas no encontradas.

## 12. Decisiones técnicas relevantes

- **Capas separadas**: las rutas no contienen lógica de negocio y los servicios no dependen de Express.
- **DTOs explícitos**: las respuestas se construyen con whitelist para evitar filtrar datos sensibles.
- **Migraciones manuales**: `synchronize` permanece desactivado y el esquema evoluciona solo con migraciones versionadas.
- **Integridad en la base**: unicidad de email, unicidad de postulación y obligatoriedad condicional de `company_name` se garantizan con constraints de PostgreSQL.
- **Autorización en capas**: rol en rutas y propiedad de recursos en middlewares/servicios.
- **Búsqueda en base**: `q` usa `ILIKE` sobre título, descripción y `company_name`, sin índices nuevos ni servicios externos.
- **CORS explícito**: orígenes permitidos por entorno, métodos y headers acotados, sin credenciales.
- **Sin funcionalidades accesorias**: no hay CV, estados de postulación, mensajería ni refresh tokens.
