(function(angular) {
    'use strict';
    angular.module('FileManagerApp').service('fileNavigator', [
        '$http', '$q', 'fileManagerConfig', 'item', function ($http, $q, fileManagerConfig, Item) {

        $http.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

        var FileNavigator = function() {
            this.basedata = fileManagerConfig.filesystemData;
            this.requesting = false;
            this.fileList = [];
            this.currentPath = [];
            this.history = [];
            this.error = '';
        };

        FileNavigator.prototype.setFileSystemData = function(params) {
            var filesystemData = this.basedata;
            var that = this;

            var now = moment().format('YYYY-MM-DD HH:mm:ss');

            var myAddFolder = function(destPath, folderName) {
                var res = that.getPathFileList(destPath);
                var subdir = res.result;
                // console.log(destPath, res.itself, res.result)
                subdir.push({
                    "name": folderName,
                    "createtime": now,
                    "updatetime": now,
                    "type": "dir",
                    "subdir": []
                });
            }

            var myAddFile = function(destPath, fileName) {
                var params = {
                    mode: 'addfile',
                    name: fileName
                };

                $http.post(fileManagerConfig.createUrl, params).success(function(data) {
                    var id = data.result.id;
                    var res = that.getPathFileList(destPath);
                    var subdir = res.result;
                    subdir.push({
                        "id": id,
                        "name": fileName,
                        "createtime": now,
                        "updatetime": now,
                        "type": "file"
                    });
                }).error(function(data) {
                    
                })['finally'](function() {
                    // self.requesting = false;
                });                
            }

            var myRename = function(destPath, id, newName) {
                var params = {
                    mode: 'rename',
                    name: newName
                };

                $http.post(fileManagerConfig.renameUrl, params).success(function(data) {
                    var res = that.getPathFileList(destPath);
                    var item = res.itself;
                    item.name = newName;
                }).error(function(data) {
                    
                })['finally'](function() {
                    
                });
            }

            var myMove = function(name, path, newPath) {
                var pathname = path ? (path+'/'+name) : name;
                var res = that.getPathFileList(pathname);
                var newRes = that.getPathFileList(newPath);
                var targetDir = newRes.result;
                var file = res.itself;
                // console.log("path="+path, name, newPath, targetDir, file)
                // 添加原先的文件（夹）到目标文件夹
                targetDir.push(file);
                // 删除原先的文件（夹）
                that.deleteFile(pathname);
            }

            var myDelete = function(path, id, name) {
                var params = {
                    mode: 'delete',
                    id: fileId
                };

                $http.post(fileManagerConfig.deleteUrl, params).success(function(data) {
                    var pathname = path ? (path+'/'+name) : name;
                    that.deleteFile(pathname);
                }).error(function(data) {
                    
                })['finally'](function() {
                    
                });
            }

            switch (params.mode) {
                case 'addfolder':
                    myAddFolder(params.path, params.name);
                    break;
                case 'addfile':
                    myAddFile(params.path, params.name);
                    break;
                case 'rename':
                    myRename(params.path, params.id, params.newName);
                    break;
                case 'move':
                    myMove(params.name, params.path, params.newPath);
                    break;
                case 'remove':
                    myDelete(params.path, params.id, params.name);
                    break;
                default:
                    break;
            }

            that.saveToServer(filesystemData);
        };

        FileNavigator.prototype.saveToServer = function(fileSD) {
            var params = {
                mode: 'save',
                filesystem: fileSD
            };

            $http.post(fileManagerConfig.saveUrl, params).success(function(data) {
                
            }).error(function(data) {
                
            })['finally'](function() {
                
            });
        };

        FileNavigator.prototype.addFileOnServer = function(fileName) {
            var self = this;
            var deferred = $q.defer();

            

            return deferred.promise;
        };

        FileNavigator.prototype.renameOnServer = function(fileId, fileName) {
            var self = this;
            var deferred = $q.defer();

            var params = {
                mode: 'rename',
                name: fileName
            };

            self.requesting = true;

            $http.post(fileManagerConfig.renameUrl, params).success(function(data) {
                self.deferredHandler(data, deferred);
            }).error(function(data) {
                self.deferredHandler(data, deferred, 'Unknown error save, check the response');
            })['finally'](function() {
                self.requesting = false;
            });

            return deferred.promise;
        };

        FileNavigator.prototype.deleteOnServer = function(fileId) {
            var self = this;
            var deferred = $q.defer();

            var params = {
                mode: 'delete',
                id: fileId
            };

            self.requesting = true;

            $http.post(fileManagerConfig.deleteUrl, params).success(function(data) {
                self.deferredHandler(data, deferred);
            }).error(function(data) {
                self.deferredHandler(data, deferred, 'Unknown error save, check the response');
            })['finally'](function() {
                self.requesting = false;
            });

            return deferred.promise;
        };

        FileNavigator.prototype.getPathFileList = function(path) {
            var filesystemData = this.basedata;

            if (!path) return { "result": filesystemData }

            /*
                subdir是存放目录或文件的数组
                currentPath是存放路径的数组，将路径字符串分割而成的数组，如 joomla/java，分割成 ['joomla', 'java']
                level表示当前对比的currentPath的深度，如果当前深度未能找到匹配项，则返回错误；如果已经找到匹配项，并且已经达到currentPath的最大深度，则返回匹配项的subdir数组内容
             */
            var getPathFileListRecursive = function(subdir, currentPath, level) {
                for (var i=0,len=subdir.length; i<len; i++) {
                    var item = subdir[i];
                    var currentLevelMatch = false;
                    if (currentPath[level]==item.name) {
                        currentLevelMatch = true;
                        if (currentPath.length==(level+1)) {
                            return { "result" : item.subdir, "itself": item }
                        } else {
                            return getPathFileListRecursive(item.subdir, currentPath, level+1)
                        }
                    }
                    if (i==(len-1) && !currentLevelMatch) return { "result" : null }
                }
            };

            var currentPath = path.split('/');
            var level = 0;
            return getPathFileListRecursive(filesystemData, currentPath, level)
        };

        FileNavigator.prototype.deleteFile = function(path) {
            var filesystemData = this.basedata;

            if (!path) return null;

            /*
                subdir是存放目录或文件的数组
                currentPath是存放路径的数组，将路径字符串分割而成的数组，如 joomla/java，分割成 ['joomla', 'java']
                level表示当前对比的currentPath的深度，如果当前深度未能找到匹配项，则返回错误；如果已经找到匹配项，并且已经达到currentPath的最大深度，则返回匹配项的subdir数组内容
             */
            var deleteFileRecursive = function(subdir, currentPath, level) {
                for (var i=0,len=subdir.length; i<len; i++) {
                    var item = subdir[i];
                    var currentLevelMatch = false;
                    // 每个currentPath路径都需要找到匹配项
                    if (currentPath[level]==item.name) {
                        currentLevelMatch = true;
                        // 如果currentPath的深度已经到达
                        if (currentPath.length==(level+1)) {
                            // 删除所找到的项
                            return subdir.splice(i,1)
                        } else {
                            return deleteFileRecursive(item.subdir, currentPath, level+1)
                        }
                    }
                    // 如果任意一个路径没有找到匹配，都是错误的
                    if (i==(len-1) && !currentLevelMatch) return { "result" : null }
                }
            };

            var currentPath = path.split('/');
            var level = 0;
            return deleteFileRecursive(filesystemData, currentPath, level)
        };

        FileNavigator.prototype.deferredHandler = function(data, deferred, defaultMsg) {
            if (!data || typeof data !== 'object') {
                this.error = 'Bridge response error, please check the docs';
            }
            if (!this.error && data.result && data.result.error) {
                this.error = data.result.error;
            }
            if (!this.error && data.error) {
                this.error = data.error.message;
            }
            if (!this.error && defaultMsg) {
                this.error = defaultMsg;
            }
            if (this.error) {
                return deferred.reject(data);
            }
            return deferred.resolve(data);
        };

        FileNavigator.prototype.list = function() {
            var self = this;
            // var deferred = $q.defer();
            var path = self.currentPath.join('/');
            var data = {params: {
                mode: 'list',
                onlyFolders: false,
                path: '/' + path
            }};

            self.requesting = true;
            self.fileList = [];
            self.error = '';

            var retData = self.getPathFileList(path)

            self.requesting = false;

            return retData;

            // $http.post(fileManagerConfig.listUrl, data).success(function(data) {
            //     self.deferredHandler(data, deferred);
            // }).error(function(data) {
            //     self.deferredHandler(data, deferred, 'Unknown error listing, check the response');
            // })['finally'](function() {
            //     self.requesting = false;
            // });
            // return deferred.promise;
        };

        FileNavigator.prototype.refresh = function() {
            var self = this;
            var path = self.currentPath.join('/');
            var data = self.list()
            self.fileList = (data.result || []).map(function(file) {
                return new Item(file, self.currentPath);
            });
            self.buildTree(path);

            // return self.list().then(function(data) {
            //     console.log(data)
            //     self.fileList = (data.result || []).map(function(file) {
            //         return new Item(file, self.currentPath);
            //     });
            //     self.buildTree(path);
            // });
        };

        FileNavigator.prototype.buildTree = function(path) {
            var self = this;
            var filesystemData = self.basedata;

            this.history = [];
            this.history.push({name: '', nodes: []})

            // 如果
            var recursive = function(parent, subdir, currentPath, level) {
                for (var i=0,len=subdir.length; i<len; i++) {
                    
                    var file = subdir[i];

                    // 目前仅在目录树中显示目录（不显示文件）
                    if (file.type!=="dir") continue;

                    var currentPathArr = (level===0) ? [""] : currentPath.slice(0, level)
                    var currentPathStr = currentPathArr.join('/')
                    var item = new Item(file, currentPathArr);
                    var absName = (currentPathStr ? (currentPathStr+'/') : "") + item.model.name;

                    parent.nodes.push({item: item, name: absName, nodes: []});

                    if (absName.trim() && path.trim().indexOf(absName) === 0) {
                        var nodesLen = parent.nodes.length;
                        recursive(parent.nodes[nodesLen-1], file.subdir, currentPath, level+1);
                    }

                    parent.nodes = parent.nodes.sort(function(a, b) {
                        return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : a.name.toLowerCase() === b.name.toLowerCase() ? 0 : 1;
                    });
                }
            };

            var currentPath = path.split('/');
            var level = 0;
            recursive(this.history[0], filesystemData, currentPath, level)
        }

        // 构建目录树
        // FileNavigator.prototype.buildTree = function(path) {
        //     var flatNodes = [], selectedNode = {};

        //     function recursive(parent, item, path) {
        //         var absName = path ? (path + '/' + item.model.name) : item.model.name;
        //         if (parent.name.trim() && path.trim().indexOf(parent.name) !== 0) {
        //             parent.nodes = [];
        //         }
        //         if (parent.name !== path) {
        //             for (var i in parent.nodes) {
        //                 recursive(parent.nodes[i], item, path);
        //             }
        //         } else {
        //             for (var e in parent.nodes) {
        //                 if (parent.nodes[e].name === absName) {
        //                     return;
        //                 }
        //             }
        //             parent.nodes.push({item: item, name: absName, nodes: []});
        //         }
        //         parent.nodes = parent.nodes.sort(function(a, b) {
        //             return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : a.name.toLowerCase() === b.name.toLowerCase() ? 0 : 1;
        //         });
        //     }

        //     function flatten(node, array) {
        //         array.push(node);
        //         for (var n in node.nodes) {
        //             flatten(node.nodes[n], array);
        //         }
        //     }

        //     function findNode(data, path) {
        //         return data.filter(function (n) {
        //             return n.name === path;
        //         })[0];
        //     }

        //     !this.history.length && this.history.push({name: '', nodes: []});
        //     // 暂时注释以下三行代码，目前看selectedNode没有用途
        //     // flatten(this.history[0], flatNodes);
        //     // selectedNode = findNode(flatNodes, path);
        //     // selectedNode.nodes = [];

        //     for (var o in this.fileList) {
        //         var item = this.fileList[o];
        //         item.isFolder() && recursive(this.history[0], item, path);
        //     }
        //     console.log(this.history)
        // };

        FileNavigator.prototype.folderClick = function(item) {
            this.currentPath = [];
            if (item && item.isFolder()) {
                this.currentPath = item.model.fullPath().split('/').splice(1);
            }
            this.refresh();
        };

        FileNavigator.prototype.upDir = function() {
            if (this.currentPath[0]) {
                this.currentPath = this.currentPath.slice(0, -1);
                this.refresh();
            }
        };

        FileNavigator.prototype.goTo = function(index) {
            this.currentPath = this.currentPath.slice(0, index + 1);
            this.refresh();
        };

        FileNavigator.prototype.fileNameExists = function(fileName, filePath) {
            // console.log(filePath!=undefined, fileName, filePath)
            if (filePath!=undefined) {
                var fp = filePath ? (filePath+'/'+fileName) : fileName;
                var res = this.getPathFileList(filePath+fileName);
                if (res.result!=null) return true;
                return false;
            }
            for (var item in this.fileList) {
                item = this.fileList[item];
                if (fileName.trim && item.model.name.trim() === fileName.trim()) {
                    return true;
                }
            }
        };

        FileNavigator.prototype.fileNameExistsInTarget = function(targetPath) {

        };

        FileNavigator.prototype.listHasFolders = function() {
            for (var item in this.fileList) {
                if (this.fileList[item].model.type === 'dir') {
                    return true;
                }
            }
        };

        return FileNavigator;
    }]);
})(angular);