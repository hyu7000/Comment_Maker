const vscode = require('vscode');

const {
    fetchOpenAIResponse
} = require('./ai_api_function.js');

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
    DEFAULT_SETTING_DATA,

    KEYWORD_COMMENT
} = require('./default_settings.js');

const {
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
} = require('./base_function.js');

/**************************************************/
/* Variable and Getter, Setter                    */
/**************************************************/

let OPENAI_API_KEY = '';

function get_OPENAI_API_KEY() {
    return OPENAI_API_KEY;
}
function set_OPENAI_API_KEY(api_key) {
    OPENAI_API_KEY = api_key;
    console.log(`API key set`);
}

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

// 함수 설명 주석 생성 함수, openAI로 생성
function initGenDescriptionByUsingOpenAI() {
    let gen_comment = vscode.commands.registerCommand('comment-maker.GenerateDescriptionComment', async function() {
        // API 키가 없을시 return
        if (OPENAI_API_KEY == '') {
            vscode.window.showInformationMessage('Cannot verify the API key');
            return;
        }
        
        // 현재 파일이 .c 가 아니라면 제거
        if (getCurrentFileExtension() !== '.c') {
            vscode.window.showInformationMessage('The file in this editor is not a .c file.');
            return;
        }

        // 프롬프트 시작
        let prompt = `Here is a collection of comment codes, function names, function parameters, and return types.\n`
        prompt += `The purpose is to utilize this information to describe the function in a way that is easily understandable at a higher level of abstraction.\n`
        prompt += `The comments are written sequentially according to the function execution order.\n`
        prompt += `A higher level of abstraction users do not need the details of the features.\n`
        prompt += `Please do not include function-related information in the description.. Write in under 100 characters.\n`
        prompt += `Multi-line comments may contain asterisks (*). Take this into account when analyzing.\n`        


        /************ c file ************/
        let func_description_line_index_obj_in_cfile = extractFunctionCommentsInFile();

        let descriptions = await generateDescriptions(prompt);

        // 각 함수 설명을 적절한 줄에 삽입
        descriptions = descriptions.filter(descriptionObj => {
            let lineIndex = func_description_line_index_obj_in_cfile[descriptionObj.functionName];
            if (lineIndex !== undefined) {
                appendTextToLine(lineIndex, descriptionObj.description);
                return false; // 현재 객체를 새 배열에 포함시키지 않음
            }
            return true; // 이 객체를 새 배열에 포함시킴
        });  

        // Display a message box to the user
        vscode.window.showInformationMessage('Completed adding a comment to the c file.');


        /************ hs file ************/
        let fileName = getCurrentFileName();
        fileName = replaceStringAndFillWithSpaces(fileName, '.c', '.h');
        let fileUri  = await findFile(fileName);
        if (fileUri === undefined) {
            vscode.window.showInformationMessage('The h file was not found.');
            let remain_description = descriptionsToStringLines(descriptions);
            appendRemainingDescriptionToFileEnd(remain_description);
            return;            
        }

        await openFile(fileUri);

        let func_description_line_index_obj_in_hfile = extractFunctionCommentsInFile();

        // 각 함수 설명을 적절한 줄에 삽입
        descriptions.forEach(({ functionName, description }) => {
            let lineIndex = func_description_line_index_obj_in_hfile[functionName];
            if (lineIndex !== undefined) {
                appendTextToLine(lineIndex, description);
            }
        });

        // Display a message box to the user
        vscode.window.showInformationMessage('Completed adding a comment to the h file.');
    });

    return gen_comment;
}

// 함수 설명 주석 제거, @description 태그의 작성된 주석만 제거
function initRemoveDescriptionInFunction() {
    let remove_comment = vscode.commands.registerCommand('comment-maker.RemoveDescriptionComment', async function() {
        const total_lines = getTotalLines();
        let cur_line_index = 0;

        while (cur_line_index < total_lines) {
            let lineText = getTextFromLine(cur_line_index);
            let index_in_line_to_remove = findTagInLine(lineText, "@description");

            if (index_in_line_to_remove !== -1) {
                await deleteTextFromRange(cur_line_index, index_in_line_to_remove); // await 추가
                console.log(`line: ${cur_line_index}, index removed: ${index_in_line_to_remove}`);
            }

            cur_line_index++;
        }

        vscode.window.showInformationMessage('Completed remove a comment');
    });

    return remove_comment;
}

