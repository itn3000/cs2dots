'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as Q from 'q';
import * as child_process from 'child_process';
import * as path from 'path';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "cs-syntax-visualizer" is now active!');
    console.log(__dirname);

    new CsSyntaxVisualizer.CsSyntaxVisualizerExtension(context).initialize();

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json
    let disposable = vscode.commands.registerCommand('extension.sayHello', () => {
        // The code you place here will be executed every time your command is executed

        // Display a message box to the user
        vscode.window.showInformationMessage('Hello World!');
    });

    context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {
}

module CsSyntaxVisualizer {
    export class CsSyntaxVisualizerExtension {
        private provider: CsTextDocumentContentProvider;
        constructor(private context: vscode.ExtensionContext) {
            let dotsPath = process.env['GRAPHVIZ_DOT'];
            let dotnetPath = "dotnet";
            let cs2dotsPath = path.join(this.context.extensionPath, "bin", "Cs2Dots");
            this.provider = new CsTextDocumentContentProvider(dotsPath, dotnetPath, cs2dotsPath);
        }
        public initialize() {
            this.registerTextProvider();
            this.registerDocumentChangedWatcher();
            this.registerCommands();
        }
        private registerTextProvider(): void {
            let reg = vscode.workspace.registerTextDocumentContentProvider(CsTextDocumentContentProvider.Schema, this.provider);
            this.context.subscriptions.push(reg);
        }
        private registerCommands(): void {
            let disposable = vscode.commands.registerCommand('extension.visualizeCsSyntax', () => {
                let editor = vscode.window.activeTextEditor;
                return vscode.commands.executeCommand('vscode.previewHtml'
                    , CsTextDocumentContentProvider.PreviewUri
                    , vscode.ViewColumn.Two, 'Visualize C# syntax')
                    .then((success) => {
                        this.provider.update(CsTextDocumentContentProvider.PreviewUri);
                        vscode.window.showTextDocument(editor.document);
                    }, (reason) => {
                        vscode.window.showErrorMessage(reason);
                    });
            });
            this.context.subscriptions.push(disposable);
        }
        private registerDocumentChangedWatcher(): void {
            let editorChanged = vscode.window.onDidChangeActiveTextEditor((editor: vscode.TextEditor) => {
                this.provider.update(CsTextDocumentContentProvider.PreviewUri);
            })
            let changedTimeStamp = new Date().getTime();
            let documentChanged = vscode.workspace.onDidChangeTextDocument((e: vscode.TextDocumentChangeEvent) => {
                if (vscode.window.activeTextEditor.document != e.document) {
                    return;
                }
                changedTimeStamp = new Date().getTime();
                setTimeout(() => {
                    if (new Date().getTime() - changedTimeStamp >= 400) {
                        this.provider.update(CsTextDocumentContentProvider.PreviewUri);
                    }
                }, 500);
            });
            this.context.subscriptions.push(editorChanged, documentChanged);
        }
    }
    class CsTextDocumentContentProvider implements vscode.TextDocumentContentProvider {
        public constructor(private dotsPath: string, private dotnetPath: string, private cs2DotsPath: string) {

        }
        public static Schema = "visualize-cs-syntax";
        public static PreviewUri = vscode.Uri.parse(`${CsTextDocumentContentProvider.Schema}://authority/cs-syntax-visualize`);
        public provideTextDocumentContent(uri: vscode.Uri): string | Thenable<string> {
            return this.createSnipet();
        }
        private createSnipet(): string | Thenable<string> {
            return this.extractSnipet();
        }
        private errorSnipet(msg: string): string | Thenable<string> {
            return `<body><span>${msg}</span></body>`;
        }
        private extractSnipet(): Thenable<string> {
            let editor = vscode.window.activeTextEditor;
            let opt = new CsSyntaxExecutorOptions();
            opt.cs2dotsPath = this.cs2DotsPath;
            opt.dotnetPath = this.dotnetPath;
            opt.dotsPath = this.dotsPath;
            return CsSyntaxExecutor.createSvgExecutor(editor.document.getText(),
                opt)
                .execute()
                .then(x => `<body style="background-color:white;">${x}</body>`)
                ;

        }
        private _onDidChange = new vscode.EventEmitter<vscode.Uri>();
        get onDidChange(): vscode.Event<vscode.Uri> {
            return this._onDidChange.event;
        }
        public update(uri: vscode.Uri) {
            this._onDidChange.fire(uri);
        }
    }
    class CsSyntaxExecutorOptions {
        public dotnetPath: string;
        public cs2dotsPath: string;
        public dotsPath: string;
    }
    class CsSyntaxExecutor {
        public static createSvgExecutor(code: string
            , options: CsSyntaxExecutorOptions
        ): CsSyntaxExecutor {
            return new CsSyntaxExecutor(code
                , options
                , ["-Tsvg"]
                , null);
        }
        constructor(
            private code: string,
            private executeOptions: CsSyntaxExecutorOptions,
            private dotsOptions: string[],
            private cs2dotsOptions: string[]
        ) {
        }
        public execute(): Q.Promise<string> {
            let cs2dotsParams = [];
            let cs2dotsdll = path.join(this.executeOptions.cs2dotsPath, "Cs2Dots.dll");
            let process = child_process.spawn("dotnet"
                , [cs2dotsdll]);
            process.stdin.write(this.code);
            process.stdin.end();
            let dotsopts = this.dotsOptions;
            let dotspath = this.executeOptions.dotsPath;
            return Q.Promise<string>((resolve, reject, notify) => {
                var output = '';
                process.stdout.on('data', x => {
                    output += x;
                });
                process.stdout.on('close', x => {
                    resolve(output);
                });
                let er = '';
                process.stderr.on('data', x => {
                    er += x;
                });
                process.stderr.on('close', x => {
                    if (!!er) {
                        console.log(er);
                    }
                })
            }).then(data => {
                let dotsproc = child_process.spawn(dotspath,
                    dotsopts);
                dotsproc.stdin.write(data);
                dotsproc.stdin.end();
                return Q.Promise<string>((resolve, reject, notify) => {
                    let dotsoutput = "";
                    let errout = "";
                    dotsproc.stdout.on('close', () => {
                        resolve(dotsoutput);
                    });
                    dotsproc.stdout.on('data', (x) => {
                        dotsoutput += x;
                    });

                    dotsproc.stderr.on('data', (x) => {
                        errout += x;
                    });
                    dotsproc.stderr.on('close', () => {
                        if (!!errout) {
                            console.log(errout);
                        }
                    })
                });
            });
        }
    }
}