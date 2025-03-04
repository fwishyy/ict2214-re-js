// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';


import Config from './config';
import Deobfuscator from './deobfuscator';
import Detector from './detector';


// This is the function that is called when the extension is activated
// Currently configured to a super barebones preview of the current file
// TODO: Implement LIVE PREVIEW
// TODO: Refactor this and probably move it somewhere else to facilitate different transformation options
export function activate(context: vscode.ExtensionContext) {
	const config = new Config({
		unpackArrays: true,
		decodeStrings: true,
		removeProxyFunctions: true,
		simplifyExpressions: true
	});

	const myScheme = 'deobfuscate';
	const myProvider = new class implements vscode.TextDocumentContentProvider {
		onDidChangeEmitter = new vscode.EventEmitter<vscode.Uri>();
		onDidChange = this.onDidChangeEmitter.event;

		provideTextDocumentContent(uri: vscode.Uri): string {
			return uri.query;
		}
	};
	context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider(myScheme, myProvider));

	context.subscriptions.push(vscode.commands.registerCommand('deobfuscate.detect', async () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			return;
		}
		const code = editor.document.getText();
		const detector = new Detector(code);
		detector.execute();
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

		// you can test your transformations here
		// extend a Transformation class, write the execute function
		// import it and push it into the transformations array here
		// you might want to test each transformation individually first
		// TODO: verify that multiple transformations work concurrently

		const fileName = editor.document.fileName + '.deobfuscated';
		const uri = vscode.Uri.parse(`${myScheme}://deobfuscate-preview/${fileName}?${deobfuscatedSrc}`);
		const doc = await vscode.workspace.openTextDocument(uri);
		await vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
	}));

	let lastActiveEditor: any = null; // Store the last focused editor

	vscode.window.onDidChangeActiveTextEditor((editor) => {
		if (editor) {
			lastActiveEditor = editor;
		}
	});

	context.subscriptions.push(
		vscode.commands.registerCommand('deobfuscate.show', () => {
			const panel = vscode.window.createWebviewPanel(
				'deobfuscate',
				'Deobfuscator',
				vscode.ViewColumn.Two,
		
				{
					enableScripts: true
				}
			);

			panel.webview.html = getWebviewContent();

			// Handle messages from the webview
			panel.webview.onDidReceiveMessage(
				async (options) => {
					const config = new Config(options);
					const editor = lastActiveEditor;
					if (!editor) {
						return;
					}
					const src = editor.document.getText();

					const deobfuscator = new Deobfuscator(config, src);
					const deobfuscatedSrc = deobfuscator.execute();

					// you can test your transformations here
					// extend a Transformation class, write the execute function
					// import it and push it into the transformations array here
					// you might want to test each transformation individually first
					// TODO: verify that multiple transformations work concurrently

					const fileName = editor.document.fileName + '.deobfuscated';
					const uri = vscode.Uri.parse(`${myScheme}://deobfuscate-preview/${fileName}?${deobfuscatedSrc}`);
					const doc = await vscode.workspace.openTextDocument(uri);
					await vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
				},
				undefined,
				context.subscriptions
			);
		})
	);
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
                <label><input type="checkbox" id="unpackArrays"> Array Unpacker</label>
                <label><input type="checkbox" id="decodeStrings"> Decode Strings</label>
                <label><input type="checkbox" id="removeProxyFunctions"> Remove Proxy Functions</label>
            </div>
            <div class="checkbox-row">
                <label><input type="checkbox" id="simplifyExpressions"> Simplify Expressions</label>
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
                        simplifyExpressions: document.getElementById('simplifyExpressions').checked
                    };

                    vscode.postMessage(options);
                });
            }())
        </script>
    </body>
    </html>`;
}






// This method is called when your extension is deactivated
export function deactivate() { }
