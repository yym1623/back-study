# Express — Node 위의 웹 프레임워크

> **이전:** [node.md](./node.md) · **다음:** [nest.md](./nest.md)

Express는 **Node의 `http` 모듈 위**에 올라간 프레임워크입니다.  
내부적으로 `http.createServer`를 쓰지만, 라우팅·미들웨어·요청 파싱을 대신 처리해 줍니다.

---

## 1. Node와 Express의 관계

```
[Node 순수]
http.createServer((req, res) => {
  if (req.url === '/api/users' && req.method === 'GET') { ... }
})

        ↓ Express가 이걸 이렇게 바꿔줌

[Express]
app.get('/api/users', (req, res) => { ... });
```

| | 순수 Node | Express |
|--|-----------|---------|
| 서버 생성 | `http.createServer` 직접 | `express()` → 내부에서 http 사용 |
| 라우팅 | `if (req.url === ...)` | `app.get()`, `app.post()` |
| body 파싱 | `req.on('data')` 직접 | `express.json()` 미들웨어 |
| 포트 열기 | `server.listen(3000)` | `app.listen(3000)` |

**Express = Node HTTP 서버 + 편의 레이어** (별개 언어/런타임이 아님)

---

## 2. 가장 처음 — Hello World

```bash
pnpm add express
```

```js
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send('hello world');
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
```

Node `index.js`와 **동작은 같음**:

```
node index.js / node app.js
      ↓
express() → 내부적으로 http 서버 생성
      ↓
app.listen(3000) → 포트 대기
      ↓
GET / → 핸들러 실행 → 'hello world' 응답
```

---

## 3. 라우팅 — URL + HTTP method

```js
app.get('/api/users', (req, res) => {
  res.json([{ id: 1, name: 'kim' }]);
});

app.get('/api/users/:id', (req, res) => {
  const id = req.params.id; // /api/users/1 → id = '1'
  res.json({ id, name: 'kim' });
});

app.post('/api/users', (req, res) => {
  const user = req.body; // express.json() 필요
  res.status(201).json({ message: 'created', user });
});

app.delete('/api/users/:id', (req, res) => {
  res.status(204).send();
});
```

| Express | Node 순수와 대응 |
|---------|-----------------|
| `app.get('/path', handler)` | `req.method === 'GET' && req.url === '/path'` |
| `req.params.id` | URL에서 직접 파싱 |
| `req.query.page` | `?page=1` 쿼리 파싱 |
| `req.body` | `req.on('data')` + `JSON.parse` |
| `res.json(data)` | `writeHead` + `JSON.stringify` + `end` |

---

## 4. 미들웨어 — 요청 처리 파이프라인

Express의 핵심 개념. **요청 → 미들웨어1 → 미들웨어2 → 라우트 핸들러 → 응답**

```js
const express = require('express');
const app = express();

// 1. JSON body 파싱 (모든 요청에 적용)
app.use(express.json());

// 2. 로깅 미들웨어
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next(); // 다음 미들웨어/핸들러로
});

// 3. 인증 미들웨어 (특정 경로만)
const auth = (req, res, next) => {
  const token = req.headers.authorization;
  if (!token) return res.status(401).json({ error: 'unauthorized' });
  next();
};

app.get('/api/me', auth, (req, res) => {
  res.json({ user: 'kim' });
});
```

```
요청 들어옴
    ↓
express.json()  → body 파싱
    ↓
로깅 middleware
    ↓
auth middleware (해당 라우트만)
    ↓
라우트 핸들러
    ↓
응답
```

Node 순수에서는 이 체인을 **직접** 짜야 합니다. Express는 `app.use()` / `next()`로 표준화.

---

## 5. REST API 구조 — 파일 나누기

작아지면 한 파일, 커지면 보통 이렇게 나눕니다:

```
project/
├── app.js              # express 앱 설정, 미들웨어
├── server.js           # listen(3000)
├── routes/
│   └── users.js        # /api/users 라우트
├── controllers/
│   └── usersController.js  # 요청 처리 로직
└── services/
    └── usersService.js     # 비즈니스 로직
```

```js
// routes/users.js
const router = express.Router();

router.get('/', getUsers);
router.post('/', createUser);

module.exports = router;

// app.js
app.use('/api/users', require('./routes/users'));
```

```
HTTP 요청
    ↓
routes/users.js      (URL 매칭)
    ↓
controllers/         (req/res 처리)
    ↓
services/            (로직)
    ↓
DB
```

Node 단계의 `if (req.url)` 분기가 **파일/함수 단위**로 정리되는 느낌.

---

## 6. DB 연결 — Express에서

Express 자체에 DB 기능은 **없음**. Node와 같이 드라이버/ORM을 **붙여서** 씁니다.

### 6-1. 드라이버 직접 (`pg`)

```js
const { Pool } = require('pg');
const pool = new Pool({ /* connection config */ });

app.get('/api/users', async (req, res) => {
  const result = await pool.query('SELECT * FROM users');
  res.json(result.rows);
});
```

### 6-2. ORM (Prisma 예)

```bash
pnpm add @prisma/client
pnpm add -D prisma
npx prisma init
```

```js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

app.get('/api/users', async (req, res) => {
  const users = await prisma.user.findMany();
  res.json(users);
});
```

### DB까지 흐름

```
클라이언트
    ↓  GET /api/users
Express app
    ↓  app.get → controller/service
Prisma / pg
    ↓  SQL 실행
PostgreSQL
    ↓  rows
res.json(users)
```

| 레이어 | 역할 |
|--------|------|
| Route | URL ↔ handler 연결 |
| Controller | req/res, status code |
| Service | 비즈니스 로직 |
| ORM/Driver | DB 통신 |

> Express는 **"어느 레이어에 뭘 둘지"를 강제하지 않음** → 팀마다 구조가 달라질 수 있음 → Nest로 가는 이유 중 하나

---

## 7. 에러 처리 · 개발 도구

```js
// 404
app.use((req, res) => {
  res.status(404).json({ error: 'not found' });
});

// 에러 핸들러 (4개 인자)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'internal server error' });
});
```

```bash
pnpm add -D nodemon
# "dev": "nodemon server.js"
```

Node와 동일: **코드 수정 → 서버 재시작** 필요.

---

## 8. Express vs Node — 한눈에

| | Node (`http`) | Express |
|--|---------------|---------|
| 시작 코드 | `createServer` + `listen` | `express()` + `app.listen` |
| 라우팅 | 수동 `if/else` | `app.get/post/...` |
| JSON API | `writeHead` + `JSON.stringify` | `res.json()` |
| body | 스트림 직접 읽기 | `express.json()` |
| 구조 | 자유 / 제각각 | 자유 / 제각각 (조금 더 관례) |
| DB | pg, mysql2, Prisma 등 **직접 연결** | 동일 |
| 적합 | 학습, 초소형 서버 | 중소형 API, 빠른 프로토타입 |

---

## 9. Nest로 넘어가는 이유

Express도 커지면:

- 폴더 구조·레이어가 **팀마다 다름**
- DI(의존성 주입), 테스트, 모듈 경계가 **약함**
- TypeScript + 데코레이터 기반 **표준 구조**가 없음

Nest는 Express(또는 Fastify) **위에** MVC + DI + 모듈 시스템을 올린 프레임워크.

```
Node (http)
    ↓
Express (라우팅, 미들웨어)
    ↓
Nest (모듈, Controller, Service, DI, TypeORM/Prisma 통합)
```

**다음:** Nest가 Express/Node 위에서 어떻게 구조화하는지 → [nest.md](./nest.md)
