import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { fileURLToPath } from "node:url";
import { learningModeLabel, parseLearningApproach, renderMap, selectQuest } from "./core.ts";
import { exportNote, initializePlan, planPath, readPlan, readSchedule, saveScheduleDocuments } from "./storage.ts";
import { createStudySession, updateHome } from "./sessions.ts";
import type { StudySchedule } from "./schedule.ts";
import { availableDates, localDateKey, weekday } from "./calendar.ts";
import { courseKey, getProgress, initializeTracking, readTracking, recordOutcome, renderProgress } from "./tracking.ts";
import type { OutcomeStatus } from "./tracking.ts";

const help = [
  "/learn init — 질문을 통해 기간·자료·목표를 확인하고 계획 초안 만들기",
  "/learn schedule — 확인된 schedule.json으로 플래너·실라버스·인계 기록 저장",
  "/learn track — 시작일·총 회차·학습 요일을 확인하여 유연한 진도 추적 시작",
  "/learn progress — 완료 회차, 지난 예정일 확인 후보, 남은 일정 보기",
  "/learn finish <폴더명> — 사용자 확인으로 완료·부분학습·안함 기록",
  "/learn today — 미완료 회차를 이어가거나 다음 회차 하나 시작",
  "/learn home — 메인 페이지의 오늘 링크 갱신 (새 학습을 만들지 않음)",
  "/learn demo [기초부터|목표부터] — 별도의 가중평균 예제 지도 생성",
  "/learn map — 개념 지도 표시 (plan.json 필요)",
  "/learn export — 개념 지도 Markdown 내보내기 (plan.json 필요)",
].join("\n");

