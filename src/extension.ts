import * as vscode from 'vscode';

const regex = /^(#rng)*([\(\[])(-*\d+),\s*(-*\d+)([\)\]])(\d*)(\w*)$/;
const check_all_regex = /#rng([\(\[])(-*\d+),\s*(-*\d+)([\)\]])(\d*)(\w*)/;
const all_regex = /^#rng([\(\[])(-*\d+),\s*(-*\d+)([\)\]])(\d*)(\w*)$/;

function checkSelection(textEditor: vscode.TextEditor, selection: vscode.Selection) {
    selection = new vscode.Selection(selection.anchor, new vscode.Position(selection.active.line, selection.active.character - 5));
    let text = textEditor.document.getText(selection);
    let match = text.match(regex);
    while ((match === null) && (selection.active.character > 0)) {
        selection = new vscode.Selection(selection.anchor, new vscode.Position(selection.active.line, selection.active.character - 1));
        text = textEditor.document.getText(selection);
        match = text.match(regex);
    }

    if (selection.active.character > 0) {
        let wider_selection = new vscode.Selection(selection.anchor, new vscode.Position(selection.active.line, selection.active.character - 4));
        text = textEditor.document.getText(wider_selection);
        match = text.match(regex);
        if (match) {
            selection = wider_selection;
        }
    }

    return selection;
}

function processSelection(textEditor: vscode.TextEditor, editBuilder: vscode.TextEditorEdit, selection: vscode.Selection) {
    if (selection.isEmpty && selection.active.character >= 5) {
        selection = checkSelection(textEditor, selection);
    }

    const text = textEditor.document.getText(selection);
    let match = text.match(regex);

    if (match) {
        if (match[6] === '') {
            match[6] = '1';
        }
        if (match[7] === '') {
            match[7] = 'd';
        }
        
        let min, max;
        if (match[7] === 'd') {
            min = parseInt(match[3]) + Number(match[2] === '(');
            max = parseInt(match[4]) - Number(match[5] === ')');
        } else {
            min = parseFloat(match[3]) + Number(match[2] === '(');
            max = parseFloat(match[4]) - Number(match[5] === ')');
        }

        if (min > max) {
            vscode.window.showErrorMessage('Can\'t generate random number because the left boundary is bigger than the right boundary "' + text + '"');
        } else {
            let result = '';
            const count = parseInt(match[6]);
            for (let i = 0; i < count; ++i) {
                let randomNumber = Math.random() * (max - min) + min;
                if (match[7] === 'd') {
                    randomNumber = Math.round(randomNumber);
                }
                result += randomNumber.toString();
                if (i < count - 1) {
                    result += ', ';
                }
            }

            editBuilder.replace(selection, result);
        }
    } else {
        vscode.window.showErrorMessage('Selected text can\'t be processed "' + text + '"');
    }
}

function processSelections(textEditor: vscode.TextEditor, editBuilder: vscode.TextEditorEdit, selections: readonly vscode.Selection[]) {
    for (let selection of selections) {
        processSelection(textEditor, editBuilder, selection);
    }
}

export function activate(context: vscode.ExtensionContext) {
    let one_command = vscode.commands.registerTextEditorCommand('rand-generator.generateRandomNumber', (textEditor) => {
        textEditor.edit((editBuilder) => {
            processSelections(textEditor, editBuilder, textEditor.selections);
        });
    });

    context.subscriptions.push(one_command);

    let all_command = vscode.commands.registerTextEditorCommand('rand-generator.generateAllRandomNumbers', (textEditor) => {
        let selections: vscode.Selection[] = [];
        for (let i = 0; i < textEditor.document.lineCount; ++i) {
            const line = textEditor.document.lineAt(i);
            const text = line.text;
            if (text.match(check_all_regex)) {
                let end = text.length;
                for (let start = end - 5; start >= 0; --start) {
                    let part_text = text.slice(start, end);
                    if (part_text.match(check_all_regex)) {
                        while (part_text.match(all_regex) === null) {
                            --end;
                            part_text = text.slice(start, end); 
                        }
                        selections.push(new vscode.Selection(new vscode.Position(i, start), new vscode.Position(i, end)));
                        end = start;
                    }
                }
            }
        }
        textEditor.edit((editBuilder) => {
            processSelections(textEditor, editBuilder, selections);
        });
    });

    context.subscriptions.push(all_command);
}

export function deactivate() {}
