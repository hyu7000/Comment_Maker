const vscode = acquireVsCodeApi();

(function() {
    // 페이지가 로드되면, 이벤트 리스너를 추가합니다.
    document.addEventListener('DOMContentLoaded', () => {
        document.getElementById('add-btn').addEventListener('click', () => {
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

function showToast() {
    var toast = document.getElementById("toast");
    toast.classList.add("show");
    setTimeout(function(){ toast.classList.remove("show"); }, 3000); // 3초 후에 메시지 사라짐
}

function saveComment() {
    // 비동기 작업을 위해 Promise를 사용
    return new Promise((resolve, reject) => {
        // 서버에 DEFAULT_COMMENTS 데이터 요청
        vscode.postMessage({ command: 'request_default_comments' });

        // 메시지 응답 리스너
        const messageHandler = event => {
            const message = event.data; // 수신된 메시지
            if (message.command === 'response_default_comments') {
                // 이벤트 리스너를 제거
                window.removeEventListener('message', messageHandler);

                // Promise를 해결하고 받은 데이터로 작업을 계속
                resolve(message.default_comments);
            }
        };

        // 이벤트 리스너를 추가
        window.addEventListener('message', messageHandler);

        // 설정한 시간 내에 응답이 없는 경우, Promise를 거부
        setTimeout(() => {
            window.removeEventListener('message', messageHandler);
            reject(new Error('Response timeout'));
        }, 5000); // 예: 5초 타임아웃
    }).then(default_comments => {
        // 서버로부터 받은 DEFAULT_COMMENTS를 사용하여 comment_data 생성
        const comment_data = createUpdatedCommentsObject(default_comments);

        // 최종적으로 수정된 comment_data를 서버로 전송
        vscode.postMessage({ command: 'save_comment', comment: comment_data });
    }).catch(error => {
        console.error('Failed to receive default comments:', error);
    });
}

function getSettingsData() {
    // 설정 항목을 저장할 객체 초기화
    const settings = {};

    // 'setting-item' 클래스를 가진 모든 요소를 선택
    const settingItems = document.querySelectorAll('.setting-item');

    // 각 설정 항목을 순회하면서, id와 해당 값으로 객체를 구성
    settingItems.forEach(item => {
        // 각 setting-item 내의 input 요소 찾기
        const input = item.querySelector('input[type="text"]');
        // input 요소의 id와 값으로 settings 객체를 업데이트
        if (input) {
            settings[input.id] = input.value;
        }
    });

    // 설정 값을 저장하거나 후속 처리
    console.log(settings); // 콘솔에 결과 출력, 실제 사용 시 이 부분에 후속 처리 코드를 추가할 수 있음
    return settings; // 필요에 따라 설정 객체를 반환
}

function saveSettings() {
    const settingData = getSettingsData();

    vscode.postMessage({ command: 'save_setting_data', setting: settingData });
}

function removeConfiguration() {
    // 'setting-item' 클래스를 가진 모든 요소를 선택
    const settingItems = document.querySelectorAll('.setting-item');

    // 각 설정 항목을 순회하면서 입력 필드를 찾아 값을 지움
    settingItems.forEach(item => {
        // 각 setting-item 내의 input 요소 찾기
        const input = item.querySelector('input[type="text"]');
        // input 요소가 있다면 해당 값 지우기
        if (input) {
            input.value = ''; // 텍스트 입력 공간의 내용을 지움
        }
    });
}


function createUpdatedCommentsObject(default_comment) {
    // 새로운 객체를 초기화합니다.
    const updatedComments = {};

    // default_comment 객체의 각 항목에 대해 반복합니다.
    Object.keys(default_comment).forEach(key => {
        // 각 키에 해당하는 textarea 요소를 찾습니다.
        const textarea = document.getElementById(key);

        // 해당 textarea가 존재하면, 그 값을 사용하여 새 객체에 추가합니다.
        if (textarea) {
            updatedComments[key] = textarea.value;
        } else {
            // textarea가 존재하지 않으면, 기본값을 사용합니다.
            updatedComments[key] = default_comment[key];
        }
    });

    // 수정된 코멘트 객체를 반환합니다.
    return updatedComments;
}

// 메시지 수신 리스너
window.addEventListener('message', event => {
    const message = event.data; // 수신된 메시지
    switch (message.command) {
        case 'updateContent':
            // .content 영역에 수신된 HTML 컨텐츠로 업데이트
            document.querySelector('.content').innerHTML = message.content;
            break;

        case 'updateContent_Tab1':
            document.querySelector('.content').innerHTML = message.content;
            const textareas = document.getElementsByClassName('comment_textarea');
            for (let i = 0; i < textareas.length; i++) {
                autoResizeTextarea(textareas[i]);
            }
            break;

        case 'saved_successfully':            
            showToast();
            break;
    }
});