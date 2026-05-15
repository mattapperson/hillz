import { ImageResponse } from 'next/og'

export const alt = 'Hillz — eval and auto-improve agent skills via hill climbing'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OG() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        background: '#fafafa',
        color: '#18181b',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '72px',
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        position: 'relative',
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1200 630"
        style={{ position: 'absolute', inset: 0, opacity: 0.07 }}
        role="img"
        aria-label="topographic contour lines"
      >
        <title>topographic contour lines</title>
        <g fill="none" stroke="#000" strokeWidth="1.2">
          <ellipse cx="900" cy="320" rx="180" ry="120" />
          <ellipse cx="900" cy="320" rx="260" ry="170" />
          <ellipse cx="900" cy="320" rx="340" ry="220" />
          <ellipse cx="900" cy="320" rx="420" ry="270" />
          <ellipse cx="900" cy="320" rx="500" ry="320" />
        </g>
      </svg>
      <div
        style={{
          fontFamily: 'ui-monospace, SFMono-Regular, monospace',
          textTransform: 'uppercase',
          letterSpacing: '0.18em',
          fontSize: 20,
          opacity: 0.6,
          display: 'flex',
        }}
      >
        {'// hill-climbing eval harness'}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div
          style={{
            fontFamily: 'ui-monospace, SFMono-Regular, monospace',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            fontSize: 140,
            fontWeight: 500,
            lineHeight: 1,
            display: 'flex',
          }}
        >
          Hillz
        </div>
        <div style={{ fontSize: 36, lineHeight: 1.2, maxWidth: 900, display: 'flex' }}>
          Eval and auto-improve agent skills via hill climbing.
        </div>
      </div>
    </div>,
    size,
  )
}
