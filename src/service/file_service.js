import BaseService from 'service/base_service';


export default class FileService extends BaseService {

     /**
     * 下载帮区文档 file
     */
    downloadBandDoc(params, callbacks) {
        return this.createTemplate(params, callbacks, {
            url: g_callToolUrl 
                + '&toolID=' + g_fileUploadToolId
                + '&returnType=VALUE'
                + '&toolAction=downloadDocument',
            ajaxParams: {
                documentID: params.documentId,
                storageID: params.storageId,
            },
            ajaxResponseType: 'file',
            errorTag: 'downloadBandDoc',
            errorMsg: '下载帮区文档失败',
        });
    };

    /**
     * 上传帮区文档 file
     */
    uploadBandDoc(params, callbacks) {
        return this.createTemplate(params, callbacks, {
            url: g_callToolUrl 
                + '&toolID=' + g_fileUploadToolId
                + '&returnType=VALUE'
                + '&toolAction=uploadDocument',
            ajaxParams: {
                fileToUpload: params.file,
            },
            errorTag: 'uploadBandDoc',
            errorMsg: '上传帮区文档失败',
        });
    };
    
    /**
     * 完成上传帮区文档 bandId,storageId,name,keywords,description,extension
     */
    confirmUpload(params, callbacks) {
        return this.createTemplate(params, callbacks, {
            url: g_callToolUrl 
                + '&toolID=' + g_fileUploadToolId
                + '&returnType=VALUE'
                + '&toolAction=confirmUploadDocument',
            ajaxParams: {
                bandID: params.bandId,
                storageID: params.storageId,
                uploadType: 0,
                documentVersion: {
                    storageID: params.storageId,
                    description: params.description,
                    extension: params.extension,
                    documentID: '',
                    size: params.size,
                },
                document: {
                    name: params.name,
                    description: params.description,
                    keywords: params.keywords,
                },
            },
            handleDetailsFetchPlaceholdersFn: (json) => {
                if(! json.documentID) {
                    console.log(json);
                    return;
                }
                return {
                    objId: json.documentID,
                    objType: Document,
                    ajaxParams: {
                        action: 'getBandDocuments',
                        bandID: params.bandId,
                        query: {
                            objID: json.documentID
                        },
                    },
                };
            },
            errorTag: 'uploadBandDoc',
            errorMsg: '上传帮区文档失败',
        });
    };
};