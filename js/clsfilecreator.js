var sampleNamesList = [];
var selectedSamplesList = [];
var idIncrement = 0;

function parseQueryString() {
    var query = (window.location.search || '?').substr(1),
        map   = {};
    query.replace(/([^&=]+)=?([^&]*)(?:&+|$)/g, function(match, key, value) {
        (map[key] = map[key] || []).push(value);
    });
    return map;
}

function getFilename(file)
{
    var fileName = file;
    var index = fileName.lastIndexOf("/");

    if(index != -1)
    {
        return fileName.substring(index + 1);
    }

    return fileName;
}

function generateNewId()
{
    return ++idIncrement;
}

/*function parseFile(file, callback) {
    var fileSize   = file.size;
    var chunkSize  = 64 * 1024; // bytes
    var offset     = 0;
    var self       = this; // we need a reference to the current object
    var block      = null;

    var foo = function(evt) {
        if (evt.target.error == null) {
            offset += evt.target.result.length;

            callback(evt.target.result); // callback for handling read chunk
        } else {
            console.log("Read error: " + evt.target.error);
            return;
        }
        if (offset >= fileSize) {
            console.log("Done reading file");
            return;
        }

        block(offset, chunkSize, file);
    }

    block = function(_offset, length, _file) {
        var r = new FileReader();
        var blob = _file.slice(_offset, length + _offset);
        r.onload = foo;
        r.readAsText(blob);
    }

    block(offset, chunkSize, file);
}*/

function parseGCTFile(fileURL) {
    $.ajax({
        contentType: 'text/plain',
        url: fileURL
    }).done(function (text, status, xhr) {
        loadSamples(text);
    });
}

function loadSamples(fileContents)
{
    var lines = fileContents.split(/\n/);

    if(lines.length >= 4)
    {
        //The samples
        var sampleLines = lines[2];
        var samples = sampleLines.split(/\t/);
        samples.splice(0, 2);
        sampleNamesList = samples;

        listSamples(sampleNamesList);
    }
    else
    {
        alert("Error parsing file: " + fileContents);
    }
}

function listSamples(sampleNames)
{
    var controls = $("<div/>").attr("id", "sampleControls");
    controls.append($("<button>Check All</button>").attr("id", "checkAllSamples").click(function()
    {
        $("#sampleTable").find("input:checkbox").click();
    }));

    controls.append($("<button>Uncheck All</button>").attr("id", "uncheckAllSamples").click(function()
    {
        $("#sampleTable").find("input:checkbox").click();
    }));

    $("#step-1").append(controls);

    var table = $("<table/>").attr("id", "sampleTable");
    var tableRow = null;

    var numRows = (sampleNames.length / 4 >> 0); //num columns is  4
    for(var r=0;r<numRows;r++)
    {
        tableRow = $("<tr/>");
        table.append(tableRow);
        for(var c=0;c<4;c++)
        {
            var index= r + (c * numRows);

            if(index < sampleNames.length)
            {
                tableRow.append("<td>" + (index + 1) + ".</td>");

                var checkBox = $("<input type='checkbox'/>").click(function()
                {
                    var sampleIndex = $.inArray( $(this).data("sample"), selectedSamplesList);

                    if($(this).is(":checked"))
                    {
                        if(sampleIndex == -1)
                        {
                            selectedSamplesList.push($(this).data("sample"));
                        }
                    }
                    else
                    {
                        if(sampleIndex != -1)
                        {
                            selectedSamplesList.splice(sampleIndex, 1);
                        }
                    }
                });

                checkBox.data("sample", sampleNames[index]);
                checkBox.click();

                var tableData = $("<td/>");
                tableData.append(checkBox);
                tableData.append(sampleNames[index]);
                tableRow.append(tableData);
            }
        }

    }
    /*for(var i=0;i<sampleNames.length;i++)
    {
        if(i%4 == 0)
        {
            tableRow = $("<tr/>");
            table.append(tableRow);
        }

        tableRow.append("<td>" + i + ".</td>");

        var checkBox = $("<input type='checkbox'/>");
        var tableData = $("<td/>");
        tableData.append(checkBox);
        tableData.append(sampleNames[i]);
        tableRow.append(tableData);
    }*/

    var div = $("<div/>");
    div.append(table);
    $("#step-1").append(div);
}


