import * as vscode from 'vscode';
import * as MarkdownIt from 'markdown-it';

export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('markdown-reading.read', () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showInformationMessage('No active editor found.');
            return;
        }

        const document = editor.document;
        if (document.languageId !== 'markdown') {
            vscode.window.showInformationMessage('Current file is not a Markdown file.');
            return;
        }

        const md = new MarkdownIt();
        const text = document.getText();
        const htmlContent = md.render(text);

        const panel = vscode.window.createWebviewPanel(
            'markdownReading',
            `Reading: ${document.fileName.split(/[\\/]/).pop()}`,
            vscode.ViewColumn.Active,
            {
                enableScripts: true
            }
        );

        panel.webview.html = getWebviewContent(htmlContent, document.fileName);
    });

    context.subscriptions.push(disposable);
}

function getWebviewContent(content: string, title: string) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Markdown Reading</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            padding: 20px;
            max-width: 800px;
            margin: 0 auto;
            line-height: 1.6;
            color: #333;
            background-color: #fff;
        }
        @media (prefers-color-scheme: dark) {
            body {
                background-color: #1e1e1e;
                color: #d4d4d4;
            }
        }
        pre {
            background-color: #f4f4f4;
            padding: 10px;
            border-radius: 5px;
            overflow-x: auto;
        }
        @media (prefers-color-scheme: dark) {
            pre {
                background-color: #2d2d2d;
            }
        }
        code {
            font-family: 'Courier New', Courier, monospace;
        }
        img {
            max-width: 100%;
        }
        blockquote {
            border-left: 4px solid #ccc;
            padding-left: 10px;
            margin-left: 0;
            color: #666;
        }
        table {
            border-collapse: collapse;
            width: 100%;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }
        th {
            background-color: #f2f2f2;
        }
        @media (prefers-color-scheme: dark) {
            th {
                background-color: #333;
            }
            th, td {
                border-color: #444;
            }
        }
    </style>
</head>
<body>
    ${content}
</body>
</html>`;
}

export function deactivate() {}
