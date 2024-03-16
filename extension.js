// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

const {
    C_FILE_COMMENT,
    HEADER_FILE_COMMENT,
    INCLUDES_COMMENT,
    MACRO_COMMENT,
    GLOBAL_VAR_COMMENT,
    DATA_STRUCTURE_COMMENT,
    FUNCTION_PROTOTYPES_COMMENT,
    INTERRUPT_COMMENT,
    PRIVATE_FUNCTION_COMMENT,
    EXTERN_FUNCTION_COMMENT,

    DEFAULT_COMMENTS,
    DEFAULT_HEADER_FILE_COMMENT_TYPES,
    DEFAULT_C_FILE_COMMENT_TYPES,
    DEFAULT_SETTING_DATA
} = require('./js/default_settings.js');

let commentReplacements = {};

let settingData = {};

let is_commnent_saved = false;

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json

    // 저장된 데이터 불러오기
    checkSavedData(context);

    // 디테일 주석 생성 커맨드 초기화
    let gen_detail_comment = initGenDetailCommand();
    context.subscriptions.push(gen_detail_comment);

    // 일반 주석 생성 커맨드 초기화
    let gen_normal_comment = initGenNormalCommand();
    context.subscriptions.push(gen_normal_comment);

    // 웹뷰 초기화
    let open_page = initWebView(context);
    context.subscriptions.push(open_page);

    // 상태 바에 디테일 주석 버튼 항목 생성
    let genDetailCommentBtn = initGenDetailCommentBtn();
    context.subscriptions.push(genDetailCommentBtn);

    // 주석 데코레이션 설정
    initDecorations(context);
    
}

// This method is called when your extension is deactivated
function deactivate() {}

// Decorations 업데이트 로직을 별도의 함수로 분리
function updateAtWordDecorations(activeEditor, decorationType) {
    if (!activeEditor) {
        return;
    }

    const regEx = /\/\*S[\s\S]*?\*\//g; // /*S ... */에 대한 정규 표현식
    const text = activeEditor.document.getText();
    const atWordDecorations = [];
    let match;

    while ((match = regEx.exec(text))) {
        const subText = match[0];
        let lastIndex = 0;  // 마지막으로 찾은 인덱스를 추적
        const subMatches = subText.match(/@[\w]+/g);  // @로 시작하는 단어에 대한 정규 표현식
    
        if (subMatches) {
            subMatches.forEach(matchStr => {  // 'match' 대신 'matchStr'로 이름 변경하여 혼동 방지
                const matchIndex = subText.indexOf(matchStr, lastIndex);  // 마지막으로 찾은 위치 이후로부터 시작
                const startPos = activeEditor.document.positionAt(match.index + matchIndex);
                const endPos = activeEditor.document.positionAt(match.index + matchIndex + matchStr.length);
                const decoration = { range: new vscode.Range(startPos, endPos) };
                atWordDecorations.push(decoration);
                lastIndex = matchIndex + matchStr.length;  // 마지막으로 찾은 인덱스 업데이트
            });
        }
    }

    activeEditor.setDecorations(decorationType, atWordDecorations);
}

function initDecorations(context) {
    const decorationType = vscode.window.createTextEditorDecorationType({
        color: '#3E9CD6' // 텍스트 색상을 파란색으로 설정
    });

    const updateDecorations = () => {
        const activeEditor = vscode.window.activeTextEditor;
        updateAtWordDecorations(activeEditor, decorationType);
    };

    if (vscode.window.activeTextEditor) {
        updateDecorations(); // 초기 상태에서 decoration 업데이트
    }

    // Editor가 변경되었을 때 Decorations 업데이트
    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(updateDecorations));

    // 문서 내용이 변경되었을 때 Decorations 업데이트
    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(event => {
        if (vscode.window.activeTextEditor && event.document === vscode.window.activeTextEditor.document) {
            updateDecorations();
        }
    }));
}

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
 * 주어진 객체의 각 value를 vscode 파일에 삽입합니다.
 * @param {Object} obj 삽입할 value 값을 가진 객체
 * @param {number} startLine 삽입을 시작할 라인 번호
 */
