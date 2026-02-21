# Markdown Importer for Foundry VTT

[![Foundry v11](https://img.shields.io/badge/Foundry-v11-green)](https://foundryvtt.com/)
[![Foundry v12](https://img.shields.io/badge/Foundry-v12-green)](https://foundryvtt.com/)
[![Foundry v13](https://img.shields.io/badge/Foundry-v13-green)](https://foundryvtt.com/)
[![Module Version](https://img.shields.io/badge/version-1.0.0-blue)](./module.json)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Manifest](https://img.shields.io/badge/Manifest-module.json-orange)](https://raw.githubusercontent.com/apoapostolov/Markdown-Importer-for-Foundry-VTT/main/module.json)
[![Issues](https://img.shields.io/github/issues/apoapostolov/Markdown-Importer-for-Foundry-VTT)](https://github.com/apoapostolov/Markdown-Importer-for-Foundry-VTT/issues)

A system-agnostic module that seamlessly converts Markdown text into ProseMirror formatting directly within Foundry VTT's text editors.

## Core Features

- **ProseMirror Menu Button**: Adds a convenient "Convert Markdown" button to the ProseMirror editor menu. Select text (or leave unselected to convert the whole document) and click the button to convert Markdown syntax to rich text.
- **Convert on Save**: An optional setting (disabled by default) that automatically checks for and converts Markdown syntax whenever you save a Journal Entry Page.
- **System Agnostic**: Works out of the box with any game system on Foundry VTT.

## Installation

1. Open **Add-on Modules** in Foundry VTT.
2. Click **Install Module**.
3. Paste the following manifest URL into the **Manifest URL** field:

```text
https://raw.githubusercontent.com/apoapostolov/Markdown-Importer-for-Foundry-VTT/main/module.json
```

4. Click **Install** and enable **Markdown Importer for Foundry VTT** in your world.

## Usage

1. Open any ProseMirror editor (e.g., a Journal Entry).
2. Paste or type your Markdown text.
3. Click the "Convert Markdown" button in the editor menu (icon: file with an up arrow).
4. The text will be converted to rich text formatting.

Alternatively, enable "Convert Markdown on each save" in the module settings to have this happen automatically when you save a Journal Entry Page.

## Compatibility

- Foundry Virtual Tabletop: **v11**, **v12**, **v13**
- System: **System Agnostic**
