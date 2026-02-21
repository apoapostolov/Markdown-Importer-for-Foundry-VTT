import {
    containsMarkdownSyntax,
    convertMarkdown,
    getShowdownConverter,
    normalizeMarkdownSource,
} from "./detection/convert-markdown.js";

Hooks.once("init", () => {
  game.settings.register("markdown_importer", "convertOnSave", {
    name: "MARKDOWN_IMPORTER.SETTINGS.CONVERT_ON_SAVE.NAME",
    hint: "MARKDOWN_IMPORTER.SETTINGS.CONVERT_ON_SAVE.HINT",
    scope: "client",
    config: true,
    type: Boolean,
    default: false,
  });
});

Hooks.on("getProseMirrorMenuItems", (menu, items) => {
  items.push({
    action: "convertMarkdown",
    title: game.i18n.localize("MARKDOWN_IMPORTER.MENU.CONVERT_MARKDOWN.TITLE"),
    icon: '<i class="fa-solid fa-file-arrow-up"></i>',
    cmd: () => convertMarkdown(menu),
  });
});

function extractTextFromHtml(html) {
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = html;

  let text = "";
  for (const node of tempDiv.childNodes) {
    if (node.nodeName === "P") {
      text += node.textContent + "\n\n";
    } else if (node.nodeName === "BR") {
      text += "\n";
    } else {
      text += node.textContent + "\n";
    }
  }
  return text.trim();
}

Hooks.on("preUpdateJournalEntryPage", (page, changes, options, userId) => {
  if (!game.settings.get("markdown_importer", "convertOnSave")) return;

  const content = changes.text?.content;
  if (!content) return;

  const textContent = extractTextFromHtml(content);

  if (containsMarkdownSyntax(textContent)) {
    const converter = getShowdownConverter();
    if (converter) {
      try {
        const normalizedContent = normalizeMarkdownSource(textContent);
        const html = converter.makeHtml(normalizedContent);
        changes.text.content = html;
      } catch (error) {
        console.error(
          "[Markdown Importer] Failed to convert markdown on save",
          error,
        );
      }
    }
  }
});