// 함수의 속성에 대한 주석 생성 함수, 양식만 생성
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

/**************************************************/
/* Private Function                               */
/**************************************************/

// 매개변수의 코드에서 /*S 부터 */ 주석까지 탐색한다. 함수 외부에서 탐색
function extractFunctionCommentsInFile() {
    let total_lines = getTotalLines();
    const startComment = '/*S';
    const endComment = '*/';
    const description_tag = '@description';
    const function_tag = '@function';
    const name_tag = '@name';

    let is_in_S_comment = false;
    let is_function_comment = false;

    let func_description_line_index = {};
    let cur_line_index = 0;

    let cur_function_name = '';

    while (cur_line_index < total_lines) {
        let lineText = getTextFromLine(cur_line_index);
        
        // S 주석 내부가 아니며, /*S 가 없을 경우
        if ((lineText.indexOf(startComment, 0) === -1) && is_in_S_comment === false) {
            cur_line_index += 1;
            continue;
        }
        
        // /*S 발견 후 첫 탐색일 경우
        if(is_in_S_comment === false)
        {
            cur_function_name = '';
            is_in_S_comment = true;
        }

        // S 주석 내부에 있으며, */ 를 탐색할 경우
        if ((lineText.indexOf(endComment, 0) != -1) && is_in_S_comment === true) {
            cur_function_name == '';
            is_in_S_comment = false;
            
            cur_line_index += 1;
            continue;
        }

        // 함수 태그 탐색한 경우
        if ((lineText.indexOf(function_tag, 0) != -1) && is_function_comment === false) {
            is_function_comment = true;
            cur_line_index += 1;
            continue;
        }  

        // 이름 태그 탐색한 경우
        if ((lineText.indexOf(name_tag, 0) != -1) && cur_function_name === '') {
            let name_start_index = lineText.indexOf(':', 0);
            if (name_start_index != -1)
            {
                cur_function_name = lineText.substring(name_start_index + 1).trim();
            }
            cur_line_index += 1;
            continue;
        }  
        
        // 설명 태그 탐색한 경우
        if ((lineText.indexOf(description_tag, 0) != -1) && cur_function_name != '') {
            func_description_line_index[cur_function_name] = cur_line_index;
        }   

        cur_line_index += 1;
    }

    return func_description_line_index;
}

// 매개변수의 코드에서 /*S 부터 */ 주석까지 탐색한다. 함수 내부에서 탐색
function extractCommentsInFunction(code) {
    const startComment = '/*S';
    const endComment = '*/';
    let comments = [];
    let startIndex = 0;

    while (startIndex < code.length) {
        startIndex = code.indexOf(startComment, startIndex);
        if (startIndex === -1) break; // 더 이상 시작 문자열이 없으면 반복 종료
        
        let contentStart = startIndex + startComment.length; // 주석 내용 시작 인덱스
        let endIndex = code.indexOf(endComment, contentStart);
        if (endIndex === -1) break; // 종료 문자열이 없으면 반복 종료

        // 주석 내용 추출 및 배열에 추가
        comments.push(code.substring(contentStart, endIndex).trim());

        // 다음 탐색을 위한 인덱스 조정
        startIndex = endIndex + endComment.length;
    }

    return comments;
}

