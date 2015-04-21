function uploadData(url, data,  callBack)
{
    var uploadData = new Blob(data, {type: 'text/plain'});

    $.ajax({
        type: "POST",
        processData: false,
        contentType: false,
        data: uploadData,
        url: "/gp/rest/v1/upload/whole/?path=" + encodeURIComponent(url),
        success: function() {
            console.log("upload complete");
            callBack("success");
        },
        error: function(data, textStatus) {
            console.log("Error: " + textStatus);
            callBack("Error: " + textStatus)
        }
    });
}

function uploadToFilesTab(url, data, successFunction)
{
    var uploadData = new Uint8Array(data);

    //data can be chunked but not doing this
    //only one chunk will be sent
    /*var totalChunks = 1;
    var nextChunk =0;
    var dataSize = uploadData.byteLength;
    createUploadPath(url, data, totalChunks, dataSize, successFunction);
    */
}

function addSubDirs(url)
{
    var servletUrl = "/gp/UploadFileTree/saveTree?dir="+url;

    $.ajax({
        url: servletUrl,
        type: "GET",
        dataType: "json",
        success: function(data) {
            // Populate the parameter with the child files
            console.log(data);

            $.each(data, function(index, file) {
                var isFile = !file.data.attr["data-directory"];
                if (!isFile) {
                    console.log("directory: " + file);
                }
            });
        },
        error: function() {
            console.log("Unable to expand directory.");
        }
    });
}

function saveToGPDialog(callBack)
{
    //create dialog
    w2popup.open({
        title   : 'Select Directory from Files Tab',
        width   : 600,
        height  : 320,
        showMax : true,
        modal: true,
        body    : '<div id="gpDialog"><div id="fileTree" style="height: 300px;"/></div>',
        buttons  : '<button class="btn" onclick="w2popup.close();">Cancel</button> <button class="btn" onclick="w2popup.close();">OK</button>',
        onOpen  : function (event) {
            event.onComplete = function () {
                $("#fileTree").gpUploadsTree(
                {
                    name: "Uploads_Tab_Tree"
                });
            };
        },
        onClose: function (event) {
            var selectGpDir = $("#fileTree").gpUploadsTree("selectedDir");
            event.onComplete = function () {
                $("#fileTree").gpUploadsTree("destroy");
                callBack(selectGpDir);
            }
        }
    });
}

(function( $ ) {
    $.widget("ui.gpUploadsTree", {
        directory: null,
        options: {
            name: "",
            onSuccess: null,
            nodes: []
        },
        topLevelNodeCounter: 0,
        _create: function() {

            var self = this,
                opt = self.options,
                el = self.element;

            this._createTree();
        },
        _setOption: function (key, value) {},
        _getSubDirs: function(dirUrl, parentId)
        {
            var self = this;

            var servletUrl = "/gp/UploadFileTree/saveTree";
            if(dirUrl != null)
            {
                servletUrl +="?dir=" + encodeURIComponent(dirUrl);
            }

            $.ajax({
                url: servletUrl,
                type: "GET",
                dataType: "json",
                success: function(data) {
                    // Populate the parameter with the sub directories
                    console.log(data);

                    $.each(data, function(index, file)
                    {
                        var isDir = (file.data.attr !== undefined && file.data.attr["data-kind"] == "directory");
                        if (isDir) {
                            //add this directory to the tree
                            var dirName = file.data.attr["name"];
                            var nodeId = null;
                            if (parentId == null) {
                                nodeId = self.topLevelNodeCounter++;

                                if (w2ui[self.options.name].get(nodeId) == null)
                                {
                                    w2ui[self.options.name].add([
                                        { id: nodeId.toString(), text: dirName, icon: 'icon-folder', url: file.data.attr["href"]}
                                    ]);

                                    self._getSubDirs(file.data.attr["href"], nodeId.toString());
                                }
                            }
                            else
                            {
                                nodeId = parentId + "-" + index.toString();
                                if(w2ui[self.options.name].get(nodeId) == null)
                                {
                                    w2ui[self.options.name].insert(parentId, null, [
                                        { id: nodeId, text: dirName, img: 'icon-folder', url: file.data.attr["href"]}
                                    ]);
                                }
                            }
                        }
                    });
                },
                error: function() {
                    console.log("Unable to expand directory.");
                }
            });
        },
        _createTree: function()
        {
            var self = this;

            $(this.element).w2sidebar({
                name: self.options.name,
                nodes: [
                    { id: 'top-level', text: 'Files Tab', expanded: true, group: true,
                        nodes: self.options.nodes
                    }
                ],
                onClick: function(event) {
                    //show sub directories
                    var nodeId = event.target;
                    var dirUrl = w2ui[this.name].get(nodeId).url;
                    self._getSubDirs(dirUrl, nodeId);
                    self.directory = {
                        name: w2ui[this.name].get(nodeId).text,
                        url : dirUrl
                    };
                },
                onExpand: function(event) {
                    console.log(event);
                    //get contents of visible directories
                    var parentNode = event.object;
                    var nodes = parentNode.nodes;
                    if(nodes !== undefined && nodes.length > 0)
                    {
                        for(var i=0;i<nodes.length;i++)
                        {
                            self._getSubDirs(nodes[i].url, nodes[i].id);
                        }
                    }
                }
            });

            self._getSubDirs();
        },
        destroy: function() {
            w2ui[this.options.name].destroy();
        },
        selectedDir: function()
        {
            return this.directory;
        }
    });
}( jQuery ));