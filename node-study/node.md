# Node.js — HTTP 서버 기본

> **다음 단계:** [express.md](./express.md) → [nest.md](./nest.md)

Node만으로 백엔드를 만들 때의 출발점. **외부 패키지 없이** 내장 모듈(`http`, `fs`, `path` 등)만으로 시작합니다.

---

## 1. 가장 처음 — `index.js`로 서버 열기

현재 프로젝트의 시작점:

```js
// 순수 Node 문법 연습할 땐 외부 패키지 설치 자체가 필요 없어요.
// Node 자체에 내장된 모듈(http, fs, path 등)만 쓸 거니까요.

const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end('hello world');
});

server.listen(3000, () => {
  console.log('Server is running on port 3000');
});
```

### 실행

```bash
node index.js
# 또는
pnpm dev
```

브라우저에서 `http://localhost:3000` → `hello world` 표시

### 코드가 하는 일 (순서)

```
node index.js 실행
      ↓
http.createServer() → 서버 객체 1개 생성 (요청 처리 함수 등록)
      ↓
server.listen(3000) → 3000번 포트에서 대기 시작
      ↓
브라우저가 GET / 요청
      ↓
(req, res) 콜백 1번 실행 → 응답 body: "hello world"
```

| 코드 | 역할 | 몇 번 실행? |
|------|------|-------------|
| `createServer(...)` | 서버 + 콜백 정의 | **1번** (앱 시작 시) |
| `listen(3000)` | 포트 열기 | **1번** |
| `(req, res) => {}` | 요청 처리 | **요청마다** |

> `createServer`만 하고 `listen` 안 하면 → 서버 객체는 있지만 **밖에서 접속 불가**

---

## 2. `req` / `res` — 요청과 응답

서버의 핵심은 **요청마다 다르게 응답**하는 것.

| 객체 | 자주 쓰는 것 | 의미 |
|------|-------------|------|
| `req` | `req.url` | 요청 경로 (`/`, `/users`) |
| `req` | `req.method` | `GET`, `POST`, `PUT`, `DELETE` |
| `req` | `req.headers` | 요청 헤더 |
| `res` | `res.writeHead(status, headers)` | 상태코드 + 헤더 |
| `res` | `res.end(data)` | 응답 본문 보내고 종료 |

### URL별 분기 (라우팅의 시작)

```js
const server = http.createServer((req, res) => {
  if (req.url === '/') {
    res.end('home');
  } else if (req.url === '/about') {
    res.end('about page');
  } else {
    res.writeHead(404);
    res.end('not found');
  }
});
```

- 서버는 **하나**
- URL마다 다른 응답 → **REST API의 기본 개념**

---

## 3. REST API — JSON으로 데이터 주기

실무에서는 보통 HTML 대신 **JSON**을 보냅니다.

```js
const server = http.createServer((req, res) => {
  if (req.url === '/api/users' && req.method === 'GET') {
    const users = [{ id: 1, name: 'kim' }];

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(users));
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'not found' }));
  }
});
```

```
클라이언트 (React, 앱 등)
      ↓  GET http://localhost:3000/api/users
Node 서버
      ↓  200 + [{ "id": 1, "name": "kim" }]
클라이언트가 JSON 받아서 UI 구성
```

| 방식 | 서버가 보내는 것 | UI는 누가? |
|------|-----------------|-----------|
| 지금 (텍스트/HTML) | `hello world` 또는 HTML | 브라우저가 그대로 표시 |
| REST API | JSON 데이터 | **프론트(React 등)** 가 구성 |
| SSR | HTML 전체 | **서버**가 HTML 구성 |

---

## 4. POST — body 읽기

GET은 URL에 데이터, POST는 **body**에 데이터.

`req`는 **스트림**이라 이벤트로 읽습니다:

```js
const server = http.createServer((req, res) => {
  if (req.url === '/api/users' && req.method === 'POST') {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk;
    });

    req.on('end', () => {
      const user = JSON.parse(body); // { "name": "lee" }
      // 여기서 DB 저장 등 처리
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'created', user }));
    });
  }
});
```

---

## 5. 내장 모듈 — `fs`, `path`

HTTP 서버만이 Node 전부는 아닙니다.

| 모듈 | 용도 |
|------|------|
| `http` / `https` | HTTP 서버 |
| `fs` | 파일 읽기/쓰기 |
| `path` | 경로 조합 (`path.join`) |
| `url` | URL 파싱, 쿼리스트링 |

정적 파일(HTML/CSS) 서빙 예:

```js
const fs = require('fs');
const path = require('path');

// req.url === '/index.html' 일 때
const filePath = path.join(__dirname, 'public', 'index.html');
fs.readFile(filePath, (err, data) => {
  if (err) {
    res.writeHead(404);
    res.end('not found');
    return;
  }
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(data);
});
```

---

## 6. DB 연결 — Node에서 직접

Node는 DB 드라이버 패키지로 **직접** DB에 붙을 수 있습니다.

```
클라이언트 → HTTP 요청 → Node 서버 → DB 드라이버 → PostgreSQL/MySQL
                              ↑
                         (pg, mysql2 등)
```

### 예: PostgreSQL (`pg` 패키지)

```bash
pnpm add pg
```

```js
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'password',
  database: 'mydb',
});

const server = http.createServer(async (req, res) => {
  if (req.url === '/api/users' && req.method === 'GET') {
    const result = await pool.query('SELECT * FROM users');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result.rows));
  }
});
```

### Node + DB 흐름

```
1. 서버 시작 → DB connection pool 생성 (1번)
2. GET /api/users 요청
3. pool.query('SELECT ...') 실행
4. 결과 rows → JSON.stringify → res.end()
5. 클라이언트에 JSON 응답
```

> Node 단계에서는 **SQL, 연결, 에러 처리, 라우팅을 전부 직접** 작성합니다.

---

## 7. 개발 시 재시작 — nodemon / `--watch`

서버 코드를 고치면 **재실행**해야 반영됩니다.

```bash
# Node 18+ 내장
node --watch index.js

# 또는 nodemon
pnpm add -D nodemon
# package.json → "dev": "nodemon index.js"
```

- **파일 저장** → 자동 재시작 (nodemon / `--watch`)
- **브라우저 새로고침** → 서버 재시작 아님, 요청만 다시 보냄

---

## 8. Node의 한계 (왜 Express/Nest로 가는지)

순수 Node로 크게 가면:

- URL/method 분기가 `if/else` 지옥
- POST body, 쿠키, 파일 업로드 직접 처리
- 미들웨어(인증, 로깅) 직접 체인 구성
- DB 로직이 라우트 핸들러에 섞임

→ **Express**가 라우팅·미들웨어를 정리해 주고, **Nest**가 구조·DI·모듈화를 정리해 줍니다.

---

## 전체 흐름 요약

```
[index.js]
  require('http')
  createServer → listen(3000)
      ↓
  요청마다 (req, res) 콜백
      ↓
  req.url / req.method 분기
      ↓
  JSON 응답 (REST API)  또는  HTML/파일 (SSR/정적)
      ↓
  (선택) pg/mysql2로 DB query
      ↓
  res.end(JSON.stringify(...))
```

| 개념 | Node에서 |
|------|----------|
| 서버 시작 | `createServer` + `listen` |
| 라우팅 | `if (req.url === ...)` |
| API 응답 | `res.end(JSON.stringify(...))` |
| DB | `pg`, `mysql2` 등 직접 사용 |
| 구조 | 파일 1~2개에 다 때려 넣기 쉬움 |

**다음:** 반복되는 패턴을 Express가 어떻게 줄여 주는지 → [express.md](./express.md)