function displayStep2()
{
    var samplesList = $("#samplesGrid");

    var sampleRecords =  [];
    for(var s=0;s<selectedSamplesList.length;s++)
    {
        sampleRecords.push({ recid: s, sample: selectedSamplesList[s]});
    }

    console.log("samples grid");

    //delete any existing samples grid
    if( w2ui['samplesGrid'] !== undefined )
    {
        w2ui['samplesGrid'].destroy();
    }

    $('#samplesGrid').w2grid({
        name   : 'samplesGrid',
        header: 'List of Samples',
        show: {
            toolbar: true,
            footer: true,
            header: true
        },
        columns: [
            { field: 'recid', caption: 'Index'}, {field: 'sample', caption: 'Sample Name', size: '100%' }
        ],
        sortData: [{ field: 'recid', direction: 'ASC' }, { field: 'sample', direction: 'ASC' }],
        records: sampleRecords
     });

    w2ui['samplesGrid'].hideColumn('recid');


    $("#classInputAdd").click(function()
    {
        var newOption = $("<option/>");
        var value = $("#classInput").val();

        if(value !== undefined && value !== null && value.length > 0)
        {
            newOption.val(value);
            newOption.text(value);
            $("#classSelection").append(newOption);
            $("#classSelection").val(value);
        }
    });

    $("#assignClass").click(function()
    {
        //check if this class is already defined
        var className = $("#classSelection").val();
        var classNodeArray = w2ui['classAssignments'].find({ text: className });
        var classId= null;

        if(!classNodeArray || classNodeArray.length == 0)
        {
            classId = generateNewId();
            classId = classId.toString();
            w2ui['classAssignments'].add({ id: classId, text: className, expanded: true, group: true});
        }
        else
        {
            //get class Id from node
            classId = classNodeArray[0].id;
            classId = classId.toString();
        }

        var selectedSamples = w2ui['samplesGrid'].getSelection();

        //update the total sample count for class
        //w2ui['classAssignments'].set(classId, { text: className + "(" + selectedSamples.length + ")"});
        //w2ui['classAssignments'].set(classId, { count: selectedSamples.length.toString() });


        for(var r=0;r<selectedSamples.length;r++)
        {
            var sampleName = w2ui['samplesGrid'].get(selectedSamples[r]).sample;
            w2ui['classAssignments'].add(classId , [{id: generateNewId().toString(), text: sampleName}]);

            //delete the record from the grid
            w2ui['samplesGrid'].remove(selectedSamples[r]);
        }

    });

    //display the tentative class assignments list
    $('#classAssignments').w2sidebar({
        name: 'classAssignments',
        topHTML: '<div class="header">Class Assignments</div>'
    });

    w2ui['classAssignments'].on('dblClick', function(event) {
        var node = event.object;
        //remove the sample from the class
       w2ui['classAssignments'].remove(node.id);

       //update the total number of samples in node
        var parent = node.parent;
        if(parent)
        {
            w2ui['classAssignments'].set(parent.id, { count:  parent.nodes.length.toString() });
        }

       console.log(event);
       //w2ui['samplesGrid'].add({ recid: node.id, sample: node.val });
    });
}

$(function()
{
    $("#creator").smartWizard({
        labelFinish: "Save",
        //enableFinishButton: true,
        onLeaveStep : function(obj, context)
        {
            if(context.fromStep == 1)
            {
                if (selectedSamplesList.length == 0)
                {
                    $("#creator").smartWizard("showError", 1);
                    $("#creator").smartWizard('showMessage', 'Please select some samples!');
                    return false;
                }
            }


            return true;
        },
        onShowStep : function(obj, context)
        {
            if(context.toStep == 2)
            {
                displayStep2();
            }
        }
    });

    var requestParams = parseQueryString();

    var inputFiles = requestParams["input.file"];
    if(inputFiles == null)
    {
        alert("No input files found");
    }
    else
    {
        for (var t = 0; t < inputFiles.length; t++)
        {
            console.log("input file: " + inputFiles[t]);
            parseGCTFile(inputFiles[t]);
        }
    }

});