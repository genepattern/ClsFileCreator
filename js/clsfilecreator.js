var sampleNamesList = [];
var selectedSamplesList = [];
var idIncrement = 0;
var jobResultNumber = -1;
var classNamesList = [];


if (typeof gp === 'undefined') {
    gp = {};
}
gp.Util = function() {};

gp.Util.endsWith = function(string, suffix) {
    return string.length >= suffix.length
        && string.substr(string.length - suffix.length) === suffix;
};


function parseQueryString() {
    console.log("clsfilecreator url: " + window.location);
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
    var sampleRecords =  [];
    for(var s=0;s<selectedSamplesList.length;s++)
    {
        sampleRecords.push({ recid: s, sample: selectedSamplesList[s]});
    }

    console.log("samples grid");

    //delete any existing samples grid
    if( w2ui['sampleAndClassGrid'] !== undefined || w2ui['sampleAndClassGrid'] !== undefined)
    {
        //w2ui['sampleAndClassGrid'].destroy();
        return;
    }

    var btn = w2obj.grid.prototype.buttons;
    delete btn['reload'];
    delete btn['columns'];

    $('#sampleAndClassGrid').w2grid({
        name   : 'sampleAndClassGrid',
        header: 'Sample & Class Assignment',
        show: {
            selectColumn: true,
            toolbar: true,
            footer: true,
            header: true,
            lineNumbers: true
        },
        multiSearch: true,
        searches: [
            { field: 'sample', caption: 'Sample Name', type: 'text' },
            { field: 'class', caption: 'Class', type: 'text' }
        ],
        columns: [
            { field: 'recid', caption: 'Index', size: '1%'},
            {field: 'sample', caption: 'Sample Name', size: '45%' },
            {field: 'class', caption: 'Class', size: '45%'}
        ],
        sortData: [{ field: 'recid', direction: 'ASC' },
            { field: 'sample', direction: 'ASC' },
            { field: 'class', direction: 'ASC' }],
        records: sampleRecords
    });

    w2ui['sampleAndClassGrid'].hideColumn('recid');

    $('#classesGrid').w2grid({
        name   : 'classesGrid',
        show: {
            footer: true,
            selectColumn: true,
            lineNumbers    : true
        },
        multiSelect : true,
        columns: [
            { field: 'recid', caption: 'Index'},
            {field: 'class', caption: 'Class', size: '100%', editable: false }
        ],
        sortData: [{ field: 'recid', direction: 'ASC' },
            { field: 'class', direction: 'ASC' }]
    });

    $("#assignClassBtn").click(function()
    {
        var selectedClass = w2ui['classesGrid'].getSelection();

        //should only be one class selected
        if(selectedClass.length == 0)
        {
            w2popup.open({
                title: 'Class Assignment',
                body: '<div class="w2ui-centered">Please select a class!</div>'
            });

            return;
        }

        if(selectedClass.length > 1)
        {
            w2popup.open({
                title: 'Class Assignment',
                body: '<div class="w2ui-centered">Only one class can be selected!</div>'
            });

            return;
        }

        for(var r=0;r<selectedClass.length;r++)
        {
            var className = w2ui['classesGrid'].get(selectedClass[r]).class;

            //add the class to the list if it is not already there
            if($.inArray(className, classNamesList) == -1)
            {
                classNamesList.push(className);
            }

            var selectedSamples = w2ui['sampleAndClassGrid'].getSelection();

            for(var s=0;s<selectedSamples.length;s++)
            {
                w2ui['sampleAndClassGrid'].set(selectedSamples[s], {class: className});
            }
        }

        w2ui['sampleAndClassGrid'].selectNone();
        w2ui['classesGrid'].selectNone();
    });

    $('#classToolbar').w2toolbar({
        name: 'classToolbar',
        items: [
            { type: 'html',  id: 'classInput',
                html: '<div style="padding: 3px 10px;">'+
                    //' Class:'+
                    '    <input id= "classInput" style="padding: 3px; border-radius: 2px; border: 1px solid silver"/>'+
                    '</div>'
            },
            { type: 'button', id: 'add', caption: 'Add', icon: 'w2ui-icon-plus' },
            { type: 'break',  id: 'break1' },
            { type: 'button', id: 'delete', caption: 'Delete', icon: 'w2ui-icon-cross' }//,
        ],
        onClick: function (event) {
            switch (event.target) {
                case 'add':
                    var className = $("#classInput").val();
                    if(className && className.length > 0)
                    {
                        //only add this class if it does not already exist
                        if(w2ui['classesGrid'].find({ class:  className }) == 0)
                        {
                            w2ui['classesGrid'].add({ recid: generateNewId(),  class: className});
                        }
                        else
                        {
                            w2popup.open({
                                title: 'Add Class',
                                body: '<div class="w2ui-centered"> The class ' +
                                    className + ' already exists. </div>',
                                width: '250',
                                height: '120',
                                modal: false
                            });
                        }
                    }
                    $("#classInput").val("");
                    break;
                case 'delete':
                    var selectedClasses = w2ui['classesGrid'].getSelection();

                    for(var c=0;c<selectedClasses.length;c++)
                    {
                        w2ui['classesGrid'].remove(selectedClasses[c]) ;

                        //remove the class from the list of assign classes
                        delete classNamesList[classNamesList.indexOf(selectedClasses[c]).class];

                        var assignSamples = w2ui['sampleAndClassGrid'].find(
                            { class:  w2ui['sampleAndClassGrid'].get(selectedClasses[c]).class });
                        for(var a=0;a<assignSamples.length;a++)
                        {
                            w2ui['sampleAndClassGrid'].set(assignSamples[a], {class: ''});
                        }
                    }

                    break;
            }
        }
    });
}

