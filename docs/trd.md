# TRD — Technical Requirements Document
# Kanban Board

## 1. 기술 스택

| 레이어 | 현재 (v2.0) | 향후 (v3.0) | 비고 |
|--------|------------|------------|------|
| 마크업 | HTML5 | HTML5 | draggable 네이티브 지원 |
| 스타일 | CSS3 (Flexbox) | CSS3 (Flexbox) | — |
| 로직 | Vanilla JS (ES6+) | Vanilla JS (ES6+) | — |
| 인증 | Supabase Auth (OAuth + 이메일) | Supabase Auth | `auth.js` 모듈로 분리 |
| 보드 저장소 | localStorage (사용자별 키) | Supabase DB | Storage 모듈만 교체 예정 |
| 배포 | GitHub Pages (Actions 자동 배포) | GitHub Pages | push → 자동 배포 |
| CDN | @supabase/supabase-js@2 | — | UMD 빌드, 전역 `supabase` 객체 |

---

## 2. 파일 구조

```
day03/
├── index.html        — 랜딩 페이지 (Google/GitHub/이메일 로그인)
├── landing.css       — 랜딩 페이지 전용 스타일
├── board.html        — 칸반 보드 (인증 후 접근, auth guard 포함)
├── style.css         — 보드 스타일
├── auth.js           — Supabase 인증 모듈 (OAuth, 이메일, 세션 관리)
├── app.js            — 보드 인터랙션 로직 (드래그앤드롭, 모달, 카드 CRUD)
├── storage.js        — 스토리지 추상화 모듈 (localStorage ↔ Supabase 교체 지점)
├── plan.md           — 구현 계획
└── docs/
    ├── prd.md
    ├── trd.md
    ├── user-flow.md
    ├── database-design.md
    ├── design-system.md
    ├── tasks.md
    └── coding-convention.md
```

---

## 3. 인증 구조

### auth.js 모듈

Supabase 클라이언트를 초기화하고 인증 관련 함수를 전역으로 노출한다.
`board.html`과 `index.html` 모두 이 모듈을 로드한다.

```js
// 초기화
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const BASE_URL = new URL('./', window.location.href).href;  // 로컬/GitHub Pages 모두 대응

// 노출 함수
getAuthUser()           // 현재 세션의 사용자 반환 (없으면 null)
signInWithGoogle()      // Google OAuth 로그인
signInWithGitHub()      // GitHub OAuth 로그인
signUpWithEmail(email, password)   // 이메일 회원가입 (emailRedirectTo: board.html)
signInWithEmail(email, password)   // 이메일 로그인
signOut()               // 로그아웃
onAuthStateChange(cb)   // 세션 변경 콜백
```

### currentUser 객체

`app.js`에서 `getAuthUser()`로 받아 전역 상태로 관리한다.

```typescript
type User = {
  id: string;           // Supabase user.id (UUID)
  name: string;         // full_name → user_name → email 앞부분 순서로 fallback
  email: string;
  avatar: string | null; // avatar_url (소셜 로그인 시 제공)
  isGuest: boolean;     // 항상 false (v2.0에서 게스트 모드 제거)
}
```

### board.html 인증 가드

```js
// app.js init() 진입점
async function init() {
  const user = await getAuthUser();
  if (!user) {
    window.location.href = 'index.html';  // 미인증 → 랜딩으로
    return;
  }
  currentUser = user;
  renderUserInfo();
  // ... 보드 로드
}
```

### index.html 자동 리다이렉트

```js
// 이미 로그인된 경우 보드로 바로 이동
const user = await getAuthUser();
if (user) { window.location.href = 'board.html'; return; }
```

### OAuth Redirect URL

```
redirectTo: BASE_URL + 'board.html'
// 로컬: http://127.0.0.1:5500/board.html
// 배포: https://ttthhh5.github.io/kanban/board.html
```

---

## 4. 스토리지 추상화 레이어 (`storage.js`)

localStorage와 Supabase DB를 동일한 인터페이스로 감싼다.
`app.js`는 `Storage` 객체만 호출하고, 내부 구현(localStorage vs Supabase)을 알지 않는다.

