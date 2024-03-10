// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json

    // 주석 생성 커맨드 초기화
    let gen_comment = initGenCommand()
    context.subscriptions.push(gen_comment);

    // 웹뷰 초기화
    let open_page = initWebView(context)
    context.subscriptions.push(open_page);

    // 상태 바 항목 생성
    let statusBarBtn = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBarBtn.command = 'comment-maker.GenerateComment'; // 이 항목을 클릭했을 때 실행할 명령어
    statusBarBtn.text = "$(comment) Add Comment"; // 버튼에 표시될 텍스트 및 아이콘 (예: Octicon 아이콘 사용)
    statusBarBtn.tooltip = "Generate Comment"; // 버튼에 마우스를 올렸을 때 표시될 툴팁

    statusBarBtn.show(); // 상태 바 항목을 표시
    context.subscriptions.push(statusBarBtn);

    console.log('추가됨');
}

// This method is called when your extension is deactivated
function deactivate() {}

// 매개변수 인덱스에 해당하는 라인의 코드를 가져온다.
function getTextFromLine(lineIndex) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        console.log("No active text editor.");
        return null;
    }

    const document = editor.document;
    if (lineIndex < 0 || lineIndex >= document.lineCount) {
        console.log("Line index out of range.");
        return null;
    }

    const lineText = document.lineAt(lineIndex).text;
    return lineText;
}

// 라인의 코드에서 함수 정규식이 매칭되는지 확인한다.
function parseFunctionDeclaration(lineIndex) {
    const lineText = getTextFromLine(lineIndex);

    if (lineText === null) {
        return null;
    }

    const functionRegex = /(?:[a-zA-Z_][a-zA-Z0-9_]*\s+)*([a-zA-Z_][a-zA-Z0-9_]*\s+\**)([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)\s*;/;
    const match = lineText.match(functionRegex);

    if (match) {
        // match[1]에는 반환 타입이, match[2]에는 함수 이름이, match[3]에는 매개변수들이 포함됩니다.
        const returnType = match[1].trim(); // 반환 타입
        const functionName = match[2]; // 함수 이름
        const parameters = match[3]; // 매개변수들

        return {
            returnType, // 반환 타입
            functionName, // 함수 명
            parameters // 매개변수들
        };
    }

    // 매칭되지 않는 경우
    return null;
}

// 현재 파일의 전체 라인 수 반환
function getTotalLines() {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
        const document = editor.document;
        const totalLines = document.lineCount;
        return totalLines;
    } else {
        return -1;
    }
}

/**
 * 현재 선택된 파일에 특정 라인부터 시작하여 문자열을 입력합니다.
 * 문자열 내의 \n 기호를 기준으로 여러 라인에 걸쳐 입력할 수 있습니다.
 * @param {number} startLine 시작 라인 인덱스 (0부터 시작)
 * @param {string} text 입력할 문자열
 */
function insertTextFromLine(startLine, text) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        console.log("No active text editor.");
        return null; // 에디터가 없는 경우에는 null을 반환하고 함수 종료
    }

    const document = editor.document;
    const insertionPosition = new vscode.Position(startLine, 0);
    const edit = new vscode.WorkspaceEdit();
    edit.insert(document.uri, insertionPosition, text + '\n');

    // 실제로 문서에 수정 사항을 적용합니다.
    vscode.workspace.applyEdit(edit).then(() => {
        console.log("Text inserted successfully.");
    });

    // 삽입된 텍스트 다음의 라인 인덱스를 계산합니다.
    const newTextLines = text.split('\n').length;
    const nextLineIndex = startLine + newTextLines;
    return nextLineIndex; // 여기서 바로 다음 라인 인덱스를 반환합니다.
}

// 문자열이 , 로 나눠었을 때 나눠지는 갯수를 반환, 파라미터 갯수 파악에 사용
function countSubstrings(inputString) {
    const substrings = inputString.split(',');
    return substrings.length;
}

