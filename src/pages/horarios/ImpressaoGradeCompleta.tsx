import { 
  DIAS_SEMANA, 
  NOMES_DIAS, 
  ESTRUTURA_AULAS, 
  GradeHorarioItem, 
  normalizarNomeTurma, 
  getEstiloBadgeCor, 
  obterCorEfetivaProfessor,
  IdFonteGrade,
  getFontFamilyById
} from "@/services/gradeHorarios"

export interface DadosImpressaoConfig {
  turno?: "INTEGRAL_COMPLETO" | "MANHA" | "TARDE" | "NOTURNO"
  turmas?: string[]
  dias?: string[]
  professor?: string
  filtroDescricaoTurmas?: string
  filtroDescricaoDias?: string
  filtroDescricaoTurno?: string
  tituloEmergencia?: string
  motivoEmergencia?: string
  instanciaEmergencia?: string
  somenteAulasEmergencia?: boolean
}

interface ImpressaoGradeCompletaProps {
  modo: "ATUAL" | "TURNO" | "TODOS" | "PROFESSOR" | "EMERGENCIA"
  dadosImpressao?: DadosImpressaoConfig
  professorSelecionado?: string
  textoVigencia: string
  turmasIntegral: string[]
  turmasNoturno: string[]
  itensGrade: GradeHorarioItem[]
  isRascunho?: boolean
  isEmergencia?: boolean
  tituloEmergencia?: string
  motivoEmergencia?: string
  diasEmergencia?: string[]
  somenteAulasEmergencia?: boolean
  idFonte?: IdFonteGrade
}

