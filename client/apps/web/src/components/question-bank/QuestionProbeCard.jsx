import { ArrowRight, BadgeInfo, Languages, Signal } from 'lucide-react';
import { useTranslation } from 'react-i18next';

function _taxonomyLabel({ t, group, key }) {
  if (!key) return '';
  return t(`questionBank.taxonomy.${group}.${key}`, { defaultValue: key });
}

function _difficultyLabel({ t, difficulty }) {
  if (!difficulty) return t('questionBank.difficulty.unknown');
  return t(`questionBank.difficulty.${difficulty}`, {
    defaultValue: String(difficulty),
  });
}

function MetadataPill({ children }) {
  return (
    <span className="inline-flex items-center rounded-md border border-slate-700/70 bg-slate-800/70 px-2 py-1 text-xs text-slate-300">
      {children}
    </span>
  );
}

function CardHeader({ probe }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs text-slate-500 font-mono truncate">
          {probe.code ?? probe.id}
        </p>
        <h2 className="mt-1 text-lg font-heading font-semibold text-white leading-snug">
          {probe.title}
        </h2>
      </div>
      <span className="shrink-0 rounded-md border border-cta/30 bg-cta/10 px-2 py-1 text-xs font-semibold text-cta">
        {_difficultyLabel({ t, difficulty: probe.difficulty })}
      </span>
    </div>
  );
}

function CardMetadata({ probe }) {
  const { t } = useTranslation();
  const roleLabel = probe.roleFamilies
    .map((key) => _taxonomyLabel({ t, group: 'roleFamilies', key }))
    .join(', ');
  const levelLabel = probe.levels
    .map((key) => _taxonomyLabel({ t, group: 'levels', key }))
    .join(', ');

  return (
    <div className="flex flex-wrap gap-2">
      {roleLabel && <MetadataPill>{roleLabel}</MetadataPill>}
      {levelLabel && <MetadataPill>{levelLabel}</MetadataPill>}
      {probe.type && (
        <MetadataPill>
          {_taxonomyLabel({ t, group: 'types', key: probe.type })}
        </MetadataPill>
      )}
    </div>
  );
}

function CardBody({ probe }) {
  return (
    <>
      <p className="text-sm text-slate-300 leading-6 line-clamp-3">
        {probe.displayQuestion}
      </p>
      {probe.displayIntent && (
        <p className="text-xs text-slate-500 leading-5 line-clamp-2">
          {probe.displayIntent}
        </p>
      )}
      <CardMetadata probe={probe} />
      <div className="flex flex-wrap gap-1.5">
        {probe.techTags.slice(0, 5).map((tag) => (
          <span
            key={tag}
            className="rounded-md bg-slate-800 px-2 py-0.5 text-xs text-slate-400"
          >
            {tag}
          </span>
        ))}
      </div>
    </>
  );
}

function CardFooter({ probe }) {
  const { t } = useTranslation();
  return (
    <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-3">
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1">
          <Languages className="w-3.5 h-3.5" />
          {probe.resolvedLocale.toUpperCase()}
        </span>
        {probe.localeFallbackUsed && (
          <span className="inline-flex items-center gap-1 text-amber-300">
            <BadgeInfo className="w-3.5 h-3.5" />
            {t('questionBank.card.fallback')}
          </span>
        )}
        {probe.popularity?.practiceCount ? (
          <span className="inline-flex items-center gap-1">
            <Signal className="w-3.5 h-3.5" />
            {t('questionBank.card.practiceCount', {
              count: probe.popularity.practiceCount,
            })}
          </span>
        ) : null}
      </div>
      <button type="button" disabled title={t('questionBank.card.detailPending')} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs font-semibold text-slate-500 disabled:cursor-not-allowed">
        {t('questionBank.card.open')}
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export default function QuestionProbeCard({ probe }) {
  return (
    <article className="rounded-lg border border-slate-700/60 bg-slate-900/70 p-4 flex flex-col gap-4 min-h-[280px]">
      <CardHeader probe={probe} />
      <CardBody probe={probe} />
      <CardFooter probe={probe} />
    </article>
  );
}
