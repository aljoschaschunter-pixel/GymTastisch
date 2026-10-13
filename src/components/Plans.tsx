import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { db, MAX_PLANS, uid, type Plan } from "../db";
import { unlockAudio } from "../device";
import { useI18n } from "../i18n";
import { exerciseName } from "../seed";
import { ExercisePicker } from "./ExercisePicker";
import { WorkoutSummary } from "./HistoryView";
import { Icon } from "./Icon";
import { ExerciseThumb, Sheet } from "./ui";

export async function startWorkout(plan?: Plan) {
  unlockAudio();
  await db.workouts.add({
    id: uid(),
    startedAt: Date.now(),
    exerciseIds: plan ? [...plan.exerciseIds] : [],
    planId: plan?.id,
  });
}

/** Start screen: guided setup on first use, then the next training day front and centre. */
export function StartScreen() {
  const { t, lang } = useI18n();
  const plans = useLiveQuery(() => db.plans.orderBy("order").toArray(), []);
  const exercises = useLiveQuery(() => db.exercises.toArray(), []);
  const done = useLiveQuery(
    () =>
      db.workouts
        .orderBy("startedAt")
        .reverse()
        .filter((w) => !!w.endedAt)
        .toArray(),
    [],
  );
  const [editing, setEditing] = useState<Plan | "new">();
  if (!plans || !exercises || !done) return null;

  const byId = new Map(exercises.map((e) => [e.id, e]));
  const locale = lang === "de" ? "de-DE" : "en-GB";
  const lastDone = new Map<string, number>();
  for (const w of done)
    if (w.planId && !lastDone.has(w.planId))
      lastDone.set(w.planId, w.startedAt);

  // The day after the most recently trained one, wrapping around.
  const lastPlanIdx = plans.findIndex(
    (p) => p.id === done.find((w) => w.planId)?.planId,
  );
  const next = plans.length
    ? plans[(lastPlanIdx + 1) % plans.length]
    : undefined;

  const when = (p: Plan) => {
    const d = lastDone.get(p.id);
    return d
      ? t("lastDone", { date: relativeDay(d, locale, t("today")) })
      : t("neverDone");
  };
  const editor = editing && (
    <PlanEditor
      plan={editing === "new" ? undefined : editing}
      count={plans.length}
      onClose={() => setEditing(undefined)}
    />
  );
  const header = (
    <header className="start-head">
      <span className="eyebrow">
        {new Date().toLocaleDateString(locale, {
          weekday: "long",
          day: "numeric",
          month: "long",
        })}
      </span>
      <h1>{t("tabWorkout")}</h1>
    </header>
  );

  if (!plans.length) {
    return (
      <div className="page">
        {header}
        <section className="setup">
          <div className="setup-badge">
            <Icon name="dumbbell" size={28} />
          </div>
          <h2>{t("setupTitle")}</h2>
          <p className="muted">{t("setupText")}</p>
          <ol className="steps">
            {(["setupStep1", "setupStep2", "setupStep3"] as const).map(
              (k, i) => (
                <li key={k}>
                  <span className="step-no">{i + 1}</span>
                  <span>{t(k)}</span>
                </li>
              ),
            )}
          </ol>
          <button
            className="btn primary full big"
            onClick={() => setEditing("new")}
          >
            <Icon name="plus" /> {t("setupCta")}
          </button>
        </section>
        <button className="btn ghost full" onClick={() => void startWorkout()}>
          {t("trainWithoutPlan")}
        </button>
        <RecentWorkouts />
        {editor}
      </div>
    );
  }

  return (
    <div className="page">
      {header}
      {next && (
        <section className="next-card">
          <span className="eyebrow accent">{t("upNext")}</span>
          <div className="next-title">
            <h2>{next.name}</h2>
            <button
              className="icon-btn"
              onClick={() => setEditing(next)}
              aria-label={t("editDay")}
            >
              <Icon name="pencil" size={20} />
            </button>
          </div>
          <p className="muted small">
            {t("nExercises", { n: next.exerciseIds.length })} · {when(next)}
          </p>
          {!!next.exerciseIds.length && (
            <div className="thumb-stack">
              {next.exerciseIds.slice(0, 5).map((id) => {
                const e = byId.get(id);
                return e ? (
                  <ExerciseThumb
                    key={id}
                    exercise={e}
                    className="thumb stack-thumb"
                  />
                ) : null;
              })}
              {next.exerciseIds.length > 5 && (
                <span className="stack-more">
                  +{next.exerciseIds.length - 5}
                </span>
              )}
            </div>
          )}
          <button
            className="btn primary full big"
            onClick={() => void startWorkout(next)}
          >
            <Icon name="play" size={18} /> {t("startWorkout")}
          </button>
        </section>
      )}

      <h3 className="group-title">{t("yourDays")}</h3>
      <ul className="list plan-list">
        {plans.map((p) => (
          <li key={p.id}>
            <div className="plan-row-main">
              <button
                className="plan-start"
                onClick={() => void startWorkout(p)}
              >
                <span className="play-dot">
                  <Icon name="play" size={14} />
                </span>
                <span className="grow plan-text">
                  <strong>{p.name}</strong>
                  <span className="muted small clamp">
                    {p.exerciseIds.length
                      ? p.exerciseIds
                          .map((id) => exerciseName(byId.get(id), t))
                          .join(", ")
                      : t("noExercisesYet")}
                  </span>
                </span>
              </button>
              <button
                className="icon-btn muted"
                onClick={() => setEditing(p)}
                aria-label={t("editDay")}
              >
                <Icon name="pencil" size={18} />
              </button>
            </div>
          </li>
        ))}
        {plans.length < MAX_PLANS && (
          <li>
            <button
              className="list-item add-row"
              onClick={() => setEditing("new")}
            >
              <span className="play-dot ghost">
                <Icon name="plus" size={16} />
              </span>
              <span className="grow">{t("addDay")}</span>
            </button>
          </li>
        )}
      </ul>

      <button
        className="btn secondary full"
        onClick={() => void startWorkout()}
      >
        {t("trainWithoutPlan")}
      </button>
      <RecentWorkouts />
      {editor}
    </div>
  );
}