// 라인의 코드에서 함수 정의 정규식이 매칭되는지 확인한다.
function parseFunctionDefinition(lineIndex) {
    const lineText = getTextFromLine(lineIndex);

    if (lineText === null) {
        return null;
    }
    
    // Regular Expression
    const functionDefinitionRegex = /^(?:[a-zA-Z_][a-zA-Z0-9_]*\s+)*([a-zA-Z_][a-zA-Z0-9_]*\s+\**)([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)\s*$/;
    const match = lineText.match(functionDefinitionRegex);

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

// 정규식으로 매칭된 함수의 match_info 를 매개변수로 받고, 주석을 생성하는 함수
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

// 태그와 콜론(:)을 찾고, 콜론 다음 인덱스를 반환한다.
function findTagInLine(line_text, tag) {
    const tag_index = line_text.indexOf(tag);
    if (tag_index === -1) {
        return -1; 
    }

    const colon_index = line_text.indexOf(":");
    if (colon_index === -1) {
        return -1;
    }

    return colon_index + 1;
}

// 특정 라인의 start, end 인덱스 사이에 있는 문자열을 제거 하는 함수
// endIndex의 디폴트는 라인 끝까지를 의미함
function deleteTextFromRange(lineNumber, startIndex, endIndex = -1) {
    return new Promise((resolve, reject) => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const document = editor.document;
            const line = document.lineAt(lineNumber);
            const endCharIndex = endIndex !== -1 ? Math.min(endIndex, line.range.end.character) : line.range.end.character;
            const deleteRange = new vscode.Range(lineNumber, startIndex, lineNumber, endCharIndex);

            editor.edit(editBuilder => {
                editBuilder.delete(deleteRange);
            }).then(success => {
                if (success) {
                    console.log('Text deleted successfully.');
                    resolve(); // 성공 시 resolve 호출
                } else {
                    console.log('Failed to delete text.');
                    reject('Failed to delete text'); // 실패 시 reject 호출
                }
            }, error => {
                console.error('Error occurred:', error);
                reject(error); // 에러 시 reject 호출
            });
        } else {
            reject('No active editor');
        }
    });
}

// prompt를 기반으로 설명 생성
async function generateDescriptions(prompt) {
    const total_lines = getTotalLines();
    let line_index = total_lines - 1;
    let function_descriptions = {};
    let fetchDescriptionsPromises = [];
    
    while (line_index >= 0) {
        let match_info = parseFunctionDefinition(line_index);
    
        if (!match_info) {
            line_index -= 1;
            continue;
        }
    
        let function_definition_start_index = getFirstCharacterIndexOfLine(line_index);
        let function_body = findMatchingBracesFromIndex(function_definition_start_index);
        let comment = extractCommentsInFunction(function_body.content);
                
        if (comment.length === 0) {
            line_index -= 1;
            continue;
        }
    
        let function_name = match_info.functionName;
        let function_return_type = match_info.returnType;
        let function_parameters = match_info.parameters;
        let combinedComments = comment.join(', ');
        let temp_prompt = `${prompt}The function name is '${function_name}', the return type is '${function_return_type}', and the parameters are '${function_parameters}'.\nThe function's comment is '${combinedComments}'`;
    
        fetchDescriptionsPromises.push(fetchOpenAIResponse(temp_prompt, OPENAI_API_KEY).then(description => {
            function_descriptions[function_name] = description;
            return { functionName: function_name, description };
        }));
    
        line_index -= 1;
    }
    
    return await Promise.all(fetchDescriptionsPromises);
}

// 작성되지 못한 description을 파일 맨 끝에 작성
function appendRemainingDescriptionToFileEnd(remain_description) {
    const total_lines = getTotalLines();

    insertTextFromLine(total_lines, remain_description);
}

// 객체의 키-값 쌍을 문자열로 변환하고 배열로 만듭니다.
function descriptionsToStringLines(descriptions) {
    // 배열의 각 객체에 대해 문자열을 생성합니다.
    const lines = descriptions.map(desc => `//"${desc.functionName} : ${desc.description}"`);
    // 배열의 각 요소를 줄바꿈 문자로 결합하여 최종 문자열을 생성합니다.
    return lines.join('\n');
}


/**************************************************/
/* module export                                  */
/**************************************************/

module.exports = { 
    get_OPENAI_API_KEY,
    set_OPENAI_API_KEY,
    get_settingData,
    set_settingData,
    initGenDescriptionByUsingOpenAI,
    initRemoveDescriptionInFunction,
    initGenDetailCommand,
    initGenNormalCommand
};