(function(angular) {
    'use strict';
    angular.module('FileManagerApp').provider('fileManagerConfig', function() {

        var values = {
            appName: 'https://github.com/joni2back/angular-filemanager',
            defaultLang: 'zh',

            mindmapUrl: '/mindmap/',

            saveUrl: '/api/mindmap/saveFileSystem',         // 为了减少服务端解析较大JSON数据的开销，单独增加了SAVE接口
            
            createFileUrl: '/api/mindmap/fileSystem',
            renameUrl: '/api/mindmap/fileSystem',
            removeUrl: '/api/mindmap/fileSystem',

            // listUrl: 'bridges/php/handler.php',
            // uploadUrl: 'bridges/php/handler.php',
            // renameUrl: 'bridges/php/handler.php',
            // copyUrl: 'bridges/php/handler.php',
            // removeUrl: 'bridges/php/handler.php',
            // editUrl: 'bridges/php/handler.php',
            // getContentUrl: 'bridges/php/handler.php',
            // createFolderUrl: 'bridges/php/handler.php',
            // downloadFileUrl: 'bridges/php/handler.php',
            // compressUrl: 'bridges/php/handler.php',
            // extractUrl: 'bridges/php/handler.php',
            // permissionsUrl: 'bridges/php/handler.php',

            searchForm: true,
            sidebar: true,
            breadcrumb: true,
            allowedActions: {
                upload: true,
                rename: true,
                copy: false,
                edit: false,
                move: true,
                changePermissions: false,
                compress: false,
                compressChooseName: true,
                extract: true,
                download: false,
                preview: false,
                remove: true,
                newwindow: true
            },

            previewImagesInModal: true,
            enablePermissionsRecursive: true,
            compressAsync: true,
            extractAsync: true,

            isEditableFilePattern: /\.(txt|html?|aspx?|ini|pl|py|md|css|js|log|htaccess|htpasswd|json|sql|xml|xslt?|sh|rb|as|bat|cmd|coffee|php[3-6]?|java|c|cbl|go|h|scala|vb)$/i,
            isImageFilePattern: /\.(jpe?g|gif|bmp|png|svg|tiff?)$/i,
            isExtractableFilePattern: /\.(gz|tar|rar|g?zip)$/i,
            tplPath: 'src/templates'
        };

        return { 
            $get: function() {
                return values;
            }, 
            set: function (constants) {
                angular.extend(values, constants);
            }
        };
    
    });
})(angular);
