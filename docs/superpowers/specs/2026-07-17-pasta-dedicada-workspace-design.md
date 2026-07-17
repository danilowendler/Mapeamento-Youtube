# Spec · Página dedicada da pasta no Workspace (M10.5 · B5.4)

> Decidido em brainstorm com o fundador em 17/07/2026 (companion visual).
> Substitui o painel lateral do Workspace por uma página própria por pasta.

## Problema

O conteúdo de uma pasta aberta hoje é uma caixa pequena à direita do
board — sem destaque, sem espaço para trabalho. A pasta é o elemento
que o usuário mais vai usar; abrir uma deve dar a sensação de entrar
num espaço de trabalho.

## Decisões de produto (respostas do fundador)

1. **Papel da pasta aberta:** equilíbrio entre planejar (anotações),
   organizar (mover) e estudar (abrir/comparar no YouTube).
2. **Anotações:** por item **e** da pasta (bloco geral).
3. **Onde vive:** página dedicada `/app/pauta/[folderId]` (opção A do
   brainstorm; overlay e expansão inline descartados).
4. **Ordenação:** automática (Recentes | Maior score); reordenação
   manual fica para depois.

## Navegação e papéis

- Board (`/app/pauta`): **triagem** — criar pastas, ver Soltos,
  arrastar/mover para pastas. Clicar numa pasta **navega** para a
  página dela. O painel lateral e o estado `selectedId` morrem;
  renomear/excluir saem do board.
- Página da pasta (`/app/pauta/[folderId]`): **planejar e estudar**.
  Breadcrumb "‹ Workspace". Pasta inexistente ou de outro usuário →
  `notFound()` (RLS já filtra). Mesmo gate de plano do Workspace.

## Dados

Migration `20260717000003_folder_notes.sql` (dev + prod via script):

- `pauta_categories.notes text` — bloco de notas da pasta.
- `channel_refs.note text` — nota por canal.
- `favorites.note` **já existe** (M8) e ganha UI agora.
- Nenhuma policy nova: as RLS de update por dono já cobrem os três.

## Actions novas (`features/pauta/actions.ts`)

- `updateFolderNotes(folderId, text)` — zod: máx. 2000 chars; trim;
  gate de plano; update em `pauta_categories` (RLS por dono);
  revalidate da página da pasta.
- `updateItemNote(type: "video" | "channel", id, text)` — zod: máx.
  500 chars; update em `favorites.note` ou `channel_refs.note`.
- Erros sempre retornados (nunca lançados); UI otimista com rollback
  e mensagem visível — padrão dos movimentos existentes.

## Página da pasta — componentes

- **Cabeçalho:** FolderGlyph grande (aberto) + nome em `font-display`
  + pill tipo·contagem (azul para Referências) + renomear/excluir
  inline (reuso do `CategoryHeader`, com redirect para `/app/pauta`
  após excluir).
- **Notas da pasta:** textarea com autosave (debounce ~800ms + onBlur),
  indicador discreto "salvando…/salvo ✓", foco silencioso (sem anel
  amarelo), placeholder didático.
- **Toolbar:** ordenar Recentes | Maior score — estado client, sem
  URL, default Recentes. (Pasta de Referências: Recentes | Mais
  inscritos.)
- **Grid de itens:** tiles do board (thumbnail 16:9 linkando ao
  YouTube + ScoreBadge para vídeos; avatar + inscritos para canais)
  acrescidos de:
  - **Nota por item:** linha "✏️ adicionar nota…" que expande para
    textarea curta com autosave; nota existente aparece resumida.
  - **Mover ▾:** menu compacto existente (outras pastas do mesmo tipo
    + Soltos).
  - **↩ soltar:** devolve aos Soltos.
- **Estado vazio didático:** explica que se povoa a pasta arrastando
  no Workspace ou pelo "Mover ▾" de qualquer card, com link de volta.
- **Mobile:** empilha (grid 1–2 colunas); sem drag (já coberto pelos
  menus).

## Fora de escopo (evoluções naturais)

Reordenação manual (position por item), status de produção por item,
busca dentro da pasta, drag-and-drop dentro da página.

## Critérios de aceite

- Clicar numa pasta no board abre a página dela; voltar funciona.
- Notas (pasta e item) persistem, com autosave e rollback visível em
  falha; RLS impede tocar em pasta/nota alheia.
- Mover/soltar/renomear/excluir funcionam a partir da página.
- Suite completa verde; sem regressão de performance no board.
- UX didática (memória `ux-didatica-beviewer`): nenhuma ação
  invisível, estados vazios ensinam, erros explicam.
