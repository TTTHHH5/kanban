# User Flow — 사용자 흐름도
# Kanban Board

## 1. 전체 여정 개요

사용자의 주요 여정은 다섯 가지입니다.

1. **인증** — 랜딩 페이지에서 Google/GitHub OAuth 또는 이메일/비밀번호로 로그인·회원가입
2. **초기 진입** — 인증 후 보드 진입 및 데이터 복원
3. **카드 이동** — 드래그앤드롭으로 컬럼 간 상태 변경
4. **카드 추가** — 모달을 통해 새 카드 생성
5. **카드 삭제** — hover 후 삭제 버튼으로 카드 제거

---

## 2. 전체 흐름도

```mermaid
flowchart TD
    A([브라우저 접속]) --> B{이미 로그인됨?}
    B -- 예 --> G
    B -- 아니오 --> C[index.html 랜딩 페이지]
    C --> D{로그인 방법 선택}
    D -- Google/GitHub --> E[OAuth 리다이렉트]
    D -- 이메일/비밀번호 --> F[로그인 or 회원가입]
    E --> G[board.html 진입]
    F --> F1{이메일 인증 필요?}
    F1 -- 예 --> F2[인증 메일 확인]
    F2 --> G
    F1 -- 아니오 --> G
    G[인증 확인\ngetAuthUser] --> H[사용자 데이터 로드\nStorage.load userId]
    H --> I{저장 데이터 있음?}
    I -- 예 --> J[저장된 카드 복원]
    I -- 아니오 --> K[기본 카드 표시]
    J --> L[보드 렌더링 완료]
    K --> L
    L --> M{어떤 작업?}

    M --> I[카드 드래그]
    M --> J[카드 추가]
    M --> K[카드 삭제]
    M --> N[로그아웃]
    N --> N1[signOut\n세션 초기화] --> C

    I --> I1[드래그 시작\n반투명 + 회전]
    I1 --> I2[대상 컬럼 이동\n하이라이트]
    I2 --> I3[placeholder 표시]
    I3 --> I4{드롭}
    I4 -- 원하는 위치 --> I5[카드 이동\n카운트 갱신\nStorage.save]
    I4 -- 취소 --> M
    I5 --> M

    J --> J1[+ 카드 추가 클릭]
    J1 --> J2[모달 열림]
    J2 --> J3{텍스트 입력}
    J3 -- 확인/Enter --> J4{빈값?}
    J4 -- 아니오 --> J5[카드 추가\nStorage.save\n모달 닫힘]
    J4 -- 예 --> J3
    J3 -- Esc/오버레이 --> J6[모달 닫힘]
    J5 --> M
    J6 --> M

    K --> K1[카드 hover\n✕ 표시]
    K1 --> K2{✕ 클릭?}
    K2 -- 예 --> K3[카드 삭제\nStorage.save]
    K2 -- 아니오 --> M
    K3 --> M
```

---

## 3. 인증 흐름 상세

```mermaid
flowchart TD
    subgraph 랜딩페이지 index.html
        A([페이지 로드]) --> B[getAuthUser 호출]
        B --> C{세션 있음?}
        C -- 예 --> D[board.html 리다이렉트]
        C -- 아니오 --> E[로그인 UI 표시]
        E --> F{로그인 방법}
        F -- Google --> G[signInWithGoogle\nOAuth 리다이렉트]
        F -- GitHub --> H[signInWithGitHub\nOAuth 리다이렉트]
        F -- 이메일 로그인 --> I[signInWithEmail\n성공 → board.html]
        F -- 이메일 회원가입 --> J[signUpWithEmail\nemailRedirectTo: board.html]
        J --> K{이메일 인증 필요?}
        K -- 예 --> L[인증 메일 발송\n사용자에게 안내]
        K -- 아니오 --> D
    end

    subgraph 보드페이지 board.html
        M([페이지 로드]) --> N[getAuthUser 호출]
        N --> O{세션 있음?}
        O -- 아니오 --> P[index.html 리다이렉트]
        O -- 예 --> Q[currentUser 설정\nrenderUserInfo]
        Q --> R[Storage.load currentUser.id]
        R --> S{데이터 있음?}
        S -- 예 --> T[보드 복원]
        S -- 아니오 --> U[기본 카드 표시]
        T --> V[보드 준비 완료]
        U --> V
    end
```

## 4. 이메일 회원가입 상세 흐름

```mermaid
sequenceDiagram
    actor U as 사용자
    participant L as 랜딩페이지
    participant A as auth.js
    participant S as Supabase
    participant E as 이메일

    U->>L: 이메일 + 비밀번호 입력 후 회원가입
    L->>A: signUpWithEmail(email, password)
    A->>S: supabase.auth.signUp({ emailRedirectTo: board.html })
    S->>E: 인증 메일 발송
    A-->>L: { data, error }
    L->>U: "인증 메일을 확인해주세요" 안내

    U->>E: 인증 링크 클릭
    E->>S: 토큰 검증
    S-->>U: board.html로 리다이렉트 (세션 생성)
```

---

## 5. 카드 이동 상세 흐름

```mermaid
sequenceDiagram
    actor U as 사용자
    participant C as 카드 (DOM)
    participant B as 보드 (이벤트 위임)
    participant L as card-list (드롭 영역)
    participant S as Storage

    U->>C: drag 시작
    C->>B: dragstart 이벤트
    B->>B: draggedCard 저장
    B->>L: placeholder 생성 및 삽입

    loop 드래그 중
        U->>B: dragover 이벤트
        B->>B: getDragAfterElement(list, y) 계산
        B->>L: placeholder 위치 갱신
    end

    U->>L: drop
    B->>L: draggedCard를 placeholder 위치에 삽입
    B->>B: placeholder 제거, 상태 초기화
    B->>B: updateCounts() 호출
    B->>S: Storage.save(currentUser.id, boardData)
```

---

## 6. 카드 추가 상세 흐름

```mermaid
sequenceDiagram
    actor U as 사용자
    participant BTN as + 카드 추가 버튼
    participant M as 모달
    participant L as card-list
    participant S as Storage

    U->>BTN: 클릭
    BTN->>M: active 클래스 추가
    M->>M: textarea 포커스

    alt 확인
        U->>M: 텍스트 입력 후 확인
        M->>M: trim() 검사
        alt 텍스트 있음
            M->>L: createCard(text, currentUser.id) → append
            M->>M: updateCounts()
            M->>S: Storage.save(currentUser.id, boardData)
            M->>M: 모달 닫기
        else 빈 텍스트
            M->>M: 아무 동작 없음
        end
    else 취소
        U->>M: Esc 또는 오버레이 클릭
        M->>M: 모달 닫기
    end
```

---

## 7. 향후 Storage 전환 흐름 (v3.0 — Supabase DB)

현재 보드 데이터는 localStorage에 저장됩니다. v3.0에서 Supabase DB로 전환 시
`storage.js` 내부만 교체하면 `app.js`는 수정 없이 동작합니다.

```mermaid
flowchart LR
    A[app.js] -->|Storage.load / Storage.save| B[storage.js]
    B -->|현재 v2.0| C[localStorage\nkanban_board_{userId}]
    B -.->|v3.0 교체 예정| D[Supabase DB\nboards / cards 테이블]
```