function RecentWorkouts() {
  const { t } = useI18n();
  const recent = useLiveQuery(
    () =>
      db.workouts
        .orderBy("startedAt")
        .reverse()
        .filter((w) => !!w.endedAt)
        .limit(3)
        .toArray(),
    [],
  );
  if (!recent?.length) return null;
  return (
    <section className="stack">
      <h3 className="group-title">{t("recentWorkouts")}</h3>
      {recent.map((w) => (
        <WorkoutSummary key={w.id} workout={w} />
      ))}
    </section>
  );
}

function relativeDay(ts: number, locale: string, today: string) {
  const startOf = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round(
    (startOf(new Date()) - startOf(new Date(ts))) / 86_400_000,
  );
  if (days === 0) return today;
  if (days < 7)
    return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(
      -days,
      "day",
    );
  return new Date(ts).toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
  });
}

function PlanEditor({
  plan,
  count,
  onClose,
}: {
  plan?: Plan;
  count: number;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [name, setName] = useState(plan?.name ?? "");
  const [ids, setIds] = useState<string[]>(plan?.exerciseIds ?? []);
  const [picking, setPicking] = useState(false);
  const exercises = useLiveQuery(() => db.exercises.bulkGet(ids), [ids]);

  const move = (i: number, d: number) => {
    const next = [...ids];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    setIds(next);
  };

  const save = async () => {
    const data = {
      name: name.trim() || t("dayN", { n: count + (plan ? 0 : 1) }),
      exerciseIds: ids,
    };
    if (plan) await db.plans.update(plan.id, data);
    else await db.plans.add({ id: uid(), order: Date.now(), ...data });
    onClose();
  };

  const remove = async () => {
    if (!plan || !confirm(t("deleteDayConfirm"))) return;
    await db.plans.delete(plan.id);
    onClose();
  };

  return (
    <Sheet title={plan ? t("editDay") : t("newDay")} onClose={onClose}>
      <div className="form">
        <label>
          {t("dayName")}
          <input
            value={name}
            placeholder={t("dayNamePlaceholder")}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <div className="field">
          <span>{t("tabExercises")}</span>
          {!ids.length && <p className="muted small">{t("noExercisesYet")}</p>}
          {!!ids.length && (
            <ul className="list">
              {ids.map((id, i) => {
                const e = exercises?.[i];
                return (
                  <li key={id} className="plan-row">
                    {e && <ExerciseThumb exercise={e} />}
                    <span className="grow">{exerciseName(e, t)}</span>
                    <button
                      className="icon-btn"
                      disabled={i === 0}
                      onClick={() => move(i, -1)}
                      aria-label={t("moveUp")}
                    >
                      <Icon name="arrowUp" size={18} />
                    </button>
                    <button
                      className="icon-btn"
                      disabled={i === ids.length - 1}
                      onClick={() => move(i, 1)}
                      aria-label={t("moveDown")}
                    >
                      <Icon name="arrowDown" size={18} />
                    </button>
                    <button
                      className="icon-btn danger-text"
                      onClick={() => setIds(ids.filter((x) => x !== id))}
                      aria-label={t("removeFromWorkout")}
                    >
                      <Icon name="x" size={18} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <button
            type="button"
            className="btn secondary full"
            onClick={() => setPicking(true)}
          >
            <Icon name="plus" size={18} /> {t("addExercise")}
          </button>
        </div>
        <button
          className="btn primary full"
          onClick={save}
          disabled={!plan && count >= MAX_PLANS}
        >
          {t("save")}
        </button>
        {plan && (
          <button className="btn ghost full danger-text" onClick={remove}>
            {t("deleteDay")}
          </button>
        )}
      </div>
      {picking && (
        <Sheet title={t("addExercise")} onClose={() => setPicking(false)}>
          <ExercisePicker
            selected={ids}
            onPick={(id) => {
              if (!ids.includes(id)) setIds([...ids, id]);
              setPicking(false);
            }}
          />
        </Sheet>
      )}
    </Sheet>
  );
}
