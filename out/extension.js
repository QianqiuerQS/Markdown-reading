"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = require("vscode");
const MarkdownIt = require("markdown-it");
const TurndownService = require("turndown");
let activePanel = undefined;
let activeDocumentUri = undefined;
function activate(context) {
    const editModeSub = vscode.commands.registerCommand('markdown-reading.editMode', () => {
        if (activePanel) {
            vscode.commands.executeCommand('setContext', 'markdownReadingIsEditing', true);
            activePanel.webview.postMessage({ command: 'setMode', mode: 'edit' });
        }
    });
    const readModeSub = vscode.commands.registerCommand('markdown-reading.readMode', () => {
        if (activePanel) {
            vscode.commands.executeCommand('setContext', 'markdownReadingIsEditing', false);
            activePanel.webview.postMessage({ command: 'setMode', mode: 'read' });
        }
    });
    context.subscriptions.push(editModeSub, readModeSub);
    let disposable = vscode.commands.registerCommand('markdown-reading.read', () => __awaiter(this, void 0, void 0, function* () {
        // Handle webview context menu: if panel is active, clicking "read" should toggle it off.
        if (activePanel && activePanel.active) {
            activePanel.dispose();
            return;
        }
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }
        const document = editor.document;
        if (document.languageId !== 'markdown') {
            vscode.window.showInformationMessage('Current file is not a Markdown file.');
            return;
        }
        // Toggle logic: if clicking the same file's preview
        if (activePanel && (activeDocumentUri === null || activeDocumentUri === void 0 ? void 0 : activeDocumentUri.toString()) === document.uri.toString()) {
            activePanel.dispose();
            return;
        }
        // If a preview for a DIFFERENT file is already open, restore that file first
        if (activePanel && activeDocumentUri) {
            yield vscode.window.showTextDocument(activeDocumentUri, { preview: false, viewColumn: vscode.ViewColumn.Active });
        }
        const md = new MarkdownIt();
        const turndown = new TurndownService({
            headingStyle: 'atx',
            hr: '---',
            bulletListMarker: '-',
            codeBlockStyle: 'fenced'
        });
        const text = document.getText();
        const htmlContent = md.render(text);
        const fileName = document.fileName.split(/[\\/]/).pop() || 'Untitled';
        const targetUri = document.uri;
        activeDocumentUri = targetUri;
        if (activePanel) {
            activePanel.title = `Reading: ${fileName}`;
            activePanel.webview.html = getWebviewContent(htmlContent, fileName);
            activePanel.reveal(vscode.ViewColumn.Active);
            // Reset context on re-open or switch
            vscode.commands.executeCommand('setContext', 'markdownReadingIsEditing', false);
        }
        else {
            activePanel = vscode.window.createWebviewPanel('markdownReading', `Reading: ${fileName}`, vscode.ViewColumn.Active, {
                enableScripts: true,
                retainContextWhenHidden: true
            });
            activePanel.webview.html = getWebviewContent(htmlContent, fileName);
            // Set initial context
            vscode.commands.executeCommand('setContext', 'markdownReadingIsEditing', false);
            activePanel.webview.onDidReceiveMessage((message) => __awaiter(this, void 0, void 0, function* () {
                switch (message.command) {
                    case 'save':
                        if (activeDocumentUri) {
                            try {
                                const markdown = turndown.turndown(message.html);
                                const edit = new vscode.WorkspaceEdit();
                                const doc = yield vscode.workspace.openTextDocument(activeDocumentUri);
                                edit.replace(activeDocumentUri, doc.validateRange(new vscode.Range(0, 0, doc.lineCount, 10000)), markdown);
                                yield vscode.workspace.applyEdit(edit);
                                yield doc.save();
                            }
                            catch (err) {
                                vscode.window.showErrorMessage('Failed to save changes: ' + err);
                            }
                        }
                        break;
                }
            }), undefined, context.subscriptions);
            activePanel.onDidDispose(() => __awaiter(this, void 0, void 0, function* () {
                const uriToRestore = activeDocumentUri;
                activePanel = undefined;
                activeDocumentUri = undefined;
                vscode.commands.executeCommand('setContext', 'markdownReadingIsEditing', false);
                if (uriToRestore) {
                    try {
                        yield vscode.window.showTextDocument(uriToRestore);
                    }
                    catch (e) {
                        // Document might have been closed already
                    }
                }
            }), null, context.subscriptions);
        }
        // Achieve "Seamless Replacement": Find the tab for the original markdown file and close it
        try {
            const tabs = vscode.window.tabGroups.activeTabGroup.tabs;
            const targetTab = tabs.find(tab => tab.input instanceof vscode.TabInputText &&
                tab.input.uri.toString() === targetUri.toString());
            if (targetTab) {
                yield vscode.window.tabGroups.close(targetTab);
            }
        }
        catch (e) {
            console.error('Failed to close original markdown tab:', e);
        }
    }));
    context.subscriptions.push(disposable);
}
exports.activate = activate;
function getWebviewContent(content, title) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Markdown Reading</title>
    <style>
        :root {
            --toolbar-bg: #ffffff;
            --toolbar-border: #e1e8ed;
            --button-hover: #f1f2f6;
            --accent-color: #003366;
        }
        body {
            font-family: Georgia, "Times New Roman", Times, "SimSun", "宋体", serif;
            padding: 20px 40px 60px 40px;
            max-width: 850px;
            margin: 0 auto;
            line-height: 1.6;
            color: #222222;
            background-color: #fdfdfb;
            font-size: 16px;
            -webkit-font-smoothing: antialiased;
        }
        #toolbar {
            position: sticky;
            top: 0;
            background: var(--toolbar-bg);
            padding: 10px;
            margin: -20px -40px 30px -40px;
            border-bottom: 1px solid var(--toolbar-border);
            display: none; /* Default to hidden */
            gap: 8px;
            flex-wrap: wrap;
            z-index: 1000;
            box-shadow: 0 2px 5px rgba(0,0,0,0.05);
            justify-content: center;
            opacity: 0;
            transform: translateY(-10px);
            transition: all 0.3s ease;
        }
        #toolbar.visible {
            display: flex;
            opacity: 1;
            transform: translateY(0);
        }
        .btn-group {
            display: flex;
            gap: 2px;
            border-right: 1px solid var(--toolbar-border);
            padding-right: 8px;
        }
        .btn-group:last-child { border-right: none; }
        button {
            background: none;
            border: 1px solid transparent;
            padding: 5px 10px;
            cursor: pointer;
            border-radius: 4px;
            font-size: 14px;
            color: #444;
            transition: all 0.2s;
            min-width: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
        }
        button:hover {
            background-color: var(--button-hover);
            border-color: var(--toolbar-border);
        }
        button.active {
            background-color: #e1e8ed;
            color: var(--accent-color);
        }
        select {
            padding: 4px;
            border-radius: 4px;
            border: 1px solid var(--toolbar-border);
            font-family: inherit;
        }
        
        #editor-content {
            outline: none;
            min-height: 80vh;
            transition: all 0.2s;
        }
        #editor-content[contenteditable="true"] {
            background-color: #ffffff;
            cursor: text;
        }

        h1, h2, h3, h4, h5, h6 {
            font-family: "SimSun", "宋体", serif;
            font-weight: 700;
            line-height: 1.3;
            margin-top: 30px;
            margin-bottom: 15px;
            color: var(--accent-color);
        }
        h1 { font-size: 2.1em; border-bottom: 2px solid #eaecef; padding-bottom: 10px; }
        h2 { font-size: 1.6em; border-bottom: 1px solid #eaecef; padding-bottom: 6px; }
        h3 { font-size: 1.3em; }

        pre {
            background-color: #f5f7f9;
            padding: 18px;
            border-radius: 8px;
            border: 1px solid #e1e8ed;
            overflow-x: auto;
            color: #2e4053;
            font-size: 14px;
            line-height: 1.5;
            margin: 20px 0;
            font-family: 'Consolas', 'Monaco', monospace;
        }
        code {
            font-family: 'Consolas', 'Monaco', monospace;
            background-color: rgba(200, 200, 200, 0.15);
            padding: 0.2em 0.4em;
            border-radius: 4px;
            color: #c0392b;
            font-size: 0.9em;
        }
        pre code {
            background-color: transparent;
            padding: 0;
            color: inherit;
            font-size: inherit;
        }
        img {
            max-width: 100%;
            display: block;
            margin: 25px auto;
            border-radius: 4px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        blockquote {
            border-left: 5px solid #dcdde1;
            padding: 10px 20px;
            color: #57606f;
            background-color: #f1f2f6;
            margin: 25px 0;
            font-style: italic;
            border-radius: 0 6px 6px 0;
        }
        table {
            border-collapse: collapse;
            width: 100%;
            margin: 25px 0;
            background: #fff;
        }
        th, td {
            border: 1px solid #dfe4ea;
            padding: 12px 15px;
            text-align: left;
        }
        th { background-color: #f8f9fa; font-weight: 700; }
        hr {
            height: 3px;
            margin: 35px 0;
            background-color: #f1f2f6;
            border: 0;
        }
        ul, ol { padding-left: 20px; margin-bottom: 20px; }
        li { margin-bottom: 8px; }
    </style>
</head>
<body>
    <div id="toolbar">
        <div class="btn-group">
            <button onclick="exec('bold')" title="Bold">B</button>
            <button onclick="exec('italic')" title="Italic">I</button>
            <button onclick="exec('underline')" title="Underline">U</button>
        </div>
        <div class="btn-group">
            <button onclick="exec('formatBlock', 'H1')">H1</button>
            <button onclick="exec('formatBlock', 'H2')">H2</button>
            <button onclick="exec('formatBlock', 'H3')">H3</button>
            <button onclick="exec('formatBlock', 'P')">P</button>
        </div>
        <div class="btn-group">
            <button onclick="exec('insertUnorderedList')" title="Bullet List">•</button>
            <button onclick="exec('insertOrderedList')" title="Numbered List">1.</button>
        </div>
        <div class="btn-group">
            <button onclick="exec('foreColor', '#222222')" style="color: #222222">A</button>
            <button onclick="exec('foreColor', '#c0392b')" style="color: #c0392b">A</button>
            <button onclick="exec('foreColor', '#2980b9')" style="color: #2980b9">A</button>
        </div>
        <div class="btn-group">
            <button onclick="exec('removeFormat')" title="Clear Formatting">×</button>
        </div>
    </div>
    <div id="editor-content" contenteditable="false">
        ${content}
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        const editor = document.getElementById('editor-content');
        const toolbar = document.getElementById('toolbar');

        function exec(command, value = null) {
            document.execCommand(command, false, value);
            editor.focus();
            save();
        }

        let saveTimeout;
        function save() {
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => {
                vscode.postMessage({
                    command: 'save',
                    html: editor.innerHTML
                });
            }, 1000);
        }

        editor.addEventListener('input', save);

        // Handle some shortcuts
        document.addEventListener('keydown', e => {
            if (e.ctrlKey || e.metaKey) {
                switch(e.key.toLowerCase()) {
                    case 'b': e.preventDefault(); exec('bold'); break;
                    case 'i': e.preventDefault(); exec('italic'); break;
                    case 'u': e.preventDefault(); exec('underline'); break;
                }
            }
        });

        // Listen for messages from extension
        window.addEventListener('message', event => {
            const message = event.data;
            switch (message.command) {
                case 'setMode':
                    if (message.mode === 'edit') {
                        toolbar.style.display = 'flex';
                        setTimeout(() => toolbar.classList.add('visible'), 10);
                        editor.contentEditable = "true";
                        editor.focus();
                    } else {
                        toolbar.classList.remove('visible');
                        setTimeout(() => toolbar.style.display = 'none', 300);
                        editor.contentEditable = "false";
                    }
                    break;
            }
        });
    </script>
</body>
</html>`;
}
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map