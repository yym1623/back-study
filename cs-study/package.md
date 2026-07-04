# npm/pnpm이 정확히 뭐냐

**패키지 매니저**예요. 하는 일은 딱 두 가지:

1. 외부 라이브러리(패키지) 다운로드 & 설치 (`node_modules` 폴더에 넣음)
2. `package.json`이라는 설정 파일을 관리 (의존성 목록, 스크립트 등 기록)

즉 npm/pnpm은 "코드 실행 방식을 바꾸는 도구"가 아니라 **"패키지 설치/관리 도구"**예요.

---

## import/require를 결정하는 건 npm/pnpm이 아니라 `package.json`의 `type` 필드

이게 핵심이에요. Node가 `.js` 파일을 실행할 때, 그 파일 근처에 있는 `package.json`을 찾아서 `"type"` 필드를 확인해요.

```json
// package.json
{
  "type": "module"   // 이게 있으면 → import/export (ESM) 가능
}
```

```json
// package.json
{
  // type 필드 아예 없음 (또는 "type": "commonjs")
}
```

→ 이러면 기본값은 **CommonJS** (`require` / `module.exports`)

> **중요:** 이 `package.json`은 npm이나 pnpm이 없어도 직접 손으로 만들 수 있어요.

```bash
mkdir test && cd test
echo '{"type": "module"}' > package.json   # npm/pnpm 없이 직접 파일 작성
echo 'export const a = 1;' > math.js
```

이렇게만 해도 `import`가 됩니다. npm이나 pnpm을 설치하거나 실행한 적이 없어도요.

---

## `pnpm init`이 하는 일

`pnpm init`은 그냥 비어있는 `package.json` 템플릿을 자동으로 만들어주는 명령어일 뿐이에요.

```bash
pnpm init
```

```json
{
  "name": "test",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {},
  "type": "commonjs"   // 명시적으로 넣어주는 버전도 있고, 아예 생략되기도 함
}
```

이게 다예요. `pnpm init` 자체가 마법을 부리는 게 아니라, 그 결과로 생기는 `package.json` 안에 `type` 필드가 있는지 없는지가 Node의 동작을 결정하는 거예요.

---

## 동작 원리 (순서)

```
1. node index.js 실행
      ↓
2. Node가 index.js를 파싱하기 전에,
   같은 폴더(또는 상위로 올라가며) package.json을 찾음
      ↓
3. package.json 있음?
   ├── 없음 → 기본값 CommonJS로 파싱 (require/module.exports)
   └── 있음 → "type" 필드 확인
        ├── "type": "module" → ESM으로 파싱 (import/export만 가능, require 기본 불가)
        ├── "type": "commonjs" 또는 필드 없음 → CommonJS로 파싱
```

---

## 정리하면

| 오해 | 정확한 사실 |
|------|-------------|
| npm/pnpm을 써야 import가 가능해진다 | ❌ npm/pnpm은 그냥 패키지 관리 도구, import 여부와 무관 |
| package.json 만드는 게 npm/pnpm의 고유 기능이다 | ❌ package.json은 그냥 JSON 파일, 메모장으로 손수 써도 됨 |
| package.json 안의 `"type"` 필드가 import/require를 결정한다 | ✅ 정확히 이거임 |
| pnpm init은 이 파일을 자동으로 만들어주는 "편의 명령어"일 뿐 | ✅ 맞음 |

즉 npm/pnpm은 **"package.json을 편하게 만들고 패키지를 설치해주는 도구"**이지, **"import를 가능하게 하는 스위치"**가 아니에요. 스위치 역할은 오직 `package.json` 안의 `"type"` 필드 값 하나예요.

이 파일만 있으면(그리고 그 안에 `"type": "module"`만 써있으면) npm이든 pnpm이든 yarn이든 아무것도 안 깔아도 `import` 쓸 수 있어요.