export default function learningExtension(pi: ExtensionAPI) {
  pi.registerCommand("learn", {
    description: "학습 일정 수립, 키워드 실라버스, 세션 간 학습 이어가기",
    handler: async (args, ctx) => {
      const [command, approach, ...extra] = args.trim().split(/\s+/);
      const show = (content: string) => pi.sendMessage({ customType: "learning-tuna", content, display: true });
      const startAgent = (task: string) => {
        if (!ctx.isIdle()) throw new Error("현재 응답이 끝난 뒤 다시 실행하세요.");
        const skill = fileURLToPath(new URL("../skills/learn/SKILL.md", import.meta.url));
        pi.sendUserMessage(`Read the learning Skill at ${JSON.stringify(skill)} and follow it. ${task}`);
      };

      try {
        if (!command || command === "help") {
          show(help);
          return;
        }
        if (!["init", "schedule", "track", "progress", "finish", "today", "home", "demo", "map", "export"].includes(command)) {
          throw new Error(`알 수 없는 명령어입니다.\n${help}`);
        }
        if (extra.length || (!["demo", "today", "finish"].includes(command) && approach)) {
          throw new Error(`인자를 확인하세요.\n${help}`);
        }
        if (command === "init") {
          startAgent("Begin initial schedule intake, not a lesson. Ask the learner about duration, source type/reference/scope, goal, and time budget. Do not assume answers or overwrite existing plans. Use ask_user_question if available. After explicit approval, create learning/schedule.json using the documented schema and materialize its documents with the Skill's local save-schedule script. If local execution is unavailable, ask the learner to run /learn schedule.");
          return;
        }
        if (command === "track") {
          if (!ctx.hasUI || !ctx.isIdle()) throw new Error("질문 UI가 있는 Pi에서 응답이 끝난 뒤 실행하세요.");
          if (await readTracking(ctx.cwd)) throw new Error("이미 추적 계획이 있습니다. /learn progress로 확인하세요. 기존 진도는 자동 초기화하지 않습니다.");
          const schedule = await readSchedule(ctx.cwd);
          const startDate = await ctx.ui.input("추적 시작일 (YYYYMMDD)", localDateKey(new Date()));
          if (startDate === undefined) return;
          const count = await ctx.ui.input("전체 학습 회차 수 (달력 기간과 별개)", "예: 8");
          if (count === undefined) return;
          const days = await ctx.ui.input("학습 요일: 0=일, 1=월, …, 6=토 (쉼표 구분)", "예: 1,3,5");
          if (days === undefined) return;
          if (!/^\d+$/.test(count.trim()) || !/^[0-6](\s*,\s*[0-6])*$/.test(days.trim())) throw new Error("회차와 요일을 숫자로 입력하세요.");
          const weekdays = days.split(",").map((day) => Number(day.trim()));
          const dates = availableDates(startDate.trim(), weekdays, Number(count.trim()));
          if (!dates.length || new Set(weekdays).size !== weekdays.length) throw new Error("1회차 이상과 중복 없는 요일을 입력하세요.");
          if (!await ctx.ui.confirm("진도 추적 시작", `${count.trim()}회차, ${dates[0]}부터 ${dates.at(-1)}까지. 기본은 가능한 요일에 한 회차씩이며, 쉬면 남은 날짜만 늦춥니다. 기존 폴더는 완료로 추정하지 않습니다. 저장할까요?`)) return;
          await initializeTracking(ctx.cwd, schedule, { startDate: startDate.trim(), totalLessons: Number(count.trim()), weekdays, userConfirmed: true });
          await updateHome(ctx.cwd);
          show("유연한 진도 추적을 시작했습니다. /learn today로 첫 회차를 진행하세요.");
          return;
        }
        if (command === "progress") {
          const progress = await getProgress(ctx.cwd);
          show(progress ? renderProgress(progress) : "추적 계획이 없습니다. /learn track에서 시작일·총 회차·요일을 확인하세요.");
          return;
        }
        if (command === "finish") {
          if (!ctx.hasUI || !ctx.isIdle()) throw new Error("질문 UI가 있는 Pi에서 응답이 끝난 뒤 실행하세요.");
          if (!approach) throw new Error("/learn finish YYYYMMDD_N 형태로 학습 폴더를 지정하세요.");
          const progress = await getProgress(ctx.cwd);
          if (progress && progress.tracking.courseKey !== courseKey(await readSchedule(ctx.cwd))) throw new Error("목표나 자료 범위가 바뀌었습니다. 기존 진도와 새 계획을 먼저 확인하세요.");
          const session = progress?.sessions.find((item) => item.id === approach);
          if (!session || session.assignment.lessonNumber !== progress?.nextLesson) throw new Error("현재 미완료 추적 회차의 폴더를 지정하세요.");
          const label = await ctx.ui.select("이 회차의 실제 학습 상태", ["완료", "부분학습", "안함"]);
          if (label === undefined) return;
          const status = ({ 완료: "completed", 부분학습: "partial", 안함: "not-studied" } as const)[label as "완료" | "부분학습" | "안함"] as OutcomeStatus;
          const summary = await ctx.ui.input("실제로 한 것과 남은 것 (안 했다면 이유)");
          if (summary === undefined) return;
          const today = localDateKey(new Date());
          const todayOption = `오늘 (${today}, 기기 현지 날짜)`;
          const dateChoice = await ctx.ui.select("실제 학습일 또는 안 한 날 확인", [todayOption, "다른 날짜"]);
          if (dateChoice === undefined) return;
          const studiedOn = dateChoice === todayOption ? today : await ctx.ui.input("실제 학습일 또는 안 한 날 (YYYYMMDD)");
          if (studiedOn === undefined) return;
          if (!await ctx.ui.confirm("학습 상태 저장", `${approach}: ${label}\n날짜: ${studiedOn}\n${summary}\n완료는 참여 확인이며 이해도 판정이 아닙니다. 저장할까요?`)) return;
          await recordOutcome(ctx.cwd, approach, { status, summary, studiedOn: studiedOn.trim(), userConfirmed: true });
          await updateHome(ctx.cwd);
          show(`학습 상태를 기록했습니다: ${label}. /learn progress에서 재배치된 일정을 확인하세요.`);
          return;
        }
        if (command === "schedule") {
          const path = await saveScheduleDocuments(ctx.cwd, await readSchedule(ctx.cwd));
          show(`학습 계획 문서 저장: ${path}\n플래너·실라버스·인계 기록이 생성되었습니다. /learn today로 이어가세요.`);
          return;
        }
        if (command === "home") {
          show(`학습 메인 페이지: ${await updateHome(ctx.cwd)}`);
          return;
        }
        const mode = parseLearningApproach(approach);
        if (command === "demo") {
          const example = await readPlan(fileURLToPath(new URL("../examples/plan.json", import.meta.url)));
          const path = await initializePlan(ctx.cwd, { ...example, mode: mode ?? example.mode });
          show(`예제 지도 생성: ${path}\n실제 학습 목표와는 별개인 예제입니다.`);
          return;
        }
        if (command === "today") {
          let schedule: StudySchedule | undefined;
          try {
            schedule = await readSchedule(ctx.cwd);
          } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
          }
          if (schedule) {
            if (!ctx.isIdle()) throw new Error("현재 응답이 끝난 뒤 다시 실행하세요.");
            const progress = await getProgress(ctx.cwd);
            if (progress && progress.tracking.courseKey !== courseKey(schedule)) throw new Error("목표나 자료 범위가 바뀌었습니다. 기존 진도와 새 계획을 먼저 확인하세요.");
            if (progress && progress.nextLesson === null) {
              await updateHome(ctx.cwd);
              show("확인된 모든 학습 회차가 완료되었습니다. 새 목표는 별도로 계획하세요.");
              return;
            }
            let allowExtra = false;
            let allowOffDay = false;
            if (progress) {
              if (progress.completedToday && !progress.pendingSession) {
                if (!ctx.hasUI || !await ctx.ui.confirm("선택적 추가 학습", "오늘 한 회차를 완료했습니다. 밀린 분량을 강제하지 않습니다. 원해서 한 회차를 더 시작할까요?")) return;
                allowExtra = true;
              }
              if (!progress.tracking.weekdays.includes(weekday(localDateKey(new Date())))) {
                if (!ctx.hasUI || !await ctx.ui.confirm("예정 요일 밖 학습", "오늘은 합의한 학습 요일이 아닙니다. 선택적으로 공부할까요?")) return;
                allowOffDay = true;
              }
              show(renderProgress(progress));
            }
            const sessionSchedule = mode ? { ...schedule, approach: mode === "bottom-up" ? "foundations" as const : "goal" as const } : schedule;
            const session = await createStudySession(ctx.cwd, sessionSchedule, new Date(), { allowExtra, allowOffDay });
            show(`${session.resumed ? "이어할" : "오늘의"} 학습: ${session.directory}\n메인 페이지: ${session.homePath}`);
            startAgent(`Resume learning. Read learning/schedule.json, the latest READY schedule snapshot, and previous substantive learning/sessions/ records before teaching. Current session folder: ${JSON.stringify(session.directory)}. ${session.resumed ? "This is the existing unfinished lesson. Read its actual work and continue only what remains; do not reset its pages or repeat completed steps." : "Its files are newly prepared templates, not prior learning evidence."} ${progress ? `Assigned lesson: ${session.lessonNumber}/${progress.tracking.totalLessons}. Only /learn finish with user confirmation advances progress. Missing dates must not create doubled catch-up work.` : "Tracking is not configured. Do not infer completion from dates; offer /learn track to confirm learning weekdays and total lessons."} Fill this folder's review.md, lesson.md, quiz.md, practice.md, reflection.md, and handoff.md as the learner progresses. Keep index.md as the primary single-page review note: goal, core concepts, detailed explanations with inline/display LaTeX and relevant Mermaid diagrams, and review points. Do not put chat transcripts or answer logs in that page. Keep supporting records in its collapsed callout. Preserve legacy notes and ask before reorganizing them. Offer recall, new learning, a short unassisted check, and subject-appropriate application; do not reveal solutions before the attempt. Keep participation completion separate from understanding. Do not assume yesterday's context or automatically advance a day. ${mode ? `For this session, use the ${learningModeLabel(mode)} approach.` : ""}`);
            return;
          }
        }
        const plan = await readPlan(planPath(ctx.cwd));
        if (command === "map") {
          show(renderMap(plan));
        } else if (command === "export") {
          show(`Markdown 저장: ${await exportNote(ctx.cwd, plan)}`);
        } else {
          const quest = selectQuest(plan, mode ?? plan.mode);
          show(quest
            ? `## 오늘의 질문 (${learningModeLabel(quest.approach)}, ${quest.minutes}분)\n\n${quest.title} [${quest.conceptId}]\n\n${quest.question}\n\n/skill:learn으로 풀이를 이어갈 수 있습니다. 진도는 자동 기록되지 않습니다.`
            : "목표 개념이 이해된 것으로 표시되어 있습니다.");
        }
      } catch (error) {
        ctx.ui.notify(error instanceof Error ? error.message : String(error), "error");
      }
    },
  });
}
