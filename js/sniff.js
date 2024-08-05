/**
 * Sniff.js
 * Browser sniffing and branching utilities
 * @version 2.52, modified by John to detect FF versions
 *
 * Sniff function from 
 * http://www.brothercake.com/scripts/sniffer.php
 *
 * All else:
 * @author john.bell@REMOVEME.umit.maine.edu
 * @uses utils.js
 *
 * Including this file automagically creates a global browsers object
 * with the following properties:
 *   ie  		Internet Explorer 4+ and IE-based third-party browsers. You can also be more specific:  
 *   ie4 		... Internet Explorer 4 only.  
 *   ie5 		... Internet Explorer 5 or 6.  
 *   ie6 		... Internet Explorer 6 only.  
 *   ns4 		Netscape 4  
 *   ns6 		Gecko and KDE-based browsers - which includes Nestcape 6 and 7, Mozilla, 
 *       		Konqueror and Safari. You can also identify smaller groups within this: 
 *   ns7 		... Netscape 7.  
 *   mz7 		... any gecko browser except Netscape. This is principally designed to identify 
 *       		    Mozilla's own builds from Version 0.6 onwards, but it also returns true for 
 *       		    any other non-netscape gecko browser.  
 *   ff15	Firefox version 1.5 or greater
 *   ff2		Firefox version 2 or greater
 *   kde 		... Konqueror, from KDE 2.2 onwards.  
 *   saf 		... Safari. This variable will ignore Safari's browser spoofing.  
 *   op5 		Opera 5.  This variable will ignore Opera's browser spoofing.
 *   op6 		Opera 6.  This variable will ignore Opera's browser spoofing. 
 *   op7 		Opera 7.  This variable will ignore Opera's browser spoofing.
 *   exclude	Everything else, more or less.
 *   win 		OS is Windows.
 *   mac		OS is MacOS.
 *   lin		OS is Linux.
 *   agt		Lower case user agent string, just in case.
 *
 * The browsers object also has the following methods, intended for use with IEWin5+ and Gecko/KDE:
 *   addEventListener		function(eventName, objectName, eventFunction, bubble)
 *   	attaches an event listener to a DOM object
 *		eventName: event name, without 'on' ex. mouseup
 *		objectName: DOM element to listen on
 *		eventFunction: Function to call on event
 *		bubble: In W3C compliant browsers, false stops bidirectional bubbling
 *	 removeEventListener	function(eventName, objectName, eventFunction, bubble)
 *		removes an event listener from a DOM object
 *		arguments same as above
 *   mousePosition 			function(e)
 *		returns an {x,y} associative array with the position of the mouse on event
 *   stopBubbling			function(e)
 *		stops bubbling of the current event
 *   calculatedStyle		function(objectDiv, propertyName)
 *		returns the calculated value of a style property of a div
 *		may work with other DOM objects, but may not...
 *		objectDiv: Div you want the style rule from
 *		propertyName: Style property you want
 *   readStyleSheet			function(ruleName)
 *		returns an array with the style properties of the given style rule
 *		ruleName: full name of the rule to be read, including scope. ex. "div.myRule" or ".myGenericRule"
 */

 function defined(obj){
	if(typeof obj != "undefined") return typeof obj;
	else return 0;
}

