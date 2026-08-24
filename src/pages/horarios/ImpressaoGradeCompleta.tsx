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

interface ImpressaoGradeCompletaProps {
  modo: "TODOS" | "PROFESSOR"
  professorSelecionado?: string
  textoVigencia: string
  turmasIntegral: string[]
  turmasNoturno: string[]
  itensGrade: GradeHorarioItem[]
  isRascunho?: boolean
  idFonte?: IdFonteGrade
}

export function ImpressaoGradeCompleta({
  modo,
  professorSelecionado,
  textoVigencia,
  turmasIntegral,
  turmasNoturno,
  itensGrade,
  isRascunho,
  idFonte = "inter",
}: ImpressaoGradeCompletaProps) {
  // Mapa de itens para acesso O(1)
  const mapaItens = new Map<string, GradeHorarioItem>()
  for (const item of itensGrade) {
    mapaItens.set(`${item.segmento}_${item.dia_semana}_${item.numero_aula}_${normalizarNomeTurma(item.turma_nome)}`, item)
    mapaItens.set(`${item.segmento}_${item.dia_semana}_${item.numero_aula}_${item.turma_nome}`, item)
  }

  const fontFamilyEfetiva = getFontFamilyById(idFonte)

  function renderTabelaTurno(
    tituloTurno: string,
    subtitulo: string,
    segmento: string,
    turmas: string[],
    aulas: { numero: number; rotulo: string }[]
  ) {
    return (
      <div 
        className="pagina-folha-a4-impressao text-black bg-white"
        style={{ fontFamily: fontFamilyEfetiva }}
      >
        {/* Cabeçalho da Folha (Compacto para caber perfeitamente em 1 folha A4 paisagem) */}
        <div className="flex items-center justify-between border-b-2 border-black pb-1 mb-1">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-black tracking-tight uppercase text-black leading-tight">
                EEMTI ANTONIETA SIQUEIRA • QUADRO DE HORÁRIOS
              </h1>
              {isRascunho && (
                <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 border border-black bg-slate-200">
                  PRÉ-DIVULGAÇÃO (RASCUNHO)
                </span>
              )}
            </div>
            <h2 className="text-[11px] font-bold text-slate-800 leading-tight">
              {tituloTurno} — <span className="font-normal text-slate-700">{subtitulo}</span>
            </h2>
          </div>
          <div className="text-right">
            <span className="text-[11px] font-black text-black block leading-tight">
              {textoVigencia || "Válido a partir de 05/02/2026 • 1º Bimestre"}
            </span>
            <span className="text-[9px] text-slate-600 block leading-tight">
              {isRascunho ? "Rascunho de Edição • " : ""}Gerado em: {new Date().toLocaleDateString("pt-BR")}
            </span>
          </div>
        </div>

        {/* Tabela de Grade de Horários */}
        <div className="w-full border-2 border-black">
          <table className="w-full border-collapse text-left border-spacing-0 table-fixed">
            <thead>
              <tr className="bg-slate-200 text-black border-b-2 border-black text-center h-6">
                <th className="border-r-2 border-black p-0.5 text-center font-black text-[10px] w-10">
                  DIA
                </th>
                <th className="border-r-2 border-black p-0.5 text-center font-black text-[9.5px] w-14">
                  AULAS
                </th>
                {turmas.map((turma) => (
                  <th
                    key={turma}
                    className="border-r border-black p-0.5 text-center font-black text-[10px] uppercase"
                  >
                    {turma}
                  </th>
                ))}
                <th className="border-l-2 border-black p-0.5 text-center font-black text-[10px] w-10">
                  DIA
                </th>
              </tr>
            </thead>

            <tbody>
              {DIAS_SEMANA.map((dia) => {
                return aulas.map((aula, aulaIdx) => {
                  const isPrimeira = aulaIdx === 0
                  const isUltima = aulaIdx === aulas.length - 1

                  return (
                    <tr
                      key={`${dia}_${aula.numero}`}
                      className={`h-[22px] ${isUltima ? "border-b-2 border-black" : "border-b border-black/40"}`}
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
                        const item = mapaItens.get(chaveNorm)
                        const cor = item?.cor_destaque || (item?.professor_nome ? obterCorEfetivaProfessor(item.professor_nome) : "")
                        const estilo = cor ? getEstiloBadgeCor(cor) : undefined

                        return (
                          <td
                            key={turma}
                            className="border-r border-black p-0 text-center align-middle h-[22px] overflow-hidden"
                            style={item ? estilo : undefined}
                          >
                            {item ? (
                              <div className="flex flex-col items-center justify-center leading-[1.05] text-black px-0.5">
                                <span className="font-black text-[8px] truncate w-full tracking-tighter">
                                  {item.disciplina_nome}
                                </span>
                                <span className="font-bold text-[7.5px] truncate w-full opacity-90">
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
      <div className="pagina-folha-a4-impressao font-sans text-black bg-white">
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

  return (
    <div id="secao-impressao-horarios-root" className="hidden print:block w-full bg-white text-black">
      {modo === "PROFESSOR" ? (
        renderTabelaProfessor(professorSelecionado || "PROFESSOR")
      ) : (
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
