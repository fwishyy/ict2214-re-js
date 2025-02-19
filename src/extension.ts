// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

import Config from './config';
import Deobfuscator from './deobfuscator';

// This is the function that is called when the extension is activated
// Currently configured to a super barebones preview of the current file
// TODO: Implement LIVE PREVIEW
// TODO: Refactor this and probably move it somewhere else to facilitate different transformation options
export function activate(context: vscode.ExtensionContext) {
	const default_config = new Config({
		unpackArrays: true,
		decodeStrings: true,
		removeProxyFunctions: false,
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
	context.subscriptions.push(vscode.commands.registerCommand('deobfuscate.preview', async () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			return;
		}
		const src = editor.document.getText();

		const deobfuscator = new Deobfuscator(default_config, src);
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
}

// This method is called when your extension is deactivated
export function deactivate() { }