function classAssignmentsSummary()
{
    $('#classAssignmentSummary').w2sidebar({
        name: 'classAssignmentSummary',
        style: 'background-color: transparent !important;'//,
    });

    var classRecords =  w2ui['classesGrid'].records;
    for(var r=0;r<classRecords.length;r++)
    {
        var className = classRecords[r].class;

        var samplesList = "";//[];
        var assignSamples = w2ui['sampleAndClassGrid'].find(
            { class:  className });

        w2ui['classAssignmentSummary'].add({ id: r.toString(), text: "Class: " + className + " ("+ assignSamples.length +")", expanded: true, group: true});

        for(var a=0;a<assignSamples.length;a++)
        {
            if(a != 0)
            {
                samplesList += ", ";
            }
            samplesList += w2ui['sampleAndClassGrid'].get(assignSamples[a]).sample;
        }

        if(samplesList.length > 0)
        {
            w2ui['classAssignmentSummary'].add(r.toString(), [{ id: r.toString() + "-" + a.toString(),
                    text:  samplesList}]);

            //w2ui['classAssignmentSummary'].disable(r.toString() + "-" + a.toString());
        }
    }
}

function createCls()
{
    var text = selectedSamplesList.length + " " + classNamesList.length + " 1" + "\n";
    text += "#";

    for(var c=0;c<classNamesList.length; c++)
    {
        text += " " + classNamesList[c];
    }
    text += "\n";

    var sampleRecords = w2ui['sampleAndClassGrid'].records;
    for(var s=0;s<sampleRecords.length;s++)
    {
        var className = sampleRecords[s].class;
        var index = classNamesList.indexOf(className);
        if(index < 0)
        {
            w2popup.open({
                title: 'Create CLS File',
                body: '<div class="w2ui-centered">An error occurred while creating CLS file. ' +
                    'The class '+ className + ' was not found. </div>'
            });

            return;
        }

        if(s !== 0)
        {
            text += " ";
        }
        text += index;
    }
    return text;
}

function downloadFile(fileName, contents)
{
    var blob = new Blob([ contents ], {
        type : "text/plain;charset=utf-8"
    });
    if (!gp.Util.endsWith(fileName.toLowerCase(), '.cls')) {
        fileName += '.cls';
    }
    saveAs(blob, fileName);
}

$(function()
{
    $("#creator").smartWizard({
        labelFinish: "Save",
        onLeaveStep : function(obj, context)
        {
            if(context.fromStep == 1)
            {
                if (selectedSamplesList.length == 0)
                {
                    $("#creator").smartWizard("showError", 1);
                    $("#creator").smartWizard('showMessage', 'Error: Please select some samples!');
                    return false;
                }
            }

            if(context.fromStep == 2)
            {
                //check if any samples do not have a class assignment
                var records = w2ui['sampleAndClassGrid'].records;

                var unClassifiedSamples = [];
                for(var r=0;r<records.length;r++) {
                    if (!records[r].class || records[r].class.length == 0) {
                        unClassifiedSamples.push(records[r].sample);
                        w2ui['sampleAndClassGrid'].select(records[r].recid);
                    }
                }

                if(unClassifiedSamples.length > 0)
                {
                    $("#creator").smartWizard("showError", 2);
                    $("#creator").smartWizard('showMessage', 'Error: There are ' + unClassifiedSamples.length + " samples with no class.");
                    return false;
                }
            }

            $("#creator").smartWizard("hideError");
            $("#creator").smartWizard("hideMessage");
            return true;
        },
        onFinish: function(obj, context)
        {
            //save the cls file to the job result

            var clsFileName = $("#clsFileName").val();

            var text = "this is a test cls";
            text = createCls();
            console.log(text);

            downloadFile(clsFileName, text);

            $("#creator").smartWizard('showMessage', 'File saved to job result ' + jobResultNumber);

            return true;

        },
        onShowStep : function(obj, context)
        {
            if(context.toStep == 2)
            {
                displayStep2();
            }
            if(context.toStep == 3)
            {
                classAssignmentsSummary();
            }
        }
    });

    var requestParams = parseQueryString();

    jobResultNumber = requestParams["job.number"];

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