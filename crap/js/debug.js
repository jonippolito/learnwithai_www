// Debug.js.
// Opens a debugging window and facilitates writing to it.
// Especially useful for alerting variables inside loops.
// v01.8 modified by Jon ippolito to revise debugObject and debugArray functions further.
/*" _______________ HOW TO USE THIS SCRIPT _________________ "*/
/*
1. Add to html head:
    <script type="text/javascript" language="JavaScript" src="add_directory_if_necessary/debug.js"></script>
    <script id="open-debug-window">
        try {
            openDebugWindow( { openerWindow: this, debugIsOn: true , purgeOldReports: true }) ;
        }
        catch(error) {
            window.status = "Debug script called but " + error ;
        }
    </script>
2. Call the function inline, and choose the argument depending on what you want:
    a. To report name and value of a global variable, just quote the argument.
        debug( "myGlobalVariable") ;
    b. To report just a string, double-quote ( " '  foo ' " ) the argument. 
        debug("'myHeading'") ;
    c. To modify style, add a second argument for an importance from 1-10, or a more nuanced anonymous object.
        debug( "myUnimportantVariable", 1 ) ;
        debug("'myImportantHeading'", 10) ;
        debug( "mySpecialVariable", { importance: 4, styleString: "color: turquoise; font-size: 20px ; " } ) ;
	e. To create a collapsible section, add a third argument:
	    debug("'Begin function'", 1, "start") ;
	    ...
	    debug("'End function'", 1, "end") ;
    d. To report the name and value of a local variable, create a temporary global:
        _this = this ; debug("_this") ;
	e. To report the contents of an array or object, use these custom functions:
		debugArray("myArray") ;
		debugObject("myObject") ;
*/
/*__________ UTILITIES. __________*/
function countProperties (argObj) {
	/*__________ To avoid browser sniffing, only use the method that works. __________*/
	// Non-FF browsers don't support .__count__ property :(
	// if (browsers.mz7) {
	// 	return argObj.__count__ ;
	// }
	// else {
		var numberOfPropertiesInt = 0
		for (prop in argObj) {
			numberOfPropertiesInt++
		}
		return numberOfPropertiesInt ;
	// }
}
function toggleDisplay (ele) {
	var siblingDiv = ele.parentNode.getElementsByTagName('div')[1] ;
	if (siblingDiv.style.display == 'block') {
		siblingDiv.style.display = 'none' ;
	}
	else {
		siblingDiv.style.display = 'block' ;	
	}
}

