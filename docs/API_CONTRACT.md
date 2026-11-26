# Contrato de API - Job Board

Documento de referencia para el frontend. Describe el comportamiento **realmente implementado** en el backend, verificado contra el código fuente actual. No incluye funcionalidades planificadas ni mejoras pendientes.

## Convenciones generales

- Prefijo de rutas: `/api`.
- Formato de cuerpo: JSON. Enviar `Content-Type: application/json` en solicitudes con body.
- Identificadores: UUID en formato string. Las rutas con ID validan UUID antes de ejecutar la lógica.
- Fechas: se serializan como strings ISO 8601, por ejemplo `2026-01-01T00:00:00.000Z`.
- Respuestas exitosas: siempre usan un objeto envelope (`{ user }`, `{ token, user }`, `{ offers, pagination }`, `{ offers }`, `{ offer }`, `{ applications }`, `{ application }`).
- Validación: Zod. Los schemas de body para registro, creación/edición de ofertas y postulación son `.strict()` y rechazan campos no declarados. `/api/auth/login` y los filtros de query descartan campos extra sin error.
- Autorización: las rutas protegidas requieren `Authorization: Bearer <token>`.
- CORS: permitido solo para los orígenes configurados en `CORS_ALLOWED_ORIGINS`.
- Orden: los listados se ordenan por `createdAt` descendente. El listado público de ofertas admite búsqueda, filtros y paginación; los demás listados no tienen paginación ni orden configurable.
- No hay endpoint de health check ni versionado de API.

### Tipos compartidos de respuesta

```ts
type PublicUser = {
  id: string;
  email: string;
  role: 'EMPLOYER' | 'CANDIDATE';
};

type AuthResult = {
  token: string;
  user: PublicUser;
};

type OfferDto = {
  id: string;
  title: string;
  description: string;
  category: JobCategory;
  seniority: Seniority;
  workMode: WorkMode;
  workday: Workday;
  contractType: ContractType;
  status: 'PUBLISHED' | 'PAUSED' | 'CLOSED';
  createdAt: string;
  updatedAt: string;
};

type PublicOfferDto = OfferDto & {
  companyName: string;
};

type PaginationMetadata = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
};

type ApplicationDto = {
  id: string;
  offerId: string;
  candidateName: string;
  phone: string;
  createdAt: string;
};

type EmployerApplicationDto = ApplicationDto & {
  candidateId: string;
};
```

`companyName` solo aparece en `PublicOfferDto`, es decir, en `GET /api/offers` y `GET /api/offers/:id`. No se devuelve en `/api/auth/*` ni en `/api/me/offers`.

### Enums

```ts
type UserRole = 'EMPLOYER' | 'CANDIDATE';

type OfferStatus = 'PUBLISHED' | 'PAUSED' | 'CLOSED';

type JobCategory =
  | 'TECHNOLOGY_SYSTEMS'
  | 'ADMINISTRATION'
  | 'SALES_COMMERCIAL'
  | 'CUSTOMER_SERVICE'
  | 'MARKETING_COMMUNICATION'
  | 'DESIGN_MULTIMEDIA'
  | 'HUMAN_RESOURCES'
  | 'FINANCE_ACCOUNTING'
  | 'LOGISTICS_TRANSPORT'
  | 'PRODUCTION_OPERATIONS'
  | 'GASTRONOMY_TOURISM'
  | 'HEALTH'
  | 'EDUCATION'
  | 'CONSTRUCTION_TRADES'
  | 'LEGAL'
  | 'OTHER';

type Seniority =
  | 'NO_EXPERIENCE'
  | 'TRAINEE'
  | 'JUNIOR'
  | 'SEMI_SENIOR'
  | 'SENIOR'
  | 'LEADER_MANAGER';

type WorkMode = 'REMOTE' | 'ONSITE' | 'HYBRID';
type Workday = 'FULL_TIME' | 'PART_TIME';

type ContractType =
  | 'EMPLOYMENT'
  | 'TEMPORARY_CONTRACT'
  | 'FREELANCE_PROJECT'
  | 'INTERNSHIP';
```