function generateNormalAllComment(obj, startLine) {
    let fullText = ''; // 모든 텍스트를 여기에 저장할 예정

    // 모든 key-value 쌍에 대해 반복
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            const values = obj[key]; // 현재 key의 value를 가져옴
            if (Array.isArray(values)) {
                // value 값이 배열인 경우, 각 항목을 분리하여 삽입
                values.forEach((value, index) => {
                    // 현재 value 값을 fullText에 추가
                    fullText += value + '\n';
                    if (index < values.length - 1) { // 마지막 항목이 아니라면 두 줄 띄우기
                        // fullText에 두 줄을 추가
                        fullText += '\n\n';
                    }
                });
            } else {
                // value 값이 단일 문자열인 경우 바로 추가
                fullText += values + '\n\n\n'; // 문자열 끝에 두 줄 띄우기를 추가
            }
        }
    }

    // 이제 fullText에 모든 주석이 저장되어 있으므로, insertTextFromLine를 한 번만 호출합니다.
    insertTextFromLine(startLine, fullText);
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

// 현재 활성화된 탭의 확장자 반환
function getCurrentFileExtension() {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
        const filePath = editor.document.uri.path;
        const extensionMatch = filePath.match(/\.([0-9a-z]+)(?:[\?#]|$)/i); // 파일 확장자를 정규식을 사용하여 추출
        if (extensionMatch) {
            const extension = extensionMatch[0]; // '.c', '.h' 등과 같은 형태로 추출됩니다.
            console.log(extension); // 확장자 출력
            return extension; // 확장자 반환
        } else {
            console.log('No file extension found');
            return ''; // 확장자를 찾을 수 없는 경우
        }
    } else {
        console.log('No active editor');
        return ''; // 에디터가 활성화되어 있지 않은 경우
    }
}

function getCurrentFileName() {
    // 현재 활성화된 텍스트 편집기를 가져옵니다.
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        console.log('No active editor');
        return ''; // 활성 편집기가 없다면 빈 문자열 반환
    }

    // 현재 편집 중인 문서의 URI를 가져옵니다.
    const documentUri = editor.document.uri;
    // URI 객체에서 경로 부분만 추출합니다.
    const filePath = documentUri.fsPath;

    // 경로에서 파일 이름을 추출합니다. (확장자 포함)
    const fileName = path.basename(filePath);

    return fileName; // 파일명 반환
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

function checkSavedData(context) {
    is_commnent_saved = context.globalState.get('is_commnent_saved', false);

    if(is_commnent_saved) {
        commentReplacements = context.globalState.get('saved_comment',      DEFAULT_COMMENTS);
        settingData         = context.globalState.get('saved_setting_data', DEFAULT_SETTING_DATA);
    }
    else {
        commentReplacements = DEFAULT_COMMENTS;
        settingData         = DEFAULT_SETTING_DATA;
    }
}

function replaceHtmlCode(htmlCode, detectCode, replace) {
    // <!--C_FILE_COMMENT--> 형태의 주석만 매칭하기 위한 정규 표현식
    const pattern = new RegExp(`<!--${detectCode}-->`, 'g');
    return htmlCode.replace(pattern, replace);
}

function replaceAllComments(htmlCode, replacements) {
    let modifiedHtml = htmlCode;
    for (const [detectCode, replace] of Object.entries(replacements)) {
        modifiedHtml = replaceHtmlCode(modifiedHtml, detectCode, replace);
    }
    return modifiedHtml;
}

function initWebView(context) {
    let web_view = vscode.commands.registerCommand('comment-maker.Settings', function() {
        const panel = vscode.window.createWebviewPanel(
            'Settings Comment Generation', // 웹뷰 유형을 식별하는 문자열
            'Settings Comment Generation', // 웹뷰 타이틀
            vscode.ViewColumn.One, // 웹뷰를 표시할 열
            {
                enableScripts: true // Enable JavaScript in the webview
            } // 웹뷰 옵션
        );

        // 스타일시트 URI 생성
        const styleUri = panel.webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'css', 'styles.css'));

        const scriptSrc = vscode.Uri.joinPath(context.extensionUri, 'js', 'webview_script.js');
        const scriptUri = panel.webview.asWebviewUri(scriptSrc).toString();

        // 웹뷰 콘텐츠를 파일에서 읽기
        const htmlPath = path.join(context.extensionPath, 'index.html');
        let htmlContent = fs.readFileSync(htmlPath, 'utf8');

        htmlContent = htmlContent.replace('SCRIPT_SRC_PLACEHOLDER', scriptUri)
                                 .replace('STYLE_SRC_PLACEHOLDER', styleUri);
        panel.webview.html = htmlContent;
        
        // Tab1 초기화
        const initialContentPath = path.join(context.extensionPath, 'pages', 'Tab1.html');
        let initialContent = fs.readFileSync(initialContentPath, 'utf8');
        initialContent = replaceAllComments(initialContent, commentReplacements);
        panel.webview.postMessage({ command: 'updateContent_Tab1', content: initialContent });

        // 메시지 수신 리스너 설정
        panel.webview.onDidReceiveMessage(message => {
            switch (message.command) {   
                case 'requestContent':
                    let tabHtmlPath = path.join(context.extensionPath, 'pages', `${message.tabName}.html`);
                    let tabContent = fs.readFileSync(tabHtmlPath, 'utf8');

                    if (message.tabName == 'Tab1') {
                        // commentReplacements 객체를 사용하여 HTML 내의 모든 주석을 한 번에 교체
                        tabContent = replaceAllComments(tabContent, commentReplacements);
                        panel.webview.postMessage({ command: 'updateContent_Tab1', content: tabContent });
                    }
                    else if (message.tabName == 'Tab2') {
                        tabContent = replaceAllComments(tabContent, settingData);
                        panel.webview.postMessage({ command: 'updateContent', content: tabContent });
                    }   
                    else {
                        panel.webview.postMessage({ command: 'updateContent', content: tabContent });
                    }

                    break;

                case 'request_default_comments':
                    panel.webview.postMessage({ command: 'response_default_comments', default_comments: DEFAULT_COMMENTS });
                    break;

                case 'save_comment':        
                    context.globalState.update('saved_comment', message.comment).then(() => {
                        // 데이터 저장이 성공적으로 완료된 후 실행할 코드
                        panel.webview.postMessage({ command: 'saved_successfully'});
                        commentReplacements = message.comment;
                    }).catch((error) => {
                        // 데이터 저장 중 오류가 발생했을 때 실행할 코드
                        console.error('Error saving the comment:', error);
                    });
                    break;
                    
                case 'save_setting_data':
                    context.globalState.update('saved_setting_data', message.setting).then(() => {
                        // 데이터 저장이 성공적으로 완료된 후 실행할 코드
                        panel.webview.postMessage({ command: 'saved_successfully'});
                        settingData = message.setting;
                    }).catch((error) => {
                        // 데이터 저장 중 오류가 발생했을 때 실행할 코드
                        console.error('Error saving the comment:', error);
                    });
                    break;
            }
        }, undefined, context.subscriptions);
    });

    return web_view;
}

