import { useState } from 'react'
import { CDN, PH, fmt } from '../utils/auth'
import { Flame, Thermometer, NotebookPen, ShoppingBag, Snowflake, Sun } from 'lucide-react'

const LEVELS = ['Original', 'Level 1', 'Level 2', 'Level 3', 'Level 4', 'Level 5']
const TEMPS  = [
  { label: 'Normal', icon: Sun },
  { label: 'Dingin', icon: Snowflake },
  { label: 'Panas', icon: Flame }
]

export default function VariantModal({ menu, onConfirm, onClose }) {
  const hasSuhu  = menu?.kategori === 'minuman'
  const hasLevel = menu?.kategori === 'makanan'

  const [level, setLevel] = useState('Original')
  const [suhu,  setSuhu]  = useState('Normal')
  const [note,  setNote]  = useState('')
  const [qty,   setQty]   = useState(1)

  const img = menu?.foto_menu ? `${CDN}/${menu.foto_menu}` : PH

  const handleAdd = () => {
    const varian = {
      ...(hasLevel && { level }),
      ...(hasSuhu  && { suhu }),
      ...(note && { catatan: note }),
    }
    onConfirm(menu, qty, varian)
  }

  return (
    <div className="ovl" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="sheet">
        <div className="sheet-handle" />
        <img
          src={img}
          alt={menu?.nama_menu}
          onError={(e) => { e.target.src = PH }}
          style={{ width: '100%', height: 180, objectFit: 'cover', borderRadius: 16, marginBottom: 16 }}
        />
        <div className="modal-ttl">{menu?.nama_menu}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <span style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 18, color: 'var(--or)' }}>
            {fmt(menu?.harga_jual)}
          </span>
          <span style={{ fontSize: 12, color: 'var(--g500)', background: 'var(--g100)', padding: '2px 8px', borderRadius: 20 }}>
            {menu?.kategori}
          </span>
        </div>

        {hasLevel && (
          <div className="var-grp">
            <span className="var-lbl flex items-center gap-2">
              <Flame size={14} className="text-or" /> Pilih Level Kepedasan
            </span>
            <div className="var-opts">
              {LEVELS.map((l) => (
                <div key={l} className={`var-opt ${level === l ? 'on' : ''}`} onClick={() => setLevel(l)}>
                  {l}
                </div>
              ))}
            </div>
          </div>
        )}

        {hasSuhu && (
          <div className="var-grp">
            <span className="var-lbl flex items-center gap-2">
              <Thermometer size={14} className="text-or" /> Pilih Suhu Minuman
            </span>
            <div className="var-opts">
              {TEMPS.map((t) => (
                <div key={t.label} className={`var-opt flex items-center gap-2 ${suhu === t.label ? 'on' : ''}`} onClick={() => setSuhu(t.label)}>
                  <t.icon size={12} /> {t.label}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="var-grp">
          <span className="var-lbl flex items-center gap-2">
            <NotebookPen size={14} className="text-or" /> Catatan (opsional)
          </span>
          <textarea
            className="rev-input"
            style={{ minHeight: 60 }}
            placeholder="Contoh: jangan pakai bawang, extra sambal..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, background: 'var(--g50)', borderRadius: 12, padding: 12 }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>Jumlah</span>
          <div className="qty-c">
            <button className="qb" onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
            <span className="qv">{qty}</span>
            <button className="qb" onClick={() => setQty((q) => q + 1)}>+</button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn btn-sec"
            style={{ flex: 'none', width: 'auto', padding: '14px 20px' }}
            onClick={onClose}
          >
            Batal
          </button>
          <button className="btn btn-p flex items-center justify-center gap-2" onClick={handleAdd}>
            <ShoppingBag size={18} /> Tambah · {fmt(menu?.harga_jual * qty)}
          </button>
        </div>
      </div>
    </div>
  )
}
