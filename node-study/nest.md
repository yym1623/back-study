# NestJS — Express 위의 구조화된 프레임워크

> **이전:** [node.md](./node.md) → [express.md](./express.md)

NestJS는 **Node + (Express 또는 Fastify) 위**에 올라간 프레임워크입니다.  
라우팅만 도와주는 Express와 달리, **모듈 · Controller · Service · DI(의존성 주입)** 로 프로젝트 구조를 **강하게** 정합니다.

---

## 1. 세 단계 관계 — Node → Express → Nest

```
┌─────────────────────────────────────────────────────────┐
│  NestJS                                                 │
│  Module, Controller, Service, Guard, Pipe, DI         │
├─────────────────────────────────────────────────────────┤
│  Express (또는 Fastify)   ← Nest가 기본 HTTP 어댑터로 사용 │
│  app.get(), middleware, res.json()                      │
├─────────────────────────────────────────────────────────┤
│  Node.js                                                │
│  http.createServer, listen, 이벤트 루프                  │
└─────────────────────────────────────────────────────────┘
```

| 단계 | 비유 | 핵심 |
|------|------|------|
| **Node** | 집 **기초 공사** | `http`, `req`/`res`, 포트 |
| **Express** | **배선·문 배치** | 라우팅, 미들웨어, `res.json` |
| **Nest** | **설계도대로 건물** | 모듈, DI, 레이어 강제 |

Nest를 써도 **최종적으로는 Node 프로세스가 포트를 listen**하고 HTTP로 통신합니다.  
([protocol.md](./protocol.md) — 포트·HTTP는 언어/프레임워크와 무관)

---

## 2. Express 코드 vs Nest 코드

### Express

```js
app.get('/api/users', async (req, res) => {
  const users = await prisma.user.findMany();
  res.json(users);
});
```

### Nest (같은 일을 구조로 분리)

```ts
// users.controller.ts
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll() {
    return this.usersService.findAll();
  }
}

// users.service.ts
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.user.findMany();
  }
}
```

| Express | Nest |
|---------|------|
| `app.get('/api/users', ...)` | `@Get()` + `@Controller('users')` |
| 핸들러 안에 DB 호출 | **Service**에 DB 로직 |
| `require` / 직접 import | **constructor 주입 (DI)** |
| 구조 자유 | **Module** 단위로 묶음 |

---

## 3. 프로젝트 시작

```bash
pnpm add -g @nestjs/cli   # 또는 npx
nest new my-api
cd my-api
pnpm start:dev            # 개발 모드 (watch = nodemon 비슷)
```

기본 생성 구조:

```
src/
├── main.ts           # 앱 부트스트랩, listen(3000)
├── app.module.ts     # 루트 모듈
├── app.controller.ts # 예시 Controller
└── app.service.ts    # 예시 Service
```

### `main.ts` — Node의 `listen`과 같은 역할

```ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
}
bootstrap();
```

```
node index.js          →  NestFactory.create + listen(3000)
createServer + listen  →  (내부적으로 Express + http)
```

---

## 4. 핵심 개념 4가지

### 4-1. Module (`@Module`)

기능 단위 묶음. Express의 `routes/users.js` + 관련 service를 **한 덩어리**로.

```ts
@Module({
  controllers: [UsersController],
  providers: [UsersService],
  imports: [PrismaModule],  // 다른 모듈 가져오기
})
export class UsersModule {}
```

### 4-2. Controller (`@Controller`)

**HTTP 요청 ↔ 응답** — Express의 route handler.

```ts
@Controller('users')        // prefix: /users
export class UsersController {
  @Get()                     // GET /users
  @Get(':id')                // GET /users/:id
  @Post()                    // POST /users
  @Patch(':id')
  @Delete(':id')
}
```

### 4-3. Service (`@Injectable`)

**비즈니스 로직** — DB, 계산, 외부 API. Controller는 얇게 유지.

```ts
@Injectable()
export class UsersService {
  create(dto: CreateUserDto) { ... }
  findAll() { ... }
}
```

### 4-4. DI (Dependency Injection)

Nest가 **인스턴스 생성·연결**을 대신함.

```ts
export class UsersController {
  constructor(private readonly usersService: UsersService) {}
  // Nest가 UsersService를 만들어서 넣어줌
}
```

Express에서는 보통:

```js
const usersService = require('./usersService'); // 직접 require
```

---

## 5. 요청 흐름 (Nest 전체)

```
클라이언트  GET /users
      ↓
main.ts → Nest 앱 (Express/Fastify)
      ↓
Middleware (전역/라우트)
      ↓
Guard (인증/권한) — 선택
      ↓
Pipe (validation, 타입 변환) — 선택
      ↓
UsersController.findAll()
      ↓
UsersService.findAll()
      ↓
PrismaService / TypeORM Repository
      ↓
PostgreSQL
      ↓
JSON 응답 (Nest가 자동 직렬화)
```