export function ImpressaoGradeCompleta({
  modo,
  dadosImpressao,
  professorSelecionado,
  textoVigencia,
  turmasIntegral,
  turmasNoturno,
  itensGrade,
  isRascunho,
  isEmergencia,
  tituloEmergencia,
  motivoEmergencia,
  diasEmergencia,
  somenteAulasEmergencia,
  idFonte = "inter",
}: ImpressaoGradeCompletaProps) {
  // Mapa de itens para acesso O(1), suportando lookup com ou sem segmento
  const mapaItens = new Map<string, GradeHorarioItem>()
  for (const item of itensGrade) {
    mapaItens.set(`${item.segmento}_${item.dia_semana}_${item.numero_aula}_${normalizarNomeTurma(item.turma_nome)}`, item)
    mapaItens.set(`${item.segmento}_${item.dia_semana}_${item.numero_aula}_${item.turma_nome}`, item)
    // Lookup direto por dia e aula (fundamental para INTEGRAL_COMPLETO que reúne manhã e tarde)
    mapaItens.set(`${item.dia_semana}_${item.numero_aula}_${normalizarNomeTurma(item.turma_nome)}`, item)
    mapaItens.set(`${item.dia_semana}_${item.numero_aula}_${item.turma_nome}`, item)
  }

  const fontFamilyEfetiva = getFontFamilyById(idFonte)

  function renderTabelaTurno(
    tituloTurno: string,
    subtitulo: string,
    segmento: string,
    turmas: string[],
    aulas: { numero: number; rotulo: string }[],
    diasCustom?: string[],
    filtroTurmasTexto?: string,
    filtroDiasTexto?: string,
    profDestaque?: string
  ) {
    const diasParaExibir = (diasCustom && diasCustom.length > 0)
      ? DIAS_SEMANA.filter(d => diasCustom.includes(d))
      : DIAS_SEMANA

    const totalLinhas = diasParaExibir.length * aulas.length
    const totalColunas = turmas.length

    // Altura dinâmica da linha para encaixe proporcional no A4 Paisagem
    let alturaLinhaClasse = "h-[22px]"
    if (totalLinhas <= 10) alturaLinhaClasse = "h-[34px]"
    else if (totalLinhas <= 18) alturaLinhaClasse = "h-[28px]"
    else if (totalLinhas <= 25) alturaLinhaClasse = "h-[22px]"
    else if (totalLinhas <= 35) alturaLinhaClasse = "h-[16.5px]"
    else alturaLinhaClasse = "h-[13px]"

    // Tamanho dinâmico das fontes das células baseado nas colunas
    const tamanhoDisciplina = totalColunas <= 3 
      ? "text-[10px]" 
      : totalColunas <= 5 
        ? "text-[9px]" 
        : totalLinhas > 35 
          ? "text-[7px]" 
          : "text-[8px]"

    const tamanhoProfessor = totalColunas <= 3 
      ? "text-[9px]" 
      : totalColunas <= 5 
        ? "text-[8px]" 
        : totalLinhas > 35 
          ? "text-[6.5px]" 
          : "text-[7.5px]"

    return (
      <div 
        className="pagina-folha-a4-impressao text-black bg-white"
        style={{ fontFamily: fontFamilyEfetiva }}
      >
        {/* Cabeçalho da Folha A4 */}
        <div className="flex items-center justify-between border-b-2 border-black pb-1 mb-1">
          <div className="flex-1 pr-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-sm font-black tracking-tight uppercase text-black leading-tight">
                EEMTI ANTONIETA SIQUEIRA • QUADRO DE HORÁRIOS
              </h1>
              {isRascunho && (
                <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 border border-black bg-slate-200">
                  PRÉ-DIVULGAÇÃO (RASCUNHO)
                </span>
              )}
            </div>

            <div className="text-[11px] font-bold text-slate-800 leading-tight flex items-center gap-2 flex-wrap mt-0.5">
              <span>{tituloTurno} — <span className="font-normal text-slate-700">{subtitulo}</span></span>
              {filtroTurmasTexto && (
                <span className="text-[9.5px] font-bold px-1.5 py-0.2 bg-slate-100 border border-black/60 rounded-xs">
                  Turmas: {filtroTurmasTexto}
                </span>
              )}
              {filtroDiasTexto && (
                <span className="text-[9.5px] font-bold px-1.5 py-0.2 bg-slate-100 border border-black/60 rounded-xs">
                  Dias: {filtroDiasTexto}
                </span>
              )}
              {profDestaque && (
                <span className="text-[9.5px] font-black px-1.5 py-0.2 bg-amber-100 border border-amber-800 rounded-xs">
                  Destaque: {profDestaque}
                </span>
              )}
              {isEmergencia && (
                <span className="text-[9.5px] font-black px-1.5 py-0.2 bg-red-100 text-red-950 border border-red-800 rounded-xs">
                  🚨 HORÁRIO EMERGENCIAL {tituloEmergencia ? `(${tituloEmergencia})` : 'TEMPORÁRIO'}
                </span>
              )}
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="text-[11px] font-black text-black block leading-tight">
              {textoVigencia || "Válido a partir de 05/02/2026 • 1º Bimestre"}
            </span>
            <span className="text-[9px] text-slate-600 block leading-tight">
              {isEmergencia ? "🚨 Horário de Emergência • " : isRascunho ? "Rascunho de Edição • " : ""}Gerado em: {new Date().toLocaleDateString("pt-BR")}
            </span>
          </div>
        </div>

        {/* Tabela da Grade de Horários */}
        <div className="w-full border-2 border-black">
          <table className="w-full border-collapse text-left border-spacing-0 table-fixed">
            <thead>
              <tr className="bg-slate-200 text-black border-b-2 border-black text-center h-6">
                <th className="border-r-2 border-black p-0.5 text-center font-black text-[10px] w-11">
                  DIA
                </th>
                <th className="border-r-2 border-black p-0.5 text-center font-black text-[9.5px] w-14">
                  AULAS
                </th>
                {turmas.map((turma) => (
                  <th
                    key={turma}
                    className="border-r border-black p-0.5 text-center font-black text-[10.5px] uppercase"
                  >
                    {turma}
                  </th>
                ))}
                <th className="border-l-2 border-black p-0.5 text-center font-black text-[10px] w-11">
                  DIA
                </th>
              </tr>
            </thead>

            <tbody>
              {diasParaExibir.map((dia) => {
                return aulas.map((aula, aulaIdx) => {
                  const isPrimeira = aulaIdx === 0
                  const isUltima = aulaIdx === aulas.length - 1

                  return (
                    <tr
                      key={`${dia}_${aula.numero}`}
                      className={`${alturaLinhaClasse} ${isUltima ? "border-b-2 border-black" : "border-b border-black/40"}`}
                    >
                      {/* Coluna Dia Início */}
                      {isPrimeira && (
                        <td
                          rowSpan={aulas.length}
                          className="border-r-2 border-black p-0.5 text-center font-black text-xs bg-slate-100 text-black align-middle select-none"
                        >
                          {dia}
                        </td>
                      )}

                      {/* Coluna Aula */}
                      <td className="border-r-2 border-black p-0 text-center font-bold text-[8.5px] bg-slate-50 text-black whitespace-nowrap align-middle">
                        {aula.numero}ª AULA
                      </td>

                      {/* Células das Turmas */}
                      {turmas.map((turma) => {
                        const chaveNorm = `${segmento}_${dia}_${aula.numero}_${normalizarNomeTurma(turma)}`
                        const chaveSimples = `${dia}_${aula.numero}_${normalizarNomeTurma(turma)}`
                        const item = mapaItens.get(chaveNorm) || mapaItens.get(chaveSimples)
                        
                        const cor = item?.cor_destaque || (item?.professor_nome ? obterCorEfetivaProfessor(item.professor_nome) : "")
                        const estilo = cor ? getEstiloBadgeCor(cor) : undefined

                        const isProfDestaque = profDestaque && item?.professor_nome?.toUpperCase().trim() === profDestaque.toUpperCase().trim()

                        return (
                          <td
                            key={turma}
                            className={`border-r border-black p-0 text-center align-middle ${alturaLinhaClasse} overflow-hidden ${
                              isProfDestaque ? "ring-2 ring-inset ring-black font-black" : ""
                            }`}
                            style={item ? estilo : undefined}
                          >
                            {item ? (
                              <div className="flex flex-col items-center justify-center leading-[1.05] px-0.5">
                                <span className={`font-black ${tamanhoDisciplina} truncate w-full tracking-tighter`}>
                                  {item.disciplina_nome}
                                </span>
                                <span className={`font-bold ${tamanhoProfessor} truncate w-full opacity-90 ${isProfDestaque ? "underline font-black" : ""}`}>
                                  {item.professor_nome}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[8px] text-slate-300">-</span>
                            )}
                          </td>
                        )
                      })}

                      {/* Coluna Dia Fim */}
                      {isPrimeira && (
                        <td
                          rowSpan={aulas.length}
                          className="border-l-2 border-black p-0.5 text-center font-black text-xs bg-slate-100 text-black align-middle select-none"
                        >
                          {dia}
                        </td>
                      )}
                    </tr>
                  )
                })
              })}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  function renderTabelaProfessor(profNome: string) {
    const busca = profNome.trim().toUpperCase()
    const aulasDoProf = itensGrade.filter(
      (i) => i.professor_nome?.toUpperCase() === busca
    )
    const corProf = obterCorEfetivaProfessor(profNome)
    const estiloProf = getEstiloBadgeCor(corProf)

    return (
      <div 
        className="pagina-folha-a4-impressao text-black bg-white"
        style={{ fontFamily: fontFamilyEfetiva }}
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-3">
          <div>
            <h1 className="text-base font-black uppercase text-black">
              EEMTI ANTONIETA SIQUEIRA • HORÁRIO INDIVIDUAL DO PROFESSOR
            </h1>
            <h2 className="text-sm font-extrabold flex items-center gap-2 mt-0.5">
              Docente:{" "}
              <span className="px-2.5 py-0.5 rounded-md border text-xs font-black" style={estiloProf}>
                {profNome}
              </span>
            </h2>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold text-black block">
              {textoVigencia || "Válido a partir de 05/02/2026 • 1º Bimestre"}
            </span>
            <span className="text-xs text-slate-700 block font-semibold mt-0.5">
              Carga Horária Semanal: {aulasDoProf.length} Aulas
            </span>
          </div>
        </div>

        {/* Grade Semanal do Docente */}
        <div className="grid grid-cols-5 gap-2.5 border-2 border-black p-2.5 rounded-md bg-slate-50">
          {DIAS_SEMANA.map((dia) => {
            const aulasDia = aulasDoProf
              .filter((a) => a.dia_semana === dia)
              .sort((a, b) => a.numero_aula - b.numero_aula)

            return (
              <div key={dia} className="border-2 border-black bg-white rounded-sm overflow-hidden flex flex-col">
                <div className="bg-slate-200 border-b-2 border-black p-1 text-center font-black text-[11px] uppercase">
                  {NOMES_DIAS[dia]}
                </div>
                <div className="p-1.5 flex flex-col gap-1.5 flex-1 min-h-[220px]">
                  {aulasDia.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-center text-slate-400 text-xs italic">
                      Sem aulas
                    </div>
                  ) : (
                    aulasDia.map((aula) => (
                      <div
                        key={`${aula.segmento}_${aula.numero_aula}_${aula.turma_nome}`}
                        className="p-1 border border-black rounded-xs text-xs"
                        style={estiloProf}
                      >
                        <div className="flex justify-between font-bold text-[9.5px] pb-0.5 border-b border-black/20">
                          <span>{aula.numero_aula}ª AULA</span>
                          <span className="font-black uppercase">{aula.turma_nome}</span>
                        </div>
                        <div className="font-black text-[10px] pt-0.5 truncate">
                          {aula.disciplina_nome}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  /**
   * Tabela Oficial Semanal de UMA TURMA INDIVIDUAL (1 PÁGINA A4 GARANTIDA)
   * Dias nas colunas (Segunda a Sexta) e Horários nas linhas (1ª a 9ª aula).
   * Encaixe perfeito, sem quebra de página, ultra-legível para alunos, pais e professores.
   */
  function renderTabelaTurmaSemanal(
    turmaAlvo: string,
    diasCustom?: string[],
    filtroTurmasTexto?: string
  ) {
    const nomeNorm = normalizarNomeTurma(turmaAlvo)
    const aulasTurma = itensGrade.filter(i => normalizarNomeTurma(i.turma_nome) === nomeNorm)
    const isNoturno = aulasTurma.some(i => i.segmento === "NOTURNO") || turmaAlvo.toUpperCase().includes("NOT") || turmaAlvo.toUpperCase().includes("NOITE")
    const estrutura = isNoturno ? ESTRUTURA_AULAS.NOTURNO : ESTRUTURA_AULAS.INTEGRAL_COMPLETO
    const diasParaExibir = (diasCustom && diasCustom.length > 0)
      ? DIAS_SEMANA.filter(d => diasCustom.includes(d))
      : DIAS_SEMANA

    // Mapa dia_aula -> item
    const mapa = new Map<string, GradeHorarioItem>()
    for (const item of aulasTurma) {
      mapa.set(`${item.dia_semana}_${item.numero_aula}`, item)
    }

    const totalAulas = aulasTurma.filter(i => i.disciplina_nome?.trim()).length
    const professoresTurma = Array.from(new Set(aulasTurma.map(i => i.professor_nome?.trim()).filter(Boolean))).sort()

    return (
      <div 
        className="pagina-folha-a4-impressao text-black bg-white"
        style={{ 
          fontFamily: fontFamilyEfetiva, 
          pageBreakInside: 'avoid', 
          breakInside: 'avoid',
          pageBreakAfter: 'avoid',
          breakAfter: 'avoid'
        }}
      >
        {/* Cabeçalho da Folha A4 */}
        <div className="flex items-center justify-between border-b-2 border-black pb-1.5 mb-2">
          <div className="flex-1 pr-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-sm font-black tracking-tight uppercase text-black leading-tight">
                EEMTI ANTONIETA SIQUEIRA • HORÁRIO SEMANAL DE AULAS
              </h1>
              <span className="text-xs font-black px-2 py-0.5 rounded-xs bg-black text-white uppercase shadow-2xs">
                TURMA: {turmaAlvo}
              </span>
              {isRascunho && (
                <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 border border-black bg-slate-200">
                  RASCUNHO
                </span>
              )}
            </div>

            <div className="text-[11px] font-bold text-slate-800 leading-tight flex items-center gap-2 flex-wrap mt-0.5">
              <span>{isNoturno ? "Ensino Médio Noturno (1ª a 4ª Aula)" : "Ensino Médio em Tempo Integral (1ª a 9ª Aula)"}</span>
              {filtroTurmasTexto && (
                <span className="text-[9.5px] font-bold px-1.5 py-0.2 bg-slate-100 border border-black/60 rounded-xs">
                  {filtroTurmasTexto}
                </span>
              )}
              {isEmergencia && (
                <span className="text-[9.5px] font-black px-1.5 py-0.2 bg-amber-100 text-amber-950 border border-amber-800 rounded-xs">
                  🚨 HORÁRIO EMERGENCIAL {tituloEmergencia ? `(${tituloEmergencia})` : 'ATIVO'}
                </span>
              )}
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="text-[11px] font-black text-black block leading-tight">
              {textoVigencia || "Ano Letivo 2026"}
            </span>
            <span className="text-[9px] text-slate-600 block leading-tight">
              Documento Oficial • Gerado em: {new Date().toLocaleDateString("pt-BR")}
            </span>
          </div>
        </div>

        {/* Tabela Semanal da Turma: Colunas = Dias, Linhas = Aulas (1 PÁGINA GARANTIDA) */}
        <div className="w-full border-2 border-black">
          <table className="w-full border-collapse text-left border-spacing-0 table-fixed">
            <thead>
              <tr className="bg-slate-200 text-black border-b-2 border-black text-center h-7">
                <th className="border-r-2 border-black p-1 text-center font-black text-[10px] w-28">
                  HORÁRIO / AULA
                </th>
                {diasParaExibir.map((dia) => (
                  <th
                    key={dia}
                    className="border-r border-black p-1 text-center font-black text-[11px] uppercase last:border-r-0"
                  >
                    {NOMES_DIAS[dia]}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {estrutura.map((aula, idx) => {
                const isUltima = idx === estrutura.length - 1
                const isFimManha = aula.numero === 5 && !isNoturno

                return (
                  <tr
                    key={aula.numero}
                    className={`${isNoturno ? "h-[65px]" : "h-[36px]"} ${
                      isUltima ? "border-b-0" : isFimManha ? "border-b-2 border-black" : "border-b border-black/40"
                    }`}
                  >
                    {/* Coluna do Horário / Número da Aula */}
                    <td className="border-r-2 border-black p-1 text-center font-black text-[9.5px] bg-slate-100 text-black whitespace-nowrap align-middle">
                      <div className="flex flex-col items-center justify-center leading-tight">
                        <span className="font-black text-[10px]">{aula.numero}ª AULA</span>
                        <span className="text-[8.5px] text-slate-600 font-semibold">{aula.rotulo.split('(')[1]?.replace(')', '') || ''}</span>
                      </div>
                    </td>

                    {/* Células dos Dias da Semana */}
                    {diasParaExibir.map((dia) => {
                      const item = mapa.get(`${dia}_${aula.numero}`)
                      const temAula = Boolean(item && (item.disciplina_nome?.trim() || item.professor_nome?.trim()))
                      const prof = item?.professor_nome?.trim() || ""
                      const disc = item?.disciplina_nome?.trim() || ""
                      const cor = item?.cor_destaque || (prof ? obterCorEfetivaProfessor(prof) : "")
                      const estiloBadge = cor ? getEstiloBadgeCor(cor) : undefined

                      return (
                        <td
                          key={dia}
                          className="border-r border-black/40 p-1 text-center align-middle last:border-r-0 hover:bg-slate-50"
                        >
                          {temAula ? (
                            <div className="flex flex-col items-center justify-center gap-0.5 w-full">
                              <span className="font-black text-[10.5px] uppercase tracking-tight line-clamp-1 leading-tight text-black">
                                {disc}
                              </span>
                              {prof && (
                                <span
                                  className="text-[9.5px] font-black px-2 py-0.5 rounded-xs truncate max-w-[95%] shadow-2xs leading-tight"
                                  style={estiloBadge}
                                >
                                  {prof}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-300 font-bold text-xs">-</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Rodapé Resumo da Turma */}
        <div className="flex items-center justify-between text-[9.5px] text-slate-800 mt-2 p-1.5 bg-slate-50 border border-black/30 rounded-xs">
          <span>Turma: <strong>{turmaAlvo}</strong></span>
          <span>Aulas Semanais: <strong>{totalAulas} aulas</strong></span>
          <span className="truncate max-w-[50%]">Docentes ({professoresTurma.length}): <strong>{professoresTurma.join(", ")}</strong></span>
        </div>
      </div>
    )
  }

  /**
   * Tabela Oficial de Aulas de Emergência / Substituições (SEM CÉLULAS EM BRANCO)
   * Imprime rigorosamente apenas as aulas cadastradas na situação emergencial escolhida.
   */
  function renderTabelaEmergenciaFocada(
    tituloEmergenciaParam?: string,
    motivoEmergenciaParam?: string,
    diasParam?: string[]
  ) {
    const diasPermitidos: string[] = (diasParam && diasParam.length > 0) ? diasParam : Array.from(DIAS_SEMANA)

    // Filtra exclusivamente itens que possuem aula válida e que pertencem aos dias afetados
    const itensValidos = itensGrade.filter(item => {
      const temDia = diasPermitidos.includes(item.dia_semana)
      const temConteudo = Boolean(item.disciplina_nome?.trim() && item.professor_nome?.trim())
      return temDia && temConteudo
    })

    const ordemDias: Record<string, number> = { SEG: 1, TER: 2, QUA: 3, QUI: 4, SEX: 5 }
    const itensOrdenados = [...itensValidos].sort((a, b) => {
      const diaDiff = (ordemDias[a.dia_semana] || 99) - (ordemDias[b.dia_semana] || 99)
      if (diaDiff !== 0) return diaDiff
      if (a.numero_aula !== b.numero_aula) return a.numero_aula - b.numero_aula
      return a.turma_nome.localeCompare(b.turma_nome)
    })

    const diasFormatados = diasPermitidos.map(d => (NOMES_DIAS as Record<string, string>)[d]?.split('-')[0] || d).join(", ")
    const totalAulas = itensOrdenados.length
    const turmasAfetadas = Array.from(new Set(itensOrdenados.map(i => i.turma_nome))).sort()
    const professoresEnvolvidos = Array.from(new Set(itensOrdenados.map(i => i.professor_nome))).sort()

    return (
      <div 
        className="pagina-folha-a4-impressao text-black bg-white"
        style={{ fontFamily: fontFamilyEfetiva }}
      >
        {/* Cabeçalho da Folha A4 de Emergência */}
        <div className="flex items-center justify-between border-b-2 border-black pb-1.5 mb-2">
          <div className="flex-1 pr-2">
            <h1 className="text-sm font-black tracking-tight uppercase text-black leading-tight flex items-center gap-2">
              <span>EEMTI ANTONIETA SIQUEIRA</span>
              <span className="text-[10px] px-2 py-0.5 rounded-xs bg-red-600 text-white font-black">
                🚨 HORÁRIO EMERGENCIAL DE AULAS
              </span>
            </h1>
            <div className="text-[11px] font-bold text-slate-800 flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="font-extrabold text-black">
                {tituloEmergenciaParam || tituloEmergencia || "Ajuste de Aulas por Ausência Docente"}
              </span>
              {motivoEmergenciaParam && (
                <span className="text-slate-700 italic border-l border-black/40 pl-2">
                  Motivo: {motivoEmergenciaParam}
                </span>
              )}
              <span className="border-l border-black/40 pl-2">
                Dias Afetados: <strong>{diasFormatados}</strong>
              </span>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="text-[11px] font-black text-black block leading-tight">
              {textoVigencia || "Vigência Emergencial"}
            </span>
            <span className="text-[9px] text-slate-600 block leading-tight">
              Documento Provisório • Gerado em: {new Date().toLocaleDateString("pt-BR")}
            </span>
          </div>
        </div>

        {/* Listagem de Aulas de Emergência (Zero Células em Branco) */}
        {totalAulas === 0 ? (
          <div className="border-2 border-dashed border-slate-400 p-8 text-center text-xs text-slate-600 rounded-xs">
            Nenhuma aula emergencial cadastrada para os dias selecionados ({diasFormatados}).
          </div>
        ) : (
          <>
            <div className="w-full border-2 border-black">
              <table className="w-full border-collapse text-left border-spacing-0 table-fixed">
                <thead>
                  <tr className="bg-slate-200 text-black border-b-2 border-black text-center h-6 text-[10px] font-black">
                    <th className="border-r border-black p-1 w-8 text-center">#</th>
                    <th className="border-r border-black p-1 w-24 text-center">DIA</th>
                    <th className="border-r border-black p-1 w-24 text-center">TURNO / HORÁRIO</th>
                    <th className="border-r border-black p-1 w-20 text-center">TURMA</th>
                    <th className="border-r border-black p-1 text-left px-2">DISCIPLINA</th>
                    <th className="p-1 text-left px-2">PROFESSOR(A) ALOCADO</th>
                  </tr>
                </thead>
                <tbody>
                  {itensOrdenados.map((item, idx) => {
                    const cor = item.cor_destaque || (item.professor_nome ? obterCorEfetivaProfessor(item.professor_nome) : "")
                    const estilo = cor ? getEstiloBadgeCor(cor) : undefined
                    const nomeDia = NOMES_DIAS[item.dia_semana] || item.dia_semana
                    const turnoDesc = item.segmento === "NOTURNO" 
                      ? "Noturno" 
                      : item.numero_aula <= 5 ? "Manhã" : "Tarde"

                    return (
                      <tr 
                        key={`${item.segmento}_${item.dia_semana}_${item.numero_aula}_${item.turma_nome}_${idx}`}
                        className="border-b border-black/40 h-[26px] text-[10px]"
                      >
                        <td className="border-r border-black text-center font-bold text-slate-600 bg-slate-50">
                          {idx + 1}
                        </td>
                        <td className="border-r border-black font-black text-center px-1 uppercase bg-slate-50">
                          {nomeDia}
                        </td>
                        <td className="border-r border-black font-bold text-center px-1">
                          {item.numero_aula}ª Aula ({turnoDesc})
                        </td>
                        <td className="border-r border-black font-black text-center px-1 text-[11px] bg-slate-100">
                          {item.turma_nome}
                        </td>
                        <td className="border-r border-black font-extrabold px-2 truncate">
                          {item.disciplina_nome}
                        </td>
                        <td 
                          className="px-2 font-black align-middle"
                          style={estilo}
                        >
                          <span className="truncate">{item.professor_nome}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Painel Resumo no Rodapé */}
            <div className="flex items-center justify-between text-[9.5px] text-slate-800 mt-2 p-1.5 bg-slate-50 border border-black/30 rounded-xs">
              <span>Total de aulas de emergência: <strong>{totalAulas} aulas</strong></span>
              <span>Turmas atendidas: <strong>{turmasAfetadas.join(", ")}</strong></span>
              <span>Docentes designados: <strong>{professoresEnvolvidos.join(", ")}</strong></span>
            </div>
          </>
        )}
      </div>
    )
  }

  // Se for impressão de emergência focada (apenas as aulas cadastradas, sem células vazias)
  const isImpressaoEmergenciaFocada = modo === "EMERGENCIA" || somenteAulasEmergencia || dadosImpressao?.somenteAulasEmergencia
  if (isImpressaoEmergenciaFocada) {
    return (
      <div id="secao-impressao-horarios-root" className="hidden print:block w-full bg-white text-black">
        {renderTabelaEmergenciaFocada(
          dadosImpressao?.tituloEmergencia || tituloEmergencia,
          dadosImpressao?.motivoEmergencia || motivoEmergencia,
          dadosImpressao?.dias || diasEmergencia
        )}
      </div>
    )
  }

  // Renderização baseada no Modo Selecionado
  return (
    <div id="secao-impressao-horarios-root" className="hidden print:block w-full bg-white text-black">
      {/* 1. MODO PROFESSOR */}
      {modo === "PROFESSOR" && (
        renderTabelaProfessor(dadosImpressao?.professor || professorSelecionado || "PROFESSOR")
      )}

      {/* 2. MODO VISUALIZAÇÃO ATUAL OU POR TURNO */}
      {(modo === "ATUAL" || modo === "TURNO") && (() => {
        const turno = dadosImpressao?.turno || "MANHA"
        const turmasAlvo = dadosImpressao?.turmas && dadosImpressao.turmas.length > 0
          ? dadosImpressao.turmas
          : (turno === "NOTURNO" ? turmasNoturno : turmasIntegral)
        const diasAlvo = dadosImpressao?.dias && dadosImpressao.dias.length > 0
          ? dadosImpressao.dias
          : ["SEG", "TER", "QUA", "QUI", "SEX"]

        // SE FOR APENAS 1 TURMA (Impressão da Turma do Aluno ou filtro de turma única):
        // Renderiza a grade semanal com Dias nas Colunas e Aulas nas Linhas, garantindo 100% de encaixe em 1 ÚNICA PÁGINA A4!
        if (turmasAlvo.length === 1) {
          return renderTabelaTurmaSemanal(turmasAlvo[0], diasAlvo, dadosImpressao?.filtroDescricaoTurmas)
        }

        if (turno === "INTEGRAL_COMPLETO") {
          return renderTabelaTurno(
            "ENSINO INTEGRAL",
            "Integral Completo (1ª a 9ª Aula)",
            "INTEGRAL_COMPLETO",
            turmasAlvo,
            ESTRUTURA_AULAS.INTEGRAL_COMPLETO,
            diasAlvo,
            dadosImpressao?.filtroDescricaoTurmas,
            dadosImpressao?.filtroDescricaoDias,
            dadosImpressao?.professor
          )
        }

        if (turno === "MANHA") {
          return renderTabelaTurno(
            "ENSINO INTEGRAL",
            "Turno da Manhã (1ª a 5ª Aula)",
            "INTEGRAL_MANHA",
            turmasAlvo,
            ESTRUTURA_AULAS.INTEGRAL_MANHA,
            diasAlvo,
            dadosImpressao?.filtroDescricaoTurmas,
            dadosImpressao?.filtroDescricaoDias,
            dadosImpressao?.professor
          )
        }

        if (turno === "TARDE") {
          return renderTabelaTurno(
            "ENSINO INTEGRAL",
            "Turno da Tarde (6ª a 9ª Aula)",
            "INTEGRAL_TARDE",
            turmasAlvo,
            ESTRUTURA_AULAS.INTEGRAL_TARDE,
            diasAlvo,
            dadosImpressao?.filtroDescricaoTurmas,
            dadosImpressao?.filtroDescricaoDias,
            dadosImpressao?.professor
          )
        }

        if (turno === "NOTURNO") {
          return renderTabelaTurno(
            "ENSINO NOTURNO",
            "Turno da Noite (1ª a 4ª Aula)",
            "NOTURNO",
            turmasAlvo,
            ESTRUTURA_AULAS.NOTURNO,
            diasAlvo,
            dadosImpressao?.filtroDescricaoTurmas,
            dadosImpressao?.filtroDescricaoDias,
            dadosImpressao?.professor
          )
        }

        return null
      })()}

      {/* 3. MODO TODOS OS HORÁRIOS (GERAL - 3 PÁGINAS) */}
      {modo === "TODOS" && (
        <>
          {/* PÁGINA 1: INTEGRAL • MANHÃ */}
          {renderTabelaTurno(
            "ENSINO INTEGRAL",
            "Turno da Manhã (1ª a 5ª Aula)",
            "INTEGRAL_MANHA",
            turmasIntegral,
            ESTRUTURA_AULAS.INTEGRAL_MANHA
          )}

          {/* PÁGINA 2: INTEGRAL • TARDE */}
          {renderTabelaTurno(
            "ENSINO INTEGRAL",
            "Turno da Tarde (6ª a 9ª Aula)",
            "INTEGRAL_TARDE",
            turmasIntegral,
            ESTRUTURA_AULAS.INTEGRAL_TARDE
          )}

          {/* PÁGINA 3: NOTURNO */}
          {renderTabelaTurno(
            "ENSINO NOTURNO",
            "Turno da Noite (1ª a 4ª Aula)",
            "NOTURNO",
            turmasNoturno,
            ESTRUTURA_AULAS.NOTURNO
          )}
        </>
      )}
    </div>
  )
}
