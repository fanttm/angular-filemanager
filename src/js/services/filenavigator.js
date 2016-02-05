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
                            return { "result" : item.subdir }
                        } else {
                            return getPathFileListRecursive(item.subdir, currentPath, level+1)
                        }
                    }
                    if (i==(len-1) && !currentLevelMatch) return { "result" : null }
                }
            };

            var currentPath = path.split('/');
            // console.log(currentPath)
            var level = 0;
            return getPathFileListRecursive(filesystemData, currentPath, level)
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
            var deferred = $q.defer();
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
            // console.log(self.currentPath, path)
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
            var flatNodes = [], selectedNode = {};

            function recursive(parent, item, path) {
                var absName = path ? (path + '/' + item.model.name) : item.model.name;
                if (parent.name.trim() && path.trim().indexOf(parent.name) !== 0) {
                    parent.nodes = [];
                }
                if (parent.name !== path) {
                    for (var i in parent.nodes) {
                        recursive(parent.nodes[i], item, path);
                    }
                } else {
                    for (var e in parent.nodes) {
                        if (parent.nodes[e].name === absName) {
                            return;
                        }
                    }
                    parent.nodes.push({item: item, name: absName, nodes: []});
                }
                parent.nodes = parent.nodes.sort(function(a, b) {
                    return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : a.name.toLowerCase() === b.name.toLowerCase() ? 0 : 1;
                });
            }

            function flatten(node, array) {
                array.push(node);
                for (var n in node.nodes) {
                    flatten(node.nodes[n], array);
                }
            }

            function findNode(data, path) {
                return data.filter(function (n) {
                    return n.name === path;
                })[0];
            }

            !this.history.length && this.history.push({name: '', nodes: []});
            flatten(this.history[0], flatNodes);
            selectedNode = findNode(flatNodes, path);
            selectedNode.nodes = [];

            for (var o in this.fileList) {
                var item = this.fileList[o];
                item.isFolder() && recursive(this.history[0], item, path);
            }
        };

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

        FileNavigator.prototype.fileNameExists = function(fileName) {
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