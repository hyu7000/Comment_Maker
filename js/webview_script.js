const vscode = acquireVsCodeApi();

(function() {
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

    // 'content' 내에 있는 'saveButtonContainer' 요소를 찾습니다.
    var btnsContainer = document.querySelector('.content #buttons');

    // 'saveButtonContainer' 바로 앞에 새 라벨과 새 텍스트 에어리어를 삽입합니다.
    // 이를 위해 'add-btn'의 부모 노드에 대한 참조를 사용하여 insertBefore를 호출합니다.
    var content = document.querySelector('.content');
    content.insertBefore(newLabel, btnsContainer); // 새 라벨을 'add-btn' 바로 앞에 삽입
    content.insertBefore(newComment, btnsContainer); // 새 텍스트 에어리어를 'add-btn' 바로 앞에 삽입
}


function openTab(evt, tabName) {
    // 모든 탭 버튼의 'active' 클래스를 제거합니다.
    var tabbuttons = document.getElementsByClassName("tab-button");
    for (var i = 0; i < tabbuttons.length; i++) {
        tabbuttons[i].className = tabbuttons[i].className.replace(" active", "");
    }

    // 클릭된 탭 버튼에 'active' 클래스를 추가합니다.
    evt.currentTarget.className += " active";

    // VS Code 확장에 탭 컨텐츠 요청 메시지 전송
    vscode.postMessage({ command: 'requestContent', tabName: tabName });
}

function autoResizeTextarea(textarea) {
    textarea.style.height = 'auto'; // 높이를 자동으로 설정하여 초기화
    textarea.style.height = textarea.scrollHeight + 'px'; // 실제 스크롤 높이를 높이로 설정
}

// 메시지 수신 리스너
window.addEventListener('message', event => {
    const message = event.data; // 수신된 메시지
    switch (message.command) {
        case 'updateContent':
            // .content 영역에 수신된 HTML 컨텐츠로 업데이트
            document.querySelector('.content').innerHTML = message.content;
            break;
    }
});