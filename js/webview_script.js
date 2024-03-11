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
    // 모든 탭 버튼의 'active' 클래스를 제거합니다.
    var tabbuttons = document.getElementsByClassName("tab-button");
    for (var i = 0; i < tabbuttons.length; i++) {
        tabbuttons[i].className = tabbuttons[i].className.replace(" active", "");
    }

    // 클릭된 탭 버튼에 'active' 클래스를 추가합니다.
    evt.currentTarget.className += " active";

    // .content 영역을 가져옵니다.
    var contentArea = document.querySelector('.content');

    // 선택된 탭 이름에 따라 다른 콘텐츠를 표시합니다.
    switch (tabName) {
        case 'Tab1':
            contentArea.innerHTML = '<h2>Tab 1 Content</h2><p>Here is the content for Tab 1.</p>';
            break;
        case 'Tab2':
            contentArea.innerHTML = '<h2>Tab 2 Content</h2><p>Here is the content for Tab 2.</p>';
            break;
        case 'Tab3':
            contentArea.innerHTML = '<h2>Tab 3 Content</h2><p>Here is the content for Tab 3.</p>';
            break;
        // 추가 탭에 대한 case를 여기에 추가할 수 있습니다.
        default:
            contentArea.innerHTML = '<p>Select a tab to see its content.</p>';
            break;
    }
}