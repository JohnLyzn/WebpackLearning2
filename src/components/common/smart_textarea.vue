<template>
    <div class="smart-textarea">
        <!-- 输入框 -->
        <div ref="input"
            contenteditable="true"
            class="smart-textarea__input"
            v-on="$listeners"
            @focus="focus()"
            @blur="blur()">
            <!-- 当前组件实例用的光标定位元素,会被动态移动 -->
            <span ref="cursor"
                contenteditable="false"
                class="smart-textarea__input-cursor">
            </span>
        </div>
        <!-- 文件选择 -->
        <form enctype="multipart/form-data"
            style="display:none;">
            <input ref="fileInput"
                type="file" 
                multiple="multiple" />
            <input ref="imgInput"
                type="file"
                :accept="acceptImgTypes"
                multiple="multiple" />
        </form>
        <!-- 弹出内容 -->
        <mu-popover ref="inputPop"
            class="smart-textarea__popover"
            :class="{'smart-textarea__popover--grid':popGrid}"
            :open.sync="POP.opening"
            :trigger="POP.trigger"
            :placement="POP.placement"
            @scroll.native.stop.prevent
            @click.stop>
            <div class="smart-textarea__popover-body">
                <van-tabs v-if="popTabs"
                    class="smart-textarea__popover-tabs"
                    v-model="POP.activedTab">
                    <van-tab v-for="tab in popTabs"
                        :key="tab.name"
                        :name="tab.name">
                        <template v-if="tab.icon"
                            #title> 
                            <mu-icon :value="tab.icon"></mu-icon>
                        </template>
                        <div class="smart-textarea__popover-list">
                            <div v-for="symbolItem of symbolItems"
                                :key="symbolItem.id"
                                class="smart-textarea__popover-list-item">
                                <mu-checkbox v-if="popMultiSelect
                                    &&INPUT.symbol.name"
                                    v-model="POP.pickedIds[INPUT.symbol.name]"
                                    :value="symbolItem.id"
                                    @change="onPickedSymbolItemChange()">
                                </mu-checkbox>
                                <mu-flex class="fill"
                                    align-items="center"
                                    justify-content="center"
                                    @click="_togglePickSymbolItem(symbolItem)">
                                    <slot name="pop-item"
                                        :item="symbolItem">
                                        <span>{{symbolItem.name}}</span>
                                    </slot>
                                </mu-flex>
                            </div>
                            <p v-show="!symbolItems.length"
                                class="tip">
                                没有可选结果~
                            </p>
                        </div>
                    </van-tab>
                </van-tabs>
                <div v-else
                    class="smart-textarea__popover-list">
                    <div v-for="symbolItem of symbolItems"
                        :key="symbolItem.id"
                        class="smart-textarea__popover-list-item">
                        <mu-checkbox v-if="popMultiSelect
                            &&INPUT.symbol.name"
                            v-model="POP.pickedIds[INPUT.symbol.name]"
                            :value="symbolItem.id"
                            @change="onPickedSymbolItemChange()">
                        </mu-checkbox>
                        <mu-flex class="fill"
                            align-items="center"
                            justify-content="center"
                            @click="_togglePickSymbolItem(symbolItem)">
                            <slot name="pop-item"
                                :item="symbolItem">
                                <span>{{symbolItem.name}}</span>
                            </slot>
                        </mu-flex>
                    </div>
                    <p v-show="!symbolItems.length"
                        class="tip">
                        没有可选结果~
                    </p>
                </div>
            </div>
        </mu-popover>
    </div>
</template>

