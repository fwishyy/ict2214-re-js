// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';


import Config from './config';
import Deobfuscator from './deobfuscator';
import Detector from './detector';

// This is the function that is called when the extension is activated
// Currently configured to a super barebones preview of the current file
export function activate(context: vscode.ExtensionContext) {
    const config = new Config({
        unpackArrays: true,
        decodeStrings: true,
        removeProxyFunctions: true,
        simplifyExpressions: true,
        removeDeadCode: true,
        stringProxyFunctions: true
    });

    let previewPanel: vscode.WebviewPanel;

    const myScheme = 'deobfuscate';
    const myProvider = new class implements vscode.TextDocumentContentProvider {
        onDidChangeEmitter = new vscode.EventEmitter<vscode.Uri>();
        onDidChange = this.onDidChangeEmitter.event;

        provideTextDocumentContent(uri: vscode.Uri): string {
            return uri.query;
        }
    };
    context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider(myScheme, myProvider));

    context.subscriptions.push(vscode.commands.registerCommand('rejs.detect', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }
        const code = editor.document.getText();
        const detector = new Detector(code);
        const generatedConfig = detector.execute();

        if (generatedConfig && previewPanel) {
            // send message to webview to update checkbox
            previewPanel.webview.postMessage({
                type: 'updateCheckbox',
                options: generatedConfig
            });
        }
    }));

    // register command to preview deobfuscated code
    context.subscriptions.push(vscode.commands.registerCommand('deobfuscate.preview', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }
        const src = editor.document.getText();

        const deobfuscator = new Deobfuscator(config, src);
        const deobfuscatedSrc = deobfuscator.execute();

        const fileName = editor.document.fileName + '.deobfuscated';
        const uri = vscode.Uri.parse(`${myScheme}://deobfuscate-preview/${fileName}?${deobfuscatedSrc}`);
        const doc = await vscode.workspace.openTextDocument(uri);
        await vscode.window.showTextDocument(doc, vscode.ViewColumn.Two);
    }));

    context.subscriptions.push(
        vscode.commands.registerCommand('rejs.activate', () => {
            // once it's activated, lock in the first active editor

            const editor = vscode.window.activeTextEditor;
            // if panel is null, create a new one
            if (!previewPanel) {
                previewPanel = vscode.window.createWebviewPanel(
                    'deobfuscate',
                    'Deobfuscator',
                    vscode.ViewColumn.Two,
                    {
                        enableScripts: true
                    }
                );

                previewPanel.webview.html = getWebviewContent();

                // Handle messages from the webview
                previewPanel.webview.onDidReceiveMessage(
                    async (options) => {
                        const config = new Config(options);
                        if (!editor) {
                            return;
                        }
                        const src = editor.document.getText();

                        const deobfuscator = new Deobfuscator(config, src);
                        const deobfuscatedSrc = deobfuscator.execute();

                        const fileName = editor.document.fileName + '.deobfuscated';
                        const uri = vscode.Uri.parse(`${myScheme}://deobfuscate-preview/${fileName}?${deobfuscatedSrc}`);
                        const doc = await vscode.workspace.openTextDocument(uri);
                        await vscode.window.showTextDocument(doc, vscode.ViewColumn.One);
                    },
                    undefined,
                    context.subscriptions
                );
            } else {
                previewPanel.reveal(vscode.ViewColumn.Two);
            }
        })
    );

    const rejsButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    rejsButton.command = 'rejs.activate';
    rejsButton.text = `$(globe) Activate RE:JS`;
    rejsButton.tooltip = 'Click to activate RE:JS';
    rejsButton.show();

    context.subscriptions.push(rejsButton);

    const detectButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    detectButton.command = 'rejs.detect';
    detectButton.text = `$(search) RE:JS Detect`;
    detectButton.tooltip = 'Click to run detection engine';
    detectButton.show();

    context.subscriptions.push(detectButton);
}

function getWebviewContent() {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>RE:JS Deobfuscator</title>
        <style>
            body {
                background-color: black;
                color: white;
                font-family: Arial, sans-serif;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                height: 100vh;
                text-align: center;
            }

            h1 {
                font-size: 2em;
            }
            p {
                font-size: 1.2em;
                font-weight: bold;
            }
            .checkbox-group {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 10px;
                margin-top: 20px;
            }
            .checkbox-row {
                display: flex;
                justify-content: center;
                gap: 10px;
            }
            label {
                background-color: blue;
                padding: 8px 15px;
                border-radius: 5px;
                cursor: pointer;
                display: flex;
                align-items: center;
                color: white;
                font-weight: bold;
                min-width: 150px; /* Reduced width */
                justify-content: center;
                font-size: 0.9em; /* Slightly smaller text */
            }
            input[type="checkbox"] {
                margin-right: 8px;
            }
            .button-container {
                display: flex;
                justify-content: center;
                width: 100%;
                margin-top: 15px;
            }
            button {
                background-color: white;
                color: black;
                border: none;
                padding: 8px 15px;
                font-size: 0.9em;
                border-radius: 5px;
                cursor: pointer;
                font-weight: bold;
            }
            button:hover {
                background-color: lightgray;
            }
        </style>
    </head>
    <body>
        <h1>Welcome to RE:JS</h1>
        <p>Select a Transformation Method</p>
        <div class="checkbox-group">
            <div class="checkbox-row">
                <label><input type="checkbox" id="unpackArrays">Array Unpacker</label>
                <label><input type="checkbox" id="decodeStrings">Decode Strings</label>
                <label><input type="checkbox" id="removeProxyFunctions">Remove Proxy Functions</label>
            </div>
            <div class="checkbox-row">
                <label><input type="checkbox" id="simplifyExpressions">Simplify Expressions</label>
                <label><input type="checkbox" id="removeDeadCode">Remove Dead Code</label>
                <label><input type="checkbox" id="stringProxyFunctions">Remove String Functions</label>
            </div>
        </div>
        <div class="button-container">
            <button type="button" id="runDeobfuscation">Deobfuscate</button>
        </div>
        <script>
            (function() {
                const vscode = acquireVsCodeApi();

                document.getElementById('runDeobfuscation').addEventListener('click', () => {
                    const options = {
                        unpackArrays: document.getElementById('unpackArrays').checked,
                        decodeStrings: document.getElementById('decodeStrings').checked,
                        removeProxyFunctions: document.getElementById('removeProxyFunctions').checked,
                        simplifyExpressions: document.getElementById('simplifyExpressions').checked,
                        removeDeadCode: document.getElementById('removeDeadCode').checked,
                        stringProxyFunctions: document.getElementById('stringProxyFunctions').checked
                    };

                    vscode.postMessage(options);
                });

                window.addEventListener('message', event => {
                    const message = event.data; // The JSON data our extension sent
                    // update checkboxes
                    document.getElementById('unpackArrays').checked = message.options.unpackArrays;
                    document.getElementById('decodeStrings').checked = message.options.decodeStrings;
                    document.getElementById('removeProxyFunctions').checked = message.options.removeProxyFunctions;
                    document.getElementById('simplifyExpressions').checked = message.options.simplifyExpressions;
                    document.getElementById('removeDeadCode').checked = message.options.removeDeadCode;
                    document.getElementById('stringProxyFunctions').checked = message.options.stringProxyFunctions;
                    
                });
            }())
        </script>
    </body>
    </html>`;
}






// This method is called when your extension is deactivated
export function deactivate() { }
