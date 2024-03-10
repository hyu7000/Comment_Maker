(function() {
    // VS Code API와의 연결을 설정합니다.
    const vscode = acquireVsCodeApi();

    // 페이지가 로드되면, 이벤트 리스너를 추가합니다.
    document.addEventListener('DOMContentLoaded', () => {
        document.getElementById('add-btn').addEventListener('click', () => {
            const textToSave = document.getElementById('header_file').value;
            const message = { command: 'saveText', text: textToSave };
            // VS Code API를 통해 메시지를 전송합니다.
            vscode.postMessage(message);
        });
    });
})();

function addComment() {
    var number = document.querySelectorAll('.content textarea').length + 1;
    var newComment = document.createElement('textarea');
    var newLabel = document.createElement('label');
    newLabel.innerHTML = "Comment " + number;
    newLabel.setAttribute('for', 'comment' + number);
    newLabel.classList.add('comment-label');

    newComment.id = 'comment' + number;
    document.querySelector('.content').appendChild(newLabel);
    document.querySelector('.content').appendChild(newComment);
}

function openTab(evt, tabName) {
    var i, tabcontent, tabbuttons;
    tabcontent = document.getElementsByClassName("tab-content");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }
    tabbuttons = document.getElementsByClassName("tab-button");
    for (i = 0; i < tabbuttons.length; i++) {
        tabbuttons[i].className = tabbuttons[i].className.replace(" active", "");
    }
    document.getElementById(tabName).style.display = "block";
    evt.currentTarget.className += " active";
}