<script>
    import _ from 'lodash';

    import {
        scanRichText,
        getElementComputedStyle,
        bindEvent,
        stopBubble,
        globalPositionOf,
        hasClass,
        addClass,
        removeClass,
        isImgFile
    } from 'common/env';
    import { Config } from 'common/constants';

    import fileIconUrl from 'images/file_icon.svg';

    const BLANK_STR = '\u00a0';
    const INPUT_ESCAPE_CHARS_REGEXP = /(\r)|(\n)|(\r\n)/g;
    const BLANK_CHAR_REGEXP = /[ \u0020\u00a0\b\t\r\n]+/g;
    const CURSOR_CONTROL_KEY_CODES = [8, 13, 35, 36, 37, 38, 39, 40, 46];// 光标移动的按键,上下左右回车退格
    const ASSIST_CONTROL_KEY_CODES = [16, 17, 18]; // 辅助按键,ctrl,shift,alt

    export default {
        name: 'smart-textarea',
        props: {
            value: {
                type: String,
                default: '',
            },
            focused: {
                type: Boolean,
                default: false,
            },
            symbols: {
                type: Object,
                default: '',
            },
            symbolItems: {
                type: Array,
                default: '',
            },
            popTabs: {
                type: Array,
                default: '',
            },
            popTab: {
                type: String,
                default: '',
            },
            popGrid: {
                type: Boolean,
                default: false,
            },
            popMultiSelect: {
                type: Boolean,
                default: true,
            },
            popOpen: {
                type: Boolean,
                default: false,
            },
        },
        data() {
            return {
                acceptImgTypes: Config.ACCEPT_IMG_TYPES,
                META: {
                    lineHeight: 0,
                },
                INPUT: {
                    focused: false,
                    enableFakeCursor: false,
                    lastSelection: '',
                    lastRange: '',
                    location: '',
                    symbolQueryInputing: false,
                    symbol: '',
                    symbolLocation: '',
                    symbolLastLocation: '',
                    symbolQuery: '',
                },
                POP: {
                    opening: false,
                    placement: 'bottom-start',
                    activedTab: '',
                    virtualSymbol: '',
                    itemMap: {},
                    pickedIds: {},
                    lastPickedIds: {},
                    trigger: '',
                },
                MUTATION: {
                    addedNodes: [],
                    removedNodes: [],
                },
            };
        },
        computed: {
            inputDom() {
                return this.$refs.input || '';
            },
            cursorDom() {
                return this.$refs.cursor || '';
            },
            inputPopDom() {
                return (this.$refs.inputPop && this.$refs.inputPop.$el) || '';
            },
            updateInput() {
                return _.throttle(() => {
                    if(this.inputDom.innerHTML.indexOf('smart-textarea__input-item') == -1
                        && ! _.trim(this.inputDom.innerText)) {
                        this.$emit('input', '');
                        return;
                    }
                    this.$emit('input', this.content());
                }, 500);
            },
            symbolNameMap() {
                if(! _.isObject(this.symbols)) {
                    return;
                }
                const result = {};
                _.forEach(this.symbols, (symbol, indicator) => {
                    if(! symbol.name) {
                        return;
                    }
                    symbol.indicator = indicator;
                    result[symbol.name] = symbol;
                });
                return result;
            },
            currentSymbolType() {
                return this.INPUT.symbol || '';
            },
            currentSymbolTypeName() {
                if(! this.INPUT.symbol) {
                    return '';
                }
                return this.INPUT.symbol.name;
            },
            currentSymbolItemSymbolType() {
                if(this.POP.virtualSymbol) {
                    return this.POP.virtualSymbol;
                }
                return this.currentSymbolType;
            },
            currentSymbolItemSymbolTypeName() {
                if(this.POP.virtualSymbol) {
                    return this.POP.virtualSymbol.name;
                }
                return this.currentSymbolTypeName;
            },
        },
        watch: {
            'symbolItems'(newVal) {
                this._initSymbolItemMap(newVal);
            },
            'popOpen'(newVal) {
                if(newVal === this.POP.opening) {
                    return;
                }
                this.POP.opening = newVal;
            },
            'popTab'(newVal) {
                this.POP.activedTab = newVal;
            },
            'POP.activedTab'(newVal) {
                this.$nextTick(() => {
                    if(newVal === this.popTab) {
                        return;
                    }
                    this.$emit('update:popTab', newVal);
                });
            },
            'INPUT.enableFakeCursor'(newVal) {
                this._changeValidPopTrigger();
            },
            'INPUT.symbol'(newVal) {
                if(! newVal) {
                    return;
                }
                this._initSymbolItemMap();
            },
            'POP.opening'(newVal) {
                this.$nextTick(() => {
                    if(newVal === this.popOpen) {
                        return;
                    }
                    this.$emit('update:popOpen', newVal);
                });
            },
        },
        methods: {
            focus() {
                this.INPUT.focused = true;
                this.$emit('update:focused', true);
                if(this.inputDom) {
                    this._generateMeta(); /* 只会生成一次 */
                    this.inputDom.focus();
                }
            },
            blur() {
                this.INPUT.focused = false;
                this.$emit('update:focused', false);
                if(this.inputDom) {
                    this.inputDom.blur();
                }
            },
            insertBackSpace() {
                if(! this.inputDom) {
                    return;
                }
                this.inputDom.focus();
                this._deleteCursorPre();
            },
            _deleteSinceEnd() {
                const selection = this._selection();
                if(selection && ! selection.isCollapsed) {
                    selection.deleteFromDocument();
                    return;
                }
                const rangeNow = this.INPUT.lastRange || this._rangeOfCursor();
                const range = document.createRange();
                const endOffset = rangeNow.endOffset - 1;
                let node = _.first(this.inputDom.childNodes);
                let count = 0;
                while(node) {
                    if(count < endOffset) {
                        count += Math.max(node.textContent.length, 1);
                        node = node.nextSibling;
                        continue;
                    }
                    if(this._isTextNode(node, true)
                        && ! _.trim(node.textContent)) {
                        node = node.previousSibling;
                        continue;
                    }
                    if(this._isTextNode(node, true)) {
                        range.setStart(node, 0);
                        range.setEnd(node, Math.max(count - endOffset, node.textContent.length));
                        break;
                    }
                    range.selectNode(node);
                    break;
                }
                this._select(range);
                range.deleteContents();
                range.collapse(true);
            },
            _deleteCursorPre() {
                const selection = this._selection();
                if(selection && ! selection.isCollapsed) {
                    selection.deleteFromDocument();
                    return;
                }
                const rangeNow = this.INPUT.lastRange || this._rangeOfCursor();
                const endNode = rangeNow.endContainer;
                if(endNode === this.inputDom) {
                    this._deleteSinceEnd();
                    return;
                }
                const endOffset = rangeNow.endOffset;
                if(endOffset == 0
                    || this._isSplitNode(endNode)) {
                    this._removeNode(endNode);
                    return;
                }
                const range = document.createRange();
                if(this._isTextNode(endNode, true)) {
                    range.setStart(endNode, endOffset - 1);
                    range.setEnd(endNode, endOffset);
                } else {
                    range.selectNode(endNode);
                }
                this._select(range);
                range.deleteContents();
                range.collapse(true);
            },
            insertFile() {
                const fileInputDom = this.$refs.fileInput;
                if(! fileInputDom) {
                    return;
                }
                fileInputDom.click();
            },
            insertImage() {
                const imgInputDom = this.$refs.imgInput;
                if(! imgInputDom) {
                    return;
                }
                imgInputDom.click();
            },
            insertSymbol(symbol, items, clearFirst) {
                if(items !== undefined) {
                    if(this.INPUT.symbol 
                        && this.INPUT.symbol.indicator !== symbol) {
                        this._resetInputSymbol();
                    }
                    this._setVirtualSymbol(symbol);
                    if(clearFirst) {
                        this._resetPickedSymbolItems();
                    }
                    if(! items.length) {
                        this._setVirtualSymbol();
                        return;
                    }
                    this.$nextTick(() => {
                        this._mergeSymbolItemMap(this.currentSymbolItemSymbolTypeName, items);
                        for(let item of items) {
                            this._pickSymbolItem(item);
                        }
                    });
                    return;
                }
                if(! this.INPUT.symbol
                    || this.INPUT.symbol.indicator !== symbol) {
                    this._insertTextTypeInput(symbol);
                    return;
                }
            },
            content() {
                const content = this._translateInput();
                this.$emit('input', content);
                return content;
            },
            cancel() {
                this.closePop();
                this._endSymbolQueryInputing();
                this._resetInputSymbol();
                this._setVirtualSymbol();
            },
            reset() {
                if(! this.inputDom) {
                    return;
                }
                this.cancel();
                _.forEachRight(this.inputDom.childNodes, (childNode) => {
                    this._removeNode(childNode);
                });
            },
            _generateMeta() {
                if(! this.inputDom) {
                    return;
                }
                if(! this.META.lineHeight) {
                    this.META.lineHeight = window.getComputedStyle(this.inputDom)
                            .getPropertyValue('line-height');
                }
            },
            _isImage(file) {
                return isImgFile(file);
            },
            _isTextNode(node, pure) {
                if(! node ) {
                    return false;
                }
                if(! pure && (node.$wrapped 
                    || node.$splited 
                    || node.$splitFor)) {
                    return false;
                }
                return node.nodeName === '#text';
            },
            _isSplitNode(node) {
                if(! node || ! node.$splited) {
                    return false;
                }
                return true;
            },  
            _isWrappedNode(node) {
                if(! node || ! this.inputDom.contains(node)) {
                    return false;
                }
                if(node.$wrapped) {
                    return node;
                }
                let current = node;
                while(current.parentElement !== this.inputDom) {
                    current = current.parentElement;
                    if(! current) {
                        break;
                    }
                    if(current.$wrapped) {
                        return current;
                    }
                }
                return false;
            },
            _isInnerBlock(node, strict) {
                if(! node || node.$wrapped) {
                    return false;
                }
                return node.tagName === 'DIV';
            },
            _wrapElementInput(dom, type, attachment) {
                const wrapperDom = document.createElement('span');
                wrapperDom.className = 'smart-textarea__input-item smart-textarea__input-' + (type || 'tag');
                wrapperDom.contentEditable = false;
                wrapperDom.$wrapped = true;
                wrapperDom.$attachment = attachment;
                const containerDom = document.createElement('div');
                containerDom.className = 'smart-textarea__input-item-wrapper';
                if(_.isString(dom)) {
                    containerDom.innerHTML = dom;
                } else {
                    containerDom.appendChild(dom);
                }
                if(attachment) {
                    attachment.type = type;
                }
                if(attachment && attachment.label) {
                    const labelDom = document.createElement('label');
                    labelDom.innerText = attachment.label;
                    containerDom.appendChild(labelDom);
                }
                if(attachment && attachment.id) {
                    wrapperDom.id = attachment.id;
                }
                wrapperDom.appendChild(containerDom);
                return wrapperDom;
            },
            _insertFileTypeInput(file) {
                if(! this.inputDom) {
                    return;
                }
                const imgDom = document.createElement('img');
                imgDom.src = fileIconUrl;
                return this._insertElementTypeInput(this._wrapElementInput(imgDom, 'file', {
                    type: 'file',
                    file: file,
                    label: file.name,
                }));
            },
            _insertImgTypeContent(file, imgUrl) {
                if(! this.inputDom) {
                    return;
                }
                const imgDom = document.createElement('img');
                imgDom.src = imgUrl;
                imgDom.onload = () => {
                    file.width = imgDom.width;
                    file.height = imgDom.height;
                };
                return this._insertElementTypeInput(this._wrapElementInput(imgDom, 'img', {
                    type: 'img',
                    file: file,
                }));
            },
            _insertTextTypeInput(text) {
                if(! this.inputDom) {
                    return;
                }
                return this._insertElementTypeInput(document.createTextNode(text));
            },
            _insertBlankTypeInput() {
                if(! this.inputDom) {
                    return;
                }
                const spanDom = document.createElement('span');
                spanDom.innerText = _.repeat(BLANK_STR, 4);
                spanDom.$tabed = true;
                this._insertElementTypeInput(spanDom);
            },
            _insertElementTypeInput(node) {
                if(! this.inputDom) {
                    return;
                }
                const range = this._rangeOfCursor();
                if(! range || range.startContainer === node) {
                    return;
                }
                if(this.cursorDom === node) {
                    range.insertNode(node);
                    range.setStartAfter(node);
                    range.collapse(true);
                    return node;
                }
                if(! range.collapsed) {
                    range.deleteContents();
                }
                range.insertNode(node);
                this.focus();
                if(this._isTextNode(node)
                    && ! this._isSplitNode(node)) {
                    this._onInputChange();
                }
                this._moveCursorAfter(node);
                this._createSpliter(node);
                return node;
            },
            _createSpliter(dom) {
                if(! dom
                    || dom === this.cursorDom 
                    || dom.parentElement !== this.inputDom
                    || dom.childNodes.length != 1
                    || ! (dom instanceof HTMLElement)) {
                    return false;
                }
                const spliterText = document.createTextNode(BLANK_STR);
                spliterText.$splited = true;
                spliterText.$splitFor = dom;
                dom.$splitor = spliterText;
                this._insertElementTypeInput(spliterText);
                return dom;
            },
            _removeNode(node) {
                if(! node) {
                    return;
                }
                if(node.$splitor) {
                    node.$splitor.remove();
                }
                if(node.$splitFor) {
                    node.$splitFor.remove();
                }
                node.remove();
            },
            _formatAttachmentStr(type, content, extra) {
                return `[:${type}/${content}/${extra||''}]`;
            },
            _escapeAttachmentSymbol(str) {
                return str.replace(/\[\:/g, '\\[\\:');
            },
            _translateAttachment(container, attachmentNode) {
                if(! container || ! attachmentNode) {
                    return;
                }
                const attachment = attachmentNode.$attachment;
                if(! attachment) {
                    container.content += attachmentNode.innerText;
                    return;
                }
                switch(attachment.type) {
                    case 'img':
                    case 'file':
                        container.files = container.files || [];
                        container.files.push(attachment.file);
                        container.content += this._formatAttachmentStr(
                            'FILE', 
                            container.files.length - 1,
                            attachment.file.name
                        );
                        break;
                    case 'tag':
                        container.content += this._formatAttachmentStr(
                            _.toUpper(attachment.symbol.name), 
                            attachment.symbolItem.id, 
                            attachment.symbolItem.name
                        );
                        break;
                }
            },
            _translateContent(container, parentNode) {
                if(! container || ! parentNode) {
                    return;
                }
                for(let node of parentNode.childNodes) {
                    /* 不能用isTextNode判断, 自动融合字符串时会导致与分隔符合并 */
                    if(node.nodeType === 3) {
                        container.content += this._escapeAttachmentSymbol(node.textContent);
                        continue;
                    }
                    if(this._isWrappedNode(node)) {
                        this._translateAttachment(container, node);
                        continue;
                    }
                    if(node.$splited) {
                        continue;
                    }
                    if(node.$tabed) {
                        container.content += this._escapeAttachmentSymbol(node.innerText);
                        continue;
                    }
                    if(this._isInnerBlock(node)) {
                        container.content += '\r\n';
                        this._translateContent(container, node);
                    }
                }
            },
            _translateInput() {
                if(! this.inputDom) {
                    return;
                }
                const container = {
                    content: '',
                    // files: [],
                };
                this._translateContent(container, this.inputDom);
                this.INPUT.content = container;
                return container;
            },
            _restoreFiles(files, value, extra) {
                const file = files[parseInt(value)];
                if(! file) {
                    return;
                }
                this._onInputFileChange([file]);
            },
            _restoreRich(content, files) {
                if(! content) {
                    return;
                }
                const pieces = _.split(content.replace(/\[|\:|\]/g, ''), '/');
                if(content.length < 2) {
                    return;
                }
                const type = pieces[0];
                const value = pieces[1];
                const extra = pieces[2];
                if(type === 'FILE') {
                    this._restoreFiles(files, value, extra);
                    return;
                }
                const symbolType = this.symbolNameMap[type];
                if(! symbolType || ! symbolType.restore) {
                    return;
                }
                this._setVirtualSymbol(symbolType);
                symbolType.restore(value, extra);
                this._setVirtualSymbol();
            },
            _restorePlain(content) {
                if(! content) {
                    return;
                }
                this._insertTextTypeInput(content);
            },
            _restoreInput(content) {
                if(! content || ! content.content) {
                    return;
                }
                this.reset();
                const container = _.clone(content);
                scanRichText(container.content, {
                    onMeetRich: (str) => {
                        this._restoreRich(str, container.files);
                    },
                    onMeetPlain: (str) => {
                        this._restorePlain(str);
                    },
                });
            },
            _onInputFileChange(files) {
                if(! files || ! files.length) {
                    return;
                }
                for (let file of files) {
                    // 非图片作为文件显示
                    if(! this._isImage(file)) {
                        this._insertFileTypeInput(file);
                        continue;
                    }
                    // 图片显示
                    const reader = new FileReader();
                    reader.readAsDataURL(file);
                    reader.onload = (e) => {
                        this._insertImgTypeContent(file, e.target.result);
                    };
                }
            },
            _selection() {
                const doc = this.inputDom.ownerDocument || this.inputDom.document;
                const win = doc.defaultView || doc.parentWindow;
                if (typeof win.getSelection != 'undefined') {
                    return win.getSelection();
                }
                return doc.selection;
            },
            _select(range) {
                if(! this._isValidRange(range)) {
                    return;
                }
                const selection = this._selection();
                selection.removeAllRanges();
                selection.addRange(range);
            },
            _storeSelection() {
                const sel = this._selection();
                this.INPUT.lastSelection = {
                    anchorNode: sel.anchorNode,
                    anchorOffset: sel.anchorOffset,
                    baseNode: sel.baseNode,
                    baseOffset: sel.baseOffset,
                    extentNode: sel.extentNode,
                    extentOffset: sel.extentOffset,
                    focusNode: sel.focusNode,
                    focusOffset: sel.focusOffset,           
                };
            },
            _isSameSelection(sel1, sel2) {
                if(! sel1 || ! sel2) {
                    return false;
                }
                if(sel1.anchorNode !== sel2.anchorNode
                    || sel1.anchorOffset !== sel2.anchorOffset
                    || sel1.baseNode !== sel2.baseNode
                    || sel1.baseOffset !== sel2.baseOffset
                    || sel1.extentNode !== sel2.extentNode
                    || sel1.extentOffset !== sel2.extentOffset
                    || sel1.focusNode !== sel2.focusNode
                    || sel1.focusOffset !== sel2.focusOffset
                ) {
                    return false;
                }
                return true;
            },
            _isCursorMoved() {
                const sel = this._selection();
                if(! sel.isCollapsed) {
                    return false;
                }
                if(! this._isSameSelection(this.INPUT.lastSelection, sel)) {
                    this._storeSelection();
                    return true;
                }
                return false;
            },
            _findValidStartAfterNode(dom) {
                if(! dom 
                    || this.inputDom === dom
                    || ! this.inputDom.contains(dom)) {
                    return this._findTextNode(_.last(this.inputDom.childNodes)) || this.inputDom;
                }
                if(this._isInnerBlock(dom)) {
                    return _.last(dom.childNodes) || this.inputDom;
                }
                return dom;
            },
            _moveCursorAfter(afterNode) {
                if(! afterNode || this.cursorDom == afterNode) {
                    return;
                }
                if(this.inputDom === afterNode
                    && this.INPUT.lastRange) {
                    this.INPUT.lastRange.collapse(true);
                    this._select(this.INPUT.lastRange);
                    return this.INPUT.lastRange;
                }
                const validAfterNode = this._findValidStartAfterNode(afterNode);
                const range = document.createRange();
                if(this.inputDom === validAfterNode) {
                    if(this.inputDom.childNodes.length) {
                        range.setStartAfter(_.last(this.inputDom.childNodes));
                    } else {
                        range.setStart(this.inputDom, 0);
                    }
                    range.collapse(true);
                    this._select(range);
                    this.INPUT.location = this._locationOfRange(range);
                    return range;
                }
                range.setStartAfter(validAfterNode);
                this._select(range);
                this.INPUT.location = this._locationOfRange(range);
                return range;
            },
            _startingChildNodeOf(node, isBefore) {
                if(! node.childNodes.length) {
                    return;
                }
                if(isBefore) {
                    return _.last(node.childNodes);
                }
                return node.childNodes[0];
            },
            _findElementNode(node, isBefore, skipClimp) {
                if(! node || ! this.inputDom.contains(node)) {
                    return null;
                }
                let key = isBefore ? 'previousSibling' : 'nextSibling';
                let current = node;
                while(current) {
                    if(! this._isTextNode(current, true)) {
                        return current;
                    }
                    if(! skipClimp && ! current[key]
                        && current.parentElement
                        && current.parentElement !== this.inputDom) {
                        current = current.parentElement[key];
                        continue;
                    }
                    current = current[key];
                }
            },
            _findTextNode(node, isBefore, skipClimp) {
                if(! node || ! this.inputDom.contains(node)) {
                    return null;
                }
                let key = isBefore ? 'previousSibling' : 'nextSibling';
                let current = node;
                while(current) {
                    if(this._isInnerBlock(current)) {
                        const innerTextNode = this._findTextNode(
                            this._startingChildNodeOf(current, isBefore),
                            isBefore,
                            true);
                        if(innerTextNode) {
                            return innerTextNode;
                        }
                    }
                    if(this._isTextNode(current)
                        && current.textContent) {
                        return current;
                    }
                    if(! skipClimp && ! current[key]
                        && current.parentElement
                        && current.parentElement !== this.inputDom) {
                        current = current.parentElement[key];
                        continue;
                    }
                    current = current[key];
                }
            },
            _locateFakeCursor(active) {
                if(active) {
                    this.INPUT.enableFakeCursor = true;
                    this._insertElementTypeInput(this.cursorDom);
                    return;
                }
                this.INPUT.enableFakeCursor = false;
                this._removeNode(this.cursorDom);
            },
            _deleteSymbolContent() {
                const location = this.INPUT.symbolLocation;
                if(! location || ! location.symbol) {
                    return;
                }
                // 选中关键字前面部分的内容
                const before = this._findTextNode(location.beforeNode, true);
                if(! before) {
                    return;
                }
                const beforeText = before.textContent || '';
                const beforeKey = location.symbol;
                if(beforeText.indexOf(beforeKey) == -1) {
                    return;
                }
                const afterKey = this.INPUT.symbolQuery;
                let finding = '', left = afterKey, after;
                if(afterKey) {
                    after = before;
                    while(finding.indexOf(afterKey) == -1) {
                        after = this._findTextNode(after.nextSibling, false);
                        finding += after.textContent;
                        left = left.substr(left.indexOf(
                            after.textContent) + after.textContent.length,
                            left.length);
                    }
                }
                const afterText = (after && after.textContent) || '';

                const range = document.createRange();
                range.collapse(false);
                range.setStart(before, beforeText.length - beforeKey.length);
                if(afterText) {
                    // 选中关键字后面部分的内容
                    range.setEnd(after, left === '' ? afterText.length : afterText.indexOf(left));
                } else {
                    // 没有后半部分, 选中到关键字前面部分的结尾
                    range.setEnd(before, beforeText.length);
                }
                range.deleteContents();
            },
            _getNodeText(node) {
                if(! node.textContent
                    || node === this.cursorDom) {
                    return '';
                }
                if(node.$wrapped || (node instanceof HTMLElement)) {
                    return ' ';
                }
                return node.textContent;
            },
            _collectSerialSiblingNodeStr(node, isBefore, skipClimp) {
                if(! node || ! this.inputDom.contains(node)) {
                    return '';
                }
                let result = '';
                let key = isBefore ? 'previousSibling' : 'nextSibling';
                let current = node;
                while(current) {
                    let innerText = '';
                    if(this._isInnerBlock(current)) {
                        innerText = this._collectSerialSiblingNodeStr(
                            this._startingChildNodeOf(current, isBefore),
                            isBefore,
                            true);
                    }
                    if(isBefore) {
                        result = (innerText || this._getNodeText(current)) + result;
                    } else {
                        result += (innerText || this._getNodeText(current));
                    }
                    if(! skipClimp
                        && ! current[key]
                        && current.parentElement
                        && current.parentElement !== this.inputDom) {
                        current = current.parentElement[key];
                        continue;
                    }
                    current = current[key];
                }
                return result;
            },
            _storeLastRange() {
                const lastRange = this._rangeOfCursor(true);
                if(! lastRange) {
                    return;
                }
                this.INPUT.lastRange = lastRange.cloneRange();
            },
            _locationOfRange(range) {
                if(! range) {
                    return;
                }
                this._storeLastRange();
                this._locateFakeCursor(true);
                const beforeNode = this.cursorDom.previousSibling || this.inputDom;
                const afterNode = this.cursorDom.nextSibling;
                // 收集到所有前面的内容
                const beforeStr = this._collectSerialSiblingNodeStr(beforeNode, true);
                const afterStr = this._collectSerialSiblingNodeStr(afterNode, false);
                //光标之前的第一个字符串, 为当前识别中的关键字
                let symbolStr =  beforeStr.substr(beforeStr.length - 1, beforeStr.length);
                // 后半部分的字符串,用于插入或替换内容
                console.log('input<', beforeStr, '><', symbolStr, '><', afterStr, '>');
                return {
                    range: range,
                    beforeNode: beforeNode,
                    afterNode: afterNode,
                    symbol: symbolStr ,
                    before: beforeStr,
                    after: afterStr,
                };
            },
            _locationOfCursor() {
                if(! this.inputDom) {
                    return;
                }
                const doc = this.inputDom.ownerDocument || this.inputDom.document;
                const win = doc.defaultView || doc.parentWindow;
                if (typeof win.getSelection != 'undefined') {
                    const sel = win.getSelection();
                    if (! sel.rangeCount) {
                        return this._locationOfRange(this._rangeOfCursor());
                    }
                    const range = sel.getRangeAt(0);
                    const preCaretRange = range.cloneRange();
                    preCaretRange.selectNodeContents(this.inputDom);
                    preCaretRange.setEnd(range.endContainer, range.endOffset);
                    preCaretRange.collapse(true);
                    return this._locationOfRange(preCaretRange);
                }
                const sel = doc.selection;
                if (! sel || sel.type == 'Control') {
                    return this._locationOfRange(this._rangeOfCursor());
                }
                const textRange = sel.createRange();
                const preCaretTextRange = doc.body.createTextRange();
                preCaretTextRange.moveToElementText(this.inputDom);
                preCaretTextRange.setEndPoint('EndToEnd', textRange);
                return this._locationOfRange(preCaretTextRange);
            },
            _isValidRange(range) {
                if(! this.inputDom.contains(range.startContainer)) {
                    return false;
                }
                if(this._isWrappedNode(range.startContainer)
                    || this._isWrappedNode(range.endContainer)) {
                    return false;
                }
                return true;
            },
            _rangeOfCursor(pure) {
                if(! this.inputDom) {
                    return;
                }
                const doc = this.inputDom.ownerDocument || this.inputDom.document;
                const win = doc.defaultView || doc.parentWindow;
                if (typeof win.getSelection != 'undefined') {
                    const sel = win.getSelection();
                    if(! sel.isCollapsed) {
                        return pure ? null : this._moveCursorAfter(sel.focusNode);
                    }
                    if (! sel.rangeCount) {
                        return pure ? null : this._moveCursorAfter(this.inputDom);
                    }
                    const range = win.getSelection().getRangeAt(0);
                    if(! pure && ! this._isValidRange(range)) {
                        return this._moveCursorAfter(this._findValidStartAfterNode(this.inputDom));
                    }
                    return range;
                }
                const sel = doc.selection;
                if (sel && sel.type != 'Control') {
                    const range = sel.createRange();
                    if(! pure && ! this._isValidRange(range)) {
                        return this._moveCursorAfter(this._findValidStartAfterNode(this.inputDom));
                    }
                    return range;
                }
            },
            _onInputChange() {
                if(this.INPUT.handleTimer) {
                    clearTimeout(this.INPUT.handleTimer);
                }
                this.INPUT.handleTimer = setTimeout(() => {
                     this._scanCursorAroundContent();
                }, 100);
            },
            _scanCursorAroundContent() {
                if(! this.inputDom) {
                    return;
                }
                //取值
                const inputStr = this.inputDom.innerText;
                if(! inputStr) {
                    return;
                }
                //记录光标当前位置
                const location = this._locationOfCursor();
                if(! location) {
                    this._locateFakeCursor(false);
                    return;
                }
                this.INPUT.location = location;
                if(this.INPUT.symbolQueryInputing
                    && location.symbol.match(BLANK_CHAR_REGEXP)) {
                    this._endSymbolQueryInputing();
                    return;
                }
                // 正在输入关键字, 每一次都调用当前对应的回调
                if(this.INPUT.symbolQueryInputing) {
                    this._handleSymbol(this.currentSymbolType, location);
                    return;
                }
                // 找到对应的处理器
                const symbolType = this.symbols[location.symbol] || this.symbols['*'];
                if(! symbolType
                    || ! symbolType.handler
                    || ( symbolType.accept && ! symbolType.accept(this.INPUT.location) )) {
                    this._resetInputSymbol();
                    this._locateFakeCursor(false);
                    return;
                }
                // 如果有要求前缀则需要匹配前缀
                if(symbolType.prefix
                    && ! _.endsWith(location.before, symbolType.prefix)) {
                    this._resetInputSymbol();
                    this._locateFakeCursor(false);
                    return;
                }
                // 补充完整信息
                symbolType.name = symbolType.name || ( symbolType.accept && symbolType.accept(this.INPUT.location) );
                if(! symbolType.name) {
                    throw new Error('未定义名称的关键字', symbolType);
                }
                symbolType.indicator = location.symbol;
                // 标记为正在输入关键字内容
                this._startSymbolQueryInputing();
                // 更新弹出窗的触发元素
                this._changeValidPopTrigger();
                // 调用进行处理
                this._handleSymbol(symbolType, location);
            },
            _setVirtualSymbol(symbol) {
                if(! symbol) {
                    this.POP.virtualSymbol = '';
                    return;
                }
                if(_.isObject(symbol)) {
                    this.POP.virtualSymbol = symbol;
                    return;
                }
                const symbolType = this.symbols[symbol];
                if(! symbolType || symbolType === this.INPUT.symbol) {
                    return;
                }
                symbolType.indicator = symbol;
                this.POP.virtualSymbol = symbolType;
            },
            _handleSymbol(symbolType, location, focusOnDom) {
                if(! symbolType || ! location) {
                    return;
                }
                // 记录当前的关键字
                if(this.INPUT.symbolLocation
                    && this.INPUT.symbolQueryInputing) {
                    this.INPUT.symbolQuery = location.before.substr(
                        location.before.lastIndexOf(this.INPUT.symbolLocation.symbol) + 1,
                        location.before.length);
                } else {
                    this.INPUT.symbol = symbolType;
                    this.INPUT.symbolLocation = location;
                }
                // 调用预定义的回调
                const result = symbolType.handler.call(this, 
                    this.INPUT.symbolQuery || '', location);
                switch(result) {
                    case 'pop':
                        this.openPop(focusOnDom);
                        break;
                }
            },
            _startSymbolQueryInputing() {
                if(this.INPUT.symbolQueryInputing) {
                    return;
                }
                this.INPUT.symbolQueryInputing = true;
            },
            _endSymbolQueryInputing() {
                if(! this.INPUT.symbolQueryInputing) {
                    return;
                }
                this.INPUT.symbolQueryInputing = false;
                this.INPUT.symbolQuery = false;
                this.closePop();
            },
            _resetInputSymbol() {
                this._endSymbolQueryInputing();
                if(this.INPUT.symbolLocation) {
                    this.INPUT.symbolLastLocation = this.INPUT.symbolLocation;
                }
                this.INPUT.symbol = '';
                this.INPUT.symbolLocation = '';
                this.INPUT.symbolQuery = '';
            },
            _initSymbolItemMap() {
                if(! this.currentSymbolItemSymbolTypeName) {
                    return;
                }
                if(! this.symbolItems || ! this.symbolItems.length) {
                    this.POP.itemMap[this.currentSymbolItemSymbolTypeName] = '';
                    return;
                }
                this._mergeSymbolItemMap(this.currentSymbolItemSymbolTypeName, 
                    this.symbolItems, true);
            },
            _mergeSymbolItemMap(name, items, needReset) {
                if(! items || ! items.length) {
                    return;
                }
                if(needReset || ! this.POP.itemMap[name]) {
                    this.POP.itemMap[name] = {};
                }
                for(let item of items) {
                    this.POP.itemMap[name][item.id] = item;
                }
                this._getPickedSymbolItemIds();
                this._getLastPickedSymbolItemIds();
            },
            _getSymbolItem(id) {
                if(! id || ! this.currentSymbolItemSymbolTypeName) {
                    return '';
                }
                if(_.isObject(id)) {
                    return id;
                }
                return this.POP.itemMap[this.currentSymbolItemSymbolTypeName][id] || '';
            },
            openPop(trigger) {
                if(! this.cursorDom || ! this.inputPopDom) {
                    return;
                }
                if(trigger && ! this._isTextNode(trigger, true)) {
                    this.POP.trigger = trigger;
                } else {
                    this._changeValidPopTrigger();
                }
                this.POP.opening = true;
            },
            _resetPickedSymbolItems() {
                if(! this.currentSymbolItemSymbolTypeName) {
                    return '';
                }
                this.$set(this.POP.pickedIds, this.currentSymbolItemSymbolTypeName, []);
                this.onPickedSymbolItemChange();
            },
            _getPickedSymbolItemIds() {
                if(! this.currentSymbolItemSymbolTypeName) {
                    return '';
                }
                const pickedIds = this.POP.pickedIds[this.currentSymbolItemSymbolTypeName];
                if(pickedIds) {
                    return pickedIds;
                }
                this.$set(this.POP.pickedIds, this.currentSymbolItemSymbolTypeName, []);
                return this.POP.pickedIds[this.currentSymbolItemSymbolTypeName];
            },
            _getLastPickedSymbolItemIds() {
                if(! this.currentSymbolItemSymbolTypeName) {
                    return '';
                }
                const lastPickedIds = this.POP.lastPickedIds[this.currentSymbolItemSymbolTypeName];
                if(lastPickedIds) {
                    return lastPickedIds;
                }
                this.$set(this.POP.lastPickedIds, this.currentSymbolItemSymbolTypeName, []);
                return this.POP.lastPickedIds[this.currentSymbolItemSymbolTypeName];
            },
            _togglePickSymbolItem(symbolItem) {
                if(this._pickSymbolItem(symbolItem)) {
                    return;
                }
                this._unpickSymbolItem(symbolItem);
            },
            _pickSymbolItem(symbolItem) {
                if(this.currentSymbolItemSymbolType.repeatable) {
                    this._insertSymbolItemElement(symbolItem);
                    return;
                }
                const pickedIds = this._getPickedSymbolItemIds();
                if(! symbolItem || ! pickedIds || pickedIds.indexOf(symbolItem.id) != -1) {
                    return false;
                }
                pickedIds.push(symbolItem.id);
                this.onPickedSymbolItemChange();
                return true;
            },
            _unpickSymbolItem(symbolItem) {
                if(this.currentSymbolItemSymbolType.repeatable) {
                    return;
                }
                const pickedIds = this._getPickedSymbolItemIds();
                if(! symbolItem  || ! pickedIds || pickedIds.indexOf(symbolItem.id) == -1) {
                    return false;
                }
                this.$delete(pickedIds, pickedIds.indexOf(symbolItem.id));
                this.onPickedSymbolItemChange();
                return true;
            },
            onPickedSymbolItemChange() {
                if(! this.currentSymbolItemSymbolTypeName) {
                    return;
                }
                if(this.symbolItemsChangeTimer) {
                    clearTimeout(this.symbolItemsChangeTimer);
                }
                this.symbolItemsChangeTimer = setTimeout(() => {
                    const pickedIds = this._getPickedSymbolItemIds();
                    const lastPickedIds = this._getLastPickedSymbolItemIds();
                    const removedItems = _.difference(lastPickedIds, pickedIds);
                    if(removedItems.length) {
                        for(let itemId of removedItems) {
                            this._removeSymbolItemElement(this._getSymbolItem(itemId));
                        }
                    }
                    if(! pickedIds.length) {
                        return;
                    }
                    this._deleteSymbolContent();
                    for(let pickedId of pickedIds) {
                        this._insertSymbolItemElement(this._getSymbolItem(pickedId));
                    }
                    this.POP.lastPickedIds[this.currentSymbolItemSymbolTypeName] = _.clone(pickedIds);
                    this._setVirtualSymbol();
                }, 400);
            },
            _getSymbolItemElementId(item, repeatable) {
                if(! this.currentSymbolItemSymbolTypeName) {
                    return;
                }
                return 'stxa' + this._uid 
                    + this.currentSymbolItemSymbolTypeName 
                    + item.id + (repeatable ? _.uniqueId() : '');
            },
            _getSymbolItemTag(item) {
                const result = this.currentSymbolItemSymbolType.display 
                    && this.currentSymbolItemSymbolType.display(item, this.META);
                if(result) {
                    return result;
                }
                return this.currentSymbolItemSymbolType.indicator + item.name;
            },
            _insertSymbolItemElement(item) {
                if(! item) {
                    return;
                }
                const repeatable = this.currentSymbolItemSymbolType.repeatable;
                const id = this._getSymbolItemElementId(item, repeatable);
                if(! id) {
                    return;
                }
                const existed = document.getElementById(id);
                if(existed) {
                    return;
                }
                const dom = this._wrapElementInput(this._getSymbolItemTag(item), 'tag', {
                    id: id,
                    symbolItem: item,
                    symbol: this.currentSymbolItemSymbolType,
                    location: _.clone(this.INPUT.symbolLocation || this.INPUT.symbolLastLocation),
                });
                this._insertElementTypeInput(dom);
            },
            _removeSymbolItemElement(item) {
                if(! item) {
                    return;
                }
                if(this.INPUT.symbol.repeatable) {
                    return;
                }
                const id = this._getSymbolItemElementId(item);
                const existed = document.getElementById(id);
                if(! existed) {
                    return;
                }
                this._removeNode(existed);
                this._changeValidPopTrigger();
            },
            _changeValidPopTrigger() {
                if(this.inputDom.contains(this.cursorDom)) {
                    this.POP.trigger = this.cursorDom;
                    this.POP.placement = 'bottom-start';
                    return;
                }
                if(this.POP.trigger 
                    && this.inputDom.contains(this.POP.trigger)) {
                    return;
                }
                const lastElement = this._findElementNode(
                    this.INPUT.location.beforeNode, true);
                if(lastElement) {
                    this.POP.trigger = lastElement;
                    this.POP.placement = 'bottom-start';
                    return;
                }
                this.POP.trigger = this.inputDom;
                this.POP.placement = 'top-start';
            },
            closePop() {
                if(! this.POP.opening) {
                    return;
                }
                this.POP.opening = false;
            },
            _handleClipBoardData(clipboardData) {
                if(! clipboardData.items) {
                    return;
                }
                const handledObjs = []; 
                for(let item of clipboardData.items) {
                    switch(item.kind) {
                        case 'file':
                            const file = item.getAsFile();
                            if(! file || handledObjs.indexOf(file) != -1) {
                                continue;
                            }
                            handledObjs.push(file);
                            this._onInputFileChange([file]);
                            break;
                        case 'string':
                            let text;
                            if(window.clipboardData) {
                                text = window.clipboardData.getData('Text');
                            } else {
                                text = clipboardData.getData('text/plain');
                            }
                            if(! text || handledObjs.indexOf(text) != -1) {
                                continue;
                            }
                            handledObjs.push(text);
                            if (document.queryCommandSupported('insertText')) {
                                document.execCommand('insertText', false, text);
                            } else {
                                document.execCommand('paste', false, text);
                            }
                            break;
                    }
                }
            },
            _initInputEvents() {
                if(! this.inputDom) {
                    return;
                }
                bindEvent(this.inputDom, 'keydown', (e) => {
                    let event = (e.originalEvent || e);
                    if(event.keyCode == 9
                        && ! event.shiftKey) { // 按下Tab键
                        this._insertBlankTypeInput();
                        return;
                    }
                }, false);
                bindEvent(this.inputDom, 'keyup', (e) => {
                    let event = (e.originalEvent || e);
                    console.log('keyup', event);
                    // 点击控制输入的按键键不触发监听
                    if(CURSOR_CONTROL_KEY_CODES.indexOf(event.keyCode) != -1) {
                        this._locateFakeCursor(false);
                        this.closePop();
                        // 非退格键的其它控制键输入后视为结束关键字查询输入
                        if(event.keyCode != 8) {
                            this._endSymbolQueryInputing();
                        }
                        return;
                    }
                    // 未带ctrl以及的按键触发内容变更
                    if(! event.ctrlKey
                        && ASSIST_CONTROL_KEY_CODES.indexOf(event.keyCode) == -1) {
                        this._onInputChange();
                    }
                }, false);
                bindEvent(this.inputDom, 'mouseup', (e) => {
                    let event = (e.originalEvent || e);
                    console.log('mouseup', event);
                    // 尝试找到封装节点
                    const wrappedNode = this._isWrappedNode(e.target);
                    if(! wrappedNode) {
                        // 不为封装节点则可能是重新定位光标
                        if(this._isCursorMoved()) {
                            this._onInputChange();
                        }
                        // 关闭弹出框以及取消假光标,保证不影响后续输入
                        this.closePop();
                        this._locateFakeCursor(false);
                        this._endSymbolQueryInputing();
                        return;
                    }
                    // 获取封装节点
                    const attachment = wrappedNode.$attachment;
                    if(! attachment) {
                        return;
                    }
                    // 关键字触发产生的封装节点
                    if(attachment.symbol
                        && ! attachment.symbol.repeatable) {
                        setTimeout(() => {
                            this._handleSymbol(
                                attachment.symbol, 
                                attachment.location,
                                wrappedNode
                            );
                        }, 100);
                    }
                }, false);
                bindEvent(this.inputDom, 'paste', (e) => {
                    let event = (e.originalEvent || e);
                    stopBubble(event);
                    console.log('paste', event);
                    if (event.clipboardData) {
                        this._handleClipBoardData(event.clipboardData);
                    } else if (window.clipboardData) {
                        this._handleClipBoardData(window.clipboardData);
                    }
                }, false);
                bindEvent(this.inputDom, 'drop', (e) => {
                    let event = (e.originalEvent || e);
                    stopBubble(event);
                    console.log('drop', event);
                    if(e.dataTransfer.files
                        && e.dataTransfer.files.length) {
                        this._onInputFileChange(e.dataTransfer.files);
                    } else if(e.dataTransfer.types.indexOf('text/plain') != -1) {
                        const text = e.dataTransfer.getData('text/plain');
                        if(! text) {
                            return;
                        }
                        this._insertTextTypeInput(text);
                    }
                }, false);
            },
            _initFileInput() {
                const fileInputDom = this.$refs.fileInput;
                if(! fileInputDom) {
                    return;
                }
                fileInputDom.onchange = (e) => {
                    const files = e.target.files;
                    if(! files || ! files.length) {
                        return;
                    }
                    this._onInputFileChange(files);
                    e.target.value = '';
                };
            },
            _initImgInput() {
                const imgInputDom = this.$refs.imgInput;
                if(! imgInputDom) {
                    return;
                }
                imgInputDom.onchange = (e) => {
                    const files = e.target.files;
                    if(! files || ! files.length) {
                        return;
                    }
                    for (let file of files) {
                        if(! this._isImage(file)) {
                            e.target.value = '';
                            toast('请选择正确的图片文件！', 'error');
                            return;
                        }
                    }
                    this._onInputFileChange(files);
                    e.target.value = '';
                };
            },
            _initInputObserver() {
                if(! this.inputDom) {
                    return;
                }
                const handleFn = _.throttle(this._handleNodeChange, 3000);
                // 监听DOM节点在输入框中被移除的事件, 以清理不需要的富态节点,分隔节点等
                this.inputDom.$observer = new MutationObserver((mutations) => {
                    console.log('MutationObserver', mutations);
                    this._changeValidPopTrigger();
                    _.forEach(mutations, (mutation) => {
                        for(let removedNode of mutation.removedNodes) {
                            if(this.cursorDom === removedNode) {
                                continue;
                            }
                            /* 再调一次删除相关的东西 */
                            this._removeNode(removedNode);
                            if(this.MUTATION.removedNodes.indexOf(removedNode) == -1) {
                                this.MUTATION.removedNodes.push(removedNode);
                            }
                        }
                        for(let addedNode of mutation.addedNodes) {
                            if(this.cursorDom === addedNode) {
                                continue;
                            }
                            if(this.MUTATION.addedNodes.indexOf(addedNode) == -1) {
                                this.MUTATION.addedNodes.push(addedNode);
                            }
                        }
                    });
                    handleFn();
                });
                this.inputDom.$observer.observe(this.inputDom, { 
                    childList: true, 
                    subtree: false, 
                });
            },
            _handleNodeChange() {
                const removedNodes = this.MUTATION.removedNodes;
                const addedNodes = this.MUTATION.addedNodes;
                for(let removedNode of removedNodes) {
                    if(addedNodes.indexOf(removedNode) != -1) {
                        continue;
                    }
                    console.log('remove node', removedNode);
                    // 对带数据的节点要特别处理
                    const attachment = removedNode.$attachment;
                    if(! attachment) {
                        this.updateInput();
                        continue;
                    }
                    if(attachment.symbolItem) {
                        this._setVirtualSymbol(attachment.symbol);
                        if(! attachment.symbol.repeatable) {
                            this._unpickSymbolItem(attachment.symbolItem);
                        }
                        this.$emit('tag-removed', [this._getSymbolItem(attachment.symbolItem.id)]);
                        this._setVirtualSymbol();
                    } else if(attachment.file) {
                        this.$emit('file-removed', attachment.file);
                    }
                    // 更新当前输入的内容
                    this.updateInput();
                }
                for(let addedNode of addedNodes) {
                    if(removedNodes.indexOf(addedNode) != -1) {
                        continue;
                    }
                    console.log('add node', addedNode);
                    // 如果有数据的节点需要专门处理
                    const attachment = addedNode.$attachment;
                    if(! attachment) {
                        this.updateInput();
                        continue;
                    }
                    if(attachment.symbolItem) { // 标签内容
                        this._setVirtualSymbol(attachment.symbol);
                        if(! attachment.symbol.repeatable) {
                            this._pickSymbolItem(attachment.symbolItem);
                        }
                        this.$emit('tag-added', [this._getSymbolItem(attachment.symbolItem.id)]);
                        this._setVirtualSymbol();
                    } else if(attachment.file) { // 文件内容，包括图片
                        this.$emit('file-added', attachment.file);
                    }
                    // 更新当前输入的内容
                    this.updateInput();
                }
                this.MUTATION.removedNodes = [];
                this.MUTATION.addedNodes = [];
            },
        },
        mounted() {
            this._initSymbolItemMap();
            this.$nextTick(() => {
                this._initImgInput();
                this._initFileInput();
                this._initInputEvents();
                this._initInputObserver();
                this._generateMeta();
            });
            
        },
    }
</script>

<style lang="scss">
    @import "style/mixin";

    .smart-textarea {
        width: 100%;
        height: 100%;
        .smart-textarea__input-cursor {
            width: 0;
            height: 0;
            position: absolute;
            display: inline-block;
        }
        .smart-textarea__input {
            width: 100%;
            height: 100%;
            padding: px2rem(4px);
            display: block;
            font-size: px2rem(16px);
            line-height: px2rem(28px);
            word-break: break-all;
            overflow-y: auto;
            overflow-x: hidden;
            &:focus {
                outline: none;
                border: px2rem(1px) solid $primary;
                border-radius: px2rem(4px);
            }
            &.smart-textarea__input--hidden {
                visibility: hidden;
                position: absolute;
                top: px2rem(2px);
                left: px2rem(2px);
                &::-webkit-scrollbar {  
                    width: 0;  
                }
            }
        }
        .smart-textarea__input-item {
            width: px2rem(60px);
            height: px2rem(60px);
            line-height: px2rem(28px);
            cursor: pointer;
            display: inline-block;
            overflow: hidden;
        }
        .smart-textarea__input-item-wrapper {
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            img {
                max-height: 100%;
            }
        }
        .smart-textarea__input-tag  {
            width: auto;
            max-width: px2rem(240px);
            height: auto;
            max-height: px2rem(240px);
            word-break: break-all;
            white-space: nowrap;
            overflow: visible;
            margin-left: px2rem(4px);
            border: none;
            color: $theme;
        }
        .smart-textarea__input-img {
            width: auto;
            height: auto;
            .smart-textarea__input-item-wrapper {
                height: px2rem(80px);
            }
        }
        .smart-textarea__input-file {
            label {
                height: px2rem(24px);
                margin-top: px2rem(4px);
                font-size: px2rem(10px);
                line-height: px2rem(12px);
                overflow: hidden;
                text-align: center;
            }
            img {
                height: px2rem(32px);
            }
        }
    }
    .smart-textarea__popover {
        width: px2rem(120px);
        height: px2rem(150px);
        background: $bgc_main;
        color: $fc_main;
        border: px2rem(1px) solid $bdc_main;
        border-radius: px2rem(2px);
        padding: px2rem(2px);
        box-shadow: px2rem(0px) px2rem(2px) px2rem(8px) px2rem(1px) rgba($bgc_main, 0.2);
        overflow: hidden;
        display: flex;
        .smart-textarea__popover-body {
            width: 100%;
            height: 100%;
            flex: 1 1 auto;;
        }
        .smart-textarea__popover-tabs {
            width: 100%;
            height: 100%;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            .van-tabs__wrap {
                flex-shrink: 0;
            }
            .van-tabs__content {
                width: 100%;
                height: 100%;
                overflow: auto;
                flex: 1 1 auto;    
            }
        }
        .smart-textarea__popover-list {
            width: 100%;
            height: 100%;
            overflow-x: hidden;
            overflow-y: auto;
        }
        .smart-textarea__popover-list-item {
            font-size: px2rem(12px);
            padding: px2rem(4px) px2rem(8px);
            cursor: pointer;
            list-style: none;
            display: flex;
            align-items: center;
            .mu-checkbox {
                margin-right: px2rem(8px);
            }
            &:hover {
                color: $theme;
                background: $bgc_hover;
            }
        }
        &::-webkit-scrollbar {  
            width: px2rem(4px);  
        }
        &.smart-textarea__popover--grid {
            width: px2rem(220px);
            height: auto;
            min-height: px2rem(50px);
            max-height: px2rem(300px);
            .smart-textarea__popover-list {
                display: flex;
                flex-wrap: wrap;
            }
            .smart-textarea__popover-list-item {
                width: px2rem(35px);
                height: px2rem(35px);
                padding: px2rem(4px);
                display: flex;
                align-items: center;
                justify-content: center;
                border: px2rem(1px) solid $bdc_main;
                img {
                    max-width: 100%;
                    max-height: 100%;
                }
                &~.smart-textarea__popover-item {
                    border-left: none;
                }
            }
        }
    }
</style>