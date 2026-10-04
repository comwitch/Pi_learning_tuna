# Learning Tuna — 한국어 설명서

[메인 / Home](README.md) · **한국어** · [English](README.en.md)

개인 프로젝트 폴더에 클론해서 사용하는 **Pi 기반 학습 앱**입니다. 처음에는 질문으로 기간과 자료를 확인하고, 계획을 승인받은 뒤 학습합니다.
[amosblomqvist/learn](https://github.com/amosblomqvist/learn)의 학습 흐름을 참고하되 원본 확장을 복사하거나 tmux에 의존하지 않습니다.

## 설치하기

### 1. 필수 도구 준비

Windows/macOS에서 다음 도구를 준비합니다. 이미 설치되어 있다면 건너뛰세요.

- [Git](https://git-scm.com/downloads): 저장소 클론에 필요합니다.
- [Node.js](https://nodejs.org/): **22.19 이상**이 필요합니다. npm도 함께 설치됩니다.
- [Pi](https://pi.dev): 이 앱을 실행하는 학습 에이전트입니다.

Pi가 없다면 **터미널**에서 설치합니다.

```sh
npm install -g --ignore-scripts @earendil-works/pi-coding-agent
```

설치 후 새 터미널에서 확인합니다.

```sh
git --version
node --version
pi --version
```

### 2. 독립 앱으로 사용하기

터미널에서 원하는 개인 프로젝트 폴더로 이동한 뒤 실행합니다. `<repository-url>`은 **이 저장소의 실제 Git URL**로 바꾸세요. 꺾쇠괄호까지 그대로 입력하지 않습니다.

```sh
git clone <repository-url> learning-tuna
cd learning-tuna
```

저장소를 `.pi`라는 이름으로 클론하지 않습니다. 앱 내부의 `.pi/settings.json`이 앱을 로드하므로, 이 독립 앱에는 별도 `pi install`이나 프로젝트의 `npm install`이 필요하지 않습니다.

<a id="study-root"></a>

### 3. 자료가 있는 root 폴더에서 사용하기

이미 책·논문·코드 등 공부할 자료가 있는 폴더에서 Pi를 실행하고 싶다면, 그 폴더를 학습 작업 폴더로 사용합니다.
아래 구조에서 `root`는 파일 시스템의 `/`가 아니라 **내가 공부할 프로젝트 폴더**를 뜻합니다.

```text
root/
├── materials/          # Existing study material
├── learning_tuna/      # Cloned app code
├── .pi/settings.json   # Local package registration (created by pi install)
└── learning/           # Plans, records, and home page (created during use)
```

**터미널에서 root로 이동한 상태**로 실행합니다.

```sh
git clone https://github.com/comwitch/Pi_learning_tuna.git learning_tuna
pi install --local ./learning_tuna
pi
```

이미 `root/learning_tuna/`에 클론했다면 `git clone`은 건너뛰고 등록부터 실행하세요. 로컬 등록은 최초 한 번만 필요합니다.
**클론만 하고 root에서 Pi를 켜는 것으로는 앱이 자동 로드되지 않습니다.** Pi는 하위 앱 폴더의 `.pi` 설정을 자동으로 찾아 로드하지 않으므로 `pi install --local`로 root에 등록해야 합니다.

등록 후 프로젝트 신뢰를 승인합니다. 이미 root에서 Pi가 열려 있었다면 `/reload`를 실행하세요. 이어 Pi 내부에서 다음을 사용합니다.

```text
/learn init
/learn track
/learn today
```

학습 자료는 `materials/`의 파일이나 root 내부의 경로로 지정하면 됩니다. 앱 코드가 있는 `learning_tuna/`로 이동할 필요는 없습니다.

- 앱 코드: `root/learning_tuna/`
- 계획·학습 기록: **`root/learning/`**
- Obsidian 메인 페이지: **`root/learning/index.md`**
- 다음 날: 같은 **root에서** `pi`를 실행하고 `/learn today`로 이어가기

앱 폴더에서 Pi를 실행하면 `root/learning_tuna/learning/`에 별도의 학습 기록이 생깁니다. 하나의 학습을 이어가려면 실행 위치를 섞지 마세요.
root를 Git으로 관리한다면 개인정보 보호를 위해 **root의 `.gitignore`에 `learning/`을 추가**하세요. 하위 앱의 `.gitignore`는 root의 학습 기록에 적용되지 않습니다. 기록은 별도로 백업합니다.

## 시작하기

### 1. 앱 실행과 AI 연결

**독립 앱 방식**은 터미널에서 앱 루트로 이동해 실행합니다. 위의 **자료 root 방식**으로 등록했다면 앱 폴더가 아닌 자료 root에서 `pi`를 실행하세요.

```sh
cd learning-tuna
pi
```

이미 앱 루트에 있다면 `cd` 없이 `pi`만 실행하세요. 프로젝트 신뢰 확인이 나오면 코드를 확인하고 승인합니다.
AI 제공자가 아직 연결되지 않았다면 **Pi 내부**에서 `/login`으로 연결한 뒤 `/model`로 사용할 모델을 선택합니다.

이미 이 폴더에서 Pi를 실행 중이었다면 **Pi 내부**에서 `/reload`하여 최신 앱을 로드합니다. 사용자 설정에 같은 `/learn` 명령이나 같은 이름의 Skill이 설치되어 있다면 중복 등록을 피하세요.
선택한 방식에 맞는 같은 작업 폴더에서 Pi를 실행하세요. 데이터는 현재 작업 폴더의 `learning/`에 저장합니다.

### 2. 첫 학습 계획 생성

**Pi 내부**에서 실행합니다. `/learn` 명령을 bash나 PowerShell 터미널에 직접 입력하지 않습니다.

```text
/learn init
```

AI가 자료·목표·기간을 질문하면 답하고, 제안한 계획을 확인한 뒤 저장을 승인합니다. 예를 들어 “이 책의 1–3장을 2주 동안, 학습하는 날마다 15분씩 공부하고 싶다”처럼 알려줄 수 있습니다.
승인 후 계획과 실라버스·인계 기록이 생성되면 유연한 진도 추적을 설정하고 첫 학습을 시작합니다.

```text
/learn track
/learn today
```

`track`은 시작일·전체 학습 회차 수·가능한 요일을 질문하고 저장 승인을 받습니다. **2주라는 기간과 8회차라는 학습 분량은 별개**이므로 자동으로 같은 수로 가정하지 않습니다.
날짜는 `YYYYMMDD`, 요일은 `0`=일요일부터 `6`=토요일까지 쉼표로 구분하여 입력합니다. 예를 들어 `1,3,5`는 월·수·금입니다.

### 3. 다음 날 다시 시작

터미널에서 같은 학습 작업 폴더(독립 앱 폴더 또는 등록한 자료 root)로 이동해 `pi`를 실행한 뒤, Pi 내부에서 `/learn today`를 실행합니다. 새 대화 세션이어도 저장된 기록을 읽고 이어가도록 구성되어 있습니다.
**`/learn init`을 매일 실행할 필요는 없습니다.** 목표나 기간을 바꾸려면 기존 계획을 변경하려는 의도를 AI에게 먼저 알려주세요.

### 명령어 요약

| Pi 내부 명령 | 용도 |
|---|---|
| `/learn init` | 질문을 통한 최초 학습 계획 수립 |
| `/learn schedule` | 승인된 일정 JSON으로 계획 문서 생성 또는 재생성 |
| `/learn track` | 시작일·총 회차·요일을 확인하고 진도 추적 설정 |
| `/learn progress` | 완료·확인 필요 기록·재배치된 미래 일정 확인 |
| `/learn finish YYYYMMDD_N` | 사용자 확인으로 완료·부분학습·안함 기록 |
| `/learn today` | 미완료 회차 이어가기 또는 다음 회차 하나 시작 |
| `/learn home` | 메인 페이지의 오늘 링크 갱신 (새 폴더 생성 안 함) |
| `/learn today 기초부터` | 이번 수업을 기초 개념부터 진행 |
| `/learn today 목표부터` | 이번 수업을 목표 문제부터 진행 |
| `/learn help` | 앱 명령어 안내 |

`/learn schedule`은 AI가 로컬 문서 생성 스크립트를 실행하지 못했거나, 문서를 다시 생성할 때 사용합니다. 승인된 `learning/schedule.json`이 먼저 있어야 합니다.
`/learn`을 찾을 수 없다면 선택한 학습 작업 폴더에서 실행했는지, 자료 root 방식에서는 로컬 등록을 했는지, 프로젝트 신뢰를 승인했는지 확인하고 `/reload`하세요.

## 학습 계획 생성 과정

```text
/learn init
```

이 명령은 예제를 생성하지 않고 AI에게 초기 계획 수립을 요청합니다. AI가 다음 내용을 질문합니다.

1. 배우려는 내용, 목표와 이해 깊이.
2. 자료가 책·논문·YouTube·기타 중 무엇인지, 제목/링크와 학습 범위.
3. 내용에 대한 기간 추정과 **사용자가 확인한 계획 기간(달력 일수)**, 하루 가능한 시간.
4. **기초부터** 또는 **목표부터** 진행할지.

정확히 **7일 이상이면 장기**입니다. 기간과 실제 학습하는 날의 빈도는 구분하여 확인합니다. 자료를 확인할 수 없으면 목차나 요약을 요청하고, 추정의 한계를 기록합니다. 실제로 읽지 않은 자료를 읽었다고 가정하지 않습니다.

AI는 범위와 계획을 설명하고 저장 승인을 받습니다. 승인 후 `learning/schedule.json`을 작성하고 로컬 스크립트로 문서까지 생성하도록 Skill이 안내합니다. 로컬 실행 도구가 없거나 직접 문서를 다시 생성하려면 다음을 실행합니다.

```text
/learn schedule
```

JSON을 검증하고 새 스냅샷 폴더에 다음 문서를 생성합니다.

| 문서 | 역할 |
|---|---|
| `planner.md` | 단기 계획 또는 장기 주차별 플래너 |
| `syllabus.md` | 키워드와 짧은 설명 중심의 실라버스 (한국어 가능) |
| `handoff.md` | 목표·자료 확인 범위·현재 수준·계획 근거·다음 행동을 담은 상세 인계 기록 (영어 가능) |
| `schedule.json` | 생성 당시의 계획 데이터 |
| `READY` | 모든 문서가 생성되었음을 표시 |

같은 명령을 다시 실행하면 기존 문서를 덮어쓰지 않고 새 스냅샷을 생성합니다. `READY`가 없는 불완전한 스냅샷은 이어가기에서 사용하지 않습니다.
이것은 학습 계획이며 **자동 작업·알림 예약이 아닙니다**. 주차는 월요일 기준이 아니라 합의한 시작일부터 1–7일, 8–14일 등으로 나눕니다. 매일 학습한다고 가정하지 않고 가능한 요일과 빈도는 계획 근거에 남깁니다.

## 다음 날 이어가기

```text
/learn today
```

승인된 일정이 있으면 학습 폴더와 `learning/index.md` 링크를 준비합니다. 새 폴더의 이름은 `learning/sessions/YYYYMMDD_N/`이며, 날짜는 **기기의 현지 생성 날짜**, 번호는 **그날 만든 1번째, 2번째… 폴더**입니다.
진도 추적을 설정했다면 `/learn today`는 **미완료 폴더를 이어가므로 새 폴더를 만들지 않을 수 있습니다**. 실제 재개·완료 날짜는 별도 상태 기록에 저장합니다. 폴더 번호와 전체 학습 회차 번호는 다릅니다.
추적 설정 전에는 기존처럼 호출마다 새 폴더가 생깁니다. 링크만 새로 고치려면 `/learn home`을 사용합니다.

AI에게 아래 기록을 읽고 학습을 이어가도록 요청합니다.

- 현재 `learning/schedule.json`
- 최신 완성된 계획의 실라버스·플래너·인계 기록
- `learning/sessions/`의 최신 실제 학습 기록 (현재 폴더의 빈 템플릿은 이전 학습으로 보지 않음)

실라버스는 짧게 유지하지만 **설명과 피드백은 충분히 자세하게** 합니다. 수업 후에는 문제, 학습자의 사고 과정, 설명·가정·오개념, 이해 근거, 미해결 사항, 다음 행동을 새 파일에 기록하도록 Skill이 안내합니다. 이전 대화의 기억에 의존하지 않습니다.

기간 확인, 자료 해석, 초안 작성 및 수업 기록은 **AI가 Skill을 따라 수행하는 단계**입니다. 실제 자료로 end-to-end 학습 정확도나 기록의 완전성을 검증한 것은 아닙니다. 저장 실패 시 이어가기의 한계를 알려야 하며, 자동으로 날짜를 진행하거나 이해도를 올리지 않습니다.

## 쉬어도 밀리지 않는 유연한 진도

### 완료 여부 확인

수업 내용을 기록한 뒤 Pi 내부에서 실행합니다. 폴더명은 실제 이름으로 바꾸세요.

```text
/learn finish 20260709_1
```

UI에서 **완료 / 부분학습 / 안함**을 선택하고, 실제 날짜와 한 일·남은 일을 입력한 뒤 최종 확인합니다. 기록을 늦게 남겼거나 외부에서 공부했다면 현재 미완료 회차의 실제 학습 날짜를 소급 입력할 수 있습니다. 미래 날짜와 확인한 시작일 이전 날짜는 허용하지 않습니다. 완료는 학습 참여의 사용자 확인이며 이해도 자동 판정이 아닙니다. 폴더·체크박스·READY만으로 완료하지 않습니다.

- 완료: 다음 회차로 이동합니다.
- 부분학습: 같은 회차의 남은 부분을 이어갑니다.
- 안함: 같은 회차를 다음 가능한 날에 진행합니다.
- 기록 없음: 미확인입니다. 외부에서 공부했거나 기록을 빠뜨렸을 수도 있으므로 곧바로 결석으로 단정하지 않습니다.

### 결석 후 재배치

기본 정책은 **가능한 요일에 한 회차씩**, 추가 숙제 없이 이어가기입니다.

```text
월요일: 1회차 완료
화요일: 학습을 쉬었음
수요일: 2회차 하나만 진행
목요일: 3회차 진행
```

`/learn progress`와 메인 페이지는 지난 예정일의 미확인·지연 기록, 다음 회차, 남은 날짜와 예상 종료일을 보여줍니다. 날짜가 지나도 진도는 올라가지 않습니다. 남은 날짜는 현재 날짜와 확인된 완료 회차에 따라 재계산되며 원래 예상 종료일보다 늦어질 수 있습니다.

같은 날 이미 한 회차를 완료했으면 **추가 회차를 할지 별도로 확인**합니다. 예정 요일 밖 학습도 선택 사항입니다. 두 회차를 강제하지 않습니다. 주말 등 선택하지 않은 요일은 기본 재배치에서 제외됩니다.

원본 `schedule.json`·실라버스·플래너는 보존하며, 유동적 회차 날짜는 진도 화면과 메인 페이지에서 제공합니다. 내용 순서는 실제 인계 기록을 읽고 AI가 안내합니다. 회차별 강의 내용 자동 분할이나 원본 플래너 자동 재작성은 아직 하지 않습니다.

추적 설정 전의 기존 폴더는 자동으로 완료 처리하거나 현재 회차에 붙이지 않습니다. 설정은 최초 한 번만 저장하며, 완료 기록 정정·요일 변경·다른 목표로 진도 이전은 아직 전용 기능이 없습니다. 목표나 자료 범위가 바뀌면 기존 진도를 새 목표에 조용히 적용하지 않고 확인을 요청합니다.

## 매 학습의 루프와 메인 페이지

| 단계 | 파일 | 내용 |
|---|---|---|
| 복습 | `review.md` | 노트 없이 이전 개념 회상; 첫 수업은 선수지식 확인 |
| 새 학습 | `lesson.md` | 개념·가정·추론 과정과 기존 지식의 연결 |
| 짧은 확인 | `quiz.md` | 힌트 없는 질문 1–2개와 답변·피드백 |
| 적용 | `practice.md` | 수학 풀이·유도 / 컴퓨터 구현·테스트 / 영어 작문·말하기 |
| 회고 | `reflection.md` | 이해 근거, 미해결 사항, 다음 복습 후보 |
| 인계 | `handoff.md` | 다음 세션이 대화 기억 없이 이어갈 수 있는 상세 기록 |

파일과 링크는 앱이 생성하고, 실제 질문·설명·피드백은 AI가 채웁니다. 폴더 생성이나 `READY` 표시는 **학습 완료가 아닙니다**. 참여 완료와 이해도를 구분하며 코딩을 모든 과목에 강제하지 않습니다.

예시 구조:

```text
learning/
├── index.md                 # Home page linking today's sessions
└── sessions/
    ├── 20260709_1/
    │   ├── index.md         # Links and checkboxes for the learning loop
    │   ├── review.md
    │   ├── lesson.md
    │   ├── quiz.md
    │   ├── practice.md
    │   ├── reflection.md
    │   ├── handoff.md
    │   └── READY            # Templates created, not lesson completion
    └── 20260709_2/
```

Obsidian에서 `learning/index.md`를 메인 페이지로 열고, **오늘의 학습 → 해당 폴더의 index.md → 각 단계** 순서로 이동합니다. 계획 문서 링크와 이전 학습 링크도 제공합니다. 링크는 상대 Markdown 경로이므로 폴더 전체를 옮겨도 유지됩니다.
메인 페이지의 자동 영역 밖에는 개인 메모를 쓸 수 있으며 갱신 시 보존됩니다. 같은 이름의 기존 노트에 자동 영역 표시가 없다면 덮어쓰지 않고 오류로 알립니다. 날짜가 바뀌었을 때 페이지는 `/learn today` 또는 `/learn home` 실행으로 갱신되며, 열어둔 페이지가 자정에 자동 갱신되는 것은 아닙니다.

## 진행 방식과 개념 지도

- **기초부터:** 목표에 필요한 기초 개념부터 연결하며 진행합니다.
- **목표부터:** 목표 문제를 시도하고, 막힌 선수지식으로 내려갔다가 돌아옵니다.

이번 수업에서만 방식을 바꾸려면 `/learn today 기초부터` 또는 `/learn today 목표부터`를 사용합니다. 기본 일정의 방식은 변경하지 않습니다.
개념 지도 기능은 초기 일정과 별개이며 `learning/plan.json`이 필요합니다. 예제를 시험하려면:

```text
/learn demo 기초부터
/learn map
/learn export
```

`demo`는 가중평균 예제 지도만 생성하며 기존 지도는 덮어쓰지 않습니다. `schedule.json`이 있으면 `today`는 실제 일정 이어가기를 우선합니다. 일정이 없으면 기존 지도에서 질문 하나를 표시합니다.
기존 지도 데이터의 내부 모드 값은 호환성을 위해 유지하지만, 명령어·화면·학습 안내는 쉬운 표현을 사용합니다. 없는 선수 개념, 중복 ID, 순환 관계는 거부합니다.

## 구조

```text
.pi/settings.json                 # Relative local package discovery
AGENTS.md                         # Learning and development guidance
src/core.ts                       # Concept graph and question selection
src/schedule.ts                   # Schedule validation and document rendering
src/storage.ts                    # Cross-platform file operations
src/save-schedule.ts              # Local document materialization for the agent
src/sessions.ts                   # Dated learning loops and home-page links
src/calendar.ts                   # Local dates and weekday-based calendar arithmetic
src/tracking.ts                   # Confirmed outcomes and one-lesson reflow
src/workspace.ts                  # In-process workspace mutation queue
src/extension.ts                  # /learn commands
skills/learn/SKILL.md              # Intake, teaching, and durable session context
skills/learn/references/           # Schedule schema reference
examples/plan.json                # Optional concept-map demo
tests/                            # Core and mocked integration tests
learning/                         # Personal runtime data, excluded from Git
  schedule.json                   # Active approved schedule
  tracking.json                   # Confirmed start date, total lessons, weekdays
  schedules/                      # Immutable planning snapshots
  index.md                        # Home page with today's and previous links
  sessions/YYYYMMDD_N/            # Per-session loop pages and detailed handoff
    progress.json                 # Immutable assigned lesson number (tracked sessions)
    outcomes/                     # Append-only user-confirmed participation records
```

현재 제한: 앱 하나에 활성 일정 하나를 사용합니다. 사용자 확인 기반 참여 추적과 날짜 재배치는 가능하지만 여러 목표 관리, 자동 채점, 복습 엔진, 무확인 완료 판정, 일정 변경 자동 병합은 없습니다.

## Obsidian 및 Windows/macOS

생성한 Markdown을 Vault 안에 두거나 복사해서 읽을 수 있습니다. 개념 지도 내보내기는 Mermaid를 사용합니다. 노트 수정은 JSON에 자동 반영되지 않습니다.
플랫폼 전용 셸·Chrome 경로·tmux를 사용하지 않습니다. 실제 macOS 실행은 아직 미검증입니다.
코드는 각 기기에 클론하고 `learning/` 기록은 별도로 동기화·백업하세요. Git에서 제외되므로 재클론만으로 기록이 복구되지 않습니다. 두 기기에서 동시에 수정하는 충돌 처리는 없습니다. Git 제외는 암호화나 외부 전송 차단이 아닙니다.

다른 프로젝트에 확장으로 사용할 때만 해당 프로젝트에서 실행합니다.

```sh
pi install --local <path-to-learning-tuna>
```

사용자 전역 설정과 프로젝트 설정에 중복 등록하지 않도록 주의하세요.

## 테스트

```sh
npm test
```

일정 경계(6일/7일), 날짜·자료·학습일 검증, 학습 폴더와 메인 링크 생성, 개인 메모 보존, 하루 결석 후 재배치, 부분 학습 이어가기, 추가 학습 확인, 기록 중복 방지, UI 취소 시 진도 불변, 기존 개념 지도 동작을 검증합니다. AI의 실제 질문·자료 독해·수업 기록을 모의 테스트가 보장하지는 않습니다.
