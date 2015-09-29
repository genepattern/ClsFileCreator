var gpAuthorizationHeaders = {};

$(function()
{
    //setup the global Authorization token
    var token = window.location.hash;
    if(token !== undefined && token !== null && token.length > 0)
    {
        gpAuthorizationHeaders = {"Authorization": "Bearer " + token};
        $.ajaxSetup({
            headers: gpAuthorizationHeaders
        });
    }
});

var gpLib = function()
{
    /**
     * Retrieves the contents of a file from a URL
     * @param fileURL
     * @param callBack
     */
    function getDataAtUrl(fileURL, options)
    {
        //if the URL is an ftp url then fail
        if(fileURL.indexOf("ftp://") ===0)
        {
            var errorMsg = "FTP files are not supported.";
            if($.isFunction(options.failCallBack)) {
                options.failCallBack(errorMsg);
            }
            throw new Error(errorMsg);
        }

        var credentials = false;
        if(fileURL.indexOf("https://") === 0)
        {
            credentials = true;
        }

        if(options == undefined)
        {
            options = {
                headers: {}
            };
        }

        $.extend(options.headers, gpAuthorizationHeaders);

        $.ajax({
            contentType: null,
            url: fileURL,
            headers: options.headers,
            xhrFields: {
                withCredentials: credentials
            },
            crossDomain: true
        }).done(function (response, status, xhr) {
            if($.isFunction(options.successCallBack))
            {
                options.successCallBack(response);
            }
        }).fail(function (response, status, xhr)
        {
            console.log(response.statusText);
            if($.isFunction(options.failCallBack))
            {
                options.failCallBack(response.statusText, response);
            }
        });
    }

    /**
     * Uploads a file to the GP Files Tab
     * @param url - the url of the file on the GP server
     * @param data - the contents of the file
     * @param callBack - a callback function if the upload was successful
     */
    function uploadDataToFilesTab(url, data, callBack) {
        var uploadData = new Blob(data, {type: 'text/plain'});

        $.ajax({
            type: "POST",
            processData: false,
            contentType: false,
            data: uploadData,
            url: "/gp/rest/v1/upload/whole/?path=" + encodeURIComponent(url),
            success: function () {
                console.log("upload complete");

                if (callBack !== undefined) {
                    callBack("success");
                }
            },
            error: function (data, textStatus)
            {
                var errorMessage = textStatus;

                if(data != null && data != undefined
                    && data.responseText != undefined && data.responseText != null)
                {
                    errorMessage = data.responseText;
                }
                console.log("Error: " + errorMessage);
                callBack("Error: " + errorMessage);
            }
        });
    }

    /**
     * This function displays a dialog displaying the directories in the Files Tab for the current GP user
     * @param callBack - a callback function if a directory in the Files Tab was selected
     */
    function saveToGPDialog(callBack) {
        //create dialog
        w2popup.open({
            title: 'Select Directory from Files Tab',
            width: 600,
            height: 320,
            showMax: true,
            modal: true,
            body: '<div id="gpDialog"><div id="fileTree" style="height: 300px;"/></div>',
            buttons: '<button class="btn" onclick="w2popup.close();">Cancel</button> <button class="btn" onclick="w2popup.close();">OK</button>',
            onOpen: function (event) {
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

    // declare 'public' functions
    return {
        saveToGPDialog: saveToGPDialog,
        uploadDataToFilesTab: uploadDataToFilesTab,
        getDataAtUrl: getDataAtUrl
    };
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