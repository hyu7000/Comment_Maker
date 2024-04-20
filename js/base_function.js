const vscode = require('vscode');
const path = require('path');

/**************************************************/
/* Extern Function                                */
/**************************************************/

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

// 주어진 라인 인덱스의 첫 번째 문자열 요소의 전체 파일 내 문자열 인덱스를 반환
function getFirstCharacterIndexOfLine(lineIndex) {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
        const document = editor.document;
        const position = new vscode.Position(lineIndex, 0);
        return document.offsetAt(position);
    } else {
        return -1; // 에디터가 없는 경우 -1을 반환
    }
}

// 특정 인덱스로부터 {, } 쌍이 맞을때까지 탐색
function findMatchingBracesFromIndex(startIndex, open_bracket = '{', close_bracket = '}') {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        return { lastIndex: -1, content: "" }; // 에디터가 없을 경우
    }

    const document = editor.document;
    const text = document.getText();
    let count_open_bracket  = 0;
    let count_close_bracket = 0;
    let contentStartIndex = startIndex;

    // 시작 인덱스에서부터 문서 끝까지 탐색
    for (let i = startIndex; i < text.length; i++) {
        if (text[i] === open_bracket) {
            count_open_bracket += 1;
            if (count_open_bracket === 1) {
                contentStartIndex = i; // 첫 '{' 발견 위치 저장
            }
        } else if (text[i] === close_bracket) {
            count_close_bracket += 1;
        }

        // 괄호 쌍이 맞춰졌고, 최소 한 쌍 이상의 괄호가 있을 경우
        if (count_open_bracket > 0 && (count_open_bracket == count_close_bracket)) {
            return {
                lastIndex: i,
                content: text.substring(contentStartIndex, i + 1) // 시작 괄호부터 종료 괄호까지의 문자열
            };
        }
    }

    return { lastIndex: -1, content: "" }; // 쌍이 맞는 괄호를 찾지 못한 경우
}

// 문자열을 매개변수로 받은 라인 인덱스 뒤에 추가
function appendTextToLine(lineIndex, textToAppend) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        console.log("No active text editor.");
        return null; // 에디터가 없는 경우에는 null을 반환하고 함수 종료
    }

    const document = editor.document;
    const line = document.lineAt(lineIndex);
    const insertionPosition = new vscode.Position(line.range.end.line, line.range.end.character);
    const edit = new vscode.WorkspaceEdit();
    edit.insert(document.uri, insertionPosition, textToAppend);

    // 실제로 문서에 수정 사항을 적용합니다.
    vscode.workspace.applyEdit(edit).then(() => {
        console.log("Text appended successfully.");
    });

    // 삽입된 텍스트 다음의 라인 인덱스를 반환합니다.
    return lineIndex + 1;
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

// 현재 선택된 파일에서 첫번째 라인 인덱스를 반환, #을 기준으로 작성함
// .c에는 #inlude를 감지, .h에는 #define을 감지하여 첫번째 라인 인덱스를 반환
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

// 파일 관련 주석 양식을 생성하고 반환하는 함수
function generateCommentFile() {
    let comment = '/*S\n * @file';

    comment += '\n * @description : ';
    comment += '\n */';

    return comment;
}

// 컴포넌트 관련 주석 양식을 생성하고 반환하는 함수
function generateCommentComponent() {
    let comment = '/*S\n * @component : ';

    comment += '\n * @layer : ';
    comment += '\n * @description : ';
    comment += '\n */';

    return comment;
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

// 현재 활성화된 탭의 파일 명 반환
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

// 원본 문자열에서, 특정 문자열을 찾고, 3번째 파라미터 문자열로 대체하는 함수
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

// 현재 년.월.일을 반환
function getCurrentDateString() {
    const date = new Date(); // 현재 날짜와 시간

    const year = date.getFullYear(); // 년도
    const month = ('0' + (date.getMonth() + 1)).slice(-2); // 월 (getMonth()는 0부터 시작하기 때문에 +1)
    const day = ('0' + date.getDate()).slice(-2); // 일 (getDate()는 현재 날짜)

    return `${year}.${month}.${day}`; // 형식에 맞게 반환
    
}

// 파일을 찾는 함수
async function findFile(fileName) {
    const pattern = `**/${fileName}`;
    const foundFiles = await vscode.workspace.findFiles(pattern);
    if (foundFiles.length > 0) {
        // 일치하는 첫 번째 파일의 URI 반환
        return foundFiles[0];
    }
    // 파일을 찾지 못했으면 undefined 반환
    return undefined;
}

// 파일 열기 함수
async function openFile(fileUri) {
    const document = await vscode.workspace.openTextDocument(fileUri);
    await vscode.window.showTextDocument(document);
}

/**************************************************/
/* module export                                  */
/**************************************************/

module.exports = { 
    getTotalLines,
    getTextFromLine,
    getFirstCharacterIndexOfLine,
    findMatchingBracesFromIndex,
    appendTextToLine,
    insertTextFromLine,
    findFirstHashLineIndex,
    generateCommentFile,
    generateCommentComponent,
    getCurrentFileExtension,
    getCurrentFileName,
    replaceStringAndFillWithSpaces,
    getCurrentDateString,
    findFile,
    openFile
};