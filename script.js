class Simulator {
    constructor() {
        this.variables = {}; // 変数を管理
        this.updateInterval = null; // setIntervalのIDを格納
        this.instance = null; // インスタンスを保存
    }

    run() {
        // **前回の実行結果をクリア**
        document.getElementById("consoleOutput").innerHTML = "";
    
        const editorText = document.getElementById("editor").value;
        const transformedCode = this.transformCSharpToJS(editorText);
    
        try {
            console.log("変換後のコード:\n" + transformedCode); // デバッグ用
            const outputFunction = new Function('"use strict";\n' + transformedCode);
            outputFunction(); // 実行
    
            // `instance` を `this.instance` に格納
            this.instance = window.instance; 
    
            // Update関数を1秒間に3回実行するための設定
            if (this.updateInterval) {
                clearInterval(this.updateInterval); // 以前のインターバルがあればクリア
            }
    
            this.updateInterval = setInterval(() => {
                if (this.instance && typeof this.instance.Update === 'function') {
                    this.instance.Update(); // Updateを実行
                }
            }, 333); // 333ミリ秒ごとにUpdateを実行
    
        } catch (e) {
            console.error(e);
            this.logError(e.message);
        }
    }
    

    // C# を JavaScript に変換
    transformCSharpToJS(csharpCode) {
        let classNameMatch = csharpCode.match(/\b(public|private|protected)?\s*class\s+(\w+)/);
        let className = classNameMatch ? classNameMatch[2] : "UnknownClass";

        let constructorInit = "";
        let variableNames = [];
        let instanceVariables = [];

        let transformedCode = csharpCode
            .replace(/using\s+[\w.]+;?/g, "") // すべての `using ...;` を削除
            .replace(/\b(public|private|protected)?\s*class\s+(\w+)\s*{/, 
                "class $2 {\n    logToConsole(message) {\n        const consoleOutput = document.getElementById('consoleOutput');\n        consoleOutput.innerHTML += message + '<br>';\n        consoleOutput.scrollTop = consoleOutput.scrollHeight;\n    }\n    constructor() {") // クラス宣言を変換
            .replace(/\b(public|private|protected)?\s*(string|int|float|double|bool)\s+(\w+)\s*=\s*([^;]+);/g, (match, accessModifier, type, varName, initialValue) => {
                variableNames.push(varName); // 変数名を記録
                instanceVariables.push(varName); // インスタンス変数として記録
                constructorInit += `this.${varName} = ${initialValue}; `; 
                return ""; // フィールド定義は削除
            }) // 変数定義を `constructor` に移動
            .replace(/\b(public|private|protected)?\s*(string|int|float|double|bool)\s+(\w+);/g, (match, accessModifier, type, varName) => {
                // フィールド定義を `constructor` 内に移動
                variableNames.push(varName); // 変数名を記録
                instanceVariables.push(varName); // インスタンス変数として記録
                constructorInit += `this.${varName} = null; `; // 初期値なしは `null` として扱う
                return ""; // フィールド定義は削除
            }) // `public string name;` → `this.name = null;` に変換
            .replace(/\b(public|private|protected)?\s*\w+\s+(\w+)\(\)\s*{/g, "$2() {") // `public`, `private` を削除して関数定義を変換
            // Debug.Log() の変換処理を修正
            transformedCode = transformedCode.replace(/Debug\.Log\(([^)]+)\);/g, (match, expr) => {
                return "this.logToConsole(" + expr.replace(/(["'])(.*?)\1/g, (match, quote, literal) => {
                    // **文字列リテラルはそのまま残す**
                    return `${quote}${literal}${quote}`;
                }).replace(/\b([a-zA-Z_]\w*)\b/g, (match, varName) => {
                    // **文字列リテラル内でなければ `this.` をつける**
                    if (instanceVariables.includes(varName) && !match.includes('"') && !match.includes("'")) {
                        return `this.${varName}`;
                    }
                    return varName;
                }) + ");";
            });



        // `constructor()` に変数の初期化を追加し、`}` を閉じる
        transformedCode = transformedCode.replace("constructor() {", `constructor() { ${constructorInit} }\n`);

        // 変数代入の変換 (例: name = "a"; → this.name = "a";, number++; → this.number++;)
        variableNames.forEach(varName => {
            let regex = new RegExp(`(?<!this\\.)\\b${varName}\\b(?!\\s*\\()`, "g"); // メソッド名は `this.` をつけない
            transformedCode = transformedCode.replace(regex, `this.${varName}`);
        });

        // **修正ポイント: `instance` を `window` に保存**
        transformedCode += `\nwindow.instance = new ${className}();\nif (window.instance.Start) window.instance.Start();\nif (window.instance.Update) window.instance.Update();`;

        return transformedCode;
    }

    logError(message) {
        const consoleOutput = document.getElementById("consoleOutput");
        consoleOutput.innerHTML += `<span style="color: red;">エラー: ${message}</span><br>`;
    }
}

// インスタンスを作成
const simulator = new Simulator();

// 実行ボタンにイベントリスナーを追加
document.getElementById("runButton").addEventListener("click", () => {
    simulator.run();
});

// 「実行を停止」ボタンの処理
document.getElementById("stopButton").addEventListener("click", () => {
    if (simulator.updateInterval) {
        clearInterval(simulator.updateInterval); // ループを停止
        simulator.updateInterval = null; // 停止したことを記録
        console.log("Update の実行を停止しました");
        document.getElementById("consoleOutput").innerHTML += "<span style='color: red;'>実行を停止しました</span><br>";
    }
});


// 「エディタをクリア」ボタンの処理
document.getElementById("clearEditorButton").addEventListener("click", () => {
    document.getElementById("editor").value = 
`using System;

public class sampleclass 
{

    public void Start()
    {
        
    }

    public void Update()
    {
        
    }
}`;
});

// 「コンソールをクリア」ボタンの処理
document.getElementById("clearConsoleButton").addEventListener("click", () => {
    document.getElementById("consoleOutput").innerHTML = "";
});



// エディタにインデント処理を追加
document.getElementById('editor').addEventListener('keydown', function (e) {
    if (e.key === 'Tab') {
        e.preventDefault(); // タブキーのデフォルト動作を防止
        const start = this.selectionStart;
        const end = this.selectionEnd;

        // 選択範囲にタブを挿入（スペース4つ分）
        this.value = this.value.substring(0, start) + '    ' + this.value.substring(end);

        // カーソル位置をタブ分だけ右に移動
        this.selectionStart = this.selectionEnd = start + 4;
    }
});

