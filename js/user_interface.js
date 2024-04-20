const vscode = require('vscode');

/**************************************************/
/* Extern Function                                */
/**************************************************/

// 디테일 주석 생성 아이콘 추가하기
function initGenDetailCommentBtn() {
    let genDetailCommentBtn = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    genDetailCommentBtn.command = 'comment-maker.GenerateDetailComment'; // 이 항목을 클릭했을 때 실행할 명령어
    genDetailCommentBtn.text = "$(comment) Add Comment"; // 버튼에 표시될 텍스트 및 아이콘 (예: Octicon 아이콘 사용)
    genDetailCommentBtn.tooltip = "Generate Comment"; // 버튼에 마우스를 올렸을 때 표시될 툴팁

    genDetailCommentBtn.show(); // 상태 바 항목을 표시

    return genDetailCommentBtn;
}

/**************************************************/
/* module export                                  */
/**************************************************/

module.exports = { 
    initGenDetailCommentBtn
};