function sniff(){
	var exclude=1;
	var agt=navigator.userAgent.toLowerCase();
	var win=0;var mac=0;var lin=1;
	if(agt.indexOf('win')!=-1){win=1;lin=0;}
	if(agt.indexOf('mac')!=-1){mac=1;lin=0;}
	var lnx=0;if(lin){lnx=1;}
	var ice=0;
	var ie=0;var ie4=0;var ie5=0;var ie6=0;var ie7=0;var com=0;var dcm;
	var op5=0;var op6=0;var op7=0;
	var ns4=0;var ns6=0;var ns7=0;var mz7=0;var kde=0;var saf=0;
	var ff15=0;var ff2=0;
	if(typeof navigator.vendor!="undefined" && navigator.vendor=="KDE"){
		var thisKDE=agt;
		var splitKDE=thisKDE.split("konqueror/");
		var aKDE=splitKDE[1].split("; ");
		var KDEn=parseFloat(aKDE[0]);
		if(KDEn>=2.2){
			kde=1;
			ns6=1;
			exclude=0;
			}
		}
	else if(agt.indexOf('webtv')!=-1){exclude=1;}
	else if(typeof window.opera!="undefined"){
		exclude=0;
		if(agt.indexOf("opera/5")!=-1||agt.indexOf("opera 5")!=-1){op5=1;}
		if(agt.indexOf("opera/6")!=-1||agt.indexOf("opera 6")!=-1){op6=1;}
		if(agt.indexOf("opera/7")!=-1||agt.indexOf("opera 7")!=-1){op7=1;}
		}
	else if(typeof document.all!="undefined"&&!kde){
		exclude=0;
		ie=1;
		if(typeof document.getElementById!="undefined"){
			if(agt.indexOf("msie 6")!=-1){
				ie6=1;
				dcm=document.compatMode;
				if(dcm!="BackCompat"){com=1;} // This should only matter for IE6, since IE7 doesn't have quirks mode.
			}
			else if(agt.indexOf("msie 7")!=-1){
				ie7=1;
			}
			else {
				ie5=1;			
			}	
		}
		else{
			ie4=1;
		}
	}
	else if(typeof document.getElementById!="undefined"){
		exclude=0;
		if(agt.indexOf("netscape/6")!=-1||agt.indexOf("netscape6")!=-1){ns6=1;}
		else if(agt.indexOf("netscape/7")!=-1||agt.indexOf("netscape7")!=-1){ns6=1;ns7=1;}
		else if(agt.indexOf("gecko")!=-1){
			ns6=1;
			mz7=1;
			var ffVer = parseFloat(agt.substr(agt.indexOf('firefox/') + 8, 3));
			if(ffVer >= 1.5) ff15=0;
			if(ffVer >= 2) ff2=1;
		}
		if(agt.indexOf("safari")!=-1 || (typeof document.childNodes!="undefined" && typeof document.all=="undefined" && typeof navigator.taintEnabled=="undefined")){mz7=0;ns6=1;saf=1;}
		}
	else if((agt.indexOf('mozilla')!=-1)&&(parseInt(navigator.appVersion)>=4)){
		exclude=0;
		ns4=1;
		if(typeof navigator.mimeTypes['*']=="undefined"){
			exclude=1;
			ns4=0;
			}
		}
	if(agt.indexOf('escape')!=-1){exclude=1;ns4=0;}
	if(typeof navigator.__ice_version!="undefined"){exclude=1;ie4=0;}
	return {exclude:exclude,win:win,mac:mac,lin:lin,ice:ice,ie:ie,ie4:ie4,ie5:ie5,ie6:ie6,ie7:ie7,com:com,dcm:dcm,op5:op5,op6:op6,op7:op7,ns4:ns4,ns6:ns6,ns7:ns7,mz7:mz7,kde:kde,saf:saf};
}
 