// 현재 선택된 파일에서 첫번째 라인 인덱스를 반환
function findFirstHashLineIndex() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        console.log("No active text editor.");
        return -1; // 에디터가 활성화되지 않았을 경우 -1 반환
    }

    const document = editor.document;
    const lineCount = document.lineCount;

    for (let i = 0; i < lineCount; i++) {
        const lineText = document.lineAt(i).text.trim(); // 공백 제거
        if (lineText.startsWith('#')) {
            return i + 1; // 1부터 시작하는 라인 인덱스 반환
        }
    }

    return -1; // '#'으로 시작하는 라인을 찾지 못한 경우 -1 반환
}


// match_info 를 매개변수로 받고, 주석을 생성하는 함수
function generateCommentFunction(match_info) {
    let comment = '/*S\n * @function';

    comment += '\n * @name : ' + match_info.functionName

    if (match_info.parameters != 'void') {
        let count_param = countSubstrings(match_info.parameters)

        for (let i = 0; i < count_param; i++) {
            comment += '\n * @parameter : '
        }
    }

    if (match_info.returnType != 'void') {
        comment += '\n * @return : '
    }

    comment += '\n * @description : \n*/'

    return comment
}

// 파일 관련 주석 반환하는 함수
function generateCommentFile() {
    let comment = '/*S\n * @file';

    comment += '\n * @description : ';
    comment += '\n */';

    return comment;
}

// 컴포넌트 관련 주석 반환하는 함수
function generateCommentComponent() {
    let comment = '/*S\n * @component : ';

    comment += '\n * @layer : ';
    comment += '\n * @description : ';
    comment += '\n */';

    return comment;
}

function initWebView(context) {
    let web_view = vscode.commands.registerCommand('yourExtension.showWebView', function() {
        const panel = vscode.window.createWebviewPanel(
            'Settings Comment Generation', // 웹뷰 유형을 식별하는 문자열
            'Settings Comment Generation', // 웹뷰 타이틀
            vscode.ViewColumn.One, // 웹뷰를 표시할 열
            {
                enableScripts: true // Enable JavaScript in the webview
            } // 웹뷰 옵션
        );

        const scriptSrc = vscode.Uri.joinPath(context.extensionUri, 'webview_script.js');
        const scriptUri = panel.webview.asWebviewUri(scriptSrc).toString();

        // 웹뷰 콘텐츠를 파일에서 읽기
        const htmlPath = path.join(context.extensionPath, 'settingCommentGeneration.html');
        let htmlContent = fs.readFileSync(htmlPath, 'utf8');

        htmlContent = htmlContent.replace('SCRIPT_SRC_PLACEHOLDER', scriptUri);
        panel.webview.html = htmlContent;

        // 메시지 수신 리스너 설정
        panel.webview.onDidReceiveMessage(message => {
            switch (message.command) {
                case 'saveText':
                    // 여기서 메시지 처리
                    console.log(message.text);
                    break;
                    // 추가적인 메시지 타입을 여기서 처리할 수 있습니다.
            }
        }, undefined, context.subscriptions);
    });

    return web_view;
}

function initGenCommand() {
    let gen_comment = vscode.commands.registerCommand('comment-maker.GenerateComment', function() {
        let line_index = getTotalLines();

        while (line_index >= 0) {
            let match_info = parseFunctionDeclaration(line_index);

            if (match_info != null) {
                let comment = generateCommentFunction(match_info);
                insertTextFromLine(line_index, comment);
            }

            line_index -= 1;
        }

        let fisrt_line_withoud_comment = findFirstHashLineIndex();

        if (fisrt_line_withoud_comment != -1) {
            let comment = generateCommentFile();
            comment += '\n' + generateCommentComponent();
            insertTextFromLine(fisrt_line_withoud_comment - 1, comment);
        }

        // Display a message box to the user
        vscode.window.showInformationMessage('Completed add a comment');
    });

    return gen_comment;
}

module.exports = {
    activate,
    deactivate
}