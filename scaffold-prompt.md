# Backend Scaffold Master Prompt

Paste the prompt below into any AI coding session to generate a clean, production-ready Express backend scaffold with no business logic.

---

```
You are an expert Node.js/TypeScript backend engineer.

Generate a clean, production-ready Express backend scaffold with NO business logic.
Every service body and controller handler should contain only TODO comments.
Use "// SCAFFOLD: implement" to mark all placeholders so they can be found with grep.

## Tech Stack
- Runtime: Node.js 20+
- Framework: Express 5.x
- Language: TypeScript 6.x (strict mode)
- DB Client: Knex 3.x + pg 8.x (PostgreSQL only, NO ORM)
- Validation: Zod 4.x (all env vars + request bodies)
- Auth: jsonwebtoken 9.x (access token) + bcryptjs 3.x (passwords/OTPs)
- File Uploads: multer 2.x
- Security: helmet 8.x, cors, cookie-parser, express-rate-limit 8.x
- Notifications: nodemailer (email), twilio (WhatsApp) — lazy singletons
- AI (optional): openai SDK — lazy singleton, skips if API key missing
- Utilities: dotenv, uuid, geoip-lite
- Dev: nodemon, ts-node, all @types/* packages

## Folder Structure

src/
├── server.ts
├── app.ts
├── types/
│   └── express.d.ts
├── config/
│   ├── db.ts
│   ├── env.ts
│   └── multer.ts
├── middleware/
│   ├── authenticate.ts
│   ├── authorize.ts
│   ├── errorHandler.ts
│   └── rateLimiter.ts
├── services/
│   ├── token.service.ts
│   ├── otp.service.ts
│   ├── audit.service.ts
│   ├── email.service.ts
│   ├── openai.service.ts
│   └── whatsapp.service.ts
└── modules/
    ├── auth/
    │   ├── auth.router.ts
    │   ├── auth.controller.ts
    │   └── auth.service.ts
    └── items/               ← example CRUD module, rename for your domain
        ├── items.router.ts
        ├── items.controller.ts
        ├── items.service.ts
        └── items.dto.ts

Root files: package.json, tsconfig.json, knexfile.ts, .env.example, .gitignore
migrations/20240001_create_example_table.ts  ← empty template
seeds/01_example.ts                          ← empty template

---

## File-by-File Specifications

### package.json
- All packages listed above as dependencies
- Scripts:
  - "dev": nodemon watching src/**/*.ts, runs ts-node -r dotenv/config src/server.ts
  - "build": tsc
  - "start": node dist/src/server.js
  - "migrate": knex --knexfile knexfile.ts migrate:latest
  - "migrate:rollback": knex --knexfile knexfile.ts migrate:rollback
  - "seed": knex --knexfile knexfile.ts seed:run

### tsconfig.json
- target: ES2020, module: commonjs
- strict: true, esModuleInterop: true, resolveJsonModule: true
- outDir: ./dist, rootDir: ./
- declaration, declarationMap, sourceMap: all true
- typeRoots: ["./src/types", "./node_modules/@types"]
- ts-node: { transpileOnly: false }

### .env.example
Required vars (no defaults — must be set by developer):
  PORT=3000
  NODE_ENV=development
  DB_HOST=localhost
  DB_PORT=5432
  DB_NAME=mydb
  DB_USER=postgres
  DB_PASSWORD=
  JWT_SECRET=                     # min 32 chars
  JWT_ACCESS_EXPIRES_IN=2h
  JWT_REFRESH_EXPIRES_IN=7d
  JWT_REFRESH_SECRET=             # min 32 chars
  OTP_TOKEN_SECRET=               # min 32 chars
  OTP_TOKEN_EXPIRES_IN=10m
  OTP_EXPIRES_MINUTES=5
  OTP_MAX_ATTEMPTS=5
  CORS_ORIGIN=http://localhost:4200
  APP_URL=http://localhost:3000
  FRONTEND_URL=http://localhost:4200
  UPLOADS_PATH=uploads
Optional (omit to disable feature):
  SMTP_HOST=, SMTP_PORT=, SMTP_SECURE=, SMTP_USER=, SMTP_PASS=, EMAIL_FROM=
  ADMIN_EMAIL=
  TWILIO_ACCOUNT_SID=, TWILIO_AUTH_TOKEN=, TWILIO_WHATSAPP_FROM=
  OPENAI_API_KEY=, OPENAI_MODEL=gpt-4o-mini

### src/config/env.ts
- Parse all env vars above using Zod .object({}).parse(process.env)
- Strings that are "optional" use .optional() or .default()
- JWT secrets must use .min(32)
- Call process.exit(1) with a clear message if parsing fails
- Export a single typed `env` object used everywhere else

### src/config/db.ts
- Export a Knex singleton configured from env
- Pool: min 2, max 10
- CRITICAL: Override pg DATE type parser to return raw string:
  import pg from 'pg'
  pg.types.setTypeParser(1082, (val: string) => val)
  (This prevents PostgreSQL DATE columns being hydrated as JS Date objects,
   which breaks <input type="date"> binding)

### src/config/multer.ts
- Resolve uploads base path from env.UPLOADS_PATH (use path.resolve)
- Create sub-folders at startup: profiles, resumes, certificates, videos
- diskStorage: filename = uuid() + original extension
- Per-type allowed MIME types:
  - profiles: image/jpeg, image/png, image/webp — max 5 MB
  - resumes: application/pdf, .doc, .docx MIME types — max 10 MB
  - certificates: PDF + JPEG + PNG — max 10 MB
  - videos: video/mp4, video/webm, video/quicktime — max 200 MB
- Export named multer instances: uploadProfile, uploadResume, uploadCertificate, uploadVideo

### src/types/express.d.ts
Augment Express Request with:
  user?: {
    sub: number
    role: string
    recruiterId?: number
    jti?: string
    accessExpiresAt?: string
  }

### src/middleware/errorHandler.ts
- Export class AppError extends Error with:
  constructor(public statusCode: number, message: string, public code?: string)
- Export global Express error handler that:
  1. Sets X-Request-ID header (uuid v4) on every error response
  2. ZodError → 400 with flatten().fieldErrors
  3. AppError → statusCode + message + optional code field
  4. MulterError → 400 with error.message
  5. Unknown → 500 ("Internal server error", stack only in development)

### src/middleware/authenticate.ts
- Read Authorization: Bearer <token>
- jwt.verify with env.JWT_SECRET
- If expired → 401 with code: 'TOKEN_EXPIRED' (so frontend can auto-refresh)
- Add decoded payload to req.user
- For recruiter tokens: if payload.accessExpiresAt is in the past → 403 immediately

### src/middleware/authorize.ts
- Export factory function: authorize(...roles: string[]) => RequestHandler
- Check req.user.role is in roles array
- Return 403 "Insufficient permissions" if not

### src/middleware/rateLimiter.ts
- authLimiter: 10 req per 60s, standardHeaders: true, legacyHeaders: false
- apiLimiter: 200 req per 60s, same options

### src/app.ts
Apply middleware in this exact order:
1. helmet({ crossOriginResourcePolicy: 'cross-origin' })
2. app.set('trust proxy', 1)
3. cors({ origin: env.CORS_ORIGIN, credentials: true, methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'] })
4. express.json({ limit: '1mb' })
5. express.urlencoded({ extended: true, limit: '1mb' })
6. cookieParser()
7. apiLimiter on /api routes
8. express.static for uploads (30d maxAge, no index, dotfiles: 'deny')
9. GET /health → { status: 'ok', timestamp: new Date().toISOString() }
10. Global request logger: console.log('[REQUEST]', method, url)
11. Mount auth router at /api/v1/auth
12. Mount items router at /api/v1/items
13. errorHandler (must be last)
Export the app (do not call listen here)

### src/server.ts
- Import app
- DB ping: db.raw('SELECT 1') — log success or exit(1) on failure
- Create sub-folders for uploads (profiles/resumes/certificates/videos)
- app.listen(env.PORT)
- Log startup: "Server running on port X in Y mode"

### src/services/token.service.ts
Export these functions (signatures only, bodies are // SCAFFOLD: implement):
  generateAccessToken(payload: { sub: number; role: string; [key: string]: unknown }): string
  verifyAccessToken(token: string): JwtPayload
  generateRefreshToken(userId: number): Promise<string>  // stores SHA-256 hash in DB
  rotateRefreshToken(rawToken: string): Promise<string>   // revoke old, issue new
  revokeRefreshToken(rawToken: string): Promise<void>

### src/services/otp.service.ts
Export these functions (signatures only):
  generateOtp(userId: number): Promise<{ otp: string; otpToken: string }>
    // otp: 6-digit from crypto.randomInt, bcrypt-hashed in DB
    // otpToken: short-lived JWT signed with OTP_TOKEN_SECRET
  verifyOtp(otpToken: string, code: string): Promise<{ userId: number }>
    // throws AppError on expired/invalid/max-attempts-exceeded
  invalidateOtps(userId: number): Promise<void>

### src/services/audit.service.ts
Export:
  logAudit(params: {
    userId?: number
    action: string
    resource: string
    resourceId?: number | string
    metadata?: Record<string, unknown>
    ipAddress?: string
  }): void   // fire-and-forget: wraps DB insert in try/catch, never throws

### src/services/email.service.ts
- Lazy nodemailer transporter singleton
- If SMTP env vars missing → create Ethereal test account, log preview URL
- Export:
    getTransporter(): Promise<Transporter>
    sendEmail(params: { to: string; subject: string; html: string }): Promise<void>
  // Add your own named send functions below this line
  // Example: sendWelcomeEmail(to: string, name: string): Promise<void>

### src/services/openai.service.ts
- Lazy OpenAI singleton (skip entirely if OPENAI_API_KEY not set)
- Export:
    chatComplete(systemPrompt: string, userContent: string): Promise<string>
    // temperature: 0.2, model: env.OPENAI_MODEL

### src/services/whatsapp.service.ts
- Lazy Twilio singleton (skip if Twilio env vars missing)
- Export:
    sendWhatsAppMessage(to: string, body: string): Promise<void>

### modules/auth/ (skeleton)
auth.router.ts:
  Apply authLimiter to all auth routes
  POST /login        → authController.login
  POST /verify-otp   → authController.verifyOtp
  POST /resend-otp   → authController.resendOtp
  POST /refresh      → authController.refresh
  POST /logout       → authenticate, authController.logout
  GET  /me           → authenticate, authController.me

auth.controller.ts:
  Each handler: parse body with Zod DTO, call service, return response
  All bodies: // SCAFFOLD: implement

auth.service.ts:
  All function bodies: // SCAFFOLD: implement
  Signatures to include:
    login(body: LoginDto): Promise<LoginResult>
    verifyOtp(body: VerifyOtpDto): Promise<TokenResult>
    resendOtp(body: ResendOtpDto): Promise<void>
    refresh(rawRefreshToken: string): Promise<{ accessToken: string }>
    logout(rawRefreshToken: string): Promise<void>
    getMe(userId: number): Promise<UserRecord>

### modules/items/ (example CRUD module — rename for your domain)
items.dto.ts:
  CreateItemDto = z.object({ name: z.string().min(1), description: z.string().optional() })
  UpdateItemDto = CreateItemDto.partial()
  ListItemsQueryDto = z.object({ page: z.coerce.number().default(1), limit: z.coerce.number().default(20) })

items.router.ts:
  GET    /           → authenticate, itemsController.list
  GET    /:id        → authenticate, itemsController.getById
  POST   /           → authenticate, authorize('admin'), itemsController.create
  PUT    /:id        → authenticate, authorize('admin'), itemsController.update
  DELETE /:id        → authenticate, authorize('admin'), itemsController.delete

items.controller.ts:
  Each handler validates input with DTO, calls service, responds
  All bodies: // SCAFFOLD: implement

items.service.ts:
  list(query: ListItemsQueryDto): Promise<{ data: Item[]; total: number }>
  getById(id: number): Promise<Item>
  create(body: CreateItemDto): Promise<Item>
  update(id: number, body: UpdateItemDto): Promise<Item>
  delete(id: number): Promise<void>
  All bodies: // SCAFFOLD: implement

### knexfile.ts
  development: { client: 'pg', connection: { host, port, database, user, password from env }, migrations: { directory: './migrations', extension: 'ts' }, seeds: { directory: './seeds', extension: 'ts' } }
  production: same but ssl: { rejectUnauthorized: false }

### migrations/20240001_create_example_table.ts
  exports.up = (knex) => knex.schema.createTable('items', table => {
    table.increments('id').primary()
    table.string('name').notNullable()
    table.text('description')
    table.timestamps(true, true)  // created_at, updated_at
  })
  exports.down = (knex) => knex.schema.dropTableIfExists('items')

### seeds/01_example.ts
  exports.seed = async (knex) => {
    await knex('items').del()
    // SCAFFOLD: insert your seed data here
  }

### .gitignore
  node_modules/, dist/, .env, uploads/profiles/*, uploads/resumes/*, uploads/certificates/*, uploads/videos/*
  Keep uploads/*/.gitkeep

---

## Rules
- Every file must compile under TypeScript strict mode with zero errors
- No business logic anywhere — only structure, types, and wiring
- Use // SCAFFOLD: implement on every empty function body
- Services use lazy singleton pattern (instance created on first call, not at module load)
- Audit logging is always fire-and-forget — never await it, never let it throw
- Refresh tokens: SHA-256 hash stored in DB, raw value sent in HttpOnly cookie
- Never call app.listen in app.ts — only in server.ts
- All Zod validation happens in controllers (parse request) or config/env.ts (parse process.env)
- Services receive already-validated plain objects, not raw req.body
```