Express 대비 **Guard, Pipe, Interceptor** 같은 단계가 **프레임워크에 내장**되어 있음.

---

## 6. DB 연결 — Nest에서

Nest는 DB를 **Module + Service** 패턴으로 붙입니다.

### 6-1. Prisma (흔한 선택)

```bash
pnpm add @prisma/client
pnpm add -D prisma
```

```ts
// prisma.service.ts
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }
}

// users.service.ts
@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.user.findMany();
  }
}
```

### 6-2. TypeORM (Nest 공식 문서에 많음)

```bash
pnpm add @nestjs/typeorm typeorm pg
```

```ts
// app.module.ts
@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      database: 'mydb',
      entities: [User],
    }),
    UsersModule,
  ],
})
export class AppModule {}
```

```ts
// users.service.ts
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepo: Repository<User>,
  ) {}

  findAll() {
    return this.usersRepo.find();
  }
}
```

### DB 연동 비교 (Node → Express → Nest)

| | Node | Express | Nest |
|--|------|---------|------|
| 연결 | `new Pool()` 직접 | `pool` / `prisma` import | `PrismaService` / `TypeOrmModule` |
| 쿼리 위치 | `createServer` 콜백 안 | route handler / service | **Service** (관례) |
| 생명주기 | 직접 connect/end | 직접 | `OnModuleInit`, Module 등록 |
| 테스트 | mock 어려움 | 보통 | DI로 Service mock 용이 |

---

## 7. DTO · Validation

Nest는 `class-validator` + `Pipe`로 요청 body 검증이 표준에 가깝습니다.

```ts
// create-user.dto.ts
export class CreateUserDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;
}

// users.controller.ts
@Post()
create(@Body() dto: CreateUserDto) {
  return this.usersService.create(dto);
}
```

Express에서는 `express.json()` + 직접 if 검증 또는 zod/joi.

---

## 8. 프론트와 연동 (blue-chat 같은 구조)

```
React (localhost:5173)
      ↓  fetch('http://localhost:3000/api/users')
Nest (localhost:3000)
      ↓  UsersController → UsersService → DB
      ↓  JSON 응답
React가 UI 구성
```

- 프론트와 백은 **같은 repo(모노레포)** 일 수 있지만 **런타임은 별개 프로세스**
- 통신은 **HTTP + JSON** (REST 또는 GraphQL)
- Nest는 `@Controller('api/users')`처럼 **API prefix**를 두는 경우가 많음

---

## 9. 개발 · 실행

```json
// package.json
{
  "scripts": {
    "start": "nest start",
    "start:dev": "nest start --watch",
    "start:prod": "node dist/main"
  }
}
```

- `start:dev` → 파일 변경 시 **자동 재컴파일 + 재시작** (nodemon + TypeScript)
- 프로덕션 → `tsc` 빌드 후 `node dist/main.js`

Node/Express와 동일: **코드 변경 = 프로세스 재시작** (dev에선 watch가 대신).

---

## 10. 언제 뭘 쓰나

| 상황 | 추천 |
|------|------|
| Node/http 동작 이해 | **Node** 순수 |
| 작은 API, 빠른 프로토타입 | **Express** |
| 팀 프로젝트, TypeScript, 구조·테스트·확장 | **Nest** |
| 학습 순서 | Node → Express → Nest |

---

## 전체 연결 요약

```
[1] Node — index.js
    http.createServer + listen(3000)
    req.url 분기 → JSON 응답
    pg로 DB 직접

[2] Express
    app.get/post + middleware
    routes/controllers/services (관례)
    Prisma/pg 붙이기

[3] Nest
    Module / Controller / Service / DI
    Guard, Pipe, DTO
    TypeORM or Prisma Module
    listen(3000) ← 여전히 Node 프로세스

[4] 클라이언트
    fetch(REST API) → JSON → UI (React 등)
```

| 개념 | Node | Express | Nest |
|------|------|---------|------|
| 서버 listen | `server.listen` | `app.listen` | `app.listen` in `main.ts` |
| 라우팅 | `if (req.url)` | `app.get()` | `@Get()` `@Controller()` |
| 로직 위치 | 콜백 안 | service (관례) | **Service (강한 관례)** |
| DB | 드라이버 직접 | ORM 직접 연결 | Module + DI |
| 구조 | 최소 | 유연 | **의견이 강한(opinionated)** |

Node에서 배운 **"포트에 listen → URL별 응답 → JSON → DB"** 흐름이 Express·Nest에서도 **같고**, 각 단계에서 **누가 그 일을 대신/정리해 주는지**만 달라집니다.
