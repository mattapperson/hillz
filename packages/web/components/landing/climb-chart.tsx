import { Eyebrow } from '@/components/site/eyebrow'
import { SectionHeader } from '@/components/site/section-header'

type Point = { iter: number; score: number }

const climb: Point[] = [
  { iter: 0, score: 0.05 },
  { iter: 2, score: 0.1 },
  { iter: 4, score: 0.14 },
  { iter: 6, score: 0.16 },
  { iter: 8, score: 0.18 },
  { iter: 10, score: 0.27 },
  { iter: 12, score: 0.31 },
  { iter: 14, score: 0.33 },
  { iter: 16, score: 0.34 },
  { iter: 18, score: 0.42 },
  { iter: 20, score: 0.45 },
  { iter: 22, score: 0.47 },
  { iter: 24, score: 0.51 },
  { iter: 26, score: 0.54 },
  { iter: 28, score: 0.55 },
  { iter: 30, score: 0.56 },
  { iter: 32, score: 0.62 },
  { iter: 34, score: 0.65 },
  { iter: 36, score: 0.67 },
  { iter: 38, score: 0.69 },
  { iter: 40, score: 0.71 },
  { iter: 42, score: 0.73 },
  { iter: 44, score: 0.74 },
  { iter: 46, score: 0.745 },
  { iter: 48, score: 0.748 },
  { iter: 50, score: 0.75 },
]

const pareto: Array<{ iter: number; score: number; label: string }> = [
  { iter: 8, score: 0.18, label: 'p1' },
  { iter: 14, score: 0.33, label: 'p2' },
  { iter: 22, score: 0.47, label: 'p3' },
  { iter: 30, score: 0.56, label: 'p4' },
  { iter: 38, score: 0.69, label: 'p5' },
  { iter: 48, score: 0.748, label: 'p6 · best' },
]

const W = 800
const H = 320
const PAD_L = 60
const PAD_R = 60
const PAD_T = 30
const PAD_B = 50

const plotW = W - PAD_L - PAD_R
const plotH = H - PAD_T - PAD_B
const bottomY = PAD_T + plotH

function x(iter: number) {
  return PAD_L + (iter / 50) * plotW
}

function y(score: number) {
  return PAD_T + (1 - score) * plotH
}

const linePath = climb
  .map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(p.iter).toFixed(2)} ${y(p.score).toFixed(2)}`)
  .join(' ')

const areaPath = `${linePath} L ${x(50).toFixed(2)} ${bottomY} L ${x(0).toFixed(2)} ${bottomY} Z`

const yTicks = [0, 0.25, 0.5, 0.75, 1.0]
const xTicks = [0, 10, 20, 30, 40, 50]

export function ClimbChart() {
  return (
    <section className="py-24 md:py-32">
      <SectionHeader
        eyebrow="how-it-climbs"
        title="Fifty iterations. One edit per step."
        description="Each accepted candidate joins the Pareto frontier. The line is the running best; the dots are the frontier members surviving at the end of the run."
      />
      <figure className="border border-fd-border bg-fd-card p-4 md:p-6">
        <div className="overflow-x-auto">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            xmlns="http://www.w3.org/2000/svg"
            role="img"
            aria-label="Score versus iteration. Climbing line with six Pareto frontier dots."
            className="w-full h-auto text-fd-foreground"
          >
            <g stroke="currentColor" strokeOpacity="0.08" strokeDasharray="2 4">
              {yTicks.map((t) => (
                <line key={`gy-${t}`} x1={PAD_L} x2={W - PAD_R} y1={y(t)} y2={y(t)} />
              ))}
            </g>

            <g stroke="currentColor" strokeOpacity="0.4">
              <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={H - PAD_B} />
              <line x1={PAD_L} y1={H - PAD_B} x2={W - PAD_R} y2={H - PAD_B} />
            </g>

            <g fontSize="10" fontFamily="var(--font-mono)" fill="currentColor" opacity="0.6">
              {yTicks.map((t) => (
                <text key={`yt-${t}`} x={PAD_L - 8} y={y(t) + 3} textAnchor="end">
                  {t.toFixed(2)}
                </text>
              ))}
              {xTicks.map((t) => (
                <text key={`xt-${t}`} x={x(t)} y={H - PAD_B + 16} textAnchor="middle">
                  {t}
                </text>
              ))}
              <text x={PAD_L - 40} y={PAD_T - 10} textAnchor="start">
                score
              </text>
              <text x={W - PAD_R} y={H - PAD_B + 32} textAnchor="end">
                iteration
              </text>
            </g>

            <path d={areaPath} fill="currentColor" fillOpacity="0.04" />

            <path
              d={linePath}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
              strokeLinecap="round"
            />

            <g>
              {pareto.map((p) => (
                <g key={p.label}>
                  <circle
                    cx={x(p.iter)}
                    cy={y(p.score)}
                    r="5"
                    fill="var(--color-fd-background)"
                    stroke="currentColor"
                    strokeWidth="1.6"
                  />
                  <text
                    x={x(p.iter) + 9}
                    y={y(p.score) - 8}
                    fontFamily="var(--font-mono)"
                    fontSize="10"
                    fill="currentColor"
                    opacity="0.75"
                  >
                    {p.label}
                  </text>
                </g>
              ))}
            </g>
          </svg>
        </div>
        <figcaption className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2">
          <Eyebrow>50 iterations</Eyebrow>
          <Eyebrow>6 frontier candidates</Eyebrow>
          <Eyebrow>+0.70 score delta</Eyebrow>
        </figcaption>
      </figure>
    </section>
  )
}
