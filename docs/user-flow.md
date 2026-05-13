# User Flow — 사용자 흐름도
# Kanban Board

## 1. 전체 여정 개요

사용자의 주요 여정은 네 가지입니다.

1. **초기 진입** — 게스트 ID 발급 및 보드 복원
2. **카드 이동** — 드래그앤드롭으로 컬럼 간 상태 변경
3. **카드 추가** — 모달을 통해 새 카드 생성
4. **카드 삭제** — hover 후 삭제 버튼으로 카드 제거

---

## 2. 전체 흐름도

```mermaid
flowchart TD
    A([브라우저에서 index.html 열기]) --> B[게스트 ID 확인·발급\ncurrentUser 초기화]
    B --> C[사용자 데이터 로드\nStorage.load userId]
    C --> D{저장 데이터 있음?}
    D -- 예 --> E[저장된 카드 복원]
    D -- 아니오 --> F[기본 카드 표시]
    E --> G[보드 렌더링 완료]
    F --> G
    G --> H{어떤 작업?}

    H --> I[카드 드래그]
    H --> J[카드 추가]
    H --> K[카드 삭제]

    I --> I1[드래그 시작\n반투명 + 회전]
    I1 --> I2[대상 컬럼 이동\n하이라이트]
    I2 --> I3[placeholder 표시]
    I3 --> I4{드롭}
    I4 -- 원하는 위치 --> I5[카드 이동\n카운트 갱신\nStorage.save]
    I4 -- 취소 --> H
    I5 --> H

    J --> J1[+ 카드 추가 클릭]
    J1 --> J2[모달 열림]
    J2 --> J3{텍스트 입력}
    J3 -- 확인/Enter --> J4{빈값?}
    J4 -- 아니오 --> J5[카드 추가\nStorage.save\n모달 닫힘]
    J4 -- 예 --> J3
    J3 -- Esc/오버레이 --> J6[모달 닫힘]
    J5 --> H
    J6 --> H

    K --> K1[카드 hover\n✕ 표시]
    K1 --> K2{✕ 클릭?}
    K2 -- 예 --> K3[카드 삭제\nStorage.save]
    K2 -- 아니오 --> H
    K3 --> H
```

---

## 3. 페이지 로드 및 사용자 초기화 흐름

```mermaid
flowchart LR
    A([DOMContentLoaded]) --> B[localStorage에서\nkanban_guest_id 확인]
    B --> C{게스트 ID 있음?}
    C -- 예 --> E[기존 ID 사용]
    C -- 아니오 --> D[crypto.randomUUID 생성\nlocalStorage 저장]
    D --> E
    E --> F[currentUser 초기화\nid / name:Guest / isGuest:true]
    F --> G[Storage.load currentUser.id]
    G --> H{보드 데이터 있음?}
    H -- 예 --> I[저장 데이터로 카드 렌더링]
    H -- 아니오 --> J[HTML 기본 카드 유지]
    I --> K[updateCounts 호출]
    J --> K
    K --> L[보드 사용 준비 완료]
```

---

## 4. 카드 이동 상세 흐름

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

## 5. 카드 추가 상세 흐름

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

## 6. 향후 인증 흐름 (v2.0 — Supabase Auth)

```mermaid
flowchart TD
    A([앱 진입]) --> B[Supabase.auth.getSession]
    B --> C{세션 있음?}
    C -- 예 --> D[currentUser = Supabase user\nisGuest: false]
    C -- 아니오 --> E[게스트 모드\n현재 v1.1 흐름]
    D --> F[Storage.load currentUser.id\nSupabase DB에서 로드]
    E --> G[Storage.load currentUser.id\nlocalStorage에서 로드]
    F --> H[보드 렌더링]
    G --> H

    H --> I{로그인 버튼 클릭?}
    I -- 예 --> J[Supabase 로그인 UI]
    J --> K{로그인 성공?}
    K -- 예 --> L[게스트 데이터 마이그레이션 여부 확인]
    L --> M[currentUser 갱신\nStorage 전환\n보드 새로고침]
    K -- 아니오 --> H
```
