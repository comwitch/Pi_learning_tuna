# Learning Tuna

Pi에서 목표 중심 학습을 진행하는 확장 패키지의 초기 뼈대입니다.
[amosblomqvist/learn](https://github.com/amosblomqvist/learn)의 진단 → 계획 → 설명 → 확인 흐름을 참고하되, 원본 확장을 복사하거나 tmux에 의존하지 않습니다.

## 실행

Node.js 22.19 이상과 Pi가 필요합니다. 이 뼈대는 외부 런타임 의존성을 설치하지 않아도 됩니다.

```sh
pi
```

프로젝트 신뢰를 승인하면 `.pi/settings.json`이 이 저장소를 로컬 Pi 패키지로 로드합니다. 이미 Pi가 열려 있다면 `/reload`를 실행하세요. 사용자 설정에 다른 `/learn` 명령이나 같은 이름의 Skill이 있으면 중복 등록을 피하세요.

```text
/learn init bottom-up
/learn today
/learn today top-down
/learn map
/learn export
```

`init`은 **가중평균 예제**를 `learning/plan.json`에 생성합니다. 기존 계획은 덮어쓰지 않습니다. 자신의 목표와 개념 관계로 JSON을 수정한 다음 사용하세요.
`today`의 선택적 모드는 이번 조회에만 적용되며, 기본 모드를 바꾸려면 JSON의 `mode`를 수정하세요.
`/skill:learn`으로 학습 대화를 시작할 수 있습니다. `/learn today` 자체는 문제를 표시할 뿐, AI 대화를 자동 실행하지 않습니다.

## 두 학습 방식

두 방식은 동일한 선수지식 그래프를 공유합니다. 간선은 **선수 개념 → 이를 사용하는 개념**을 의미합니다.

- **Bottom-up:** 목표에 필요한 개념 중 아직 이해하지 못한 기초부터 진행합니다.
- **Top-down:** 목표 문제부터 시도합니다. 해당 노드를 `blocked`로 표시하면 부족한 선수 개념으로 내려갑니다. 선수 개념이 `understood`가 되면 상위 문제로 돌아옵니다.
- 복수의 선수 개념은 배열 순서대로 선택합니다. 목표와 무관한 개념은 퀘스트 선택에서 제외합니다.
- `understood`는 수동 선언이며 자동 평가 결과가 아닙니다. 선택기는 선언된 이해도를 신뢰합니다.

예제의 `weighted-mean`을 `blocked`로 수정한 뒤 `/learn today top-down`을 실행하면 `weights` 질문이 나옵니다. `weights`도 막혔다고 표시하면 `mean`으로 내려갑니다.

## 구조

```text
.pi/settings.json       # Local package discovery
package.json            # Pi package manifest and test command
src/core.ts             # Types, graph validation, quest selection, Markdown
src/storage.ts          # Cross-platform JSON and snapshot file operations
src/extension.ts        # /learn commands
skills/learn/SKILL.md    # Teaching instructions for both approaches
examples/plan.json      # Editable example, not the learner's actual curriculum
tests/                  # Core behavior and mocked extension integration
learning/               # Runtime personal data; excluded from Git
```

`schemaVersion: 1`은 향후 마이그레이션을 위한 버전입니다. 개념 ID는 영문·숫자·`_`·`-`를 사용하고 제목과 질문에는 한국어를 사용할 수 있습니다. 없는 선수 개념, 중복 ID, 순환 의존성은 거부합니다.

## Obsidian 및 두 OS

`/learn export`는 `learning/exports/`에 Mermaid를 포함한 새 Markdown 스냅샷을 생성합니다. 프로젝트 또는 해당 폴더를 Vault 안에 두거나 생성한 파일을 Vault에 복사해서 확인하세요. 기존 노트를 덮어쓰지 않으며, 노트 수정 사항을 JSON으로 역반영하지 않습니다.

Node.js 파일 API만 사용하고 플랫폼 전용 셸·Chrome 경로·tmux를 사용하지 않습니다. Windows/macOS에서 같은 구조를 사용하도록 설계했지만, 실제 macOS 실행은 아직 검증하지 않았습니다.
개인 기록의 동기화는 사용자가 선택한 Vault 동기화 방식에 맡깁니다. 두 기기에서 동시에 수정하는 충돌 해결 기능은 없습니다. `learning/`은 Git에서 제외되지만 개인 데이터의 외부 전송까지 차단하는 보안 경계는 아닙니다.

## 테스트

```sh
npm test
```

현재 구현: 계획 검증, 두 방식의 질문 선택, 지도 출력, 덮어쓰기 없는 초기화 및 Markdown 내보내기.
아직 미구현: 사용자 목표 기반 AI 지도 생성, 자동 출제·채점, 풀이 증거 저장, 날짜별 완료 기록, 복습 스케줄, 알림, Canvas 연동.
`dailyMinutes`는 질문에 표시하는 시간 예산이며 실제 소요 시간을 보장하지 않습니다. 같은 상태에서는 같은 질문을 제안합니다.

다음 단계는 사용자의 실제 목표를 입력받아, 승인된 작은 학습 지도로 바꾸는 흐름을 추가하는 것입니다.