//old sniff function 
// function sniff(){
	// var exclude=1;
	// var agt=navigator.userAgent.toLowerCase();
	// var win=0;var mac=0;var lin=1;
	// if(agt.indexOf('win')!=-1){win=1;lin=0;}
	// if(agt.indexOf('mac')!=-1){mac=1;lin=0;}
	// var lnx=0;if(lin){lnx=1;}
	// var ice=0;
	// var ie=0;var ie4=0;var ie5=0;var ie6=0;var com=0;var dcm;
	// var op5=0;var op6=0;var op7=0;
	// var ns4=0;var ns6=0;var ns7=0;var mz7=0;var kde=0;var saf=0;
	// if(typeof navigator.vendor!="undefined" && navigator.vendor=="KDE"){
		// var thisKDE=agt;
		// var splitKDE=thisKDE.split("konqueror/");
		// var aKDE=splitKDE[1].split("; ");
		// var KDEn=parseFloat(aKDE[0]);
		// if(KDEn>=2.2){
			// kde=1;
			// ns6=1;
			// exclude=0;
			// }
		// }
	// else if(agt.indexOf('webtv')!=-1){exclude=1;}
	// else if(typeof window.opera!="undefined"){
		// exclude=0;
		// if(agt.indexOf("opera/5")!=-1||agt.indexOf("opera 5")!=-1){op5=1;}
		// if(agt.indexOf("opera/6")!=-1||agt.indexOf("opera 6")!=-1){op6=1;}
		// if(agt.indexOf("opera/7")!=-1||agt.indexOf("opera 7")!=-1){op7=1;}
		// }
	// else if(typeof document.all!="undefined"&&!kde){
		// exclude=0;
		// ie=1;
		// if(typeof document.getElementById!="undefined"){
			// ie5=1;
			// if(agt.indexOf("msie 6")!=-1){
				// ie6=1;
				// dcm=document.compatMode;
				// if(dcm!="BackCompat"){com=1;}
				// }
			// }
		// else{ie4=1;}
		// }
	// else if(typeof document.getElementById!="undefined"){
		// exclude=0;
		// if(agt.indexOf("netscape/6")!=-1||agt.indexOf("netscape6")!=-1){ns6=1;}
		// else if(agt.indexOf("netscape/7")!=-1||agt.indexOf("netscape7")!=-1){ns6=1;ns7=1;}
		// else if(agt.indexOf("gecko")!=-1){ns6=1;mz7=1;}
		// if(agt.indexOf("safari")!=-1 || (typeof document.childNodes!="undefined" && typeof document.all=="undefined" && typeof navigator.taintEnabled=="undefined")){mz7=0;ns6=1;saf=1;}
		// }
	// else if((agt.indexOf('mozilla')!=-1)&&(parseInt(navigator.appVersion)>=4)){
		// exclude=0;
		// ns4=1;
		// if(typeof navigator.mimeTypes['*']=="undefined"){
			// exclude=1;
			// ns4=0;
			// }
		// }
	// if(agt.indexOf('escape')!=-1){exclude=1;ns4=0;}
	// if(typeof navigator.__ice_version!="undefined"){exclude=1;ie4=0;}
	
	// return {exclude:exclude,win:win,mac:mac,lin:lin,ice:ice,ie:ie,ie4:ie4,ie5:ie5,ie6:ie6,com:com,dcm:dcm,op5:op5,op6:op6,op7:op7,ns4:ns4,ns6:ns6,ns7:ns7,mz7:mz7,kde:kde,saf:saf};
// }

browsers = sniff();

browsers.addEventListener = function(eventName, objectName, eventFunction, bubble){
	if(browsers.ie){
		objectName.attachEvent("on"+eventName, eventFunction);
	} else {
		objectName.addEventListener(eventName, eventFunction, bubble);
	}
}

browsers.removeEventListener = function(eventName, objectName, eventFunction, bubble){
	if(browsers.ie){
		objectName.detachEvent("on"+eventName, eventFunction);
	} else {
		objectName.removeEventListener(eventName, eventFunction, bubble);
	}
}

browsers.mousePosition = function(e){
	if(browsers.ns6){
		var x = e.pageX;
		var y = e.pageY;
	}
	if(browsers.ie){
		var x = event.clientX + document.body.scrollLeft;
		var y = event.clientY + document.body.scrollTop;
	}
	return {x:x, y:y};
}

browsers.stopBubbling = function(e){
	if(browsers.ie){
		window.event.cancelBubble = true;
	} else {
		e.stopPropagation();
	}
}

