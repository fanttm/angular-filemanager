(function(angular) {
    'use strict';
    angular.module('FileManagerApp').service('fileNavigator', [
        '$http', '$q', 'fileManagerConfig', 'item', function ($http, $q, fileManagerConfig, Item) {

        $http.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

        // MYCOMMENT
        var FileNavigator = function() {
            this.basedata = fileManagerConfig.filesystemData;
            this.requesting = false;
            this.fileList = [];                 // 当前路径下的文件（夹）列表
            this.currentPath = [];              // 当前路径数组，例如 ["joomla01", "java02"]
            this.history = [];                  // 原来是存放文件（夹）访问历史记录，目前用于存放当前在左侧边栏显示的目录树JSON数据
            this.error = '';
        };

        // MYCOMMENT
        // 根据操作指令（如addfile、rename）更新本地目录文件树的数据，并将其保存到服务器端
        // 目前支持以下五种数据更新指令：新增文件夹、新增文件、重命名、移动、删除
        FileNavigator.prototype.setFileSystemData = function(params) {
            var filesystemData = this.basedata;
            var that = this;

            var now = moment().format('YYYY-MM-DD HH:mm:ss');

            var myAddFolder = function(destPath, folderName) {
                var res = that.getPathFileList(destPath);
                var subdir = res.result;
                // console.log(destPath, res.itself, res.result)
                subdir.push({
                    "id": null,
                    "name": folderName,
                    "createtime": now,
                    "updatetime": now,
                    "type": "dir",
                    "subdir": []
                });
            }

            var myAddFile = function(destPath, fileName, fileId) {
                var res = that.getPathFileList(destPath);
                var subdir = res.result;

                subdir.push({
                    "id": fileId,
                    "name": fileName,
                    "createtime": now,
                    "updatetime": now,
                    "type": "file"
                });
            }

            var myRename = function(destPath, newName) {
                var res = that.getPathFileList(destPath);
                var item = res.itself;
                item.name = newName;
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

            var myDelete = function(path, name) {
                var pathname = path ? (path+'/'+name) : name;
                that.deleteFile(pathname);
            }

            switch (params.mode) {
                case 'addfolder':
                    myAddFolder(params.path, params.name);
                    break;
                case 'addfile':
                    myAddFile(params.path, params.name, params.id);
                    break;
                case 'rename':
                    myRename(params.path, params.newName);
                    break;
                case 'move':
                    myMove(params.name, params.path, params.newPath);
                    break;
                case 'remove':
                    myDelete(params.path, params.name);
                    break;
                default:
                    break;
            }
            
            // COMMENT_OFFLINE
            that.saveToServer(filesystemData);
        };

        FileNavigator.prototype.saveToServer = function(fileSD) {
            $http.post(fileManagerConfig.saveUrl, fileSD).success(function(data) {
                
            }).error(function(data) {
                
            })['finally'](function() {
                
            });
        };

        // MYCOMMENT
        // 根据输入的path，获取自身和其subdir的JSON数据，path是string格式，例如“joomla01/javascript/browser”
        // 注意：此处的path，一定是指路径（即文件夹），否则就是程序错误
        FileNavigator.prototype.getPathFileList = function(pathStr) {
            var filesystemData = this.basedata;

            if (!pathStr) return { "result": filesystemData }

            /*
                subdir是存放目录或文件的数组
                currentPath是存放路径的数组，将路径字符串分割而成的数组，如 joomla/java，分割成 ['joomla', 'java']
                level表示当前对比的currentPath的深度，如果当前深度未能找到匹配项，则返回错误；如果已经找到匹配项，并且已经达到currentPath的最大深度，则返回匹配项的subdir数组内容
             */
            /*
                递归代码逻辑：
                1、逐级在subdir列表中中查找是否有存在currentPath[level]的subdir[i]，如果当前级别（level）没有找到匹配项，则表示未能找到
                2、如果找到对应的subdir[i]，则在其subdir列表中继续查找是否有存在currentPath[level+1]的数据
                3、直到currentPath数组最后一个元素也匹配完成，则表示找到
             */
            var getPathFileListRecursive = function(subdir, currentPath, level) {
                for (var i=0,len=subdir.length; i<len; i++) {
                    var item = subdir[i];
                    var currentLevelMatch = false;
                    if (currentPath[level]==item.name) {
                        // 表示当前层级匹配成功
                        currentLevelMatch = true;
                        // 判断currentPath是否已经匹配到最后一个元素
                        if (currentPath.length==(level+1)) {
                            return { "result" : item.subdir, "itself": item }
                        } else {
                            return getPathFileListRecursive(item.subdir, currentPath, level+1)
                        }
                    }
                    // 判断当前层级，是否匹配成功
                    if (i==(len-1) && !currentLevelMatch) return { "result" : null }
                }
            };

            var currentPath = pathStr.split('/');
            var level = 0;
            return getPathFileListRecursive(filesystemData, currentPath, level)
        };

        // MYCOMMENT
        // 根据输入的path，删除该path指向的文件（夹），path是string格式，例如“joomla01/javascript/browser”
        // 注意：此处的path，可能是文件夹，也可能是文件
        FileNavigator.prototype.deleteFile = function(pathStr) {
            var filesystemData = this.basedata;

            if (!pathStr) return null;

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

            var currentPath = pathStr.split('/');
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

        // MYCOMMENT
        // 根据输入的path参数（例如：magento/python，这里的path，基本确定就是文件夹，不可能出现文件）
        // 构建左侧边栏目录树的JSON数据结构
        FileNavigator.prototype.buildTree = function(path) {
            var self = this;
            var filesystemData = self.basedata;

            this.history = [];
            this.history.push({name: '', nodes: []})
            
            /*
                代码逻辑说明：
                1、左侧边栏目录树，仅展示当前路径相关的目录层级结构（不包含文件）
                2、
             */
            // parent，用于保存当前路径的目录树JSON数据
            // subdir，整个目录树JSON数据
            // currentPath，当前文件路径
            // level，当前currentPath的层级深度
            var recursive = function(parent, subdir, currentPath, level) {
                for (var i=0,len=subdir.length; i<len; i++) {
                    
                    var file = subdir[i];

                    // 目前仅在目录树中显示目录（不显示文件）
                    if (file.type!=="dir") continue;

                    var currentPathArr = (level===0) ? [""] : currentPath.slice(0, level)
                    var currentPathStr = currentPathArr.join('/')
                    var item = new Item(file, currentPathArr);
                    // 注意：absName格式并非linux系统中绝对路径，而是“joomla01/javascript/browser
                    var absName = (currentPathStr ? (currentPathStr+'/') : "") + item.model.name;

                    // 将当前level下的指定subdir的所有节点，都放入parent中
                    parent.nodes.push({item: item, name: absName, nodes: []});

                    // 判断absName是否是path的子集，即是否属于当前路径的打开路径中
                    if (absName.trim() && path.trim().indexOf(absName) === 0) {
                        var nodesLen = parent.nodes.length;
                        recursive(parent.nodes[nodesLen-1], file.subdir, currentPath, level+1);
                    }
                    // 如果absName不是path的子集，则无需进入下一层级收集subdir节点

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

        // MYCOMMENT
        // 增加filePath参数，用于在移动文件（夹）时，判断是否重名
        FileNavigator.prototype.fileNameExists = function(fileName, filePath) {
            if (filePath != undefined) {
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