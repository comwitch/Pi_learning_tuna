import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { approachLabel, parseSchedule } from "./schedule.ts";
import type { StudySchedule } from "./schedule.ts";
import { withWorkspaceQueue } from "./workspace.ts";
import { localDateKey, weekday } from "./calendar.ts";
import { courseKey, getProgress, renderProgress } from "./tracking.ts";
export { localDateKey } from "./calendar.ts";

const homeStart = "<!-- learning-tuna:home:start -->";
const homeEnd = "<!-- learning-tuna:home:end -->";

async function readOptional(path: string): Promise<string | undefined> {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}

async function directories(path: string): Promise<string[]> {
  try {
    return (await readdir(path, { withFileTypes: true })).filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

function validateHome(content: string): void {
  const start = content.indexOf(homeStart);
  const end = content.indexOf(homeEnd);
  if (start < 0 || end <= start || content.indexOf(homeStart, start + homeStart.length) !== -1
    || content.indexOf(homeEnd, end + homeEnd.length) !== -1) {
    throw new Error("learning/index.md has no unique generated section. Preserve or rename it before creating the app home page.");
  }
}

async function homeContent(cwd: string): Promise<string> {
  const existing = await readOptional(join(cwd, "learning", "index.md"));
  const content = existing ?? `# Learning home\n\n자동 영역 밖에는 개인 메모를 작성할 수 있습니다.\n\n${homeStart}\n${homeEnd}\n`;
  validateHome(content);
  return content;
}

function sortSessions(names: string[]): string[] {
  return names.sort((a, b) => b.slice(0, 8).localeCompare(a.slice(0, 8)) || Number(b.slice(9)) - Number(a.slice(9)));
}

async function updateHomeUnlocked(cwd: string, now: Date): Promise<string> {
  const date = localDateKey(now);
  const content = await homeContent(cwd);
  const root = join(cwd, "learning");
  const sessions: string[] = [];
  for (const name of await directories(join(root, "sessions"))) {
    if (/^\d{8}_[1-9]\d*$/.test(name) && await readOptional(join(root, "sessions", name, "READY")) !== undefined) {
      sessions.push(name);
    }
  }
  sortSessions(sessions);
  const progress = await getProgress(cwd, now);
  const lines = [`## 오늘의 학습 (${date})`, ""];
  if (progress) lines.push(renderProgress(progress), "");
  const today = sessions.filter((name) => name.startsWith(`${date}_`));
  for (const name of today) lines.push(`- [${name} 복습용 학습 노트](sessions/${name}/index.md)`);
  if (!today.length) lines.push("오늘의 학습 폴더가 없습니다. Pi에서 `/learn today`로 시작하세요.");
  lines.push("", "## 이전 학습", "");
  for (const name of sessions.filter((name) => !name.startsWith(`${date}_`))) {
    lines.push(`- [${name}](sessions/${name}/index.md)`);
  }
  lines.push("", "## 학습 계획", "");
  const snapshots = (await directories(join(root, "schedules"))).sort().reverse();
  for (const name of snapshots) {
    if (/^[\w-]+$/.test(name) && await readOptional(join(root, "schedules", name, "READY")) !== undefined) {
      lines.push(`[플래너](schedules/${name}/planner.md) · [실라버스](schedules/${name}/syllabus.md)`);
      break;
    }
  }
  const start = content.indexOf(homeStart) + homeStart.length;
  const end = content.indexOf(homeEnd);
  const updated = `${content.slice(0, start)}\n${lines.join("\n")}\n${content.slice(end)}`;
  await mkdir(root, { recursive: true });
  const path = join(root, "index.md");
  const staging = join(root, `.home-${randomUUID()}.tmp`);
  // Replace only the app-owned section; write fully before replacing the page.
  await writeFile(staging, updated, { encoding: "utf8", flag: "wx" });
  await rename(staging, path);
  return path;
}

export function updateHome(cwd: string, now = new Date()): Promise<string> {
  return withWorkspaceQueue(cwd, () => updateHomeUnlocked(cwd, now));
}

export interface StudySession {
  id: string;
  directory: string;
  homePath: string;
  resumed?: boolean;
  lessonNumber?: number;
}

export function createStudySession(cwd: string, schedule: StudySchedule, now = new Date(),
  options: { allowExtra?: boolean; allowOffDay?: boolean } = {}): Promise<StudySession> {
  parseSchedule(schedule);
  const date = localDateKey(now);
  return withWorkspaceQueue(cwd, async () => {
    // Refuse an unrelated home page before allocating or modifying learner data.
    await homeContent(cwd);
    const progress = await getProgress(cwd, now);
    if (progress) {
      if (progress.tracking.courseKey !== courseKey(schedule)) throw new Error("Tracking belongs to a different goal or source scope. Reconcile the plan before continuing.");
      if (progress.nextLesson === null) throw new Error("All tracked lessons are complete.");
      if (date < progress.tracking.startDate) throw new Error("The confirmed tracking start date has not arrived.");
      if (!progress.tracking.weekdays.includes(weekday(date)) && !options.allowOffDay) throw new Error("Today is not a configured learning day. Confirm an optional session first.");
      if (progress.pendingSession) {
        const homePath = await updateHomeUnlocked(cwd, now);
        return { id: progress.pendingSession.id, directory: join(cwd, "learning", "sessions", progress.pendingSession.id),
          homePath, resumed: true, lessonNumber: progress.nextLesson };
      }
      if (progress.completedToday && !options.allowExtra) throw new Error("One lesson is already complete today. Additional work requires explicit confirmation.");
    }
    const root = join(cwd, "learning", "sessions");
    await mkdir(root, { recursive: true });
    const names = await directories(root);
    let sequence = Math.max(0, ...names.filter((name) => new RegExp(`^${date}_[1-9]\\d*$`).test(name)).map((name) => Number(name.slice(9)))) + 1;
    let id: string;
    let directory: string;
    while (true) {
      id = `${date}_${sequence}`;
      directory = join(root, id);
      try {
        // Exclusive directory allocation also prevents collisions between processes.
        await mkdir(directory);
        break;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
        sequence += 1;
      }
    }
    const documents = {
      "index.md": [
        `# ${id} 학습 노트`, "", "[메인 페이지](../../index.md)", "",
        "## 학습 목표", "", `전체 목표: ${schedule.goal}`, "",
        "이번 회차에서 이해할 내용: 아직 정하지 않음.", "",
        "## 핵심 개념", "", "오늘 다룬 개념의 정의와 연결을 짧게 정리합니다. 아직 수업하지 않음.", "",
        "## 상세 설명", "",
        "동기 → 정의와 가정 → 추론 단계 → 예시 순으로 설명합니다. 대화 전문이나 답변 로그는 넣지 않습니다.", "",
        "수식은 LaTeX, 필요한 관계도는 Mermaid로 관련 설명 바로 옆에 배치합니다. 아직 수업하지 않음.", "",
        "## 복습 포인트", "", "- 기억해야 할 핵심 연결: 아직 정하지 않음.",
        "- 적용 조건과 주의점: 아직 정하지 않음.", "",
        "> [!info]- 학습 진행 기록 (필요할 때 펼치기)",
        `> 시간 예산: ${schedule.dailyMinutes}분 · 진행: ${approachLabel(schedule.approach)}`,
        ...(progress ? [`> 학습 회차: ${progress.nextLesson}/${progress.tracking.totalLessons}`] : []),
        "> 폴더 생성은 학습 완료를 의미하지 않습니다.", ">",
        "> - [ ] [1. 기억에서 복습](review.md)", "> - [ ] [2. 새 개념 학습](lesson.md)",
        "> - [ ] [3. 짧은 확인](quiz.md)", "> - [ ] [4. 적용](practice.md)",
        "> - [ ] [5. 회고](reflection.md)", ">",
        "> [다음 세션용 인계 기록](handoff.md)", "",
      ].join("\n"),
      "review.md": "# 기억에서 복습\n\n이전 기록에서 중요한 개념 하나를 골라 노트 없이 회상합니다. 첫 수업은 선수지식 확인으로 대체합니다.\n\n## 질문\n\n아직 정하지 않음.\n\n## 내 답변과 피드백\n\n아직 시도하지 않음.\n",
      "lesson.md": "# 새 개념 학습 진행\n\n목표와 상세 설명은 [복습용 학습 노트](index.md)에서 한 번에 읽습니다.\n\n## 실제 학습 범위와 진행\n\n자료의 실제 사용 범위와 미완료 부분만 간단히 기록합니다. 아직 수업하지 않음.\n",
      "quiz.md": "# 짧은 확인\n\n## 힌트 없는 질문 1–2개\n\n아직 출제하지 않음.\n\n## 답변·힌트 사용·이유·피드백\n\n아직 시도하지 않음. 정답 여부만으로 이해도를 확정하지 않습니다.\n",
      "practice.md": "# 적용\n\n수학: 풀이·유도, 필요 시 수치 실험. 컴퓨터: 구현·디버깅·테스트. 영어: 작문·말하기·문장 변형.\n\n## 과제\n\n아직 정하지 않음.\n\n## 결과물과 확인\n\n아직 시도하지 않음. 코드는 필요할 때 이 폴더 안에 별도 파일로 저장하고 링크합니다. 수치 실험은 증명을 대신하지 않습니다.\n",
      "reflection.md": "# 회고\n\n- 오늘 시도한 것:\n- 혼자 설명할 수 있는 것과 근거:\n- 힌트가 필요했던 것:\n- 오개념·미해결 질문:\n- 다음 복습 후보와 적용 과제:\n\n학습 참여 완료와 개념 이해도는 별도로 판단합니다. 아직 완료하지 않음.\n",
      "handoff.md": ["# Agent handoff", "", `Session: ${id}`, `Created at (UTC): ${now.toISOString()}`,
        `Goal: ${schedule.goal}`, "", "Status: prepared, no learning evidence recorded yet.", "",
        "Read prior recorded sessions before assigning this loop. Do not interpret templates as completed work.", "",
        "## Attempt and feedback", "", "Not recorded yet.", "",
        "## Detailed explanation, assumptions, and connections", "", "Not recorded yet.", "",
        "## Understanding evidence and unresolved gaps", "", "Not recorded yet.", "",
        "## Next action and rationale", "", schedule.nextAction, ""].join("\n"),
    };
    for (const [name, content] of Object.entries(documents)) {
      await writeFile(join(directory, name), content, { encoding: "utf8", flag: "wx" });
    }
    if (progress) {
      await writeFile(join(directory, "progress.json"), JSON.stringify({ schemaVersion: 1,
        trackingId: progress.tracking.id, lessonNumber: progress.nextLesson, startedOn: date }, null, 2), { flag: "wx" });
    }
    await writeFile(join(directory, "READY"), "Session templates ready, not lesson completion.\n", { flag: "wx" });
    const homePath = await updateHomeUnlocked(cwd, now);
    return { id, directory, homePath, resumed: false, lessonNumber: progress?.nextLesson ?? undefined };
  });
}
