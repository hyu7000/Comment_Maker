const vscode = require('vscode');

const {
    KEYWORD_SX_COMMENT,
    KEYWORD_CX_COMMENT
} = require('./default_settings.js');

/**************************************************/
/* Extern Function                                */
/**************************************************/

// 데코레이션 초기화
function initDecorations(context) {
    // 데코레이션 색상 정의
    const decorationType = vscode.window.createTextEditorDecorationType({
        color: '#3E9CD6' // 텍스트 색상을 파란색으로 설정
    });

    // 데코레이션 업데이트 함수 정의
    const updateDecorations = () => {
        const activeEditor = vscode.window.activeTextEditor;
        const keywordSxRegex = /\/\*S[\s\S]*?\*\//g; // /*S ... */ 블록
        const keywordCxRegex = /\/\*C[\s\S]*?\*\//g; // /*C ... */ 블록
        updateCommentDecorations(activeEditor, decorationType, KEYWORD_SX_COMMENT, keywordSxRegex);
        updateCommentDecorations(activeEditor, decorationType, KEYWORD_CX_COMMENT, keywordCxRegex);
    };

    // 첫 로딩될때 정의된 updateDecorations 호출
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

/**************************************************/
/* Private Function                               */
/**************************************************/

// Decorations 업데이트 로직을 별도의 함수로 분리
const decorations = [];
function updateCommentDecorations(activeEditor, decorationType, matchWords, blockRegex) {
    if (!activeEditor) {
        return;
    }

    const regEx = blockRegex; // /*S ... */에 대한 정규 표현식
    const text = activeEditor.document.getText();
    let match;

    while ((match = regEx.exec(text))) {
        const subText = match[0];
        let lastIndex = 0;  // 마지막으로 찾은 인덱스를 추적
        const subMatches = subText.match(/@[\w]+/g);  // @로 시작하는 단어에 대한 정규 표현식
    
        if (subMatches) {
            subMatches.forEach(matchStr => {
                let matchIndex = subText.indexOf(matchStr, lastIndex);  // 마지막으로 찾은 위치 이후로부터 시작, [문제 해결] 여기로 이동
                // 여기서 확인: matchStr가 matchWords 중 하나와 일치하는지 확인
                if (matchWords.includes(matchStr.slice(1))) { // '@' 문자를 제거하고 확인
                    if (matchIndex !== -1) { 
                        const startPos = activeEditor.document.positionAt(match.index + matchIndex);
                        const endPos = activeEditor.document.positionAt(match.index + matchIndex + matchStr.length);
                        const decoration = { range: new vscode.Range(startPos, endPos) };
                        decorations.push(decoration);
                    }
                }
                lastIndex = matchIndex >= 0 ? matchIndex + matchStr.length : lastIndex; // [문제 해결] 유효한 matchIndex만 업데이트
            });
        }
    }

    activeEditor.setDecorations(decorationType, decorations);
}

/**************************************************/
/* module export                                  */
/**************************************************/

module.exports = { 
    initDecorations
};