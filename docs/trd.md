# TRD — Technical Requirements Document
# Kanban Board

## 1. 기술 스택

| 레이어 | 현재 (v1.1) | 향후 (v2.0) | 비고 |
|--------|------------|------------|------|
| 마크업 | HTML5 | HTML5 | draggable 네이티브 지원 |
| 스타일 | CSS3 (Flexbox) | CSS3 (Flexbox) | — |
| 로직 | Vanilla JS (ES6+) | Vanilla JS (ES6+) | — |
| 사용자 식별 | Guest ID (crypto.randomUUID) | Supabase Auth | 동일한 currentUser 인터페이스 유지 |
| 저장소 | localStorage (사용자별 키) | Supabase DB | Storage 모듈만 교체 |

---

## 2. 파일 구조

```
day03/
├── index.html        — 보드 전체 마크업 (헤더 유저 영역 포함)
├── style.css         — 전역 스타일
├── app.js            — 인터랙션 로직 (드래그앤드롭, 모달, 카드 CRUD)
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

## 3. 사용자 식별 구조

### currentUser 객체

앱 전체에서 단일 `currentUser` 상태로 현재 사용자를 관리한다.
인증 전후 동일한 인터페이스를 유지하여 auth 연동 시 교체 범위를 최소화한다.

```typescript
type User = {
  id: string;           // 게스트: crypto.randomUUID(), 인증 후: Supabase user.id
  name: string;         // 게스트: "Guest", 인증 후: 사용자 이름
  email: string | null; // 게스트: null, 인증 후: 이메일
  isGuest: boolean;     // 게스트 여부 플래그
}
```

### 게스트 ID 발급 흐름

```
DOMContentLoaded
  → localStorage.getItem('kanban_guest_id') 존재?
      예 → 해당 ID를 currentUser.id 로 사용
      아니오 → crypto.randomUUID() 생성 → localStorage.setItem('kanban_guest_id', id)
  → currentUser = { id, name: 'Guest', email: null, isGuest: true }
```

### 향후 Supabase 전환 시

```js
// 현재 (게스트)
currentUser = { id: 'uuid-xxxx', name: 'Guest', email: null, isGuest: true }

// 전환 후 (인증)
const { data: { user } } = await supabase.auth.getUser();
currentUser = { id: user.id, name: user.user_metadata.name, email: user.email, isGuest: false }
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