function initGenDetailCommand() {
    let gen_comment = vscode.commands.registerCommand('comment-maker.GenerateDetailComment', function() {
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

function filterCommentsByTypes(defaultComments, commentTypes) {
    let filteredComments = {};
    // commentTypes 배열을 순회하면서, 각 키에 대응하는 defaultComments의 값을 새 객체에 추가
    commentTypes.forEach(type => {
        if (defaultComments[type]) { // 해당 타입의 코멘트가 존재한다면
            filteredComments[type] = defaultComments[type];
        }
    });
    return filteredComments;
}

function replaceStringAndFillWithSpaces(originalString, searchString, replaceString) {
    // 다중라인 처리를 위해 originalString을 라인별로 분할합니다.
    const lines = originalString.split('\n');
    const resultLines = [];

    lines.forEach(line => {
        // 각 라인에 대해서 searchString의 시작 위치를 찾습니다.
        const indexToReplace = line.indexOf(searchString);
        if (indexToReplace === -1) {
            // searchString이 없는 경우 원본 라인을 그대로 사용합니다.
            resultLines.push(line);
            return;
        }

        // '**' 문자열의 시작 위치를 찾습니다.
        const indexDoubleAsterisks = line.indexOf('**', indexToReplace);

        // searchString을 replaceString으로 대체하고, 나머지 부분은 공백으로 채웁니다.
        let newLine = line.substring(0, indexToReplace) + 
                      replaceString + 
                      ' '.repeat(Math.max(0, indexDoubleAsterisks - indexToReplace - replaceString.length));

        if (indexDoubleAsterisks !== -1) {
            // '**' 이후의 문자열을 원본에서 복사합니다.
            newLine += line.substring(indexDoubleAsterisks);
        }

        // 결과 라인 추가
        resultLines.push(newLine);
    });

    // 수정된 라인들을 다시 하나의 문자열로 병합합니다.
    return resultLines.join('\n');
}



function getCurrentDateString() {
    const date = new Date(); // 현재 날짜와 시간

    const year = date.getFullYear(); // 년도
    const month = ('0' + (date.getMonth() + 1)).slice(-2); // 월 (getMonth()는 0부터 시작하기 때문에 +1)
    const day = ('0' + date.getDate()).slice(-2); // 일 (getDate()는 현재 날짜)

    return `${year}.${month}.${day}`; // 형식에 맞게 반환
}

function initGenNormalCommand() {
    let gen_normal_comment = vscode.commands.registerCommand('comment-maker.GenerateNormalComment', function() {
        let temp_commentReplacements = {};

        if (getCurrentFileExtension() == '.c')
        {
            temp_commentReplacements = filterCommentsByTypes(DEFAULT_COMMENTS, DEFAULT_C_FILE_COMMENT_TYPES);
            temp_commentReplacements['C_FILE_COMMENT'] = replaceStringAndFillWithSpaces(temp_commentReplacements['C_FILE_COMMENT'], '{Project_name}', settingData['Project_name']);
            temp_commentReplacements['C_FILE_COMMENT'] = replaceStringAndFillWithSpaces(temp_commentReplacements['C_FILE_COMMENT'], '{Reviser}',      settingData['Reviser']);
            temp_commentReplacements['C_FILE_COMMENT'] = replaceStringAndFillWithSpaces(temp_commentReplacements['C_FILE_COMMENT'], '{0000.00.00}',   getCurrentDateString());
            temp_commentReplacements['C_FILE_COMMENT'] = replaceStringAndFillWithSpaces(temp_commentReplacements['C_FILE_COMMENT'], '{FileName}',     getCurrentFileName());
            generateNormalAllComment(temp_commentReplacements, 0);
        }
        else if(getCurrentFileExtension() == '.h')
        {
            temp_commentReplacements = filterCommentsByTypes(DEFAULT_COMMENTS, DEFAULT_HEADER_FILE_COMMENT_TYPES);
            temp_commentReplacements['HEADER_FILE_COMMENT'] = replaceStringAndFillWithSpaces(temp_commentReplacements['HEADER_FILE_COMMENT'], '{Project_name}', settingData['Project_name']);
            temp_commentReplacements['HEADER_FILE_COMMENT'] = replaceStringAndFillWithSpaces(temp_commentReplacements['HEADER_FILE_COMMENT'], '{Reviser}',      settingData['Reviser']);
            temp_commentReplacements['HEADER_FILE_COMMENT'] = replaceStringAndFillWithSpaces(temp_commentReplacements['HEADER_FILE_COMMENT'], '{0000.00.00}',   getCurrentDateString());
            temp_commentReplacements['HEADER_FILE_COMMENT'] = replaceStringAndFillWithSpaces(temp_commentReplacements['HEADER_FILE_COMMENT'], '{FileName}',     getCurrentFileName());
            generateNormalAllComment(temp_commentReplacements, 0);
        }

        // Display a message box to the user
        vscode.window.showInformationMessage('Completed add a comment');
    });

    return gen_normal_comment;
}

function initGenDetailCommentBtn() {
    let genDetailCommentBtn = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    genDetailCommentBtn.command = 'comment-maker.GenerateDetailComment'; // 이 항목을 클릭했을 때 실행할 명령어
    genDetailCommentBtn.text = "$(comment) Add Comment"; // 버튼에 표시될 텍스트 및 아이콘 (예: Octicon 아이콘 사용)
    genDetailCommentBtn.tooltip = "Generate Comment"; // 버튼에 마우스를 올렸을 때 표시될 툴팁

    genDetailCommentBtn.show(); // 상태 바 항목을 표시

    return genDetailCommentBtn;
}

module.exports = {
    activate,
    deactivate
}