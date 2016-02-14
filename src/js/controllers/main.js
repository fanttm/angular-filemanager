(function(window, angular, $) {
    'use strict';
    angular.module('FileManagerApp').controller('FileManagerCtrl', [
        '$scope', '$translate', '$cookies', 'fileManagerConfig', 'item', 'fileNavigator', 'fileUploader',
        function($scope, $translate, $cookies, fileManagerConfig, Item, FileNavigator, FileUploader) {

        $scope.config = fileManagerConfig;
        $scope.reverse = false;
        $scope.predicate = ['model.type', 'model.name'];        
        $scope.order = function(predicate) {
            $scope.reverse = ($scope.predicate[1] === predicate) ? !$scope.reverse : false;
            $scope.predicate[1] = predicate;
        };

        $scope.query = '';
        $scope.temp = new Item();
        $scope.fileNavigator = new FileNavigator();
        $scope.fileUploader = FileUploader;
        $scope.uploadFileList = [];
        $scope.viewTemplate = $cookies.viewTemplate || 'main-table.html';

        // MYCOMMENT angular的$watch用法，监控非model的变量
        // 
        // $scope.$watch(function() {
        //     return window.document.body.scrollHeight;
        // }, function() {
        //     var iframe = window.parent.document.getElementById("filemanagerIframe");
        //     $(iframe).height(window.document.body.scrollHeight);
        // });
 
        $scope.setTemplate = function(name) {
            $scope.viewTemplate = $cookies.viewTemplate = name;
        };

        $scope.changeLanguage = function (locale) {
            if (locale) {
                return $translate.use($cookies.language = locale);
            }
            $translate.use($cookies.language || fileManagerConfig.defaultLang);
        };

        $scope.touch = function(item) {
            item = item instanceof Item ? item : new Item();
            item.revert();
            $scope.temp = item;
        };

        // 打开脑图
        $scope.openNewWindow = function(item) {
            var mindmapUrl = fileManagerConfig.mindmapUrl + item.model.id;
            window.open(mindmapUrl);
        };

        // 此处默认仅有文件夹和文件两种格式，暂不考虑图片和文件编辑等
        $scope.smartClick = function(item) {
            if (item.isFolder()) {
                return $scope.fileNavigator.folderClick(item);
            }

            $scope.openNewWindow(item);

            // if (item.isImage()) {
            //     if ($scope.config.previewImagesInModal) {
            //         return $scope.openImagePreview(item);
            //     } 
            //     return item.download(true);
            // }
            // if (item.isEditable()) {
            //     return $scope.openEditItem(item);
            // }
        };

        $scope.openImagePreview = function(item) {
            item.inprocess = true;
            $scope.modal('imagepreview')
                .find('#imagepreview-target')
                .attr('src', item.getUrl(true))
                .unbind('load error')
                .on('load error', function() {
                    item.inprocess = false;
                    $scope.$apply();
                });
            return $scope.touch(item);
        };

        $scope.openEditItem = function(item) {
            item.getContent();
            $scope.modal('edit');
            return $scope.touch(item);
        };

        $scope.modal = function(id, hide) {
            return $('#' + id).modal(hide ? 'hide' : 'show');
        };

        $scope.isInThisPath = function(path) {
            var currentPath = $scope.fileNavigator.currentPath.join('/');
            return currentPath.indexOf(path) !== -1;
        };

        $scope.edit = function(item) {
            item.edit().then(function() {
                $scope.modal('edit', true);
            });
        };

        $scope.changePermissions = function(item) {
            item.changePermissions().then(function() {
                $scope.modal('changepermissions', true);
            });
        };

        $scope.copy = function(item) {
            var samePath = item.tempModel.path.join() === item.model.path.join();
            if (samePath && $scope.fileNavigator.fileNameExists(item.tempModel.name)) {
                item.error = $translate.instant('error_invalid_filename');
                return false;
            }
            item.copy().then(function() {
                $scope.fileNavigator.refresh();
                $scope.modal('copy', true);
            });
        };

        $scope.compress = function(item) {
            item.compress().then(function() {
                $scope.fileNavigator.refresh();
                if (! $scope.config.compressAsync) {
                    return $scope.modal('compress', true);
                }
                item.asyncSuccess = true;
            }, function() {
                item.asyncSuccess = false;
            });
        };

        $scope.extract = function(item) {
            item.extract().then(function() {
                $scope.fileNavigator.refresh();
                if (! $scope.config.extractAsync) {
                    return $scope.modal('extract', true);
                }
                item.asyncSuccess = true;
            }, function() {
                item.asyncSuccess = false;
            });
        };

        $scope.remove = function(item) {
            var params = {
                mode: 'remove',
                path: item.model.path.join('/'),
                name: item.model.name
            }
            // COMMENT_OFFLINE
            item.remove().then(function() {                
                $scope.fileNavigator.setFileSystemData(params);
                $scope.fileNavigator.refresh();
                $scope.modal('delete', true);
            });
        };

        $scope.rename = function(item) {
            var samePath = item.tempModel.path.join() === item.model.path.join();
            if (samePath && $scope.fileNavigator.fileNameExists(item.tempModel.name)) {
                item.error = $translate.instant('error_invalid_filename');
                return false;
            }
            var fp = item.model.path.join('/');
            var params = {
                mode: 'rename',
                path: (fp ? (fp+'/'+item.model.name) : item.model.name),
                newName: item.tempModel.name
            }
            // COMMENT_OFFLINE
            item.rename().then(function() {
                $scope.fileNavigator.setFileSystemData(params);
                $scope.fileNavigator.refresh();
                $scope.modal('rename', true);
            });
        };

        // MYCOMMENT 将原有的“重命名/移动”两个合并的功能，分割成两个单独的功能，以便于用户理解使用
        $scope.move = function(item) {
            var samePath = item.tempModel.path.join() === item.model.path.join();
            if (samePath || $scope.fileNavigator.fileNameExists(item.tempModel.name, item.tempModel.path.slice(1).join('/'))) {
                item.error = $translate.instant('error_invalid_filename');
                return false;
            }
            var params = {
                mode: 'move',
                name: item.model.name,
                path: item.model.path.join('/'),
                newPath: item.tempModel.path.slice(1).join('/')     // item.tempModel.path = ["","xxxx","xxxxx"]，所以需要slice(1)
            }
            // console.log(params, item.tempModel.path, item.model.path)
            $scope.fileNavigator.setFileSystemData(params);
            $scope.fileNavigator.currentPath = item.tempModel.path.slice(1);
            $scope.fileNavigator.refresh();
            $scope.modal('move', true);            
        }

        $scope.createFolder = function(item) {
            var name = item.tempModel.name && item.tempModel.name.trim();
            item.tempModel.type = 'dir';
            item.tempModel.path = $scope.fileNavigator.currentPath;
            if (name && !$scope.fileNavigator.fileNameExists(name)) {
                // item.createFolder().then(function() {
                //     $scope.fileNavigator.refresh();
                //     $scope.modal('newfolder', true);
                // });
                var params = {
                    mode: 'addfolder',
                    path: item.tempModel.path.join('/'),
                    name: item.tempModel.name
                };
                $scope.fileNavigator.setFileSystemData(params);                
                $scope.fileNavigator.refresh();
                $scope.modal('newfolder', true);
            } else {
                item.error = $translate.instant('error_invalid_filename');
                return false;
            }
        };

        // 新增了创建文件的功能
        $scope.createFile = function(item) {
            var name = item.tempModel.name && item.tempModel.name.trim();
            item.tempModel.type = 'file';
            item.tempModel.path = $scope.fileNavigator.currentPath;
            if (name && !$scope.fileNavigator.fileNameExists(name)) {
                // COMMENT_OFFLINE
                item.createFile().then(function(data) {
                    var params = {
                        id: data.id,
                        mode: 'addfile',
                        path: item.tempModel.path.join('/'),
                        name: item.tempModel.name
                    };
                    $scope.fileNavigator.setFileSystemData(params);                
                    $scope.fileNavigator.refresh();
                    $scope.modal('newfile', true);
                });
            } else {
                item.error = $translate.instant('error_invalid_filename');
                return false;
            }
        };

        // MYCOMMENT 
        // 为了原有的目录展示模式保持不变，即无法在文件（夹）显示区域显示ROOT文件夹；而在文件（夹）移动操作中，
        // 如果无法选中ROOT文件夹，则无法将文件（夹）移动到ROOT目录下；
        // 因此增加该功能，直接指定待移动的文件（夹）的目标路径
        $scope.selectRoot = function(temp) {
            temp.tempModel.path = [];
            $('#selector').modal('hide');
        };

        $scope.uploadFiles = function() {
            $scope.fileUploader.upload($scope.uploadFileList, $scope.fileNavigator.currentPath).then(function() {
                $scope.fileNavigator.refresh();
                $scope.modal('uploadfile', true);
            }, function(data) {
                var errorMsg = data.result && data.result.error || $translate.instant('error_uploading_files');
                $scope.temp.error = errorMsg;
            });
        };

        $scope.getQueryParam = function(param) {
            var found;
            window.location.search.substr(1).split('&').forEach(function(item) {
                if (param ===  item.split('=')[0]) {
                    found = item.split('=')[1];
                    return false;
                }
            });
            return found;
        };

        $scope.changeLanguage($scope.getQueryParam('lang'));
        $scope.isWindows = $scope.getQueryParam('server') === 'Windows';
        $scope.fileNavigator.refresh();
    }]);
})(window, angular, jQuery);