```js
// storage.js — 현재 구현 (localStorage)
const Storage = {
  async load(userId) {
    const raw = localStorage.getItem(`kanban_board_${userId}`);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  },

  async save(userId, data) {
    localStorage.setItem(`kanban_board_${userId}`, JSON.stringify(data));
  },
};

export default Storage;
```

```js
// storage.js — 향후 구현 (Supabase) — 인터페이스 동일
const Storage = {
  async load(userId) {
    const { data } = await supabase
      .from('boards')
      .select('columns')
      .eq('user_id', userId)
      .single();
    return data?.columns ?? null;
  },

  async save(userId, data) {
    await supabase
      .from('boards')
      .upsert({ user_id: userId, columns: data.columns });
  },
};
```

`app.js`에서의 호출은 버전과 무관하게 동일하다:
```js
const board = await Storage.load(currentUser.id);
await Storage.save(currentUser.id, boardData);
```

---

## 5. HTML 구조 요구사항

- `<header>` — 좌측 제목, 우측 `.user-area` (유저 아바타/이름 영역 예약)
- `<main class="board">` — 보드 루트, Flexbox 컨테이너
- `<section class="column" id="{status}" data-status="{status}">` — 컬럼 단위
- `<div class="card-list" id="{status}-list">` — 드롭 대상 영역, `min-height: 48px` 보장
- `<div class="card" draggable="true" data-id="{id}" data-user-id="{userId}">` — 개별 카드
- `<div class="modal-overlay" id="modal-overlay">` — 카드 추가 모달, `position: fixed`

---

## 6. Drag & Drop 구현 명세

### 이벤트 위임 구조
모든 drag 이벤트는 `.board`에 단일 리스너로 위임한다. 개별 카드에 리스너를 붙이지 않는다.

### 이벤트 흐름

```
dragstart (board)
  → draggedCard = e.target.closest('.card')
  → placeholder = createPlaceholder()
  → setTimeout(() => card.classList.add('dragging'), 0)

dragover (board)  [preventDefault 필수]
  → list = e.target.closest('.card-list')
  → afterCard = getDragAfterElement(list, e.clientY)
  → placeholder를 afterCard 앞에 삽입 (null이면 append)

drop (board)
  → placeholder.parentNode.insertBefore(draggedCard, placeholder)
  → removePlaceholder()
  → updateCounts()
  → Storage.save(currentUser.id, getBoardData())

dragend (board)
  → draggedCard.classList.remove('dragging')
  → removePlaceholder()
  → draggedCard = null
  → updateCounts()
```

### 삽입 위치 알고리즘 (`getDragAfterElement`)

```
입력: card-list 요소, 마우스 Y 좌표
처리: 드래그 중이 아닌 카드들의 중앙 Y와 마우스 Y를 비교
      마우스 위치 바로 아래에 있는 카드를 반환
출력: Element | undefined
      undefined → 리스트 맨 끝에 삽입
```

---

## 7. 모달 명세

| 동작 | 트리거 | 결과 |
|------|--------|------|
| 열기 | `.add-card-btn` click | `modal-overlay.classList.add('active')`, `cardInput.focus()` |
| 확인 | `#modal-confirm` click 또는 Enter (Shift 제외) | `confirmAdd()` → 카드 생성 → `Storage.save()` → 모달 닫기 |
| 취소 | `#modal-cancel` click / Esc / 오버레이 click | `closeModal()` |
| 빈값 방지 | `confirmAdd()` 내 `trim()` 검사 | 빈 문자열이면 아무것도 하지 않음 |

---

## 8. 카드 DOM 생성 규격

`createCard(text, userId)` 함수가 반환하는 DOM 구조:

```html
<div class="card"
     draggable="true"
     data-id="{uuid}"
     data-user-id="{userId}"
     data-created-at="{ISO8601}">
  <p>{text}</p>
  <button class="delete-btn" aria-label="카드 삭제">✕</button>
</div>
```

---

## 9. 성능 고려사항

- 이벤트 위임으로 카드 수와 무관하게 리스너 수를 고정한다.
- `dragover` 내 DOM 조작은 `placeholder` 이동만으로 최소화한다.
- `getBoundingClientRect()`는 `dragover`마다 호출되므로, 대용량 보드에서는 throttle 적용을 고려한다.
- `Storage.save()`는 async이므로 drop 완료 후 비동기로 호출한다. UI 블로킹 없음.
