var fs = require('fs');


// SET FILE NAMES AND VARIABLES HERE
var file = "fornax.csv" // Input file
var fileJSON = "fornax.json" // Output file
var fileMatrix = "matrix.json" // Path of the comparison matrix file
var reportNumber = 2 // Number of the test, in the historic series of test. Starting with 1 for mtlynch's report, 2 for Fornax's...
var testName = "1.3.3 - fornax" // Example: "1.3.1 - mtlynch"
var testType = "Load test" // Example: "Load test"
var testConditions = "10 GB files" // Size of the uploaded files and other differential key aspects of the test, as a short summary. Examples: "40 MB files" (mtlynch's), "10 GB files" (Fornax's)
var siaValue = 0.01315 // Siacoin value at the time of the test. Check CoinMarketCap

// IF THE CSV HAS AN INTERVAL < 1 MINUTE, adjust the number so it checks every x entries. If interval = 1 minute, let "skip" in 2, if 5 seconds, "skip" = 20. Avoids the function to chocke with the csv file processing
var skip = 5


console.log("---------------------------------------------")
console.log("               SIA-TEST-PARSER")
console.log("          Analyzing: " + file)
console.log("---------------------------------------------")
var tsFile = "ts" + reportNumber + ".json" // Technical sheet file
var data1 = '';
var chunk1;
var stream1 = fs.createReadStream(file)
stream1.on('readable', function() { //Function just to read the whole file before proceeding
    while ((chunk1=stream1.read()) != null) {
        data1 += chunk1;}
});
stream1.on('end', function() {
    var csvContent = data1
    var array = csv2array(csvContent, ",")
    array.splice(0,1) // Removes column titles

    // 1- Slicing useless timepoints without contract formation
    for (var n = 0; n < array.length; n++) {
        if (array[n][1] == 0 && array[n+1][1] == 0) {
            array.splice(n,1)
            n--
        } else {
            n = array.length // exits the loop
        }
    }

    // 2- Comaprison matrix creation
    var matrixEntry = { // Will save the values for the comparison matrix
        "test": testName,
        "type": testType,
        "date": new Date(array[0][0]).getTime(),
        "conditions": testConditions,
        "contractsFormationTime": 0,
        "avgUploadSpeedTo1TB": 0,
        "SCcostMonth1TBfees": 0,
        "USDcostMonth1TBfees": 0,
        "SCcostMonth1TBnofees": 0,
        "USDcostMonth1TBnofees": 0,
        "avgUploadSpeedTo2TB": 0,
        "SCcostMonth2TBfees": 0,
        "USDcostMonth2TBfees": 0,
        "SCcostMonth2TBnofees": 0,
        "USDcostMonth2TBnofees": 0,
        "avgUploadSpeedTo10TB": 0,
        "SCcostMonth10TBfees": 0,
        "USDcostMonth10TBfees": 0,
        "SCcostMonth10TBnofees": 0,
        "USDcostMonth10TBnofees": 0,
        "avgUploadSpeedTotal": 0,
        "SCcostMonthTotalFees": 0,
        "USDcostMonthTotalFees": 0,
        "SCcostMonthTotalNofees": 0,
        "USDcostMonthTotalNofees": 0,
        "totalUploaded": 0
    }

    // 3- First entry
    var newArray = []
    var prevStorage = 0
    var prevContracts = 0
    var prevTime = new Date(array[0][0]).getTime()
    var zeroTime = new Date(array[0][0]).getTime()
    entry = createEntry(array[0])
    newArray.push(entry)

    // 4- Loop invoking. Starts in element 1
    loop(array, 1, newArray, prevTime, prevStorage, zeroTime, matrixEntry)
 
    // 5 - Saving the files
    console.log("Creating the abbreviated report '" + fileJSON + "' with " + newArray.length + " entries")
    console.log("")
    var stream2 = fs.createWriteStream(fileJSON)
    var string2 = JSON.stringify(newArray)
    stream2.write(string2)

    // 6- Matrix saving
    //console.log(matrixEntry)
    console.log("Adding the information to the comparison matrix file")
    console.log("")

    // Opening the matrix file
    var stream5 = fs.createReadStream(fileMatrix)
    var data5 = '';
    var chunk5;
    stream5.on('readable', function() { //Function just to read the whole file before proceeding
        while ((chunk5=stream5.read()) != null) {
            data5 += chunk5;}
    });
    stream5.on('end', function() {
        if (data5 != "") {
            var matrix = JSON.parse(data5)
        } else {
            var matrix = [] // Ensurig this is an array
        }

        // Replacing the matrix element with the new matrix entry on the "reportNumber" position
        matrix[reportNumber - 1] = matrixEntry

        var stream4 = fs.createWriteStream(fileMatrix)
        var string4 = JSON.stringify(matrix)
        stream4.write(string4)
    })

})


