import type { ReactNode } from 'react'
import { Check } from 'lucide-react'

const CSS = `
.pk-head{display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;margin-bottom:22px}
.pk-hl{display:flex;align-items:center;gap:14px}
.pk-ico{width:48px;height:48px;border-radius:14px;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,rgba(212,175,55,.22),rgba(212,175,55,.04));border:1px solid rgba(212,175,55,.3)}
.pk-title{font:800 24px Cairo,sans-serif;color:#fff;margin:0}
.pk-sub{font:13px Cairo,sans-serif;color:rgba(255,255,255,.5);margin:4px 0 0;line-height:1.7}
.pk-steps{display:flex;align-items:flex-start;margin-bottom:22px}
.pk-step{display:flex;flex-direction:column;align-items:center;gap:6px;min-width:56px}
.pk-dot{width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font:700 12px Montserrat,sans-serif;color:rgba(255,255,255,.4);background:rgba(44,44,44,.5);border:1px solid rgba(212,175,55,.15);transition:all .25s}
.pk-step.on .pk-dot{color:#0B0B0B;background:#D4AF37;border-color:#D4AF37;box-shadow:0 0 14px rgba(212,175,55,.45)}
.pk-step.done .pk-dot{color:#D4AF37;background:rgba(212,175,55,.12);border-color:#D4AF37}
.pk-step span{font:11px Cairo,sans-serif;color:rgba(255,255,255,.4)}
.pk-step.on span{color:#D4AF37;font-weight:700}
.pk-line{flex:1;height:2px;margin:14px 6px 0;background:rgba(212,175,55,.14)}
.pk-line.done{background:#D4AF37}
.pk-panel{background:rgba(20,20,20,.85);border:1px solid rgba(212,175,55,.12);border-radius:16px;padding:20px}
.pk-h2{font:700 16px Cairo,sans-serif;color:#fff;margin:0 0 14px}
.pk-lbl{display:block;font:600 12px Cairo,sans-serif;color:rgba(255,255,255,.55);margin-bottom:8px}
.pk-input{width:100%;box-sizing:border-box;background:rgba(11,11,11,.65);border:1px solid rgba(212,175,55,.2);border-radius:12px;padding:13px 14px;color:#fff;font:15px Montserrat,Cairo,sans-serif;outline:none;transition:border-color .2s,box-shadow .2s}
.pk-input:focus{border-color:rgba(212,175,55,.6);box-shadow:0 0 0 3px rgba(212,175,55,.08)}
.pk-input:disabled{opacity:.5;cursor:not-allowed}
.pk-opt{background:rgba(44,44,44,.3);border:1px solid rgba(212,175,55,.14);border-radius:12px;padding:14px;cursor:pointer;color:#fff;font:700 14px Montserrat,sans-serif;transition:all .2s;text-align:right}
.pk-opt:hover:not(:disabled){border-color:rgba(212,175,55,.5);transform:translateY(-1px)}
.pk-opt.sel{background:rgba(212,175,55,.1);border-color:#D4AF37;color:#D4AF37}
.pk-opt:disabled{opacity:.45;cursor:not-allowed}
.pk-pill{display:inline-block;font:700 11px Cairo,sans-serif;padding:4px 10px;border-radius:999px;white-space:nowrap}
.pk-tabs{display:flex;gap:6px;padding:4px;margin-bottom:20px;background:rgba(20,20,20,.85);border:1px solid rgba(212,175,55,.1);border-radius:14px;overflow-x:auto}
.pk-tab{flex:1;white-space:nowrap;display:flex;align-items:center;justify-content:center;gap:7px;border:none;background:none;border-radius:10px;padding:10px 14px;cursor:pointer;color:rgba(255,255,255,.45);font:600 13px Cairo,sans-serif;transition:all .2s}
.pk-tab.on{background:rgba(212,175,55,.14);color:#D4AF37}
.pk-tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:18px}
.pk-tile{background:rgba(20,20,20,.85);border:1px solid rgba(212,175,55,.12);border-radius:14px;padding:16px}
.pk-tile small{display:block;font:12px Cairo,sans-serif;color:rgba(255,255,255,.45);margin-bottom:6px}
.pk-tile b{font:800 20px Montserrat,sans-serif;color:#fff;direction:ltr;display:inline-block}
.pk-empty{display:flex;flex-direction:column;align-items:center;gap:10px;padding:46px 20px;text-align:center;font:14px Cairo,sans-serif;color:rgba(255,255,255,.4)}
.pk-empty i{width:54px;height:54px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(212,175,55,.06);border:1px solid rgba(212,175,55,.12)}
.pk-note{display:flex;gap:10px;padding:12px 14px;border-radius:12px;font:12px Cairo,sans-serif;line-height:1.9}
.pk-mono{font-family:Montserrat,sans-serif;direction:ltr;display:inline-block}
`

export function PageStyles() { return <style>{CSS}</style> }

export function PageHeader({ icon, title, sub, right }: { icon: ReactNode; title: string; sub?: string; right?: ReactNode }) {
  return (
    <div className="pk-head">
      <div className="pk-hl">
        <div className="pk-ico">{icon}</div>
        <div>
          <h1 className="pk-title">{title}</h1>
          {sub && <p className="pk-sub">{sub}</p>}
        </div>
      </div>
      {right}
    </div>
  )
}

export function Steps({ labels, current }: { labels: string[]; current: number }) {
  return (
    <div className="pk-steps">
      {labels.map((l, i) => {
        const n = i + 1
        const cls = n === current ? 'on' : n < current ? 'done' : ''
        return (
          <div key={l} style={{ display: 'contents' }}>
            <div className={`pk-step ${cls}`}>
              <div className="pk-dot">{n < current ? <Check size={14} /> : n}</div>
              <span>{l}</span>
            </div>
            {i < labels.length - 1 && <div className={`pk-line ${n < current ? 'done' : ''}`} />}
          </div>
        )
      })}
    </div>
  )
}

export function Pill({ color, children }: { color: string; children: ReactNode }) {
  return <span className="pk-pill" style={{ background: color + '1f', color }}>{children}</span>
}

export function Empty({ icon, text, children }: { icon: ReactNode; text: string; children?: ReactNode }) {
  return <div className="pk-empty"><i>{icon}</i><div>{text}</div>{children}</div>
}
