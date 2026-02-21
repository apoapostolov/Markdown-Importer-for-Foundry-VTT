function extractSourceText(state) {
  const { from, to } = state.selection;
  if (from === to) {
    return {
      // Preserve paragraph boundaries and inline hard-breaks for markdown parsing.
      content: state.doc.textBetween(0, state.doc.content.size, "\n\n", "\n"),
      targetFrom: 0,
      targetTo: state.doc.content.size,
    };
  }

  return {
    // Preserve paragraph boundaries and inline hard-breaks for markdown parsing.
    content: state.doc.textBetween(from, to, "\n\n", "\n"),
    targetFrom: from,
    targetTo: to,
  };
}

export function containsMarkdownSyntax(text) {
  if (!text) return false;
  const markdownSignals = [
    /(^|\n)\s{0,3}#{1,6}\s+\S/m,
    /(^|\n)\s*[-*+]\s+\S/m,
    /(^|\n)\s*\d+\.\s+\S/m,
    /(^|\n)\s*>\s+\S/m,
    /```[\s\S]*?```/m,
    /`[^`\n]+`/,
    /\*\*[^*\n]+\*\*/,
    /__[^_\n]+__/,
    /(^|[^\w])\*[^*\n]+\*([^\w]|$)/,
    /(^|[^\w])_[^_\n]+_([^\w]|$)/,
    /~~[^~\n]+~~/,
    /!\[[^\]]*]\([^)]+\)/,
    /\[[^\]]+]\([^)]+\)/,
    /\|.+\|/,
    /(^|\n)\s*([-*_]\s*){3,}(\n|$)/m,
  ];

  return markdownSignals.some((signal) => signal.test(text));
}

export function normalizeMarkdownSource(content) {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const out = [];

  const isTableRow = (line) => /^\|.*\|$/.test(line.trim());
  const normalizeTaskListLine = (line) => {
    // ProseMirror/Foundry commonly strips checkbox <input> elements.
    // Keep checklist intent visible by converting task markers to unicode symbols.
    let m = line.match(/^(\s*[-*+]\s+)\[([ xX])\]\s+(.*)$/);
    if (m) return `${m[1]}${m[2].toLowerCase() === "x" ? "☑" : "☐"} ${m[3]}`;
    m = line.match(/^(\s*\d+\.\s+)\[([ xX])\]\s+(.*)$/);
    if (m) return `${m[1]}${m[2].toLowerCase() === "x" ? "☑" : "☐"} ${m[3]}`;
    return line;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = normalizeTaskListLine(lines[i]);
    if (line.trim() !== "") {
      out.push(line);
      continue;
    }

    const prev = lines[i - 1] ?? "";
    const next = lines[i + 1] ?? "";
    const removeBlankBetweenTableRows = isTableRow(prev) && isTableRow(next);
    if (removeBlankBetweenTableRows) {
      continue;
    }

    out.push(line);
  }

  return out.join("\n");
}

export function getShowdownConverter() {
  const showdown = globalThis.showdown;
  if (!showdown?.Converter) return null;

  const foundryLinks = [];
  const placeholderPrefix = "FOUNDRYLINK" + Math.random().toString(36).substring(2, 8);
  
  const foundryExtension = [
    {
      type: 'lang',
      regex: /(@(?:UUID|Compendium|Item|Actor|JournalEntry|RollTable|Cards|Macro|Scene|Playlist)\[[^\]]+\](?:{[^}]+})?|\[\[\/[^\]]+\]\])/g,
      replace: (match) => {
        const id = foundryLinks.length;
        foundryLinks.push(match);
        return `${placeholderPrefix}${id}${placeholderPrefix}`;
      }
    },
    {
      type: 'output',
      regex: new RegExp(`${placeholderPrefix}(\\d+)${placeholderPrefix}`, 'g'),
      replace: (match, id) => {
        return foundryLinks[id];
      }
    }
  ];

  const options = globalThis.CONST?.SHOWDOWN_OPTIONS ?? {};
  return new showdown.Converter({
    ...options,
    tasklists: true,
    extensions: [foundryExtension]
  });
}

export function resolveParser(view) {
  const schema = view?.state?.schema;

  const clipboardParser = view.someProp?.("clipboardParser");
  if (clipboardParser?.parseSlice)
    return { mode: "slice", parser: clipboardParser };

  const domParser = view.someProp?.("domParser");
  if (domParser?.parse) return { mode: "doc", parser: domParser };

  const cachedParser = schema?.cached?.domParser;
  if (cachedParser?.parse) return { mode: "doc", parser: cachedParser };

  const PMDOMParser =
    globalThis.ProseMirrorModel?.DOMParser ??
    globalThis.prosemirrorModel?.DOMParser ??
    globalThis.PMModel?.DOMParser;
  if (PMDOMParser?.fromSchema && schema) {
    return { mode: "doc", parser: PMDOMParser.fromSchema(schema) };
  }

  // Runtime-agnostic fallback: scan globals for a ProseMirror DOMParser holder.
  // Different Foundry bundles can expose it under different global keys.
  if (schema) {
    for (const value of Object.values(globalThis)) {
      const candidate = value?.DOMParser;
      if (candidate?.fromSchema) {
        try {
          const parser = candidate.fromSchema(schema);
          if (parser?.parse) return { mode: "doc", parser };
        } catch {
          // Continue scanning.
        }
      }
    }
  }

  return null;
}

export function htmlToSlice(view, html) {
  const parserInfo = resolveParser(view);
  if (!parserInfo) return null;

  const container = document.createElement("div");
  container.innerHTML = html;

  if (parserInfo.mode === "slice") {
    return parserInfo.parser.parseSlice(container, {
      preserveWhitespace: true,
    });
  }

  const doc = parserInfo.parser.parse(container, { preserveWhitespace: true });
  return doc.slice(0, doc.content.size);
}

export function convertMarkdown(proseMirrorMenu) {
  const view = proseMirrorMenu?.view;
  if (!view?.state) {
    ui.notifications.warn(
      game.i18n.localize("MARKDOWN_IMPORTER.NOTIFICATIONS.NO_EDITOR"),
    );
    return null;
  }

  const { content, targetFrom, targetTo } = extractSourceText(view.state);
  if (!content?.trim()) {
    ui.notifications.warn(
      game.i18n.localize("MARKDOWN_IMPORTER.NOTIFICATIONS.NO_TEXT"),
    );
    return null;
  }

  if (!containsMarkdownSyntax(content)) {
    ui.notifications.info(
      game.i18n.localize("MARKDOWN_IMPORTER.NOTIFICATIONS.NO_MARKDOWN"),
    );
    return null;
  }

  const converter = getShowdownConverter();
  if (!converter) {
    ui.notifications.error(
      game.i18n.localize("MARKDOWN_IMPORTER.NOTIFICATIONS.NO_CONVERTER"),
    );
    return null;
  }

  try {
    const normalizedContent = normalizeMarkdownSource(content);
    const html = converter.makeHtml(normalizedContent);
    const slice = htmlToSlice(view, html);
    if (!slice?.content?.size) {
      ui.notifications.warn(
        game.i18n.localize("MARKDOWN_IMPORTER.NOTIFICATIONS.NO_PARSER"),
      );
      return null;
    }

    const tr = view.state.tr
      .replaceRange(targetFrom, targetTo, slice)
      .scrollIntoView();
    view.dispatch(tr);
    ui.notifications.info(
      game.i18n.localize("MARKDOWN_IMPORTER.NOTIFICATIONS.SUCCESS"),
    );
    return html;
  } catch (error) {
    console.error("[Markdown Importer] convertMarkdown failed", error);
    ui.notifications.error(
      game.i18n.localize("MARKDOWN_IMPORTER.NOTIFICATIONS.FAILED"),
    );
    return null;
  }
}