function loop(array, n, newArray, prevTime, prevStorage, zeroTime, matrixEntry) {
    var time = new Date(array[n][0]).getTime()
    if (time >= (prevTime + 900000)) { // Only takes one entry every 15 minutes (900000 milliseconds)
        entry = createEntry(array[n])
        newArray.push(entry)
        prevTime = time
    }

    if (parseInt(array[n][1]) >= 50 && prevContracts < 50) {
        // If we reached 50 contracts, print the time needed
        var timeTo50 = (time - zeroTime) / 60000 // In minutes
        console.log("Time for going from 0 to 50 contracts: " + timeTo50 + " minutes")
        matrixEntry.contractsFormationTime = timeTo50
    }

    if (array[n][4] >= 1000000000000 && prevStorage < 1000000000000) {
        // If we reached 1TB
        var secondsTo1TB = (time - zeroTime) / 1000 // In seconds
        var speedTo1TB = ((array[n][4] / 1000000) / secondsTo1TB).toFixed(2) // Speed in MBps
        var costPlusFees = (array[n][8]/1000000000000000000000000) + (array[n][9]/1000000000000000000000000) + (array[n][10]/1000000000000000000000000) + (array[n][11]/1000000000000000000000000)
        var costMinusFees = (array[n][9]/1000000000000000000000000) + (array[n][10]/1000000000000000000000000) + (array[n][11]/1000000000000000000000000)
        var TBmonthPlusFees = (costPlusFees / 3).toFixed(2) // Divided by 3 months
        var TBmonthMinusFees = (costMinusFees / 3).toFixed(2) // Divided by 3 months
        
        console.log("Average speed for 1TB upload: " + speedTo1TB + " MBps")
        matrixEntry.avgUploadSpeedTo1TB = speedTo1TB
        console.log("Cost for 1TB upload (PLUS fees): " + TBmonthPlusFees + " SC/Tb/month")
        matrixEntry.SCcostMonth1TBfees = TBmonthPlusFees
        console.log("Cost for 1TB upload (PLUS fees): " + (TBmonthPlusFees * siaValue).toFixed(2) + " USD/Tb/month")
        matrixEntry.USDcostMonth1TBfees = (TBmonthPlusFees * siaValue).toFixed(2)
        //console.log("Cost for 1TB upload (MINUS fees): " + TBmonthMinusFees + " SC/Tb/month")
        matrixEntry.SCcostMonth1TBnofees = TBmonthMinusFees
        //console.log("Cost for 1TB upload (MINUS fees): " + (TBmonthMinusFees * siaValue).toFixed(2) + " USD/Tb/month")
        matrixEntry.USDcostMonth1TBnofees = (TBmonthMinusFees * siaValue).toFixed(2)
    }

    if (array[n][4] >= 2000000000000 && prevStorage < 2000000000000) {
        // If we reached 2TB
        var secondsTo2TB = (time - zeroTime) / 1000 // In seconds
        var speedTo2TB = ((array[n][4] / 1000000) / secondsTo2TB).toFixed(2) // Speed in MBps
        var costPlusFees = (array[n][8]/1000000000000000000000000) + (array[n][9]/1000000000000000000000000) + (array[n][10]/1000000000000000000000000) + (array[n][11]/1000000000000000000000000)
        var costMinusFees = (array[n][9]/1000000000000000000000000) + (array[n][10]/1000000000000000000000000) + (array[n][11]/1000000000000000000000000)
        var TBmonthPlusFees = (costPlusFees / (2 * 3)).toFixed(2) // Divided by 3 months and 2 TB
        var TBmonthMinusFees = (costMinusFees / (2 * 3)).toFixed(2) // Divided by 3 months and 2 TB
        
        console.log("Average speed for 2TB upload: " + speedTo2TB + " MBps")
        matrixEntry.avgUploadSpeedTo2TB = speedTo2TB
        console.log("Cost for 2TB upload (PLUS fees): " + TBmonthPlusFees + " SC/Tb/month")
        matrixEntry.SCcostMonth2TBfees = TBmonthPlusFees
        console.log("Cost for 2TB upload (PLUS fees): " + (TBmonthPlusFees * siaValue).toFixed(2) + " USD/Tb/month")
        matrixEntry.USDcostMonth2TBfees = (TBmonthPlusFees * siaValue).toFixed(2)
        //console.log("Cost for 2TB upload (MINUS fees): " + TBmonthMinusFees + " SC/Tb/month")
        matrixEntry.SCcostMonth2TBnofees = TBmonthMinusFees
        //console.log("Cost for 2TB upload (MINUS fees): " + (TBmonthMinusFees * siaValue).toFixed(2) + " USD/Tb/month")
        matrixEntry.USDcostMonth2TBnofees = (TBmonthMinusFees * siaValue).toFixed(2)
    }

    if (array[n][4] >= 10000000000000 && prevStorage < 10000000000000) {
        // If we reached 10TB
        var secondsTo10TB = (time - zeroTime) / 1000 // In seconds
        var speedTo10TB = ((array[n][4] / 1000000) / secondsTo10TB).toFixed(2) // Speed in MBps
        var costPlusFees = (array[n][8]/1000000000000000000000000) + (array[n][9]/1000000000000000000000000) + (array[n][10]/1000000000000000000000000) + (array[n][11]/1000000000000000000000000)
        var costMinusFees = (array[n][9]/1000000000000000000000000) + (array[n][10]/1000000000000000000000000) + (array[n][11]/1000000000000000000000000)
        var TBmonthPlusFees = (costPlusFees / (10 * 3)).toFixed(2) // Divided by 3 months and 10 TB
        var TBmonthMinusFees = (costMinusFees / (10 * 3)).toFixed(2) // Divided by 3 months and 10 TB
        
        console.log("Average speed for 10TB upload: " + speedTo10TB + " MBps/Tb/month")
        matrixEntry.avgUploadSpeedTo10TB = speedTo10TB
        console.log("Cost for 10TB upload (PLUS fees): " + TBmonthPlusFees + " SC/Tb/month")
        matrixEntry.SCcostMonth10TBfees = TBmonthPlusFees
        console.log("Cost for 10TB upload (PLUS fees): " + (TBmonthPlusFees * siaValue).toFixed(2) + " USD/Tb/month")
        matrixEntry.USDcostMonth10TBfees = (TBmonthPlusFees * siaValue).toFixed(2)
        //console.log("Cost for 10TB upload (MINUS fees): " + TBmonthMinusFees + " SC/Tb/month")
        matrixEntry.SCcostMonth10TBnofees = TBmonthMinusFees
        //console.log("Cost for 10TB upload (MINUS fees): " + (TBmonthMinusFees * siaValue).toFixed(2) + " USD/Tb/month")
        matrixEntry.USDcostMonth10TBnofees = (TBmonthMinusFees * siaValue).toFixed(2)
    }

    // Updating variables
    prevStorage = array[n][4]
    prevContracts = parseInt(array[n][1])
    
    // Repeat loop if we are not at the end of the array
    if (n < (array.length - 20)) {
        loop(array, (n + skip), newArray, prevTime, prevStorage, zeroTime, matrixEntry)
    } else {
        // Final results for the total uploaded data in the test
        var totalUploaded = array[n][4] / 1000000000000
        var secondsToFinal = (time - zeroTime) / 1000 // In seconds
        var speedToFinal = ((array[n][4] / 1000000) / secondsToFinal).toFixed(2) // Speed in MBps
        var speedToFinalFiles = ((array[n][5] / 1000000) / secondsToFinal).toFixed(2) // Speed in MBps
        var costPlusFees = (array[n][8]/1000000000000000000000000) + (array[n][9]/1000000000000000000000000) + (array[n][10]/1000000000000000000000000) + (array[n][11]/1000000000000000000000000)
        var costMinusFees = (array[n][9]/1000000000000000000000000) + (array[n][10]/1000000000000000000000000) + (array[n][11]/1000000000000000000000000)
        var TBmonthPlusFees = (costPlusFees / (totalUploaded * 3)).toFixed(2) // Divided by 3 months and 10 TB
        var TBmonthMinusFees = (costMinusFees / (totalUploaded * 3)).toFixed(2) // Divided by 3 months and 10 TB
        
        console.log("Average speed for the whole test: " + speedToFinal + " MBps")
        matrixEntry.avgUploadSpeedTotal = speedToFinal
        console.log("Cost for the whole test (PLUS fees): " + TBmonthPlusFees + " SC/Tb/month")
        matrixEntry.SCcostMonthTotalFees = TBmonthPlusFees
        console.log("Cost for the whole test (PLUS fees): " + (TBmonthPlusFees * siaValue).toFixed(2) + " USD/Tb/month")
        matrixEntry.USDcostMonthTotalFees = (TBmonthPlusFees * siaValue).toFixed(2)
        //console.log("Cost for the whole test (MINUS fees): " + TBmonthMinusFees + " SC/Tb/month")
        matrixEntry.SCcostMonthTotalNofees = TBmonthMinusFees
        //console.log("Cost for the whole test (MINUS fees): " + (TBmonthMinusFees * siaValue).toFixed(2) + " USD/Tb/month")
        matrixEntry.USDcostMonthTotalNofees = (TBmonthMinusFees * siaValue).toFixed(2)
        matrixEntry.totalUploaded = (array[n][4] / 1000000000000).toFixed(2)

        // Technical sheet file
        // Print the total amount uploaded to Finish the report
        var totalUploaded = (array[n][4] / 1000000000000).toFixed(2)
        var totalUploadedFiles = (array[n][5] / 1000000000000).toFixed(2)
        var tsEntry = {
            "type": "-",
            "version": "-",
            "tester": "-",
            "system": "-",
            "filesType": "-",
            "terminateCondition": "-",
            "date": zeroTime,
            "siaUSDprice": siaValue,
            "uploadedFile": totalUploadedFiles,
            "uploadedAbsolut": totalUploaded,
            "totalFiles": array[n][2],
            "contracts": array[n][1],
            "spent": costPlusFees,
            "time": (time - zeroTime) / 3600000,
            "dollarTbMonth": (TBmonthPlusFees * siaValue).toFixed(2),
            "uploadFiles": speedToFinalFiles,
            "uploadAbsolut":speedToFinal,
            "crashes": "-",
            "notes": "-",
            "link": "-"
        }
        console.log("")
        console.log("Creating the technical sheet report:" + tsFile)
        console.log("")
        var stream3 = fs.createWriteStream(tsFile)
        var string3 = JSON.stringify(tsEntry)
        stream3.write(string3)
    }
}


