import { useCallback, useEffect, useRef, useState } from 'react'

/* eslint-disable @typescript-eslint/no-explicit-any */
function criarReconhecedor(): any | null {
  const w = window as any
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition
  return Ctor ? new Ctor() : null
}

/**
 * Ditado por voz (Web Speech API, pt-BR).
 * `aoTexto(texto, final)` é chamado com texto parcial (final=false) e final (final=true).
 */
export function useDitado(aoTexto: (texto: string, final: boolean) => void) {
  const [ouvindo, setOuvindo] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const rec = useRef<any>(null)
  const cb = useRef(aoTexto)
  cb.current = aoTexto
  const suportado = typeof window !== 'undefined' && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)

  const parar = useCallback(() => { try { rec.current?.stop() } catch { /* ignora */ } }, [])

  const iniciar = useCallback(() => {
    setErro(null)
    const r = criarReconhecedor()
    if (!r) { setErro('Ditado por voz não é suportado neste navegador.'); return }
    r.lang = 'pt-BR'
    r.continuous = false
    r.interimResults = true
    r.onresult = (e: any) => {
      let parcial = ''
      let final = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) final += t
        else parcial += t
      }
      if (final) cb.current(final.trim(), true)
      else if (parcial) cb.current(parcial.trim(), false)
    }
    r.onerror = (e: any) => {
      setErro(e.error === 'not-allowed' ? 'Permita o acesso ao microfone para ditar.' : e.error === 'no-speech' ? 'Não ouvi nada. Tente de novo.' : 'Não foi possível usar o microfone.')
      setOuvindo(false)
    }
    r.onend = () => setOuvindo(false)
    rec.current = r
    try { r.start(); setOuvindo(true) } catch { setOuvindo(false) }
  }, [])

  useEffect(() => () => { try { rec.current?.abort() } catch { /* ignora */ } }, [])

  return { suportado, ouvindo, iniciar, parar, erro }
}
