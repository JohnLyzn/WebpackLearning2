const fs = require("fs");
require("path");

let _assetsPath;

exports.modifyFile = (assetsPath) => {
    console.log("修改文件...");
    _assetsPath = assetsPath;
    modifyMainPage();
    modifyJs();
}

function modifyMainPage() {
    const mainPageName = _assetsPath + '/main.html';
    const newMainPageName = _assetsPath + '/main.jsp';

    fs.readFile(mainPageName, (err, data) => {
        if (err) throw err;

        let newContent = data.toString();

        const urls = "</div>\n" + fs.readFileSync(__dirname + '/url.txt').toString() + "\n";

        newContent = newContent.replace("</div>", urls);

        newContent = '<%@ page language="java" import="java.util.*" contentType="text/html; charset=utf-8"%>\n' + newContent;

        fs.writeFile(mainPageName, newContent, () => {
            console.log("修改 main.html 完成");
            fs.rename(mainPageName, newMainPageName, ()=>{
                console.log("重命名 main.html --> main.jsp 完成");
            });
        });
    })
}

function modifyJs() {
    const jsName = _assetsPath + '/js/main.js';

    fs.readFile(jsName, (err, data) => {
        if (err) throw err;

        let newContent = data.toString();
        newContent = newContent.replace('"${resourceUrl}/"', "g_resourceUrl");

        fs.writeFile(jsName, newContent, () => {
            console.log("修改 main.js 完成");
        });
    })
}