/*__________ DEBUG FUNCTIONS __________*/
// Prepare the window.
debugWindowOpenedBefore = false ;
function openDebugWindow(argsObj) { //openerWindow [usually "this"], debugIsOn, purgeOldReports
    debugWindowOpenedBefore = true ;
    debugIsOn = argsObj.debugIsOn ;
    purgeOldReports = argsObj.purgeOldReports ;
    if (debugIsOn) {
        openerWindow = argsObj.openerWindow ;
        openerWindowTitle = (openerWindow.document.title == "")? openerWindowTitle = "untitled window" : openerWindow.document.title ;
        debugWinVar = window.open("","debugWinName","width=400,height=800,resizable,scrollbars,left=-50") ;
        debugWinVar.document.write("<html><head><title>Debugging: " + openerWindowTitle + "</title></head><body>") ;
        if (purgeOldReports) {
            // The following line does not allow multiple reports per window.
            debugWinVar.document.close() ;
        }
        var currentTimeObj =  new Date() ;
        debugWinVar.document.write( "<hr />DEBUG.JS REPORT AT " + currentTimeObj.getHours() + ":" +  currentTimeObj.getMinutes() + ":" +  currentTimeObj.getSeconds() + "<br />" );
        debugWinVar.document.write( "<div style='font-size: .7em; color: dimgray'>To disable debugging, set debugIsOn to false in <em>openDebugWindow</em> function.</div>" );
        debugWinVar.focus() ;
    }
}
// Report an event to that window.
function debug(lineToWriteArg, optionsArg, makeCollapsible) { // optionsArg can be an importance from 1 to 10 or an object.
    if (!debugIsOn) return ;
    var styleString = "font-family: arial ; font-size: 12px ; font-weight: bold ; " ;
    var lineToWrite = lineToWriteArg ;
    // CONDITIONALS WOULD HAVE TO GO ABOVE.
    try {
        errorTest = lineToWrite != "'" + eval(lineToWrite) + "'"
        if (lineToWrite != "'" + eval(lineToWrite) + "'") {
            lineToWrite += ": <span style='color: purple ;'>" + eval(lineToWrite) + "</span>" ;
        }
        else {
            styleString += " color: wheat ; background-color: dimgray ; " ;
        }
    }
    catch (e) {
        this_broke_the_debugger = lineToWrite; debug("this_broke_the_debugger", 8) ;
    }
    if (optionsArg) {
        if (typeof optionsArg == "object") {
            if (optionsObj.styleStringCustom) {
                styleString += optionsObj.styleStringCustom ;
            }
            if (optionsObj.importance) {
                var importance = optionsObj.importance ;
            }
        }
        else if (typeof optionsArg == "number") {
            var importance = optionsArg ;
        }
        switch (importance) { // 10 is highest.
            case 0:
                break ;
            case 1:
                styleString += "color: blueviolet" ;
                break ;
            case 2:
                styleString +="margin-left: 15px ; color: dodgerblue ; " ;
                break ;
            case 3:
                styleString +="margin-left: 15px ; color: darkcyan ; " ;
                break ;
            case 4:
                styleString +="margin-left: 10px ; color: olive ; font-size: 13px ; " ;
                break ;
             case 5:
                styleString +="margin-left: 10px ; color: teal ; font-size: 13px ; " ;
                break ;
            case 6:
                styleString += "margin-left: 5px ; color: orange; font-size: 14px ; " ;
                break ;
            case 7:
                styleString +="margin-left: 5px ; color: orangered ; font-size: 14px ; " ;
                break ;
            case 8:
                styleString +="margin-left: 0px ; color: red ; font-size: 16px ;" ;
                break ;
            case 9:
                styleString +="margin-left: 0px ; color: maroon ; font-size: 20px ;" ;
                break ;
            case 10:
                styleString +="margin-left: 0px ; color: white ; background-color: black; font-size: 24px ;" ;
                break ;
        }
    }
	if (makeCollapsible) {
		if (makeCollapsible == "start") {
			debug("debugWinVar.document.body")
			// Tried writing this to a script in debugWinVar.document but wasn't being recognized. :/
		    lineToWrite = "<div style='font-family: verdana; border: peru solid 1px;  background-color: ivory;padding: .2em; -webkit-border-radius: 10px; -moz-border-radius: 10px;'><div style='text-decoration: underline;' onmouseup='opener.toggleDisplay( this )' " + lineToWrite + "</div><div style='display: none'>" ;
		}
		else {
	        lineToWrite += "</div></div>" ;
		}
	}
	else {
	    // if (!optionsObj.noBreak) {
	    lineToWrite += "<br />"
	    // }
	    lineToWrite = "<span style=' margin-left: 20px; " + styleString + " '>" + lineToWrite + "</span>" ;		
	}
    if (!debugWindowOpenedBefore) {
        alert("debug.js hasn't been properly initialized. Check the instructions in debug.js or remove all debug.js references from your html code.") ;
        document.write("Exited document.") ;
        return ;
    }
    if (typeof debugWinVar == "undefined" || typeof debugWinVar.document == "undefined" ) { // It was opened but is now closed.
        openDebugWindow({ openerWindow: openerWindow, debugIsOn: debugIsOn , purgeOldReports: purgeOldReports }) ;
    }
    debugWinVar.document.writeln(lineToWrite) ;
}
/*__________ Debug objects. __________*/
function debugObject(objectArg){ // objectArg can be string or object.
    if (!debugIsOn) return ;
	_objectName = objectArg ; debug("_objectName", 2, "start") ;
	if (typeof objectArg == "string") { // objectArg is the object name as a string.
		debugWinVar.document.write("<h4>Here are the " + countProperties( eval(objectArg) ) + " properties for " + objectArg + "</h4>") ;
		objectArg = eval(objectArg) ; // Otherwise you'll be evaluating properties of the string, which are meaningless.
	}
	var objectProperties = "" ;
	for (var property in objectArg) {
		objectProperties += "<span style='color: silver'>" + property + ":</span> " + objectArg[property] + " <span style='color: silver'>|</span><br /> " ;
	}
    debugWinVar.document.write(objectProperties) ;
    debugWinVar.document.write("<br />") ;
    debug("'End of object'", 1, "end") ;
}
/*__________ Debug arrays. __________*/
function debugArray(arrayArg){ // arrayArg can be string or object.
    if (!debugIsOn) return ;
	if (typeof arrayArg == "string") { // objectArg is the object name as a string.
		debug("'Here are the properties for :'") ;
		_arrayName = arrayArg ; debug("_arrayName", 2, "start") ;
		arrayArg = eval(arrayArg) ;
		_arrayLength = arrayArg.length ; debug("_arrayLength") ;
	}
	var arrayElements = "" ;
	for (var counter=0; counter < arrayArg.length; counter++) {
		arrayElements += arrayArg[counter] + ", " ;
	};
    debugWinVar.document.write(arrayElements) ;
    debug("'End of array'", 1, "end") ;
}
/* UPGRADE: STILL TO IMPLEMENT
Flags:
-b follow with a line break and a border ________
-1, -2 importance
-n no line break

*/