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

  function walk(node) {
    let text = "";
    for (const child of node.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        text += child.textContent;
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const tag = child.nodeName.toLowerCase();
        if (tag === "p" || tag === "div") {
          text += walk(child) + "\n\n";
        } else if (tag === "br") {
          text += "\n";
        } else if (tag === "ul" || tag === "ol") {
          text += "\n\n" + walk(child) + "\n\n";
        } else if (tag === "li") {
          text += "- " + walk(child) + "\n";
        } else if (["h1", "h2", "h3", "h4", "h5", "h6"].includes(tag)) {
          const level = tag.substring(1);
          text += "\n\n" + "#".repeat(level) + " " + walk(child) + "\n\n";
        } else {
          // Preserve other HTML tags (like strong, em, span, table, etc.)
          const inner = walk(child);
          const outer = child.cloneNode(false).outerHTML;
          const match = outer.match(/^(<[^>]+>)(.*)(<\/[^>]+>)$/);
          if (match) {
            text += match[1] + inner + match[3];
          } else {
            // Self-closing tag
            text += outer;
          }
        }
      }
    }
    return text;
  }
  
  return walk(tempDiv).trim();
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
        ui.notifications.info(game.i18n.localize("MARKDOWN_IMPORTER.NOTIFICATIONS.AUTO_CONVERTED"));
      } catch (error) {
        console.error(
          "[Markdown Importer] Failed to convert markdown on save",
          error,
        );
      }
    }
  }
});