---

## Módulo Auth

### `POST /api/auth/register`

- Acceso: público.
- Parámetros de ruta: ninguno.
- Query: ninguna.
- Body: obligatorio.

| Campo | Obligatorio | Tipo | Restricciones |
|---|---|---|---|
| `email` | Sí | string | Se aplica `trim` y `toLowerCase`; debe ser email válido |
| `password` | Sí | string | 8 a 128 caracteres; sin `trim` |
| `role` | Sí | `UserRole` | `EMPLOYER` o `CANDIDATE` |
| `companyName` | Solo si `role === 'EMPLOYER'` | string | `trim`, 1 a 120 caracteres |
| Campos extra | No | - | Rechazados con `400 VALIDATION_ERROR` |

Si `role === 'CANDIDATE'`, enviar `companyName` produce `400`.

Respuesta exitosa `201`:

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

> La respuesta no incluye `companyName`, `password` ni `passwordHash`.

Errores:

| Código HTTP | `error.code` | Motivo |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Body inválido, rol inválido, `companyName` faltante para EMPLOYER o presente para CANDIDATE, campos extra |
| 409 | `EMAIL_ALREADY_EXISTS` | El email ya está registrado |
| 500 | `INTERNAL_ERROR` | Error no manejado |

Ejemplo:

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

---

### `POST /api/auth/login`

- Acceso: público.
- Parámetros de ruta: ninguno.
- Query: ninguna.
- Body: obligatorio.

| Campo | Obligatorio | Tipo | Restricciones |
|---|---|---|---|
| `email` | Sí | string | Se aplica `trim` y `toLowerCase`; debe ser email válido |
| `password` | Sí | string | 1 a 128 caracteres |

Este schema **no es estricto**: los campos adicionales se ignoran y no generan error.

Respuesta exitosa `200`: la misma forma que `register`:

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

Errores:

| Código HTTP | `error.code` | Motivo |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Email con formato inválido o password vacío / > 128 caracteres |
| 401 | `INVALID_CREDENTIALS` | Email inexistente o contraseña incorrecta. El mensaje es el mismo en ambos casos |
| 500 | `INTERNAL_ERROR` | Error no manejado |

Ejemplo:

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"empleador@ejemplo.com","password":"password123"}'
```

---

### `GET /api/auth/me`

- Acceso: JWT válido, cualquier rol.
- Parámetros de ruta: ninguno.
- Query: ninguna.
- Body: no se utiliza.

Respuesta exitosa `200`:

```json
{
  "user": {
    "id": "<uuid>",
    "email": "empleador@ejemplo.com",
    "role": "EMPLOYER"
  }
}
```

Errores:

| Código HTTP | `error.code` | Motivo |
|---|---|---|
| 401 | `UNAUTHORIZED` | Falta header, token inválido/expirado o usuario inexistente |

Ejemplo:

```bash
curl http://localhost:3000/api/auth/me \
  -H 'Authorization: Bearer <token>'
