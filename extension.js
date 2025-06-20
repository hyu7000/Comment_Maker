// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

const {
    DEFAULT_COMMENTS,
    DEFAULT_SETTING_DATA,
} = require('./js/default_settings.js');

const {
    get_settingData,
    set_settingData,
    initGenSxCommentCommand,
    initGenNormalCommand,
    initGenCxCommentCommand
} = require('./js/generation_comment.js')

const {
    initDecorations
} = require('./js/decoration.js')

const {
    initIntelliSense
} = require('./js/IntelliSense.js')

const {
    initHover
} = require('./js/hover.js')

let commentReplacements = {};

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

/**************************************************/
/* Extern Function                                */
/**************************************************/

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json

    /**************************************************/
    /* Initialize Command                             */
    /**************************************************/    

    // 일반 주석 생성 커맨드 초기화
    let gen_normal_comment = initGenNormalCommand();
    context.subscriptions.push(gen_normal_comment);

    // Sx 주석 생성 커맨드 초기화
    let gen_sx_comment = initGenSxCommentCommand();
    context.subscriptions.push(gen_sx_comment);

    // Cx 주석 생성 커맨드 초기화
    let gen_cx_comment = initGenCxCommentCommand();
    context.subscriptions.push(gen_cx_comment);

    /**************************************************/
    /* Initialize Web View                            */
    /**************************************************/

    // 웹뷰 초기화
    let open_page = initWebView(context);
    context.subscriptions.push(open_page); 

    /**************************************************/
    /* Initialize Background                          */
    /**************************************************/

    // 주석 데코레이션 설정
    initDecorations(context);    

    // 인텔리센스(자동완성) 설정
    context.subscriptions.push(initIntelliSense());

    // 호버 설정
    context.subscriptions.push(initHover());

    // 저장된 값 불러오기
    restoreData(context);
}

// This method is called when your extension is deactivated
function deactivate() {}

/**************************************************/
/* Private Function                               */
/**************************************************/

function restoreData(context) {
    // 데이터 복원
    commentReplacements    = context.globalState.get('saved_comment',      DEFAULT_COMMENTS);
    const temp_settingData = context.globalState.get('saved_setting_data', DEFAULT_SETTING_DATA);

    // settingData 할당
    set_settingData(temp_settingData);
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
                                 .replace('STYLE_SRC_PLACEHOLDER',  styleUri );
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
                        const temp_settingData = get_settingData();
                        tabContent = replaceAllComments(tabContent, temp_settingData);
                        panel.webview.postMessage({ command: 'updateContent_Tab2', content: tabContent });
                    }
                    else {
                        panel.webview.postMessage({ command: 'updateContent', content: tabContent });
                    }

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
                        set_settingData(message.setting);
                    }).catch((error) => {
                        // 데이터 저장 중 오류가 발생했을 때 실행할 코드
                        console.error('Error saving the comment:', error);
                    });
                    break;

                case 'requeset_default_comment':
                    panel.webview.postMessage({ command: 'response_default_comment', default_comment:DEFAULT_COMMENTS });
                    break;
            }
        }, undefined, context.subscriptions);
    });

    return web_view;
}

/**************************************************/
/* module export                                  */
/**************************************************/

module.exports = {
    activate,
    deactivate
}