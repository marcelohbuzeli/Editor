// Funções de edição do "agente" (as mesmas que a skill editor-plasso usa via window.__agente).
// O app cria o agente sozinho ao abrir (window.__agente) e o botão "Editar com IA" aplica a receita com elas.
export function criarAgente(C) {

  const S = C.S;
  const id = () => Math.random().toString(36).slice(2, 10);
  const norm = (c) => Object.assign({ aOn: true, volume: 1, afi: 0, afo: 0, vfi: 0, vfo: 0, vfa: true, transition: 'none' }, c);
  const idb = (fn) => new Promise((res, rej) => { const r = indexedDB.open('corte', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onerror = () => rej(r.error); r.onsuccess = () => { const tx = r.result.transaction('kv', 'readwrite'); const out = fn(tx.objectStore('kv')); tx.oncomplete = () => res(out && out.result); tx.onerror = () => rej(tx.error); }; });
  const clicar = (sel) => { const b = document.querySelector(sel); if (!b || b.disabled) throw new Error('botão ' + sel + ' indisponível'); b.click(); };

  return {
    // 1) Guarda o projeto que estiver aberto (não apaga nada do Marcelo) e informa se havia projeto.
    async guardarProjetoAtual() {
      const p = await idb((s) => s.get('project'));
      if (!p || !p.media || !p.media.length) return 'sem projeto aberto';
      const chave = 'backup-' + new Date().toISOString().replace(/[:.]/g, '-');
      await idb((s) => s.put(p, chave));
      return 'projeto anterior guardado em ' + chave + ' (' + p.media.length + ' vídeo(s))';
    },

    // 1b) Começa um projeto limpo SEM apagar o banco do Editor (o backup e os arquivos antigos continuam lá).
    novoProjeto() {
      const C2 = window.__corte; try { C2.pause(); } catch {}
      Object.assign(S, { clips: [], audios: [], layers: [], zooms: [], captions: [], words: {}, aspect: null, t: 0, sel: null });
      return 'projeto limpo';
    },
    // 1c) Importa vídeos servidos no Mac pelo servir-brutos.py. nomes = ['A001.mov', ...] na ordem de gravação.
    async importarDoMac(nomes, porta = 8766) {
      const files = [];
      for (const n of nomes) {
        const r = await fetch(`http://127.0.0.1:${porta}/${encodeURIComponent(n)}`);
        if (!r.ok) throw new Error('não baixei ' + n + ' (' + r.status + ')');
        const b = await r.blob(); files.push(new File([b], n, { type: b.type || 'video/mp4' }));
      }
      await C.importVideos(files);
      return S.clips.length + ' vídeo(s) na trilha';
    },
    // Volta um projeto guardado (ex.: o do Marcelo) para ser o projeto aberto. Recarregue a página depois.
    async restaurar(chave) {
      const p = await idb((s) => s.get(chave)); if (!p) throw new Error('backup não encontrado: ' + chave);
      await idb((s) => s.put(p, 'project')); return 'restaurado: ' + chave + ' (recarregue a página)';
    },
    async backups() { return (await idb((s) => s.getAllKeys())).filter((k) => String(k).startsWith('backup-')); },
    // 2) Transcrição feita NO MAC (transcrever-local.py), sem chave: carrega o palavras.json servido em `url`
    //    e monta as legendas do mesmo jeito que o Editor (até 4 palavras, quebra em pausa > 0,7 s ou fim de frase).
    async usarPalavras(url = 'http://127.0.0.1:8768/palavras.json') {
      const r = await fetch(url); if (!r.ok) throw new Error('não baixei as palavras (' + r.status + ')');
      const dados = await r.json();
      const ids = [...new Set(S.clips.map((c) => c.mediaId))];
      let total = 0; const faltando = [];
      for (const mid of ids) {
        const nome = C.media.get(mid)?.name; const ws = dados[nome];
        if (!ws) { faltando.push(nome); continue; }
        S.words[mid] = ws.map((w) => ({ text: w.text, start: w.start, end: w.end })); total += ws.length;
      }
      if (faltando.length) throw new Error('sem transcrição para: ' + faltando.join(', '));
      if (!total) throw new Error('não encontrei fala no áudio');
      S.captions = S.captions.filter((c) => !ids.includes(c.mediaId));
      for (const mid of ids) {
        const blocos = []; let cur = [];
        for (const w of S.words[mid]) { const p = cur[cur.length - 1]; if (p && (cur.length >= 4 || w.start - p.end > 0.7 || /[.!?…]$/.test(p.text))) { blocos.push(cur); cur = []; } cur.push(w); }
        if (cur.length) blocos.push(cur);
        blocos.forEach((bw, i) => { const nx = blocos[i + 1]; let fim = bw[bw.length - 1].end + 0.3; if (nx) fim = Math.min(fim, nx[0].start);
          S.captions.push({ id: id(), mediaId: mid, start: bw[0].start, end: Math.max(fim, bw[0].start + 0.2), text: bw.map((w) => w.text).join(' ') }); });
      }
      return total + ' palavras, ' + S.captions.length + ' legendas';
    },
    // 2b) Alternativa: transcrição pela Groq (só funciona se a chave estiver salva no Editor).
    async transcrever() { await C.transcribeAll(() => {}); return Object.values(S.words).reduce((n, w) => n + w.length, 0) + ' palavras'; },
    // 3) Lista de palavras com tempo, para decidir o que fica (compare com o roteiro).
    palavras() {
      const out = []; let i = 0;
      for (const m of [...new Set(S.clips.map((c) => c.mediaId))]) for (const w of (S.words[m] || [])) out.push({ i: i++, m, t: w.text, s: +w.start.toFixed(2), e: +w.end.toFixed(2) });
      return out;
    },
    texto() { return this.palavras().map((w) => `${w.i}:${w.t}`).join(' '); },
    // 4) Monta a trilha com os trechos que ficam. trechos = [[iPrimeiraPalavra, iUltimaPalavra], ...] na ordem final.
    //    Dentro de cada trecho, pausas maiores que `pausa` segundos são cortadas. pad = folga antes/depois da fala.
    montar(trechos, { pausa = 0.35, pad = 0.08 } = {}) {
      const P = this.palavras(); if (!P.length) throw new Error('sem transcrição');
      const clips = [];
      for (const [a, b] of trechos) {
        const ws = P.slice(a, b + 1); if (!ws.length) continue;
        let ini = ws[0], fim = ws[0];
        const fecha = () => clips.push(norm({ id: id(), mediaId: ini.m, in: Math.max(0, ini.s - pad), out: fim.e + pad }));
        for (const w of ws.slice(1)) { if (w.m !== fim.m || w.s - fim.e > pausa) { fecha(); ini = w; } fim = w; }
        fecha();
      }
      for (let k = 1; k < clips.length; k++) if (clips[k].mediaId === clips[k - 1].mediaId && clips[k].in < clips[k - 1].out) clips[k].in = clips[k - 1].out;
      S.clips = clips.filter((c) => c.out - c.in > 0.12); S.zooms = []; S.sel = null;
      return S.clips.length + ' cortes, ' + S.clips.reduce((t, c) => t + c.out - c.in, 0).toFixed(1) + ' s';
    },
    // Atalho: só tira silêncios (sem retakes), do começo ao fim.
    tirarSilencios(op) { const n = this.palavras().length; return this.montar([[0, n - 1]], op); },
    // 5) Zoom NOS CORTES: no lugar de transição, o take seguinte começa com um zoom in (punch-in) e segura até o
    //    próximo corte, que volta ao normal. Alterna: um take normal, o seguinte aproximado. Nunca zoom solto no meio.
    //    Takes curtos (< minimo s) ficam sem zoom. Pode chamar antes ou depois de combinar(): os zooms dos pontos altos ficam.
    zooms({ forca = 1.12, dur = 0.3, minimo = 1.2 } = {}) {
      S.zooms = S.zooms.filter((z) => z.ponto); const comPonto = new Set(S.zooms.map((z) => z.clipId)); let alterna = false;
      S.clips.forEach((c, i) => {
        if (i === 0) return;
        alterna = !alterna;
        if (alterna && !comPonto.has(c.id) && c.out - c.in >= minimo) S.zooms.push({ id: id(), clipId: c.id, off: 0, dur, type: 'in', amount: forca });
      });
      return S.zooms.length + ' zooms nos cortes';
    },
    // 5b) Zoom no PONTO ALTO (frase de efeito / combinação): o take fica sem zoom até `tempo` (segundos da timeline
    //     final) e aí aproxima. `ate` (opcional) = volta ao normal nesse tempo; sem `ate`, segura até o corte.
    zoomNaFrase(tempo, { forca = 1.2, dur = 0.35, ate = null } = {}) {
      let t = 0;
      for (const c of S.clips) {
        const len = c.out - c.in;
        if (tempo >= t && tempo < t + len - 0.2) {
          S.zooms = S.zooms.filter((z) => z.clipId !== c.id);   // o take começa sem zoom (ponto zero)
          const off = +(tempo - t).toFixed(2);
          S.zooms.push({ id: id(), clipId: c.id, off, dur, type: 'in', amount: forca, ponto: true });
          if (ate != null && ate - t > off + dur + 0.3 && ate - t < len) S.zooms.push({ id: id(), clipId: c.id, off: +(ate - t).toFixed(2), dur, type: 'out', amount: forca, ponto: true });
          return 'zoom no ponto alto em ' + tempo.toFixed(1) + ' s';
        }
        t += len;
      }
      throw new Error('nenhum take em ' + tempo + ' s');
    },
    // Tempo na timeline final de um instante do bruto (mediaId + segundos do arquivo). null se esse trecho foi cortado.
    tempoNaTimeline(mediaId, s) {
      let t = 0;
      for (const c of S.clips) { if (c.mediaId === mediaId && s >= c.in && s < c.out) return t + (s - c.in); t += c.out - c.in; }
      return null;
    },
    // 6) Estilo da legenda na identidade do cliente. Ex.: {tpl:'editorial', font:'Poppins', weight:700, color:'#EEF2F8', size:60, y:0.75, upper:false}
    estilo(o = {}) { Object.assign(S.cap, o); return JSON.stringify(S.cap); },

    // 6b) Motion/título de reforço (frase de efeito) por cima do vídeo. inicio/dur em segundos da timeline final.
    //     layout: 'bloco' | 'script' | 'etiqueta' | 'mix' | 'eco' | 'espacado'. *palavra* = destaque do modelo.
    //     Cores: tcolor (texto) e tacc (destaque); por padrão, as mesmas da legenda (identidade do cliente).
    titulo(texto, inicio, dur = 2.5, { layout = 'mix', tpl = S.cap.tpl, x = 0.5, y = 0.38, size = 80, color = '#FFFFFF', font = S.cap.font, tcolor = S.cap.tcolor || null, tacc = S.cap.tacc || null } = {}) {
      S.layers.push({ id: id(), kind: 'text', name: 'Texto', text: texto, start: inicio, in: 0, out: dur, x, y, scale: 1, rot: 0, op: 1, font, weight: 800, size, color, bg: '', shadow: true, upper: false, tpl, layout, tcolor, tacc });
      return S.layers.length + ' camada(s) de texto';
    },
    // 7) Destaques: palavras que entram na fonte/cor de destaque do modelo (marcadas com *palavra*).
    destacar(lista = []) {
      const alvo = lista.map((x) => x.toLowerCase()); let n = 0;
      for (const c of S.captions) c.text = c.text.split(' ').map((w) => { const k = w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, ''); if (k && alvo.includes(k) && !w.includes('*')) { n++; const m = w.match(/^(.*?)([.,!?…:;]*)$/); return '*' + m[1] + '*' + m[2]; } return w; }).join(' ');
      return n + ' destaques';
    },
    // 7b) COMBINAÇÃO (modelo Elegante): duas partes DIFERENTES da fala, uma grande e outra em manuscrito.
    //     Ex.: combinar('profissão', 'mais vida') → "conteúdo é *profissão* _mais vida_". Nunca a mesma palavra nas duas.
    //     Junta as legendas do trecho num bloco só, se a frase estiver dividida. JÁ COLOCA o zoom no ponto alto
    //     (o take fica sem zoom e aproxima na frase). Com observação "sem zoom": combinar(a, b, {zoom:false}).
    combinar(grande, manuscrito, { zoom = true } = {}) {
      const nk = (w) => String(w).toLowerCase().replace(/[*_]/g, '').replace(/[^\p{L}\p{N}]/gu, '');
      const ga = String(grande).split(/\s+/).map(nk).filter(Boolean), ma = String(manuscrito).split(/\s+/).map(nk).filter(Boolean);
      if (!ga.length || !ma.length) throw new Error('informe as duas partes');
      if (ga.join(' ') === ma.join(' ')) throw new Error('as duas partes precisam ser diferentes');
      const tl = (c) => this.tempoNaTimeline(c.mediaId, c.start) ?? -1;
      const caps = S.captions.filter((c) => tl(c) >= 0).sort((a, b) => tl(a) - tl(b));
      const W = []; caps.forEach((c, ci) => c.text.split(/\s+/).filter(Boolean).forEach((w, wi) => W.push({ ci, wi, k: nk(w) })));
      const achar = (seq, de, ate) => { for (let i = de; i <= Math.min(ate, W.length - seq.length); i++) if (seq.every((s, j) => W[i + j].k === s)) return i; return -1; };
      for (let g = achar(ga, 0, W.length); g >= 0; g = achar(ga, g + 1, W.length)) {
        const m = achar(ma, g + ga.length, g + ga.length + 4); if (m < 0) continue;
        const c0 = W[g].ci, c1 = W[m + ma.length - 1].ci;
        if (caps.slice(c0, c1 + 1).some((c) => c.mediaId !== caps[c0].mediaId)) continue;
        const bloco = caps.slice(c0, c1 + 1);
        const ws = bloco.flatMap((c) => c.text.split(/\s+/).filter(Boolean)).map((w) => w.replace(/[*_]/g, ''));
        const base = W.findIndex((x) => x.ci === c0), gi = g - base, mi = m - base;
        const marca = (a, n, ch) => { ws[a] = ch + ws[a]; const e = a + n - 1; ws[e] = ws[e].replace(/([.,!?…:;]*)$/, ch + '$1'); };
        marca(gi, ga.length, '*'); marca(mi, ma.length, '_');
        const novo = Object.assign(bloco[0], { text: ws.join(' '), end: bloco[bloco.length - 1].end });
        S.captions = S.captions.filter((c) => !bloco.includes(c) || c === novo);
        const w0 = (S.words[novo.mediaId] || []).filter((w) => w.start >= novo.start - 0.05 && w.start < novo.end)[gi];
        const tempo = +(this.tempoNaTimeline(novo.mediaId, w0 ? w0.start : novo.start) ?? tl(novo)).toFixed(2);
        let z = null; if (zoom) { try { z = this.zoomNaFrase(tempo); } catch (e) { z = 'sem zoom: ' + e.message; } }
        return { texto: novo.text, tempo, zoom: z };
      }
      throw new Error('não achei "' + grande + '" seguido de "' + manuscrito + '" na legenda');
    },
    // 8) Aplica tudo na tela e grava (o app redesenha e salva sozinho com desfazer + refazer).
    aplicar() {
      if (typeof C.aplicarEstado === 'function') { C.aplicarEstado(); return S.clips.length + ' cortes na timeline (salvo)'; }
      clicar('#btn-undo'); clicar('#btn-redo'); return S.clips.length + ' cortes na timeline';   // Editor antigo (antes da v22)
    },
    // 9) Galeria: salva o projeto no Supabase (lista de projetos do Editor) e devolve { id, link } para reabrir e ajustar.
    //    meta = { titulo, cliente, taskId, pasta (link da pasta no Drive) }. Depois da exportação, salve de novo com { video }.
    async salvarNaGaleria(meta = {}) {
      if (typeof C.galeriaSalvar !== 'function') throw new Error('Editor antigo: recarregue a página (precisa da v23 ou mais nova)');
      return C.galeriaSalvar(meta);
    },
    // 10) Exporta o vídeo final (Full HD) e manda para o receber-video.py, que grava na pasta do Drive.
    //     Demora (mais que o limite do javascript_tool): comece com exportarParaMacEmSegundoPlano() e confira exportacao().
    exportarParaMacEmSegundoPlano(nome, { porta = 8769, res = '1080' } = {}) {
      window.__exportacao = { fase: 'exportando', inicio: Date.now() };
      (async () => {
        try {
          const f = await C.exportarArquivo(res);
          window.__exportacao = { fase: 'enviando', mb: +(f.size / 1048576).toFixed(1) };
          const r = await fetch(`http://127.0.0.1:${porta}/${encodeURIComponent(nome)}`, { method: 'POST', body: f });
          if (!r.ok) throw new Error('o Mac não recebeu o vídeo (' + r.status + ')');
          window.__exportacao = { fase: 'pronto', mb: +(f.size / 1048576).toFixed(1), ...(await r.json()) };
        } catch (e) { window.__exportacao = { fase: 'erro', erro: String(e.message || e) }; }
      })();
      return 'exportação começou';
    },
    // 11) Tela "Reconectar vídeos" (projeto da galeria aberto num navegador sem os brutos): baixa do servir-brutos.py
    //     os arquivos que a tela pede e entrega para ela. Depois o Editor abre o projeto sozinho (recarrega a página).
    async reconectarDoMac(porta = 8766) {
      const inp = document.querySelector('#gl-arq'); if (!inp) return 'nenhuma tela de reconectar aberta';
      const nomes = [...document.querySelectorAll('#gl-falta span')].map((x) => x.textContent.trim()).filter(Boolean);
      const dt = new DataTransfer();
      for (const n of nomes) {
        const r = await fetch(`http://127.0.0.1:${porta}/${encodeURIComponent(n)}`);
        if (!r.ok) throw new Error('não achei ' + n + ' na pasta servida (' + r.status + ')');
        const b = await r.blob(); dt.items.add(new File([b], n, { type: b.type || 'video/mp4' }));
      }
      inp.files = dt.files; inp.dispatchEvent(new Event('change'));
      return 'reconectados: ' + nomes.join(', ');
    },
    exportacao() { const x = window.__exportacao || { fase: 'parado' }; return x.inicio ? { ...x, segundos: Math.round((Date.now() - x.inicio) / 1000) } : x; },
    resumo() { return { cortes: S.clips.length, duracao: +S.clips.reduce((t, c) => t + c.out - c.in, 0).toFixed(1), legendas: S.captions.length, zooms: S.zooms.length, camadas: S.layers.length, modelo: S.cap.tpl || null }; },
  };
}