function createEntry(e) {
    // Creates and adds an entry for the JSON file
    var time = new Date(e[0]).getTime()
    var absoluteTB = (e[4] / 1000000000000).toFixed(2) // In gigabytes
    var filesTB = (e[5] / 1000000000000).toFixed(2) // In gigabytes
    if (absoluteTB == 0) { // Avoids a division by 0
        var efficiency = 0
    } else {
        var efficiency = ((filesTB / absoluteTB)*100).toFixed(2)
    }
    var fees = (e[8] / 1000000000000000000000000).toFixed(2)
    var storage = (e[9] / 1000000000000000000000000).toFixed(2)
    var upload = (e[10] / 1000000000000000000000000).toFixed(2)
    var download = (e[11] / 1000000000000000000000000).toFixed(2)
    var renterFunds = (e[12] / 1000000000000000000000000).toFixed(2)
    var wallet = (e[13] / 1000000000000000000000000).toFixed(2)

    var entry = {"time": time, "contracts": parseInt(e[1]), "absoluteTB": absoluteTB, "filesTB": filesTB, "efficiency": efficiency, "fees": fees,
        "storage": storage, "upload": upload, "download": download, "renterFunds": renterFunds, "wallet": wallet}

    return entry
}


// CSV parser function(from Jos de Jong 2010)
function csv2array(data, delimeter) {
    // Retrieve the delimeter
    if (delimeter == undefined) 
      delimeter = ',';
    if (delimeter && delimeter.length > 1)
      delimeter = ',';
  
    // initialize variables
    var newline = '\n';
    var eof = '';
    var i = 0;
    var c = data.charAt(i);
    var row = 0;
    var col = 0;
    var array = new Array();
  
    while (c != eof) {
        // skip whitespaces
        while (c == ' ' || c == '\t' || c == '\r') {
            c = data.charAt(++i); // read next char
        }
        
        // get value
        var value = "";
        if (c == '\"') {
            // value enclosed by double-quotes
            c = data.charAt(++i);
            
            do {
                if (c != '\"') {
                    // read a regular character and go to the next character
                    value += c;
                    c = data.charAt(++i);
                }
                
                if (c == '\"') {
                    // check for escaped double-quote
                    var cnext = data.charAt(i+1);
                    if (cnext == '\"') {
                    // this is an escaped double-quote. 
                    // Add a double-quote to the value, and move two characters ahead.
                    value += '\"';
                    i += 2;
                    c = data.charAt(i);
                    }
                }
            }
            while (c != eof && c != '\"');
            
            if (c == eof) {
                throw "Unexpected end of data, double-quote expected";
            }
    
            c = data.charAt(++i);
        }
        else {
            // value without quotes
            while (c != eof && c != delimeter && c!= newline && c != ' ' && c != '\t' && c != '\r') {
            value += c;
            c = data.charAt(++i);
            }
        }
    
        // add the value to the array
        if (array.length <= row) 
            array.push(new Array());
        array[row].push(value);
        
        // skip whitespaces
        while (c == ' ' || c == '\t' || c == '\r') {
            c = data.charAt(++i);
        }
    
        // go to the next row or column
        if (c == delimeter) {
            // to the next column
            col++;
        }
        else if (c == newline) {
            // to the next row
            col = 0;
            row++;
        }
        else if (c != eof) {
            // unexpected character
            throw "Delimiter expected after character " + i;
        }
        
        // go to the next character
        c = data.charAt(++i);
    }  
    
    return array;
}