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
}

// this method is called when your extension is deactivated
export function deactivate() {
}

module CsSyntaxVisualizer {
    export class CsSyntaxVisualizerExtension {
        private provider: CsTextDocumentContentProvider;
        constructor(private context: vscode.ExtensionContext) {
            let cfg = vscode.workspace.getConfiguration("cssyntaxvisualizer");
            let dotsPath = cfg.get("dotsPath", null);
            if (dotsPath == null || dotsPath == "") {
                dotsPath = process.env['GRAPHVIZ_DOT'];
            }
            let dotnetPath = cfg.get("dotnetPath", "dotnet");
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
                    , vscode.ViewColumn.Two, 'C# syntax tree')
                    .then((success) => {
                        let queryuri = vscode.Uri.parse(CsTextDocumentContentProvider.PreviewUri.toString());
                        // queryuri.query = "includeToken=false&isScriptMode=false";
                        this.provider.update(queryuri);
                        vscode.window.showTextDocument(editor.document);
                    }, (reason) => {
                        vscode.window.showErrorMessage(reason);
                    });
            });
            let selected = vscode.commands.registerCommand('extension.visualizeCsSyntaxSelected', () => {
                let editor = vscode.window.activeTextEditor;
                return vscode.commands.executeCommand('vscode.previewHtml'
                    , CsTextDocumentContentProvider.PreviewSelectedUri
                    , vscode.ViewColumn.Two, 'C# syntax tree(partial)')
                    .then((success) => {
                        this.provider.update(CsTextDocumentContentProvider.PreviewSelectedUri);
                        vscode.window.showTextDocument(editor.document);
                    }, (reason) => {
                        vscode.window.showErrorMessage(reason);
                    });
            });
            this.context.subscriptions.push(disposable);
            this.context.subscriptions.push(selected);
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
        public static PreviewSelectedUri = vscode.Uri.parse(`${CsTextDocumentContentProvider.Schema}://authority/cs-syntax-visualize-selected`);
        public provideTextDocumentContent(uri: vscode.Uri): string | Thenable<string> {
            return this.createSnipet(uri);
        }
        private createSnipet(uri: vscode.Uri): string | Thenable<string> {
            return this.extractSnipet(uri);
        }
        private errorSnipet(msg: string): string | Thenable<string> {
            return `<body><span>${msg}</span></body>`;
        }
        private extractSnipet(uri: vscode.Uri): Thenable<string> {
            console.log(uri.toJSON());
            let editor = vscode.window.activeTextEditor;
            let text = "";
            if (uri == CsTextDocumentContentProvider.PreviewSelectedUri) {
                text = editor.document.getText(editor.selection);
            } else {
                text = editor.document.getText();
            }
            let opt = new CsSyntaxExecutorOptions();
            opt.cs2dotsPath = this.cs2DotsPath;
            opt.dotnetPath = this.dotnetPath;
            opt.dotsPath = this.dotsPath;
            // TODO: currently,not supported
            opt.includeToken = false;
            opt.isScriptMode = false;
            return CsSyntaxExecutor.createSvgExecutor(text,
                opt)
                .execute()
                .then(x => `<body><div style="background-color:white;overflow:scroll;">${x}</div></body>`)
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
        public includeToken: boolean;
        public isScriptMode: boolean;
    }
    class CsSyntaxExecutor {
        public static createSvgExecutor(code: string
            , options: CsSyntaxExecutorOptions
        ): CsSyntaxExecutor {
            let cs2dots = [];
            if (options.includeToken) {
                cs2dots.push("-t");
            }
            if (options.isScriptMode) {
                cs2dots.push("-m");
                cs2dots.push("csx");
            }
            return new CsSyntaxExecutor(code
                , options
                , ["-Tsvg"]
                , cs2dots);
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
                , [cs2dotsdll].concat(this.cs2dotsOptions));
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