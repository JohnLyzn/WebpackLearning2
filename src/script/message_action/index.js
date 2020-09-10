import _ from 'lodash';
import { ajax } from 'common/env';

import { ScriptOutput } from '../index';

/* 声明执行器实现, 其中要支持的方法:
runTool(toolId,bandId/gid,param,type)
previewFile(documentId)
openChatroom(chatroomId)
gotoBand(bandId)
request(url)
openView(type,*expression*)
into()
back()
my(objId/viewId,userId)
input(type,name,label,setting)
line(type,*expression*,label,setting)
reply(content,setting)
count(queryStr)
query(queryStr,extractJsonPath)
enable(messageId)
disable(messageId)
notify(event,data)

要支持的环境变量:
$chatroomId
$messageId
$groupId
$bandId
$userId
$userName
$userAccount
$device
$input

通过固定名称的公开变量声明执行器定义文件路径:
*/
export const EXECUTIONS_PATHS = ['func.js', 'view.js'];

/* 下面是一个MessageActionInputObj的对象模板, 注意:
1.对象的内容由执行器中的实现逻辑写入;
2.函数名称与对象中的key一致;
3.执行顺序会自动按脚本声明的顺序执行;
4.根据同级其它参数的情况, 选择执行逻辑(比如对于requestUrl, 有view的情况下就不直接请求而是打开页面);

const TEMPLATE_OUTPUT_OBJ = {
    view: 'replace',
    requestUrl: '',
    lines: [{
        label: '开会日期',
        content: '2020年9月1日09:13:43',
        type: 'info',
    }],
    count: '{"tag":{"eq":"JOIN_ATTIVITY"}}',
    query: {
        target: '{"tag":{"eq":"JOIN_ATTIVITY"}}',
        path: '$[?].sender.senderName',
    },
    reply: {
        message: {
            content: '', 
            // ...options
        },
    },
    notify: {
        event: 'resize',
        // ...data
    },
};
*/
export class MessageActionOutput extends ScriptOutput {
    
    view() {
        const viewType = this.get('view');
        if(! viewType) {
            return;
        }
        const vueContext = this.context().arg('_component');
        // 设置为显示请求的URL
        if(this.contains('requestUrl')) {
            vueContext.openMsgActionView(viewType, this.get('requestUrl'));
            return;
        }
        // 默认打开链接
        vueContext.openMsgActionView(viewType);
    };

    count() {

    };

    query() {

    };

    inputs() {

    };

    lines() {
        
    };

    reply() {
        
    };

    notify() {
        
    };

    async requestUrl() {
        if(this.contains('view')) {
            return;
        }
        const url = this.get('requestUrl');
        if(! url) {
            return;
        }
        const extra = this.scope().arg(4, 'Object');
        const json = await ajax({
            url: url,
            type: 'POST',
            data: extra.data,
            dataType: extra.dataType || 'json',
            headers: extra.headers,
        });
        if(! json) {
            return;
        }
        this.write(json);
    };
}