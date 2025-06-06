const vscode = require('vscode');

const {
    DEFAULT_COMMENTS,
    DEFAULT_HEADER_FILE_COMMENT_TYPES,
    DEFAULT_C_FILE_COMMENT_TYPES
} = require('./default_settings.js');

const {
    getTotalLines,
    getTextFromLine,
    insertTextFromLine,
    findFirstHashLineIndex,
    generateCommentFile,
    generateCommentComponent,
    getCurrentFileExtension,
    getCurrentFileName,
    replaceStringAndFillWithSpaces,
    getCurrentDateString,
} = require('./base_function.js');

/**************************************************/
/* Variable and Getter, Setter                    */
/**************************************************/

let settingData = {};

function get_settingData() {
    return settingData;
}
function set_settingData(data) {
    settingData = data;
    console.log(`settingData set`);
}

/**************************************************/
/* Extern Function                                */
/**************************************************/

// 함수의 속성에 대한 주석 생성 함수, 양식만 생성
function initGenSxCommentCommand() {
    let gen_comment = vscode.commands.registerCommand('comment-maker.GenerateSxComment', function() {
        let line_index = getTotalLines();

        while (line_index >= 0) {
            let match_info = parseFunctionDeclaration(line_index);

            if (match_info != null) {
                let comment = generateSxCommentFunction(match_info);
                insertTextFromLine(line_index, comment);
            }

            line_index -= 1;
        }

        let fisrt_line_without_comment = findFirstHashLineIndex();

        if (fisrt_line_without_comment != -1) {
            let comment = generateCommentFile();
            comment += '\n' + generateCommentComponent();
            insertTextFromLine(fisrt_line_without_comment - 1, comment);
        }

        // Display a message box to the user
        vscode.window.showInformationMessage('Completed add a comment');
    });

    return gen_comment;
}

// 코드의 속성을 구별하기 위한 주석 생성 함수, 양식만 생성
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

// 유저가 선택한 코드 위에 Config 주석(Cx) 삽입 command 초기화 설정
function initGenCxCommentCommand() {
    let gen_cx_comment = vscode.commands.registerCommand('comment-maker.GenerateCxComment', function() {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;

        const selection = editor.selection;
        const selectedLine = selection.start.line;

        var code_type = detectCodeType(editor.document.getText(selection));

        switch(code_type) {
            case 'function':
                let func_info = parseFunctionDeclaration(selectedLine);

                if (func_info != null) {
                    let comment = generateCxCommentFunction(func_info);
                    insertTextFromLine(selectedLine, comment);
                }
                break;
            case 'header':
                let header_name = parseHeader(editor.document.getText(selection));

                if (header_name != null) {
                    let comment = generateCxCommentHeader(header_name);
                    insertTextFromLine(selectedLine, comment);
                }
                break;
            case 'macro':
                let macro_name = parseMacro(editor.document.getText(selection));

                if (macro_name != null) {
                    let comment = generateCxCommentMacro(macro_name);
                    insertTextFromLine(selectedLine, comment);
                }
                break;
        }
    });

    return gen_cx_comment;
}

/**************************************************/
/* Private Function                               */
/**************************************************/

// 입력된 코드가 어떤 타입인지 확인인
function detectCodeType(code) {
    if (code.includes('#define')) {
        return 'macro';
    }

    if (code.includes('#include')) {
        return 'header';
    }

    // 함수 여부는 외부에 정의된 함수로 판단
    if (isFunctionCode(code)) {
        return 'function';
    }

    return '';
}

// 라인의 코드에서 함수 선언 정규식이 매칭되는지 확인한다.
function parseFunctionDeclaration(lineIndex) {
    const lineText = getTextFromLine(lineIndex);

    if (lineText === null) {
        return null;
    }

    // Regular Expression
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

// 코드가 함수인지 확인
function isFunctionCode(code) {
    // Regular Expression
    const functionRegex = /(?:[a-zA-Z_][a-zA-Z0-9_]*\s+)*([a-zA-Z_][a-zA-Z0-9_]*\s+\**)([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)\s*;/;
    const match = code.match(functionRegex);

    if(match)
    {
        return true;
    }

    return false;
}

// 정규식으로 매칭된 함수의 주석을 생성하는 함수(Sx)
function generateSxCommentFunction(func_info) {
    let comment = '/*S\n * @function';

    comment += '\n * @name : ' + func_info.functionName

    if (func_info.parameters != 'void') {
        let count_param = countSubstrings(func_info.parameters)

        for (let i = 0; i < count_param; i++) {
            comment += '\n * @parameter : '
        }
    }

    if (func_info.returnType != 'void') {
        comment += '\n * @return : '
    }

    comment += '\n * @description : \n*/'

    return comment
}

// 정규식으로 매칭된 함수의 주석을 생성하는 함수(Cx)
function generateCxCommentFunction(func_info) {
    let comment = '/*C\n * @Type :';
    comment += '\n * @Name : ' + func_info.functionName
    comment += '\n * @Description : \n*/'

    return comment
}

// 라인의 코드에서 Macro 이름 얻기
function parseMacro(code) {
    // 앞뒤 공백 제거
    const trimmed = code.trim();

    // "#define"으로 시작하지 않으면 무시
    if (!trimmed.startsWith('#define')) {
        return null;
    }

    // "#define" 이후 토큰 분리
    const tokens = trimmed.split(/\s+/);

    if (tokens.length < 2) {
        return null; // 매크로 이름 없음
    }

    // 매크로 이름 추출
    const macroName = tokens[1];

    // 함수형 매크로일 경우 괄호 제거: SUM(a, b) → SUM
    const match = macroName.match(/^([A-Za-z_]\w*)/);
    return match ? match[1] : null;
}

// 정규식으로 매칭된 매크로 주석 생성
function generateCxCommentMacro(macro_name) {
    let comment = '/*C\n * @Type :';
    comment += '\n * @Name : ' + macro_name;
    comment += '\n * @Description : ';
    comment += '\n * @Configuration : ';
    comment += '\n * 1.';
    comment += '\n */';

    return comment
}

// 라인의 코드에서 Header 이름 얻기
function parseHeader(code) {
    const trimmed = code.trim();

    // "#include"로 시작하는지 확인
    if (!trimmed.startsWith('#include')) {
        return null;
    }

    // 정규식으로 <...> 또는 "..." 안의 파일 이름 추출
    const match = trimmed.match(/^#include\s*[<"]([^">]+)[">]/);
    return match ? match[1] : null;
}

// 정규식으로 매칭된 헤더 주석 생성
function generateCxCommentHeader(header_name) {
    let comment = '/*C\n * @Type : Header';
    comment += '\n * @Layer : ';
    comment += '\n * @Name : ' + header_name;
    comment += '\n */';

    return comment
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

// 주석 타입에 따라 생성할 주석 comment 필터
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

// 문자열이 , 로 나눠었을 때 나눠지는 갯수를 반환, 파라미터 갯수 파악에 사용
function countSubstrings(inputString) {
    const substrings = inputString.split(',');
    return substrings.length;
    
}

/**************************************************/
/* module export                                  */
/**************************************************/

module.exports = { 
    get_settingData,
    set_settingData,
    initGenSxCommentCommand,
    initGenNormalCommand,
    initGenCxCommentCommand
};