browsers.calculatedStyle = function(objectDiv, propertyName){
	if(browsers.ns6){
		if (propertyName == "clip") {
	    	var propertyValue = objectDiv.style.clip;
	    	if (propertyValue == "") {
				return {top:0, right: browsers.calculatedStyle(objectDiv, "width"), bottom: browsers.calculatedStyle(objectDiv, "height"), left: 0};
			}
			return propertyValue;
		}
		
		propertyValue = document.defaultView.getComputedStyle(objectDiv, "")[propertyName];
		return (propertyValue == "") ? false : propertyValue;
    }
	if(browsers.ie){
		if (propertyName == "width") return objectDiv.offsetWidth;
		if (propertyName == "height") return objectDiv.offsetHeight;
		if (propertyName == "top") return objectDiv.offsetTop;
		if (propertyName == "left") return objectDiv.offsetLeft;
		if (propertyName == "clip") {
	    	var propertyValue = objectDiv.style.clip;
			if (propertyValue == "") {
				return {top:0, right: browsers.calculatedStyle(objectDiv, "width"), bottom: browsers.calculatedStyle(objectDiv, "height"), left: 0};
	    	}
			return propertyValue;
		}
		var propertyValue = objectDiv.currentStyle[propertyName];
		return (propertyValue == "") ? false : propertyValue;
    }
}

browsers.readStyleSheet = function(ruleName){
	var styleArray = new Array();
	var rulesLabel = browsers.ie ? "rules" : "cssRules";
	var cleanArray = new Array();		
	var realProperties = "styleArray[property]!='' && defined(styleArray[property])!='object'";
		realProperties += "&& defined(styleArray[property])!='function' && property != 'cssText'";
		realProperties += "&& property != 'accelerator' && property != 'length'";
	
	for (var i = 0; i < document.styleSheets.length; i++ ){
		for(var j=0; j<eval("document.styleSheets[i]."+rulesLabel+".length"); j++){
			if(eval("document.styleSheets[i]."+rulesLabel+"[j].selectorText.toLowerCase()") == ruleName.toLowerCase()){
				styleArray = eval("document.styleSheets[i]."+rulesLabel+"[j].style");
				for(property in styleArray){
					if(eval(realProperties)){
						cleanArray[property] = styleArray[property];
					}
				}
			}
		}
	}
	return cleanArray;
}

browsers.preventDefault = function(e){
	if(browsers.ie){
		window.event.returnValue = false;	
	} else {
		e.preventDefault();	
	}
	return false;
}

browsers.correctPNG = function(){ 
// correctly handle PNG transparency in Win IE 5.5 or higher.
// note that this is set to autorun whenever sniff.js is loaded.
	for(var i=0; i<document.images.length; i++){
		var img = document.images[i];
		var imgName = img.src.toUpperCase();
  		if (imgName.substring(imgName.length-3, imgName.length) == "PNG") {
			var imgID = (img.id) ? "id='" + img.id + "' " : ""
			var imgClass = (img.className) ? "class='" + img.className + "' " : ""
			var imgTitle = (img.title) ? "title='" + img.title + "' " : "title='" + img.alt + "' "
			var imgStyle = "display:inline-block;" + img.style.cssText 
			if (img.align == "left") imgStyle = "float:left;" + imgStyle
			if (img.align == "right") imgStyle = "float:right;" + imgStyle
			if (img.parentElement.href) imgStyle = "cursor:hand;" + imgStyle		
			var strNewHTML = "<span " + imgID + imgClass + imgTitle
				+ " style=\"" + "width:" + img.width + "px; height:" + img.height + "px;" + imgStyle + ";"
			 	+ "filter:progid:DXImageTransform.Microsoft.AlphaImageLoader"
				+ "(src=\'" + img.src + "\', sizingMethod='scale');\"></span>" 
			img.outerHTML = strNewHTML
			i = i-1;
		 	
		}
	}
}

