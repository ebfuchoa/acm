DO $$
DECLARE
    rename_pairs text[][] := ARRAY[
        ARRAY['unidades_sociais', 'unidade_social'],
        ARRAY['atendimentos', 'atendimento'],
        ARRAY['usuarios', 'usuario'],
        ARRAY['usuarios_responsavel', 'usuario_responsavel'],
        ARRAY['usuarios_residencial', 'usuario_residencial'],
        ARRAY['usuarios_escolaridade', 'usuario_escolaridade'],
        ARRAY['movimentacoes_usuarios', 'usuario_movimentacao'],
        ARRAY['composicoes_familiares', 'usuario_composicao_familiar'],
        ARRAY['situacoes_habitacionais', 'usuario_situacao_habitacional'],
        ARRAY['situacao_familiar', 'usuario_situacao_familiar'],
        ARRAY['condicoes_saude', 'usuario_condicao_saude'],
        ARRAY['parecer', 'usuario_parecer'],
        ARRAY['atividades', 'atividade'],
        ARRAY['grupos', 'grupo'],
        ARRAY['usuarios_grupos', 'usuario_grupo'],
        ARRAY['atividades_grupos', 'atividade_grupo'],
        ARRAY['atividades_dias_semana', 'atividade_dia_semana'],
        ARRAY['inscricoes', 'inscricao'],
        ARRAY['frequencias', 'frequencia'],
        ARRAY['frequencias_grupos', 'frequencia_grupo'],
        ARRAY['justificativas_falta', 'justificativa_falta'],
        ARRAY['relatorios', 'relatorio'],
        ARRAY['versoes_relatorio', 'versao_relatorio'],
        ARRAY['aprovacoes_relatorio', 'aprovacao_relatorio'],
        ARRAY['participantes', 'participante'],
        ARRAY['versoes_participante', 'versao_participante'],
        ARRAY['anexos_participante', 'anexo_participante'],
        ARRAY['usuarios_unidades_sociais', 'usuario_unidade_social'],
        ARRAY['colaboradores', 'colaborador']
    ];
    pair text[];
BEGIN
    FOREACH pair SLICE 1 IN ARRAY rename_pairs LOOP
        IF to_regclass('public.' || pair[1]) IS NOT NULL
           AND to_regclass('public.' || pair[2]) IS NULL THEN
            EXECUTE format('ALTER TABLE %I RENAME TO %I', pair[1], pair[2]);
        END IF;
    END LOOP;
END $$;
