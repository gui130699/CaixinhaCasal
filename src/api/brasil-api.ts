// ============================================================
// BrasilAPI — Bancos
// https://brasilapi.com.br/api/banks/v1
// ============================================================

export interface BrasilBank {
  ispb: string
  name: string
  code: number | null
  fullName: string
}

const BASE_URL = 'https://brasilapi.com.br/api/banks/v1'

let _cache: BrasilBank[] | null = null

export const brasilBanksApi = {
  /** Retorna todos os bancos (cacheado em memória) */
  async getAll(): Promise<BrasilBank[]> {
    if (_cache) return _cache
    const res = await fetch(BASE_URL)
    if (!res.ok) throw new Error('Erro ao buscar lista de bancos')
    const data: BrasilBank[] = await res.json()
    // Remove entradas sem nome útil e ordena alfabeticamente
    _cache = data
      .filter(b => b.name && b.name.trim().length > 0)
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
    return _cache
  },

  /** Busca um banco pelo código numérico */
  async getByCode(code: string | number): Promise<BrasilBank | null> {
    try {
      const res = await fetch(`${BASE_URL}/${code}`)
      if (!res.ok) return null
      return await res.json()
    } catch {
      return null
    }
  },
}