browsers.getTargetElement = function(e){
	if(browsers.ie) return event.srcElement;
	else return e.currentTarget;
}

browsers.getWindowArea = function(){
	//Gets the browser area.  Returns {h:, w:}
	var width = 0
	var height = 0;
	if(!browsers.ie){
		width = window.innerWidth;
		height = window.innerHeight;
	} else if( document.documentElement && ( document.documentElement.clientWidth || document.documentElement.clientHeight ) ) {
		//IE 6+ in 'standards compliant mode' (HA!)
		width = document.documentElement.clientWidth;
		height = document.documentElement.clientHeight;
	} else if( document.body && ( document.body.clientWidth || document.body.clientHeight ) ) {
		//IE 4 compatible
		width = document.body.clientWidth;
		height = document.body.clientHeight;
	}
	return {h: height, w: width};
}

browsers.numSort = function(a, b){
	//Sort order parameter for Array.sort
	//Not really browser specific, but is generically useful
	return (a-b);
}

browsers.numSortArray = function(a, b){
	//Sort order parameter for Array.sort in multidimensional arrays where you're sorting by index 0
	//Not really browser specific, but is generically useful
	return (a[0] - b[0]);
}

browsers.strSortArray = function(a, b){
	//Sort order parameter for Array.sort in multidimensional arrays where you're sorting by index 0
	//Not really browser specific, but is generically useful
	var lowerA = a[0].toLowerCase();
	var lowerB = b[0].toLowerCase();
	return lowerA > lowerB ? 1 : lowerA < lowerB ? -1 : 0;
}

browsers.setCookie = function(name,value,days) {
	if (days) {
		var date = new Date();
		date.setTime(date.getTime()+(days*24*60*60*1000));
		var expires = "; expires="+date.toGMTString();
	}
	else var expires = "";
	document.cookie = name+"="+value+expires+"; path=/";
}

browsers.readCookie = function(name) {
	var nameString = name + "=";
	var cookieArray = document.cookie.split(';');
	for(var i=0;i < cookieArray.length;i++) {
		var cookie = cookieArray[i];
		while (cookie.charAt(0)==' ') cookie = cookie.substring(1,cookie.length);
		if (cookie.indexOf(nameString) == 0) return cookie.substring(nameString.length,cookie.length);
	}
	return null;
}

browsers.eraseCookie = function(name) {
	browsers.setCookie(name,"",-1);
}

browsers.screenWidth = function(){
	if (!browsers.ie) {
		return window.innerWidth;
	} else {
		return document.body.offsetWidth;
	}
}

browsers.screenHeight = function(){
	if (!browsers.ie) {
		return window.innerHeight;
	} else {
		return document.body.offsetHeight;
	}
}

browsers.setFloat = function(domObj, newFloat){
	//Fixes the stupid cross-browser float issue
	if(!browsers.ie) domObj.style.cssFloat = newFloat;
	else domObj.style.styleFloat = newFloat;	
}

if(browsers.ie6) window.attachEvent("onload", browsers.correctPNG);

// Get current browser window dimensions. Function must be called onload to prevent innerWidth and innerHeight misfire before body loads.
// Note that screen.availWidth and screen.availHeight already work across Gecko and IE.
function getWindowDimensions() {
    browsers.innerWidth = document.body.parentNode.clientWidth ;
    browsers.innerHeight =  document.body.parentNode.clientHeight ;
// Note that window.outerWidth and window.outerHeight have no IE equivalent, so the values for IE are only an approximation.
// UPGRADE Write some hideous ActiveX check to see if IE sidebar is open.
    browsers.outerWidth = (browsers.ie)? browsers.innerWidth + 26 : window.outerWidth ; // Assumes vertical scrollbar, no sidebar.
    browsers.outerHeight =  (browsers.ie)? browsers.innerHeight + 147 : window.outerHeight ; // Assumes menu, Standard Buttons, Address Bar, Status (30px).
}