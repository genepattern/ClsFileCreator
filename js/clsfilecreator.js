var sampleNamesList = [];
var selectedSamplesList = [];
var idIncrement = 0;
var jobResultNumber = -1;
var classNamesList = [];
var selectedGpDir = null;


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

    if(lines.length >= 4 && lines[0].indexOf("#1.2") != -1)
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
        $("#creator").smartWizard("showError", 1);
        $("#creator").smartWizard('showMessage', "Error parsing file. Please check that it is a valid GCT file.");

        console.log("Error parsing file. Please check that it is a valid GCT file.");
    }
}

function listSamples(sampleNames)
{
    var controls = $("<div/>").attr("id", "sampleControls");
    controls.append($("<button class='btn'>Check All</button>").attr("id", "checkAllSamples").click(function()
    {
        $("#sampleTable").find("input:checkbox").click();
    }));

    controls.append($("<button class='btn'>Uncheck All</button>").attr("id", "uncheckAllSamples").click(function()
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

    var div = $("<div/>");
    div.append(table);
    $("#step-1").append(div);
}


function defineClasses()
{
    var sampleRecords =  [];
    for(var s=0;s<selectedSamplesList.length;s++)
    {
        sampleRecords.push({ recid: s, sample: selectedSamplesList[s]});
    }

    if( w2ui['classesGrid'] !== undefined)
    {
        w2ui['classesGrid'].destroy();
    }

    var btn = w2obj.grid.prototype.buttons;
    delete btn['reload'];
    delete btn['columns'];

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

    if( w2ui['classToolbar'] == undefined) {
        $('#classToolbar').w2toolbar({
            name: 'classToolbar',
            items: [
                { type: 'html', id: 'classInput',
                    html: '<div style="padding: 3px 10px;">' +
                        '    <input id= "classInput" style="padding: 3px; border-radius: 2px; border: 1px solid silver" placeholder="Enter class name"/>' +
                        '</div>'
                },
                { type: 'button', id: 'add', caption: 'Add Class', icon: 'w2ui-icon-plus' },
                { type: 'break', id: 'break1' },
                { type: 'button', id: 'delete', caption: 'Delete Class', icon: 'w2ui-icon-cross' }//,
            ],
            onClick: function (event) {
                switch (event.target) {
                    case 'add':
                        var className = $("#classInput").val();
                        if (className && className.length > 0) {
                            //only add this class if it does not already exist
                            if (w2ui['classesGrid'].find({ class: className }) == 0) {
                                w2ui['classesGrid'].add({ recid: generateNewId(), class: className});
                            }
                            else {
                                w2popup.open({
                                    title: 'Add Class',
                                    body: '<div class="w2ui-centered"> The class ' +
                                        className + ' already exists. </div>',
                                    width: '250',
                                    height: '120',
                                    modal: false
                                });
                            }
                            classNamesList.push(className);
                        }

                        $("#classInput").val("");
                        break;
                    case 'delete':
                        var selectedClasses = w2ui['classesGrid'].getSelection();

                        for (var c = 0; c < selectedClasses.length; c++) {
                            w2ui['classesGrid'].remove(selectedClasses[c]);

                            //remove the class from the list of assign classes
                            //delete classNamesList[classNamesList.indexOf(selectedClasses[c]).class];
                            var classNameIndex = classNamesList.indexOf(selectedClasses[c]).class;
                            classNamesList.slice(classNameIndex, 1);

                            var assignSamples = w2ui['sampleAndClassGrid'].find(
                                { class: w2ui['sampleAndClassGrid'].get(selectedClasses[c]).class });
                            for (var a = 0; a < assignSamples.length; a++) {
                                w2ui['sampleAndClassGrid'].set(assignSamples[a], {class: ''});
                            }

                           // var classNameIndex = classNamesList.slice(classNameIndex, 1);
                        }

                        break;
                }
            }
        });
    }
}

function assignSamplesToClasses()
{
    var sampleRecords =  [];
    for(var s=0;s<selectedSamplesList.length;s++)
    {
        sampleRecords.push({ recid: s, sample: selectedSamplesList[s]});
    }

    console.log("sample and class grid");

    //delete any existing samples grid
    if( w2ui['sampleAndClassGrid'] !== undefined)
    {
        w2ui['sampleAndClassGrid'].destroy();
        w2ui['sampleGrid'].destroy();
    }

    var btn = w2obj.grid.prototype.buttons;
    delete btn['reload'];
    delete btn['columns'];

    $('#sampleGrid').w2grid({
        name   : 'sampleGrid',
        header: 'Samples',
        show: {
            selectColumn: true,
            toolbar: true,
            footer: true,
            header: true,
            lineNumbers: true
        },
        multiSearch: true,
        searches: [
            { field: 'sample', caption: 'Sample Name', type: 'text' }
        ],
        columns: [
            { field: 'recid', caption: 'Index'},
            {field: 'sample', caption: 'Sample Name', size: '90%' }
        ],
        sortData: [{ field: 'recid', direction: 'ASC' },
            { field: 'sample', direction: 'ASC' }],
        records: sampleRecords
    });

    $('#sampleAndClassGrid').w2grid({
        name   : 'sampleAndClassGrid',
        show: {
            selectColumn: true,
            toolbar: true,
            footer: true,
            lineNumbers: true//,
        },
        multiSearch: false,
        searches: [
            { field: 'sample', caption: 'Sample Name', type: 'text' },
            { field: 'class', caption: 'Class', type: 'text' }
        ],
        columns: [
            { field: 'recid', caption: 'Index'},//, size: '1%'},
            {field: 'sample', caption: 'Sample Name'}, //, size: '45%' },
            { field: 'class', caption: 'Class', type: 'text' }
        ],
        sortData: [{ field: 'recid', direction: 'ASC' },
            { field: 'sample', direction: 'ASC' },
            { field: 'class', direction: 'ASC' }]
    });

    w2ui['sampleAndClassGrid'].hideColumn('recid');
    //w2ui['sampleAndClassGrid'].hideColumn('class');

    $('#selectedClass').w2field('list', { items: classNamesList });
    $('#selectedClass').change(function()
    {
        //show only samples with this class
        //w2ui['sampleAndClassGrid'].showSearch('class');
        w2ui['sampleAndClassGrid'].search("class", $(this).val());
    });

    //select the first class in the list
    $("#selectedClass").val(classNamesList[0]);
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
        keyNavigation: false,
        labelFinish: "Save",
        onLeaveStep : function(obj, context)
        {
            if(context.fromStep == 1)
            {
                if (selectedSamplesList.length == 0)
                {
                    $("#creator").smartWizard("showError", 1);
                    $("#creator").smartWizard('showMessage', 'Error: No samples selected!');
                    return false;
                }
            }

            if(context.fromStep == 2 && context.toStep == 3)
            {
                if(classNamesList.length == 0)
                {
                    $("#creator").smartWizard("showError", 2);
                    $("#creator").smartWizard('showMessage', 'Error: No classes defined!');
                    return false;
                }
            }

            if(context.fromStep == 3 && context.toStep == 4)
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
        onFinish: function(obj, context) {
            //save the cls file to the job result

            var saveMethod = $("input[name='saveMethod']").val();

            if($("#clsFileName").val() == undefined ||
                $("#clsFileName").val() == "")
            {
                $("#creator").smartWizard("showError", 5);
                $("#creator").smartWizard('showMessage', "Error: No file name provided.");

                $('#clsFileName').w2tag("Enter a file name");
            }
            else if (saveMethod == "gp")
            {
                //first check if a directory was selected
                if(selectedGpDir == null)
                {
                    $("#creator").smartWizard("showError", 5);
                    $("#creator").smartWizard('showMessage', "Error: No save directory selected.");

                    $('#gpDir').w2tag("Select directory");

                    return false;
                }
                else
                {
                    $("#creator").smartWizard("hideError", 5);
                    $("#creator").smartWizard('hideMessage');

                    $('#gpDir').w2tag("");
                }

                var text = [];
                text.push(createCls());

                var saveLocation = selectedGpDir + $("#clsFileName").val();
                console.log("save location: " + saveLocation);
                uploadData(saveLocation, text, function(result)
                {
                    if(result !== "success")
                    {
                        $("#creator").smartWizard('showMessage', "Error saving file. " + result);
                    }
                    else
                    {
                        $("#creator").smartWizard('showMessage', "File " + $("#clsFileName").val() + " saved.");
                    }
                });
            }
            else if(saveMethod == "download")
            {
                var clsFileName = $("#clsFileName").val();

                var text = "A brand new cls file please";
                text = createCls();
                console.log(text);

                downloadFile(clsFileName, text);

                $("#creator").smartWizard('showMessage', 'File saved to job ' + jobResultNumber);
            }
            else
            {
                $("#creator").smartWizard('showMessage', "Error: No save method selected.");
                return false;
            }
            return true;

        },
        onShowStep : function(obj, context)
        {
            if(context.fromStep == 1 && context.toStep == 2)
            {
                defineClasses();
            }
            else if(context.fromStep == 2  && context.toStep == 3)
            {
                assignSamplesToClasses();
            }
            else if(context.toStep == 4)
            {
                classAssignmentsSummary();
            }
        }
    });

    //var saveMethods = ['Save CLS file to GenePattern Files Tab','Download CLS file'];
    //$('#saveMethod').w2field('list', { items: saveMethods });

    $("#assignClassBtn").click(function()
    {
        var className = $("#selectedClass").val();

        //add the class to the list if it is not already there
        /*if($.inArray(className, assignedClassNamesList) == -1)
        {
            assignedClassNamesList.push(className);
        }*/

        var selectedSamples = w2ui['sampleGrid'].getSelection();

        for(var s=0;s<selectedSamples.length;s++)
        {
            var node =  w2ui['sampleGrid'].get(selectedSamples[s]);

            w2ui['sampleAndClassGrid'].add(
                {
                    recid: node.recid,
                    sample: node.sample,
                    class: className
                });

            //hide it from the samples grid
            w2ui['sampleGrid'].remove(w2ui['sampleGrid'].get(selectedSamples[s]).recid);
        }

        w2ui['sampleGrid'].selectNone();
    });

    $("#unassignClassBtn").click(function()
    {
        var selectedSamples = w2ui['sampleAndClassGrid'].getSelection();

        for(var s=0;s<selectedSamples.length;s++)
        {
            var node =  w2ui['sampleAndClassGrid'].get(selectedSamples[s]);
            var recordId = node.recid;
            w2ui['sampleGrid'].add(
                {
                    recid: recordId,
                    sample: node.sample
                });

            //remove it from the samples grid
            w2ui['sampleAndClassGrid'].remove(recordId);
        }

        w2ui['sampleAndClassGrid'].selectNone();
    });

    $("#selectGpDir").hide();
    $("input[name='saveMethod']").click(function()
    {
        if($(this).val() == "gp")
        {
            $("#selectGpDir").show();
        }
        else
        {
            $("#selectGpDir").hide();
        }
    });

    $("#gpDir").click(function()
    {
        saveToGPDialog(function(selectedDir)
        {
            $("#selectedDir").empty();

            if(selectedDir.url !== undefined)
            {
                $("#selectedDir").text("Directory:" + selectedDir.url);
                selectedGpDir = selectedDir.url;
            }
            else
            {
                $("#selectedDir").text("Directory: No directory selected");
            }
        });
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