```

---

## Módulo Offers

### `GET /api/offers`

- Acceso: público.
- Parámetros de ruta: ninguno.
- Query: todos opcionales.

| Parámetro | Tipo | Obligatorio | Restricciones |
|---|---|---|---|
| `category` | `JobCategory` | No | Uno de los valores del enum |
| `seniority` | `Seniority` | No | Uno de los valores del enum |
| `workMode` | `WorkMode` | No | Uno de los valores del enum |
| `workday` | `Workday` | No | Uno de los valores del enum |
| `contractType` | `ContractType` | No | Uno de los valores del enum |
| `q` | string | No | `trim`, 1 a 120 caracteres; busca en título, descripción y nombre de empresa |
| `page` | number | No | Entero ≥ 1; por defecto `1` |
| `limit` | number | No | Entero entre `1` y `50`; por defecto `10` |

Los filtros se combinan con `AND`. La búsqueda `q` usa `ILIKE` con `%` en los extremos y se combina con los filtros y la paginación. Los caracteres `%`, `_` y `\` de `q` se escapan para tratarse literalmente. Los parámetros de query no declarados se ignoran. Solo se devuelven ofertas con `status === 'PUBLISHED'`, ordenadas por `createdAt` descendente.

Respuesta exitosa `200`:

```json
{
  "offers": [
    {
      "id": "<uuid>",
      "title": "Desarrollador TypeScript",
      "description": "Desarrollo de APIs con Node.js y TypeScript",
      "category": "TECHNOLOGY_SYSTEMS",
      "seniority": "JUNIOR",
      "workMode": "REMOTE",
      "workday": "FULL_TIME",
      "contractType": "EMPLOYMENT",
      "status": "PUBLISHED",
      "createdAt": "2026-01-01T00:00:00.000Z",
      "updatedAt": "2026-01-01T00:00:00.000Z",
      "companyName": "Empresa Ejemplo"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1,
    "hasNext": false,
    "hasPrevious": false
  }
}
```

`totalPages` es `Math.ceil(total / limit)` y vale `0` cuando `total` es `0`. Una página fuera de rango devuelve `200` con `offers: []` y los metadatos de la página solicitada. `hasPrevious` es `false` cuando no hay resultados, incluso si `page > 1`.

Errores:

| Código HTTP | `error.code` | Motivo |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Filtro fuera del enum, `page` < 1, `limit` fuera de 1..50 o `q` vacío / > 120 caracteres |
| 500 | `INTERNAL_ERROR` | Error no manejado |

Ejemplo:

```bash
curl 'http://localhost:3000/api/offers?q=typescript&category=TECHNOLOGY_SYSTEMS&page=1&limit=10'
```

---

### `GET /api/offers/:id`

- Acceso: público.
- Parámetros de ruta: `id` (UUID de la oferta).
- Query: ninguna.
- Body: no se utiliza.

Solo devuelve ofertas `PUBLISHED`. Una oferta `PAUSED` o `CLOSED` responde `404`.

Respuesta exitosa `200`:

```json
{
  "offer": {
    "id": "<uuid>",
    "title": "Desarrollador TypeScript",
    "description": "Desarrollo de APIs con Node.js y TypeScript",
    "category": "TECHNOLOGY_SYSTEMS",
    "seniority": "JUNIOR",
    "workMode": "REMOTE",
    "workday": "FULL_TIME",
    "contractType": "EMPLOYMENT",
    "status": "PUBLISHED",
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-01-01T00:00:00.000Z",
    "companyName": "Empresa Ejemplo"
  }
}
```

Errores:

| Código HTTP | `error.code` | Motivo |
|---|---|---|
| 400 | `VALIDATION_ERROR` | `id` no es UUID |
| 404 | `NOT_FOUND` | No existe o no está publicada |
| 500 | `INTERNAL_ERROR` | Error no manejado |

Ejemplo:

```bash
curl http://localhost:3000/api/offers/<offer-uuid>
```

---

### `POST /api/offers`

- Acceso: JWT válido con rol `EMPLOYER`.
- Parámetros de ruta: ninguno.
- Query: ninguna.
- Body: obligatorio y estricto.

| Campo | Obligatorio | Tipo | Restricciones |
|---|---|---|---|
| `title` | Sí | string | `trim`, 1 a 120 caracteres |
| `description` | Sí | string | `trim`, 1 a 5000 caracteres |
| `category` | Sí | `JobCategory` | Enum |
| `seniority` | Sí | `Seniority` | Enum |
| `workMode` | Sí | `WorkMode` | Enum |
| `workday` | Sí | `Workday` | Enum |
| `contractType` | Sí | `ContractType` | Enum |
| `employerId` | No permitido | - | Se toma del token |
| `status` | No permitido | - | Se fuerza a `PUBLISHED` |
| Campos extra | No | - | Rechazados con `400` |

Respuesta exitosa `201`: `{ "offer": OfferDto }`. No incluye `companyName`, `employerId` ni `employer`.

```json
{
  "offer": {
    "id": "<uuid>",
    "title": "Desarrollador TypeScript",
    "description": "Desarrollo de APIs con Node.js y TypeScript",
    "category": "TECHNOLOGY_SYSTEMS",
    "seniority": "JUNIOR",
    "workMode": "REMOTE",
    "workday": "FULL_TIME",
    "contractType": "EMPLOYMENT",
    "status": "PUBLISHED",
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-01-01T00:00:00.000Z"
  }
}
```

Errores:

| Código HTTP | `error.code` | Motivo |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Body inválido o campos no permitidos |
| 401 | `UNAUTHORIZED` | Falta token o token inválido |
| 403 | `FORBIDDEN` | El usuario autenticado no es `EMPLOYER` |
| 500 | `INTERNAL_ERROR` | Error no manejado |

Ejemplo:

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

---

### `GET /api/me/offers`

- Acceso: JWT válido con rol `EMPLOYER`.
- Parámetros de ruta: ninguno.
- Query: ninguna.
- Body: no se utiliza.

Devuelve todas las ofertas propias, con cualquier `status`, ordenadas por `createdAt` descendente. Respuesta `200`: `{ "offers": OfferDto[] }`.

```json
{
  "offers": [
    {
      "id": "<uuid>",
      "title": "Desarrollador TypeScript",
      "description": "Desarrollo de APIs con Node.js y TypeScript",
      "category": "TECHNOLOGY_SYSTEMS",
      "seniority": "JUNIOR",
      "workMode": "REMOTE",
      "workday": "FULL_TIME",
      "contractType": "EMPLOYMENT",
      "status": "PAUSED",
      "createdAt": "2026-01-01T00:00:00.000Z",
      "updatedAt": "2026-01-02T00:00:00.000Z"
    }
  ]
}
```

Errores:

| Código HTTP | `error.code` | Motivo |
|---|---|---|
| 401 | `UNAUTHORIZED` | Falta token o token inválido |
| 403 | `FORBIDDEN` | El usuario autenticado no es `EMPLOYER` |
| 500 | `INTERNAL_ERROR` | Error no manejado |

Ejemplo:

```bash
curl http://localhost:3000/api/me/offers \
  -H 'Authorization: Bearer <token>'
```

---

### `PATCH /api/offers/:id`

- Acceso: JWT válido con rol `EMPLOYER` y propiedad de la oferta.
- Parámetros de ruta: `id` (UUID de la oferta).
- Query: ninguna.
- Body: obligatorio, estricto y parcial.

| Campo | Obligatorio | Tipo | Restricciones |
|---|---|---|---|
| `title` | No | string | `trim`, 1 a 120 caracteres |
| `description` | No | string | `trim`, 1 a 5000 caracteres |
| `category` | No | `JobCategory` | Enum |
| `seniority` | No | `Seniority` | Enum |
| `workMode` | No | `WorkMode` | Enum |
| `workday` | No | `Workday` | Enum |
| `contractType` | No | `ContractType` | Enum |
| `status` | No permitido | - | Use `PATCH /api/offers/:id/status` |
| Campos extra | No | - | Rechazados con `400` |

Debe enviarse al menos un campo. Un cuerpo `{}` responde `400`.

Respuesta exitosa `200`: `{ "offer": OfferDto }` con los valores actualizados y `updatedAt` recalculado.

Errores:

| Código HTTP | `error.code` | Motivo |
|---|---|---|
| 400 | `VALIDATION_ERROR` | UUID inválido, body vacío, campo inválido o `status` incluido |
| 401 | `UNAUTHORIZED` | Falta token o token inválido |
| 403 | `FORBIDDEN` | El usuario autenticado no es `EMPLOYER` |
| 404 | `NOT_FOUND` | La oferta no existe o pertenece a otro empleador |
| 500 | `INTERNAL_ERROR` | Error no manejado |

Ejemplo:

```bash
curl -X PATCH http://localhost:3000/api/offers/<offer-uuid> \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <token>' \
  -d '{"title":"Nuevo título","seniority":"SENIOR"}'
```

---

### `PATCH /api/offers/:id/status`

- Acceso: JWT válido con rol `EMPLOYER` y propiedad de la oferta.
- Parámetros de ruta: `id` (UUID de la oferta).
- Query: ninguna.
- Body: obligatorio y estricto.

| Campo | Obligatorio | Tipo | Restricciones |
|---|---|---|---|
| `status` | Sí | `OfferStatus` | `PUBLISHED`, `PAUSED` o `CLOSED` |

Transiciones permitidas:

| Estado actual | Estados destino permitidos |
|---|---|
| `PUBLISHED` | `PAUSED`, `CLOSED` |
| `PAUSED` | `PUBLISHED`, `CLOSED` |
| `CLOSED` | Ninguno |

Enviar el mismo estado también se rechaza con `409 INVALID_STATUS_TRANSITION`.

Respuesta exitosa `200`: `{ "offer": OfferDto }` con el nuevo `status`.

```json
{
  "offer": {
    "id": "<uuid>",
    "title": "Desarrollador TypeScript",
    "description": "Desarrollo de APIs con Node.js y TypeScript",
    "category": "TECHNOLOGY_SYSTEMS",
    "seniority": "JUNIOR",
    "workMode": "REMOTE",
    "workday": "FULL_TIME",
    "contractType": "EMPLOYMENT",
    "status": "PAUSED",
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-01-02T00:00:00.000Z"
  }
}
```

Errores:

| Código HTTP | `error.code` | Motivo |
|---|---|---|
| 400 | `VALIDATION_ERROR` | UUID inválido, body inválido o `status` fuera del enum |
| 401 | `UNAUTHORIZED` | Falta token o token inválido |
| 403 | `FORBIDDEN` | El usuario autenticado no es `EMPLOYER` |
| 404 | `NOT_FOUND` | La oferta no existe o pertenece a otro empleador |
| 409 | `INVALID_STATUS_TRANSITION` | Transición no permitida o estado igual al actual |
| 500 | `INTERNAL_ERROR` | Error no manejado |

Ejemplo:

```bash
curl -X PATCH http://localhost:3000/api/offers/<offer-uuid>/status \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <token>' \
  -d '{"status":"PAUSED"}'
```

---

## Módulo Applications

### `POST /api/offers/:offerId/applications`

- Acceso: JWT válido con rol `CANDIDATE`.
- Parámetros de ruta: `offerId` (UUID de la oferta).
- Query: ninguna.
- Body: obligatorio y estricto.

| Campo | Obligatorio | Tipo | Restricciones |
|---|---|---|---|
| `candidateName` | Sí | string | `trim`, 1 a 120 caracteres |
| `phone` | Sí | string | `trim`, 1 a 50 caracteres |
| `candidateId` | No permitido | - | Se toma del token |
| `offerId` | No permitido | - | Se toma de la ruta |
| Campos extra | No | - | Rechazados con `400` |

La oferta debe existir y estar `PUBLISHED`. No se permite postularse dos veces a la misma oferta.

Respuesta exitosa `201`:

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

> No incluye `candidateId`, `candidate`, `offer`, `email` ni `passwordHash`.

Errores:

| Código HTTP | `error.code` | Motivo |
|---|---|---|
| 400 | `VALIDATION_ERROR` | UUID inválido, body inválido o campos no permitidos |
| 401 | `UNAUTHORIZED` | Falta token o token inválido |
| 403 | `FORBIDDEN` | El usuario autenticado no es `CANDIDATE` |
| 404 | `NOT_FOUND` | La oferta no existe, está `PAUSED` o está `CLOSED` |
| 409 | `ALREADY_APPLIED` | Ya existe una postulación de ese candidato a esa oferta |
| 500 | `INTERNAL_ERROR` | Error no manejado |

Ejemplo:

```bash
curl -X POST http://localhost:3000/api/offers/<offer-uuid>/applications \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <token-candidato>' \
  -d '{"candidateName":"Ana Pérez","phone":"+5491112345678"}'
```

---

### `GET /api/me/applications`

- Acceso: JWT válido con rol `CANDIDATE`.
- Parámetros de ruta: ninguno.
- Query: ninguna.
- Body: no se utiliza.

Devuelve solo las postulaciones del candidato autenticado, ordenadas por `createdAt` descendente. No incluye `candidateId`.

Respuesta exitosa `200`:

```json
{
  "applications": [
    {
      "id": "<uuid>",
      "offerId": "<offer-uuid>",
      "candidateName": "Ana Pérez",
      "phone": "+5491112345678",
      "createdAt": "2026-01-01T00:00:00.000Z"
    }
  ]
}
```

Errores:

| Código HTTP | `error.code` | Motivo |
|---|---|---|
| 401 | `UNAUTHORIZED` | Falta token o token inválido |
| 403 | `FORBIDDEN` | El usuario autenticado no es `CANDIDATE` |
| 500 | `INTERNAL_ERROR` | Error no manejado |

Ejemplo:

```bash
curl http://localhost:3000/api/me/applications \
  -H 'Authorization: Bearer <token-candidato>'
```

---

### `GET /api/offers/:offerId/applications`

- Acceso: JWT válido con rol `EMPLOYER` y propiedad de la oferta.
- Parámetros de ruta: `offerId` (UUID de la oferta).
- Query: ninguna.
- Body: no se utiliza.

Devuelve las postulaciones de esa oferta, ordenadas por `createdAt` descendente. No hay filtro por estado de la oferta: el propietario también ve postulaciones de ofertas `PAUSED` o `CLOSED`. Es la única respuesta que incluye `candidateId`.

Respuesta exitosa `200`:

```json
{
  "applications": [
    {
      "id": "<uuid>",
      "offerId": "<offer-uuid>",
      "candidateId": "<uuid>",
      "candidateName": "Ana Pérez",
      "phone": "+5491112345678",
      "createdAt": "2026-01-01T00:00:00.000Z"
    }
  ]
}
```

Errores:

| Código HTTP | `error.code` | Motivo |
|---|---|---|
| 400 | `VALIDATION_ERROR` | UUID inválido |
| 401 | `UNAUTHORIZED` | Falta token o token inválido |
| 403 | `FORBIDDEN` | El usuario autenticado no es `EMPLOYER` |
| 404 | `NOT_FOUND` | La oferta no existe o pertenece a otro empleador |
| 500 | `INTERNAL_ERROR` | Error no manejado |

Ejemplo:

```bash
curl http://localhost:3000/api/offers/<offer-uuid>/applications \
  -H 'Authorization: Bearer <token-empleador>'
```

---

## Respuestas de error

Todas las respuestas de error usan este envelope:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Datos inválidos",
    "details": [
      { "path": "password", "message": "<mensaje de Zod>" }
    ]
  }
}
```

`details` solo aparece cuando el error lo incluye. En la práctica lo aportan los errores de validación de Zod; en los demás casos se omite por `undefined`. El frontend debe confiar en `error.code`, no en `error.message` ni en los mensajes de Zod, que pueden cambiar con la versión de la librería.

| Código HTTP | `error.code` | Cuándo ocurre |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Datos de ruta, query o body inválidos |
| 400 | `INVALID_JSON` | El cuerpo no es JSON válido |
| 401 | `UNAUTHORIZED` | Autenticación requerida, token inválido/expirado o usuario inexistente |
| 401 | `INVALID_CREDENTIALS` | Login con credenciales incorrectas |
| 403 | `FORBIDDEN` | Rol no autorizado para la operación |
| 404 | `NOT_FOUND` | Recurso inexistente, no visible públicamente o ajeno al empleador |
| 409 | `EMAIL_ALREADY_EXISTS` | Email duplicado en registro |
| 409 | `INVALID_STATUS_TRANSITION` | Cambio de estado de oferta no permitido |
| 409 | `ALREADY_APPLIED` | Postulación duplicada |
| 500 | `INTERNAL_ERROR` | Error no manejado |

Nota: la clase `ConflictError` define el código genérico `CONFLICT`, pero actualmente todos los conflictos emitidos usan uno de los tres códigos específicos de la tabla.

Las rutas inexistentes responden `404 NOT_FOUND` con el mismo envelope.

---

## Reglas de negocio que el frontend debe respetar

1. `EMPLOYER` administra ofertas; `CANDIDATE` busca ofertas y se postula. No existen otros roles.
2. `employerId` y `candidateId` nunca se envían: se derivan del usuario autenticado.
3. Una oferta se crea siempre con `status: 'PUBLISHED'`. El campo `status` está prohibido en el body de creación.
4. `PATCH /api/offers/:id` no cambia el estado. Para cambiarlo existe `PATCH /api/offers/:id/status`.
5. Las transiciones válidas son `PUBLISHED → PAUSED|CLOSED` y `PAUSED → PUBLISHED|CLOSED`. `CLOSED` es terminal. El mismo estado tampoco es válido como destino.
6. Las consultas públicas (`GET /api/offers` y `GET /api/offers/:id`) solo muestran ofertas `PUBLISHED`.
7. Para operaciones de propiedad, un `EMPLOYER` distinto del dueño recibe `404`, no `403`. El `403` se reserva para rol incorrecto.
8. Solo se puede postular a ofertas `PUBLISHED`.
9. Existe como máximo una postulación por par `(offerId, candidateId)`. La garantía es la constraint única de base de datos; un duplicado responde `409 ALREADY_APPLIED`.
10. `candidateId` se expone únicamente en `GET /api/offers/:offerId/applications`.
11. El listado público de ofertas admite `q`, filtros y paginación; los demás listados devuelven el conjunto completo ordenado por `createdAt` descendente.
12. No hay orden configurable ni paginación en `/api/me/offers`, `/api/me/applications` ni `/api/offers/:offerId/applications`.
13. No hay estados de postulación, CV, mensajería ni tokens de refresco. El frontend no debe enviar campos para esas funciones.

---

## JWT, envío y expiración

- Obtener el token en `POST /api/auth/register` o `POST /api/auth/login`.
- Enviarlo en todas las rutas protegidas:

```http
Authorization: Bearer <token>
```

- El token se firma con HS256 y expira exactamente 1 hora después de emitirse (`exp - iat === 3600`).
- El payload incluye `sub` (ID de usuario) y `role`, además de los claims estándar `iat` y `exp`.
- No hay refresh token ni endpoint de renovación. Ante un `401`, el frontend debe descartar el token y pedir un nuevo login.
- `GET /api/auth/me` sirve para validar el token y recuperar `{ id, email, role }`.
- Aunque el token contiene `role`, la autorización efectiva usa el usuario recuperado de la base de datos durante `authenticate`. Un cambio manual del claim en el token no modifica los permisos.
- Las causas de `401` son indistinguibles por código: header ausente, token inválido, token expirado o usuario eliminado. El mensaje varía entre `Autenticación requerida` y `Token inválido o expirado`.

---

## Configuración para conectar el frontend

### URL base

El backend escucha en `PORT`, con valor por defecto `3000`. No existe una variable de entorno `API_URL` ni configuración de base URL en la API; la elige el cliente.

```ts
const API_BASE_URL = 'http://localhost:3000/api';
```

Ejemplo con `fetch`:

```ts
const response = await fetch(`${API_BASE_URL}/offers`, {
  headers: {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  },
});
```

Las variables que influyen en el comportamiento HTTP observable son `PORT`, `NODE_ENV` y `CORS_ALLOWED_ORIGINS`. `DB_*` y `JWT_SECRET` son internas del backend y no deben exponerse al frontend.

### CORS

CORS está implementado con un middleware propio en `src/middlewares/cors.ts`, montado antes de `express.json()` y de los routers. No se agregó la dependencia `cors`.

- Orígenes permitidos: los definidos en `CORS_ALLOWED_ORIGINS`, separados por coma. Por defecto incluye solo `http://localhost:5173` (origen local de Vite).
- El origen de la solicitud se normaliza con `new URL(...).origin` y se compara por igualdad exacta con la lista configurada. No se usan comodines ni coincidencias por prefijo.
- La validación de entorno rechaza valores con `*`, con ruta (por ejemplo `https://ejemplo.com/app`) o que no sean `http`/`https`. También normaliza la barra final.
- Métodos permitidos: `GET,POST,PATCH,OPTIONS`.
- Headers permitidos: `Content-Type,Authorization`.
- `Access-Control-Max-Age`: `600` segundos.
- Se envía `Vary: Origin` cuando se responden headers CORS.
- **No se habilitan credenciales**: no se emite `Access-Control-Allow-Credentials` ni cookies. El frontend debe enviar el JWT en el header `Authorization`, no en cookies.
- Un origen no configurado recibe la respuesta sin headers CORS. El servidor no lo bloquea por aplicación, pero el navegador sí bloqueará la lectura de la respuesta.
- Las solicitudes `OPTIONS` se responden con `204` y los headers CORS cuando el origen está permitido, sin ejecutar rutas ni consultar la base de datos.

Ejemplo de preflight:

```http
OPTIONS /api/offers HTTP/1.1
Origin: http://localhost:5173
Access-Control-Request-Method: POST
Access-Control-Request-Headers: content-type,authorization
```

Respuesta:

```http
HTTP/1.1 204 No Content
Access-Control-Allow-Origin: http://localhost:5173
Vary: Origin
Access-Control-Allow-Methods: GET,POST,PATCH,OPTIONS
Access-Control-Allow-Headers: Content-Type,Authorization
Access-Control-Max-Age: 600
```

En producción, `CORS_ALLOWED_ORIGINS` debe reemplazarse por los orígenes reales del frontend: la configuración por defecto no habilita cualquier origen de forma indiscriminada.

---

## Ambigüedades y comportamientos a tener en cuenta

1. **CORS configurado por entorno.** Solo responde a los orígenes listados en `CORS_ALLOWED_ORIGINS`. Si el frontend se sirve desde otro origen, debe agregarse a esa variable; ver la sección anterior.
2. **`/api/auth/login` no es estricto.** A diferencia de `register`, creación/edición de ofertas y postulación, ignora campos extra en lugar de rechazarlos.
3. **`companyName` no se devuelve en auth.** Se exige y persiste para `EMPLOYER`, pero `POST /api/auth/register`, `POST /api/auth/login` y `GET /api/auth/me` devuelven solo `id`, `email` y `role`. Tampoco aparece en `/api/me/offers`.
4. **Paginación acotada.** `limit` máximo es `50` y no existe parámetro `sort`. `GET /api/offers` es el único listado paginado; los demás devuelven el conjunto completo.
5. **Mensajes de validación inestables.** `details[].message` proviene de Zod; el contrato estable es `error.code`.
6. **`404` con doble significado.** En rutas de propiedad significa “no existe o no es tuyo”, no necesariamente “ruta inexistente”.
7. **`details` es opcional.** No todos los errores lo incluyen; el frontend debe manejar su ausencia.
8. **No hay health check ni versionado.** No existe, por ejemplo, `/api/health` ni `/api/v1/...`.
9. **Código `CONFLICT` no emitido actualmente.** Está definido en la clase de error, pero los conflictos concretos usan `EMAIL_ALREADY_EXISTS`, `INVALID_STATUS_TRANSITION` o `ALREADY_APPLIED`.
10. **Página fuera de rango.** Devuelve `200` con `offers: []`; `hasPrevious` se calcula solo con `totalPages > 0`, por lo que es `false` cuando no hay resultados aunque `page > 1`.

No se encontraron ambigüedades que impidan documentar los 12 endpoints existentes. Los puntos anteriores son comportamientos reales o limitaciones del backend actual, no decisiones pendientes resueltas en este documento.
