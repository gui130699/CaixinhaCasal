import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type KeyboardEvent,
} from 'react'
import { cn } from '@/lib/utils'
import { brasilBanksApi, type BrasilBank } from '@/api/brasil-api'

interface BankSelectorProps {
  label?: string
  error?: string
  /** Valor atual exibido no campo (nome do banco) */
  value?: string
  onSelect: (bank: { code: string; name: string }) => void
  required?: boolean
}

export function BankSelector({
  label = 'Banco',
  error,
  value = '',
  onSelect,
  required,
}: BankSelectorProps) {
  const [query, setQuery] = useState(value)
  const [banks, setBanks] = useState<BrasilBank[]>([])
  const [filtered, setFiltered] = useState<BrasilBank[]>([])
  const [open, setOpen] = useState(false)
  const [loadingList, setLoadingList] = useState(false)
  const [loadingCode, setLoadingCode] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)

  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const codeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync value from outside
  useEffect(() => { setQuery(value) }, [value])

  // Click outside → fecha dropdown
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Carrega lista de bancos uma vez ao abrir ou ao digitar
  const ensureBanks = useCallback(async () => {
    if (banks.length > 0) return
    setLoadingList(true)
    try {
      const data = await brasilBanksApi.getAll()
      setBanks(data)
    } catch { /* ignora */ } finally {
      setLoadingList(false)
    }
  }, [banks.length])

  // Filtra lista conforme query
  useEffect(() => {
    if (!query.trim()) {
      setFiltered(banks.slice(0, 80))
      return
    }
    const q = query.trim().toLowerCase()
    const results = banks.filter(b => {
      const code = b.code !== null ? String(b.code) : ''
      return (
        b.name.toLowerCase().includes(q) ||
        b.fullName?.toLowerCase().includes(q) ||
        code.startsWith(q)
      )
    })
    setFiltered(results.slice(0, 80))
  }, [query, banks])

  // Busca por código após pausa de digitação
  useEffect(() => {
    const isNumeric = /^\d+$/.test(query.trim())
    if (!isNumeric || query.trim().length < 3) return

    if (codeTimerRef.current) clearTimeout(codeTimerRef.current)
    codeTimerRef.current = setTimeout(async () => {
      setLoadingCode(true)
      try {
        const bank = await brasilBanksApi.getByCode(query.trim())
        if (bank) {
          setQuery(bank.name)
          onSelect({ code: String(bank.code ?? ''), name: bank.name })
          setOpen(false)
        }
      } catch { /* ignora */ } finally {
        setLoadingCode(false)
      }
    }, 600)

    return () => { if (codeTimerRef.current) clearTimeout(codeTimerRef.current) }
  }, [query, onSelect])

  const handleFocus = async () => {
    await ensureBanks()
    setOpen(true)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value)
    setOpen(true)
    setActiveIndex(-1)
    if (!e.target.value) {
      onSelect({ code: '', name: '' })
    }
  }

  const selectBank = (bank: BrasilBank) => {
    setQuery(bank.name)
    onSelect({ code: String(bank.code ?? ''), name: bank.name })
    setOpen(false)
    setActiveIndex(-1)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(i => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i => Math.max(i - 1, -1))
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault()
      selectBank(filtered[activeIndex])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  // Scroll item ativo para visível
  useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return
    const item = listRef.current.children[activeIndex] as HTMLElement | undefined
    item?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  const inputId = 'bank-selector'

  return (
    <div ref={containerRef} className="w-full relative">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          autoComplete="off"
          placeholder="Pesquise por nome ou código do banco..."
          value={query}
          onChange={handleChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          className={cn(
            'input-base pr-10',
            error && 'border-red-400 focus:border-red-400 focus:ring-red-400/30',
          )}
        />
        {/* Ícone de status */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
          {loadingList || loadingCode ? (
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          ) : (
            <svg className={cn('w-4 h-4 transition-transform duration-200', open && 'rotate-180')} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </div>
      </div>

      {/* Hint */}
      {!error && (
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
          Digite o nome ou o código do banco. Ex: <span className="font-medium">341</span> para Itaú.
        </p>
      )}
      {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg overflow-hidden">
          {loadingList && (
            <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              Carregando bancos...
            </div>
          )}
          {!loadingList && filtered.length === 0 && (
            <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
              Nenhum banco encontrado
            </div>
          )}
          {!loadingList && filtered.length > 0 && (
            <ul
              ref={listRef}
              className="max-h-56 overflow-y-auto scrollbar-thin py-1"
              role="listbox"
            >
              {filtered.map((bank, idx) => (
                <li
                  key={bank.ispb}
                  role="option"
                  aria-selected={idx === activeIndex}
                  onMouseDown={() => selectBank(bank)}
                  onMouseEnter={() => setActiveIndex(idx)}
                  className={cn(
                    'flex items-center gap-3 px-3.5 py-2.5 cursor-pointer text-sm transition-colors',
                    idx === activeIndex
                      ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                      : 'text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50',
                  )}
                >
                  {bank.code !== null && (
                    <span className="flex-shrink-0 w-10 text-center text-xs font-mono font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-lg py-0.5">
                      {bank.code}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="font-medium truncate">{bank.name}</p>
                    {bank.fullName && bank.fullName !== bank.name && (
                      <p className="text-xs text-gray-400 truncate">{bank.fullName}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
