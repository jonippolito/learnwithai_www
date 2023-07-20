// ThoughtMesh.js by Jon Ippolito.
// Requires ExpandingMenu.js, telamon.js
// Version 6.9, modified by Jon to fix disappearing submesh radio button by eliminating custom "countProperties" option for Firefox.
/************************* Nomenclature.*************************
GENERAL
	thoughtMesh: the namespace. This and related constants are defined in the loadMesh function.
TAGS
	These are not a property of the menu, so that in the future (?) ThoughtMesh might operate from multiple menus:
	thoughtMesh.uniqueTags: an array of all the tags in the document--doubles as a manager of cloud tag objects.
	thoughtMesh.selectedTags: an array defined after user clicks on a tag; this is a manager of objects with integer index and tag name properties, and its contents are updated dynamically. It is overwritten every time a new tag (not a + or -) is clicked.
	thoughtMesh.tagList: a version of thoughtMesh.selectedTags as comma-delimited string.
	thoughtMesh.tagsFromItem["print-gift"]: an object of tags associated with that menuItem.
	thoughtMesh.itemsFromTag["art"].menuItems: an object of menuItems tagged with "art".
	thoughtMesh.itemsFromTag["art"].menuItems.length: the number of menuItems tagged with "art". UPGRADE: convert .length to countProperties?
SUBMESHES
	Note that the words submesh and group are used here interchangeably.
	thoughtMesh.submeshes: an object with active submeshes as properties. This doubles as a manager for the groups.
	thoughtMesh.submeshes["group_2"]: an object with properties of a submesh whose database id (not its order in the *thoughtMesh.submeshes* properties!) is 2.
	thoughtMesh.submeshes["group_2"].filter: an object created by the GroupFilter constructor that keeps track of radio buttons.
	thoughtMesh.currentGroup: the submesh selected, referenced by groupId (not its order in the *thoughtMesh.submeshes* properties).
*/
/************************* Utilities.*************************/
function checkSubmeshButton (groupId) {
	if (countProperties( thoughtMesh.submeshes ) > 1) { // ThoughtMesh will only add filters if there is more than one submesh.
		for (var groupCounter in thoughtMesh.submeshes) {
			thoughtMesh.submeshes[groupCounter].filter.input.checked = false ;
		};
		thoughtMesh.submeshes["group_" + groupId].filter.input.checked = true ;
	}
}
function checkAuthorButton (authorId) {
	if (authorId == 0) { // Show all authors.
		thoughtMesh.thisAuthor.input.checked = false ;
		thoughtMesh.allAuthors.input.checked = true ;
		thoughtMesh.wantFilteredForAuthor = false ;
	}
	else { // Filter for this page's author only.
		thoughtMesh.thisAuthor.input.checked = true ;
		thoughtMesh.allAuthors.input.checked = false ;
		thoughtMesh.wantFilteredForAuthor = true ;
	}
}
function countProperties (argObj) {
	// Old Firefox used to support .__count__ property, but FF 43+ doesn't seem to.
	var numberOfPropertiesInt = 0
	for (prop in argObj) {
		numberOfPropertiesInt++
	}
	return numberOfPropertiesInt ;
}
/************************* Create ThoughtMesh.*************************/
thoughtMesh = {} ;
thoughtMesh.defaultOutsideLexiasScript = "http://vectors.usc.edu/thoughtmesh/json/outsideLexias.json.php" ; // Eventually can be localized for different meshes.
thoughtMesh.tagsFromItem = {} ; // This cannot be accessed as an array.
thoughtMesh.itemsFromTag = {} ; // Ditto.
thoughtMesh.uniqueTags = [] ; // This array doubles as a cloud tag manager.
thoughtMesh.tagObjs = [] ; // Separate from selectedTags, because the latter needs to be defined before the former can be created so sizes etc. are normalized.
thoughtMesh.tagObjs.getObjectByTag = {} ; // Returns cloud tag object without creating empty array elements, eg thoughtMesh.tagObjs.getObjectByTag["1973"].
thoughtMesh.selectedTags = [] ; // Defining this in advance prevents misfire when user clicks on scope radiobutton before clicking on a tag.
function loadMesh( argObj ) {
	// argObj looks like { outsideLexiasUrl: 'http://vectors.usc.edu/thoughtmesh/json/outsideLexias.json.php' ,	documentId : 11, method: 'standalone'/'telamon' [outside links via Vectors]/'custom' [handwritten outside lexia JSON], autogenerateInlineNavigation: true/false, primaryGroup: 2 [0 is none] }
	/*__________ Register variables. __________*/
	primaryGroup = (typeof argObj.primaryGroup == "undefined")? 0 : argObj.primaryGroup ;
	thoughtMesh.navigationTopPix = (typeof argObj.navigationTopPix == "undefined")? "20px" : argObj.navigationTopPix ;
	thoughtMesh.navigationMarginBottomPix = (typeof argObj.navigationMarginBottomPix == "undefined")? "16px" : argObj.navigationMarginBottomPix ;
	thoughtMesh.lexiasTopPix = (typeof argObj.lexiasTopPix == "undefined")? "120px" : argObj.lexiasTopPix ;
	/*________________________ Check browser compatibility.________________________*/
	// Check for browser compliance. If stale browser, go to old browser page. (Safari works for the most part, as is explained in the stale browser page.)
	if ( browsers.ns4 || browsers.ie4 || browsers.ie5 || browsers.ie6) { // Explicit numbers is more future-proof.
		if ( !confirm("Your browser doesn't appear to support all ThoughtMesh features.\n\nClick Cancel to learn more, or\n\nOK to proceed anyway.") ) {
			document.location="recommended_thoughtmesh_browsers.html";
		}
	}
	/*________________________ Decide which ThoughtMesh method to implement.________________________*/
	thoughtMesh.method = (typeof argObj.method == "undefined")? "telamon" : argObj.method ;
	if (thoughtMesh.method == "custom") {
		// Shouldn't have to do anything, because this option means the author will hard-code a custom json file.
	}
	else if (thoughtMesh.method == "standalone") {
		// Prevent JSON errors even though there are no outside lexias for this page.
		document.getElementById("tab-out").style.display = "none" ;
		document.getElementById("tab-trace").style.display = "none" ;
	}
	else { // Telamon.
		// Only load remote data if Internet is present.
		// telamon.offline is set by checking for existence of a ping.js file on the remote server in the HTML head immediately after the telamon.js include.
		if (telamon.offline) {
			addSubmeshStyle( {isOffline: true} ) ;
			document.getElementById("lexias-out-warning").innerHTML = "<span class='warning'>You appear to be offline, so this feature is not available.</span> Please enable Internet and reload this page to use this feature." ;
		}
		else {
			/*__________ Load telamon parameters __________*/
			thoughtMesh.id = ( typeof argObj.documentId != "undefined" )? argObj.documentId :  "[No document id specified!]" ;
			thoughtMesh.outsideLexiasUrl = ( typeof argObj.outsideLexiasUrl != "undefined" )? argObj.outsideLexiasUrl : thoughtMesh.defaultOutsideLexiasScript ;
			thoughtMesh.outsideLexiasUrl = encodeURI(thoughtMesh.outsideLexiasUrl) ; // NEC? JB says no.
			debugLoadMessage = 'This script has been loaded via telamon.include: ' + thoughtMesh.outsideLexiasUrl ;
			/*__________ Load all tag JSON. __________*/
			// This checks which tags are common to the entire mesh, so ThoughtMesh can grey out the others when user clicks "excerpts out."
			var scriptEle = document.createElement('script') ;
			scriptEle.type = 'text/javascript' ;
			scriptEle.src = 'http://vectors.usc.edu/thoughtmesh/tech/TagCountAll.js.php' ;
			document.getElementsByTagName('head')[0].appendChild(scriptEle) ;
			/*__________ Initialize submeshes __________*/
			telamon.get( thoughtMesh.outsideLexiasUrl, {documentid: thoughtMesh.id }, "outsideLexiasFun(); initializeSubmeshes() ;" ) ;
		}
	}
	// Note that inline navigation generation (next, tag, and permalink buttons) takes place in registerTags() so as to make use of predefined tag arrays.
	/*________________________ Initialize tags.________________________*/
	registerTags();
	/*________________________ Initialize tabs.________________________*/
	respondToTab( document.getElementById("tab-here") );
	document.getElementById("loading-shroud").style.display = "none" ;
}
function setTagSize( argObj ) {
	// Don't use thoughtMesh.tagObjs.length, because you want the final one, not the length at the time each tag is added. Use thoughtMesh.uniqueTags.length instead.
	// Jon used square root to give small numbers a fighting chance. In ems.
	// It doesn't matter how many there are, it matters how big the max is.
	// Goal is for the maximum size to be 4em, minimum .8em. So I want a square root function with f(argObj.maximum) = 4 and f(argObj.minimum) = .8.
	var tagSize = 4 * (   Math.sqrt( .5 * (argObj.frequency/argObj.maximum) )   );
	if (tagSize < 1 ) tagSize = 1 ;
	return tagSize ;
}
function sortTagsNumerically(a,b) {
	return thoughtMesh.itemsFromTag[ a ].length - thoughtMesh.itemsFromTag[ b ].length ;
}
String.prototype.trim = function () {
    return this.replace(/^\s*/, "").replace(/\s*$/, "");
}
function sortAlphabeticallyWithoutCase(a,b) {
	try {
		a = a.toLowerCase(); b = b.toLowerCase();
		if (a > b) return 1 ;
		if (a < b) return -1 ;
		return 0 ;
	}
	catch (e){ // This helps IE handle blanks.
		return 0 ;
	}
}
function CloudTag(argObj) {
	// Register arguments.
	this.containerEle = (typeof argObj.containerEle == "undefined")? document.body : argObj.containerEle ;
	this.tag = (typeof argObj.tag == "undefined")? "[no tag defined!]" : argObj.tag ;
	this.frequency = (typeof argObj.frequency == "undefined")? "[no frequency defined!]" : argObj.frequency ;
	// this.documentsFrequency = (typeof argObj.documentsFrequency == "undefined")? "[no documentsFrequency defined!]" : argObj.documentsFrequency ;
	this.size = (typeof argObj.size == "undefined")? "[no size defined!]" : argObj.size ;
	// Note: textNodes are weird, don't seem to afford same handles as elements. Hence the element repetition instead of merely replacing textNode + with -.
	/* _______ Create a box for holding +,-, and tag. _______*/
	this.tagBox = document.createElement("span") ;
	this.tagBox.className = "tag-box" ;
	this.containerEle.appendChild( this.tagBox ) ;
	/* _______ Create a blank space-holder for plus and minus links. _______*/
	this.blankLink = document.createElement("span") ;
	this.blankLink.className = "blank-link" ;
	this.blankLink.innerHTML = "+" ;
	this.blankLink.style.fontSize = this.size + "em" ;
	this.tagBox.appendChild( this.blankLink ) ;
	/* _______ Create a link for adding a tag. _______*/
	this.plusLink = document.createElement("a") ;
	this.plusLink.href = "#" ;
	this.plusLink.style.fontSize = this.size + "em" ;
	this.plusLink.onclick = function() { respondToTag({tagArg: this.cloudTagObj.tag, linkType: "plus"}) } ;
	this.plusLink.className = "cloud-tag-hidden" ;
	this.plusText =  document.createTextNode("+") ;
	// Add a means of recovering the corresponding tag from the link, for use in the onclick function.
	this.plusLink.cloudTagObj = this ;
	// Add plus to cloud.
	this.tagBox.appendChild( this.plusLink ) ;
	this.plusLink.appendChild( this.plusText ) ;
	/* _______ Create a link for subtracting a tag. _______*/
	this.minusLink = document.createElement("a") ;
	this.minusLink.href = "#" ;
	this.minusLink.style.fontSize = this.size + "em" ;
	this.minusLink.className = "cloud-tag-hidden" ; // Initially hidden.
	this.minusLink.onclick = function() { respondToTag({tagArg: this.cloudTagObj.tag, linkType: "minus"}) } ;
	this.minusText = document.createTextNode("-") ;
	// Add a means of recovering the corresponding tag from the link, for use in the onclick function.
	this.minusLink.cloudTagObj = this ;
	// Add minus to cloud.
	this.tagBox.appendChild( this.minusLink ) ;
	this.minusLink.appendChild( this.minusText ) ;
	/* _______ Create a link for replacing a tag. This is the link from the word itself. _______*/
	this.replaceLink = document.createElement("a") ;
	this.replaceLink.href = "#" ;
	this.replaceLink.style.fontSize = this.size + "em" ;
	this.replaceLink.className = "cloud-tag" ;
	this.replaceText =  document.createTextNode( this.tag ) ;
	// Enable recovery of cloudTagObj from its link, for use in the onclick function.
	this.replaceLink.cloudTagObj = this ;
	this.replaceLink.onclick = function() { respondToTag({tagArg: this.cloudTagObj.tag, linkType: "replace"}) } ;
	this.replaceLink.onmouseover = function() { // I think "this" inside this function is the link, not the CloudTag object.
		try {
			var documentsFrequency = numTaggedWith.documents[ this.cloudTagObj.tag ] ;
			var lexiasFrequency = numTaggedWith.lexias[ this.cloudTagObj.tag ] ;
			// Build a tooltip.
			if ( documentsFrequency == 1 ) { // Tag only exists in this document.
				if ( lexiasFrequency == 1 ) { // Only one lexia with that tag.
					var toolTip = lexiasFrequency + " excerpt in this " ;
				}
				else { // More than one lexia, only in this document.
					var toolTip = lexiasFrequency + " excerpts in this " ;
				}
			}
			else { // Tag exists in other documents too. If so, there must be at least two excerpts.
				var toolTip = lexiasFrequency + " excerpts in " + documentsFrequency ;
			}
			toolTip += ( documentsFrequency > 1 )? " documents" : " document" ;
		}
		catch(e) {
			var toolTip = "[documentsFrequency failed to load!]" ;
		}
		this.setAttribute( 'title', toolTip ) ;
	}
	// Add replace link to cloud.
	this.tagBox.appendChild(this.replaceLink) ;
	this.replaceLink.appendChild( this.replaceText ) ;
	/* _______ Add a space to separate tags. _______*/
	this.containerEle.appendChild(document.createTextNode(" ")) ;
}
function registerTags() {
	// This function adds tag properties to dynamic menu.
	/*__________ Loop through all items in menu, registering tags and adding inline navigation. __________*/
	for (var itemCounter=0; itemCounter < homeMenu.itemManager.length; itemCounter++) {
		// Check whether this item has any tags. Introduction, notes, or superlinks may not.
		if ( homeMenu.itemManager[itemCounter].htmlElement.getAttribute("tags") != null) {
			thoughtMesh.tagsFromItem[ homeMenu.itemManager[itemCounter].htmlElement.id ] = homeMenu.itemManager[itemCounter].htmlElement.getAttribute("tags").split(",") ;
			// Loop through all tags for that item.
			for (var newTagCounter=0; newTagCounter < thoughtMesh.tagsFromItem[ homeMenu.itemManager[itemCounter].htmlElement.id ].length; newTagCounter++) {
				var thisTag = thoughtMesh.tagsFromItem[ homeMenu.itemManager[itemCounter].htmlElement.id ][newTagCounter].toString() ; // Tag as string; supposed to prevent tags like "1973" from being misread as numerical indices to arrays, but doesn't work. UPGRADE: omit?
				thisTag = thisTag.trim() ; // Tag with whitespace removed.
				thoughtMesh.tagsFromItem[ homeMenu.itemManager[itemCounter].htmlElement.id ][newTagCounter] = thisTag ; // Add trimmed tag back into tagsFromItem array for future use.
				if ( typeof thoughtMesh.itemsFromTag[ thisTag ] == "undefined") { // This tag has not yet been registered.
					thoughtMesh.itemsFromTag[ thisTag ] = new Array() ;
					thoughtMesh.uniqueTags.push( thisTag ) ;
				}
				thoughtMesh.itemsFromTag[ thisTag ].push( homeMenu.itemManager[itemCounter] ) ;
			}; // End loop through tags for that item.
			// Add navigation to top and bottom of content div if requested.
			if ( homeMenu.autogenerateInlineNavigation == "none" || (homeMenu.autogenerateInlineNavigation == "allButFirst" && itemCounter==0) ) {
				// Don't add navigation.
			}
			else {
				addInlineNavigation({ menuItem: homeMenu.itemManager[itemCounter], menuEleId: homeMenu.htmlElement.id, hasTags: true }) ;
			}
		} // End check for tag existence.
		else {
			// If there are no tags, give it a default (empty) array; it will report length = 0.
			thoughtMesh.tagsFromItem[ homeMenu.itemManager[itemCounter].htmlElement.id ] = new Array() ;
			// Add navigation to top and bottom of content div if requested.
			if ( homeMenu.autogenerateInlineNavigation == "none" || (homeMenu.autogenerateInlineNavigation == "allButFirst" && itemCounter==0) ) {
				// Don't add navigation.
			}
			else {
				addInlineNavigation({ menuItem: homeMenu.itemManager[itemCounter], menuEleId: homeMenu.htmlElement.id, hasTags: false }) ;
			}
		}
	}; // End loop through items.
	// First sort unique tags by frequency to get max and min values for normalizing tag size.
	thoughtMesh.uniqueTags.sort( sortTagsNumerically ) ;
	thoughtMesh.tagFrequencyMin = 0;
	thoughtMesh.tagFrequencyMax = 0;
	if (typeof(thoughtMesh.itemsFromTag[ thoughtMesh.uniqueTags[0] ]) != 'undefined') {
	  thoughtMesh.tagFrequencyMin = thoughtMesh.itemsFromTag[ thoughtMesh.uniqueTags[0] ].length;
	  thoughtMesh.tagFrequencyMax = thoughtMesh.itemsFromTag[  thoughtMesh.uniqueTags[ thoughtMesh.uniqueTags.length-1 ]  ].length ;
	}
	// Now sort unique tags alphabetically (default).
	thoughtMesh.uniqueTags.sort( sortAlphabeticallyWithoutCase ) ;
	// Now add tags to cloud.
	for (var tagCounter=0; tagCounter < thoughtMesh.uniqueTags.length; tagCounter++) {
		var thisTagFrequency = thoughtMesh.itemsFromTag[ thoughtMesh.uniqueTags[tagCounter] ].length ;
		var thisCloudTag = new CloudTag({
			containerEle: document.getElementById("home-cloud"),
			tag: thoughtMesh.uniqueTags[tagCounter],
			frequency: thoughtMesh.itemsFromTag[ thoughtMesh.uniqueTags[tagCounter] ].length,
			size: setTagSize( {
				frequency:thisTagFrequency,
				minimum:thoughtMesh.tagFrequencyMin,
				maximum:thoughtMesh.tagFrequencyMax
			})
		}) ;
		thoughtMesh.tagObjs.push( thisCloudTag ) ;
		// Enable recovery of cloudTagObj from its name, for use in style highlighting--eg, thoughtMesh.tagObjs.getObjectByTag["technology"].
		thoughtMesh.tagObjs.getObjectByTag[ thoughtMesh.uniqueTags[tagCounter] ] = thisCloudTag ;
	}
}
function DocumentCitation(argObj) {
	// Register arguments.
	this.containerEle = (typeof argObj.containerEle == "undefined")? "[no container Element defined]" : argObj.containerEle ;
	this.author = (typeof argObj.author == "undefined")? "[no author defined]" : argObj.author ;
	this.title = (typeof argObj.title == "undefined")? "[no title defined]" : argObj.title ;
	this.authorAndTitle = document.createElement("div") ;
	this.authorAndTitle.className = "author-and-title" ;
	this.authorAndTitle.innerHTML = this.author + ", &quot;" + this.title + "&quot; " ;
	this.containerEle.appendChild( this.authorAndTitle ) ;
}
function LexiaExcerpt( argObj ) {
	// Register arguments.
	this.containerEle = (typeof argObj.containerEle == "undefined")? "[no container Element defined]" : argObj.containerEle ;
	this.headingText =  (typeof argObj.headingText == "undefined")? "[no heading text defined]" : argObj.headingText ;
	this.isOutside = (typeof argObj.isOutside == "undefined" ||  !argObj.isOutside )? false : true ;
	this.itemEle = (typeof argObj.itemEle == "undefined")? "[no item element defined]" : argObj.itemEle ; // A kludge, but it should throw an illuminating error.
	this.lexiaText = (typeof argObj.lexiaText == "undefined")? "[no lexia text defined]" : argObj.lexiaText ;
	// Create the lexia div.
	this.excerptDiv = document.createElement("div") ;
	this.containerEle.appendChild( this.excerptDiv ) ;
	this.excerptDiv.className = "lexia-excerpt" ;
	// Add a means of recovering the corresponding menu item from the div, for use in the onclick function.
	this.excerptDiv.lexiaObj = this ;
	// Create the heading link.
	this.headingLink = document.createElement("a") ;
	this.excerptDiv.appendChild( this.headingLink ) ;
	this.headingLink.appendChild( document.createTextNode(this.headingText) ) ;
	if( this.isOutside ) {
		// Start with url passed by ajax data on related outside lexias.
		this.headingLink.referredUrl =  (typeof argObj.url == "undefined")? "[no url defined]" : argObj.url ;
		this.headingLink.referredAnchor =  (typeof argObj.anchor == "undefined")? "[no anchor defined]" : argObj.anchor ;
		// Then add any tags currently selected, so remote ThoughtMesh will activate them too.
		var selectedTagsVar = "" ;
		if ( thoughtMesh.selectedTags.length > 0 ) { // User has selected some tags.
			selectedTagsVar += thoughtMesh.selectedTags[0].tag
			for (var tagObjCounter=1; tagObjCounter < thoughtMesh.selectedTags.length; tagObjCounter++) {
				selectedTagsVar += "&" + thoughtMesh.selectedTags[tagObjCounter].tag
			};
			this.headingLink.referredUrl += "?" + selectedTagsVar + "#" + this.headingLink.referredAnchor ;
		};
		this.headingLink.href =  this.headingLink.referredUrl ; // UPGRADE: Check for existence?
	}
	else {
		this.headingLink.href = "#" ;
		this.headingLink.onclick = function() { respondAsIf( this.parentNode.lexiaObj.itemEle ) } ;
	}
	// Not using w3c method enables highlighting inside search returns :(
	// this.excerptDiv.appendChild( document.createTextNode(this.lexiaText) ) ;
	this.lexiaHTML = document.createElement("div") ;
	this.lexiaHTML.innerHTML = this.lexiaText ;
	this.excerptDiv.appendChild( this.lexiaHTML ) ;
}
lexiaExcerptObjs = [] ;
lexiaExcerptOutObjs = [] ;
tabs = [] ;
function Tab( argObj ) {
	// UPGRADE: build DOM tabs here too?
	tabs.push( argObj ) ;
	tabs[ argObj.id ] = argObj ;
}
new Tab( {id: "tab-here", presentationId: "lexias-here", isShowing: true } ) ;
new Tab( {id: "tab-out", presentationId: "lexias-out", isShowing: true } ) ;
new Tab( {id: "tab-search", presentationId: "search-here", isShowing: true } ) ;
new Tab( {id: "tab-trace", presentationId: "trace", isShowing: true } ) ;
/************************* Manage document and author Meshes.*************************/
function initializeSubmeshes () { // Called for a document Mesh.
	// This function is always called after the first Telamon call in loadMesh, even if a document does not belong to a submesh.
	// documentGroups and primaryGroup are defined in JSON delivered in the initial Telamon call at the end of loadMesh function.
	thoughtMesh.submeshes = ( typeof documentGroups != "undefined" )? documentGroups :  "[No submeshes specified!]" ; // Specifies which submeshes this essay belongs to--defined in HTML document.
	if (typeof thoughtMesh.hasLexiasHere == "undefined") thoughtMesh.hasLexiasHere = true ; // False only if used in a Mesh home or other context without in-page content.
	// UPGRADE: REMOVE AFTER CRAIG FIXES JSON BUG:
	thoughtMesh.currentGroup = primaryGroup ; // This is the default, consisting of all submeshes. Clicking on a radio button in the "outside lexias" tab will change this.
	/*__________ Create buttons to filter for each submesh this essay belongs to. __________*/
	if ( countProperties( thoughtMesh.submeshes ) > 1 ) { 	// All documents should have default group of 0, which is all submeshes. submeshes is passed as an object, so can't use .length
		for (var group in thoughtMesh.submeshes) {
			new GroupFilter(thoughtMesh.submeshes[ group ]) ;
			// THIS REPLACED THE FOLLOWING DEFINITION OF primaryGroup--though no existence check for primaryGroup yet. thoughtMesh.currentGroup = thoughtMesh.submeshes[ group ].groupId ; // This will default submesh selection to the last submesh in the thoughtMesh.submeshes object (if it were an array it would be more flexible).
		} ;
	} ;
	checkSubmeshButton(thoughtMesh.currentGroup) ;
	/*__________ Load remote (up-to-date) submesh style and images, if appropriate. __________*/
	// Note: the choice of the submesh's open and closed triangles (green, red, etc) is defined in the Mesh stylesheet, and the actual images are defined online.
	if ( primaryGroup > 0 && thoughtMesh.hasLexiasHere ) {
		addSubmeshStyle( {isOffline: false} ) ;
	}
}
function initializeAuthorMesh () { // Called for an author home page.
	thoughtMesh.thisAuthor = new AuthorFilter( {authorId: thoughtMesh.authorId, authorWritten: thoughtMesh.authorWritten}) ;
	thoughtMesh.allAuthors = new AuthorFilter( {authorId: 0, authorWritten: "All authors"}) ;
	checkAuthorButton(thoughtMesh.authorId) ; // This sets radio buttons and sets thoughtMesh.wantFilteredForAuthor to true.
}
function addSubmeshStyle( argObj ) {

	var isOffline = (typeof argObj.isOffline == "undefined")? telamon.offline : argObj.isOffline ;
	// primaryGroup is an integer defined in the telamon call in loadMesh.

	var submeshLogoURL = '';
	var submeshBackgroundURL = '';
	var submeshPath = (isOffline)? "uploaded/group_" + primaryGroup + "/" : "http://thoughtmesh.net/publish/uploaded/group_" + primaryGroup + "/" ;
	if (documentGroups["group_" + primaryGroup].groupImage.length > 0) {
		submeshLogoURL = (isOffline)? "uploaded/group_" + primaryGroup + "/logo.png" : documentGroups["group_" + primaryGroup].groupImage ;
	}

	if (documentGroups["group_" + primaryGroup].groupBackgroundImage.length > 0) {
		submeshBackgroundURL = (isOffline)? "uploaded/group_" + primaryGroup + "/background.jpg" : documentGroups["group_" + primaryGroup].groupBackgroundImage ;
	}

	// Strip out custom stylesheet, if it exists.
	var styles = document.getElementsByTagName("link") ;
	if (styles.length > 1) {
		styles[1].href = '' ; // Safari doesn't permit you to remove stylesheets as in the line below, so this is a safeguard.
		styles[1].parentNode.removeChild(styles[1]) ; // Note: this assumes all links are styles, ie styles[i].getAttribute("rel").indexOf("style") != -1.
	}
	// Add submesh stylesheet if it exists, as declared in JSON.
	if (documentGroups["group_" + primaryGroup].defaultStylesheet != '') {
		var submeshStylesheetLink = document.createElement("link") ;
		submeshStylesheetLink.type = "text/css" ;
		submeshStylesheetLink.rel = "stylesheet" ;
		submeshStylesheetLink.href = submeshPath + "default.css" ;
		submeshStylesheetLink.media = "screen" ;
		document.getElementsByTagName("head")[0].appendChild(submeshStylesheetLink) ;
	}
	// UPGRADE: check for existence of these files before adding them.
	// Add submesh background (watermark) image. So as not to overwrite a body background color, this is done in parts. Note different file extensions.
	document.body.style.backgroundImage = "url(" + submeshBackgroundURL + ")" ;
	document.body.style.backgroundRepeat = "repeat-x" ;
	// Add link to submesh public page; this will wrap the submesh logo.
	var submeshLogoLink = document.createElement("a") ;
	submeshLogoLink.href = "http://vectors.usc.edu/thoughtmesh/meshes.php?group=" + primaryGroup ;
	// Add submesh logo image. (Not added as background to div, because that seems to screw up transparent logos.)
	if (submeshLogoURL.length > 0) {
		var submeshLogoImage = document.createElement("img") ;
		submeshLogoImage.src = submeshLogoURL ;
		submeshLogoLink.appendChild(submeshLogoImage) ;
		document.getElementById("logo").appendChild(submeshLogoLink) ;
		// Craig addition: check the height of the submesh logo against a hard-coded
		// value.. if it is too short, then add bottom margin so that the top of the title
		// aligns with the top of the mesh cloud box.  This is a good way to keep things
		// dynamic and from having to make custom images
		// Also: hard-code a dependancy for the National Poetry Foundation (group 2)
		// logo, which requires more space at the top.
	    submeshLogoImage.pass_primaryGroup = primaryGroup;
	    submeshLogoImage.onload = function() {
	      var target_height, amount_to_go;
	      var logo_obj = document.getElementById("logo");
	      var current_height = parseInt(this.height);
	      if (this.pass_primaryGroup == 2) { // NPF
	        target_height = 89; // NOTE: hard-coded value
	        if (target_height > current_height) {
	          amount_to_go = target_height - current_height;
	          logo_obj.style.marginTop = amount_to_go + 'px';
	          logo_obj.style.marginBottom = '22px'; // NOTE: hard-coded value
	        }
	      } else if (this.pass_primaryGroup == 89) { // CCS
	        target_height = 69; // NOTE: hard-coded value
	        if (target_height > current_height) {
	          amount_to_go = target_height - current_height;
	          logo_obj.style.marginBottom = amount_to_go+'px'; // NOTE: hard-coded value
	        }	        
	        document.getElementById("lexias").style.top = '85px'; // NOTE: hard-coded value
	      } else { // All groups besides #2
	        target_height = 112; // NOTE: hard-coded value
	        if (target_height > current_height) {
	          amount_to_go = target_height - current_height;
	          logo_obj = document.getElementById("logo");
	          logo_obj.style.marginBottom = amount_to_go + 'px';
	        }
	      }
	    }
	    document.getElementById("navigation").style.marginBottom = thoughtMesh.navigationMarginBottomPix ;
	}
	if (submeshBackgroundURL.length) {
		document.getElementById("lexias").style.top = thoughtMesh.lexiasTopPix ;
	}
}
function showOutsideLexiasFiltered (argObj) {
	if (telamon.offline) {
		document.getElementById("lexias-out-warning").innerHTML = "<span class='warning'>You appear to be offline, so this feature is not available.</span> Please enable Internet and reload this page to use this feature." ;
	}
	else {
		if (thoughtMesh.isAuthorMesh) {
			var authorId = (typeof argObj.authorId == "undefined")? "[No authorId defined!]" : argObj.authorId ;
			if (authorId == 0 || authorId == '[No authorId defined!]') {
				telamon.get( thoughtMesh.outsideLexiasUrl, {tag: thoughtMesh.tagList }, "outsideLexiasFun(); showOutsideLexias();" )
			}
			else {
				telamon.get( thoughtMesh.outsideLexiasUrl, {tag: thoughtMesh.tagList, authorid: thoughtMesh.authorId }, "outsideLexiasFun(); showOutsideLexias();" );
			}
		}
		else { // It's a document Mesh.
		    var pg = (typeof(thoughtMesh.currentGroup) != 'undefined') ? thoughtMesh.currentGroup : 0;
			telamon.get( thoughtMesh.outsideLexiasUrl, {tag: thoughtMesh.tagList, documentid: thoughtMesh.id, groupid: pg }, "outsideLexiasFun(); showOutsideLexias();" ); // tagList is a comma-delimited 		string.
		}
	}
}
function filterResults (argObj) {
	var authorIdVar = (typeof argObj.authorId == "undefined")? "[No authorId defined!]" : argObj.authorId ; // An authorId of zero means all authors.
	var filterInputEle = (typeof argObj.filterInputEle == "undefined")? "[No filterInputEle defined!]" : argObj.filterInputEle ;
	if (thoughtMesh.isAuthorMesh) {
		document.getElementById("lexias-out-listing").innerHTML = "" ;
		// Only get outside lexias if a tag has been chosen.
		if (thoughtMesh.selectedTags.length > 0) {
			showOutsideLexiasFiltered( {authorId: authorIdVar} ) ;
		}
		// Reset checkboxes.
		checkAuthorButton(authorIdVar) ;
	}
	else { // It's a document Mesh.
		// Show only articles that match the submesh chosen by the user.
		thoughtMesh.currentGroup = filterInputEle.value ;
		document.getElementById("lexias-out-listing").innerHTML = "" ;
		// Only get outside lexias if a tag has been chosen.
		if (thoughtMesh.selectedTags.length > 0) {
			showOutsideLexiasFiltered() ;
		}
		// Reset checkboxes.
		checkSubmeshButton(filterInputEle.value) ;
	}
}
function GroupFilter( groupObj ) {
	/*__________ Add this filter to the groupObj that is part of thoughtMesh.submeshes. __________*/
	groupObj.filter = this ;
	/*__________ Register arguments. __________*/
	this.id = (typeof groupObj.groupId == "undefined")? "[no group id defined!]" : groupObj.groupId ; // An integer; zero is "all submeshes".
	this.name = (typeof groupObj.groupName == "undefined")? "[no group name defined!]" : groupObj.groupName ;
	this.url = (typeof groupObj.groupUrl == "undefined")? "[no group url defined!]" : groupObj.groupUrl ;
	/*__________ Create elements and define their parameters. __________*/
	this.groupFilterDiv = document.createElement("div") ;
	this.input = document.createElement("input") ;
	this.input.type = "radio" ;
	this.input.value = this.id ;
	this.input.onclick = function() { filterResults( {filterInputEle: this} ) } ;
	this.text = document.createTextNode( this.name + " ") ;
	this.link = document.createElement("a") ;
	this.linkText = document.createTextNode( "[link]" ) ;
	this.link.href = this.url ;
	this.link.target = "_blank" ;
	this.link.className = "submesh-home-link" ;
	/*__________ Append newly created elements. __________*/
	document.getElementById("submesh-form").appendChild( this.groupFilterDiv ) ;
	this.groupFilterDiv.appendChild( this.input ) ;
	this.groupFilterDiv.appendChild( this.text ) ;
	this.groupFilterDiv.appendChild( this.link ) ;
	this.link.appendChild( this.linkText ) ;
}
function AuthorFilter( argObj ) {
	/*__________ Register arguments. __________*/
	this.authorId = (typeof argObj.authorId == "undefined")? "[No authorId defined!]" : argObj.authorId ; // An authorId of zero means all authors.
	/*__________ Create elements and define their parameters. __________*/
	this.authorFilterDiv = document.createElement("div") ;
	this.input = document.createElement("input") ;
	this.input.type = "radio" ;
	this.input.value = this.authorId ;
	this.input.onclick = function() {
		_this_value = this.value; debug("_this_value", 2) ;
		filterResults( {authorId: this.value} ) ;
	} ;
	this.text = document.createTextNode( argObj.authorWritten ) ;
	/*__________ Append newly created elements. __________*/
	document.getElementById("submesh-form").appendChild( this.authorFilterDiv ) ;
	this.authorFilterDiv.appendChild( this.input ) ;
	this.authorFilterDiv.appendChild( this.text ) ;
}
/************************* Respond to user choices.*************************/
function respondToTag( argObj ) {
	/*________________________ Prepare.________________________*/
	// Register some variables.
	var tagArg =  (typeof argObj.tagArg == "undefined")? "[no tagArg passed!]" : argObj.tagArg ;
	var linkType = (typeof argObj.linkType == "undefined")? "[no linkType passed]" : argObj.linkType ;
	if (typeof thoughtMesh.hasLexiasHere == "undefined") thoughtMesh.hasLexiasHere = true ; // Must be set to false in home page and Mesh page HTML.
	debug("thoughtMesh.hasLexiasHere")
	// Focus correct tab.
	if ( !tabs["tab-out"].isShowing ) {
		respondToTab( document.getElementById("tab-here") ) ;
	}
	// Clear out old lexias.
	document.getElementById("lexias-here").innerHTML = "" ;
	document.getElementById("lexias-out-listing").innerHTML = "" ;
	lexiaExcerptObjs = [] ;
	/*________________________ Adjust tag styles.________________________*/
	switch (linkType) {
		case "replace": // Replacing old tags with a single new tag.
			// Reset all styles.
			for (var tagCounter=0; tagCounter < thoughtMesh.tagObjs.length; tagCounter++) {
				thoughtMesh.tagObjs[tagCounter].replaceLink.className = "cloud-tag" ;
				thoughtMesh.tagObjs[tagCounter].plusLink.style.display = "inline" ;
				thoughtMesh.tagObjs[tagCounter].minusLink.className = "cloud-tag" ;
				thoughtMesh.tagObjs[tagCounter].minusLink.style.display = "none" ;
				try {
					thoughtMesh.tagObjs[tagCounter].blankLink.style.display = "none" ;
				}
				catch(e) {
					// UPGRADE: log this?
				}
			}
			// Style this tag.
			thoughtMesh.tagObjs.getObjectByTag[tagArg].replaceLink.className = "cloud-tag-selected" ;
			thoughtMesh.tagObjs.getObjectByTag[tagArg].plusLink.style.display = "none" ;
			thoughtMesh.tagObjs.getObjectByTag[tagArg].minusLink.style.display = "inline" ;
			thoughtMesh.tagObjs.getObjectByTag[tagArg].minusLink.className = "cloud-tag-selected" ;
			// If starting over from a new tag, wipe out the old one.
			thoughtMesh.selectedTags = [] ;
			thoughtMesh.selectedTags.push( {tag: tagArg, integer: 0} ) ; // thoughtMesh.selectedTags is a manager of objects with integer index and tag name properties.
			thoughtMesh.selectedTags.getObjectByTag = {} ;
			thoughtMesh.selectedTags.getObjectByTag[tagArg] = thoughtMesh.selectedTags[0] ;
			break ;
		case "plus": // Adding a tag in combination.
			// Register new tag. Currently no limitation on number, but they always intersect.
			thoughtMesh.selectedTags.push( {tag: tagArg, integer: thoughtMesh.selectedTags.length} ) ;
			// Enable recovery of array index from the tag name, for use in subtracting tag below.
			thoughtMesh.selectedTags.getObjectByTag[tagArg] = thoughtMesh.selectedTags[ thoughtMesh.selectedTags.length-1 ] ; // This is an object.
			// Style this tag.
			thoughtMesh.tagObjs.getObjectByTag[tagArg].replaceLink.className = "cloud-tag-selected" ;
			thoughtMesh.tagObjs.getObjectByTag[tagArg].plusLink.style.display = "none" ;
			thoughtMesh.tagObjs.getObjectByTag[tagArg].minusLink.className = "cloud-tag-selected" ;
			thoughtMesh.tagObjs.getObjectByTag[tagArg].minusLink.style.display = "inline" ;
			thoughtMesh.tagObjs.getObjectByTag[tagArg].blankLink.style.display = "none" ;
			break ;
		case "minus": // Subtracting a tag in combination.
			thoughtMesh.selectedTags.splice( thoughtMesh.selectedTags.getObjectByTag[tagArg].integer, 1 ) ;
			// The above changes the .integer property of each subsequent tag, so pop the rest of them up to compensate.
			for (var remainingTagCounter=thoughtMesh.selectedTags.getObjectByTag[tagArg].integer; remainingTagCounter < thoughtMesh.selectedTags.length; remainingTagCounter++) {
				thoughtMesh.selectedTags[remainingTagCounter].integer = remainingTagCounter ;
			};
			// Reset this tag to normal styles.
			thoughtMesh.tagObjs.getObjectByTag[tagArg].replaceLink.className = "cloud-tag" ;
			thoughtMesh.tagObjs.getObjectByTag[tagArg].plusLink.style.display = "inline" ;
			thoughtMesh.tagObjs.getObjectByTag[tagArg].minusLink.className = "cloud-tag-selected" ;
			thoughtMesh.tagObjs.getObjectByTag[tagArg].minusLink.style.display = "none" ;
			thoughtMesh.tagObjs.getObjectByTag[tagArg].blankLink.style.display = "none" ;
			break ;
	}
	// Hide content.
	if (thoughtMesh.hasLexiasHere) document.getElementById('content').style.display="none" ;
	/*________________________ Identify and show matching lexias in.________________________*/
	if (thoughtMesh.hasLexiasHere) { // Traps cases with no lexias in the immediate document, eg when building a tag cloud on the home page.
		// Loop through menu items.
		nextItemLabel:
		for (var itemCounter=0; itemCounter < homeMenu.itemManager.length; itemCounter++) {
			var thisItemEle = homeMenu.itemManager[itemCounter].htmlElement ;
			if ( thoughtMesh.tagsFromItem[ thisItemEle.id ].length == 0 ) { // Eliminates menu items without tags.
				continue nextItemLabel ; // Skips to next menu item.
			}
			else {
				homeMenu.itemManager[itemCounter].selectedViaTags = false ; // Temporary assignment, usually contradicted below.
				// Loop through the selected tags in the cloud.
				for (var cloudTagCounter=0; cloudTagCounter < thoughtMesh.selectedTags.length; cloudTagCounter++) {
					homeMenu.itemManager[itemCounter].selectedViaTags = false ;
					// Loop through that item's tags.
					for (var itemTagCounter=0; itemTagCounter < thoughtMesh.tagsFromItem[ thisItemEle.id ].length; itemTagCounter++) {
						// If an item's tag does not match any one of the selected tags, mark it for non-highlight.
						if ( thoughtMesh.tagsFromItem[ thisItemEle.id ][itemTagCounter] == thoughtMesh.selectedTags[cloudTagCounter].tag ) {
							// A match!
							homeMenu.itemManager[itemCounter].selectedViaTags = true ;
						}
						else {
							// Continue with false.
						}
					}
					if ( !homeMenu.itemManager[itemCounter].selectedViaTags ) {
						continue nextItemLabel ;
					}
				}
				if (homeMenu.itemManager[itemCounter].selectedViaTags ) {
					// Strip out HTML.
					var lexiaTextClean = getInnerText( homeMenu.itemManager[itemCounter].content.innerHTML ) ;
					// Strip out "next Lexia" link.
					if (lexiaTextClean.indexOf("Next &gt;") != -1) {
						var startLexia =  lexiaTextClean.indexOf("Next &gt;") + 10 ; // Add number of characters necessary to go past initial link.
					}
					else {
						var startLexia =  0 ;
					}
					// JS trivia: substring takes end point as second argument; substr takes number of characters to include.
					lexiaTextClean = lexiaTextClean.substr( startLexia, 300 )  + "..." ;
					var lexiaExcerptObj = new LexiaExcerpt( {
						containerEle: document.getElementById("lexias-here"),
						headingText: thisItemEle.innerHTML,
						itemEle: thisItemEle,
						lexiaText: lexiaTextClean
					} ) ;
					// Add to excerpt manager.
					lexiaExcerptObjs.push(lexiaExcerptObj) ;
					// Create a handle that looks like lexiaExcerptsObj["introduction"].
					lexiaExcerptObjs[lexiaExcerptObj.itemEle.id] = lexiaExcerptObj ;
				}
			}
		}
		if (lexiaExcerptObjs.length == 0 ) {
			warnNoMatch( { tagArray: thoughtMesh.selectedTags, presentationId: "lexias-here" } ) ;
		}
	}
	/*________________________ Identify and show matching lexias out.________________________*/
	if ( typeof thoughtMesh.selectedTags[0] != "undefined") {
		// UPGRADE: replace below with thoughtMesh.tagList = thoughtMesh.selectedTags.toString()
		thoughtMesh.tagList = thoughtMesh.selectedTags[0].tag ;
		for (var tagCounter=1; tagCounter < thoughtMesh.selectedTags.length; tagCounter++) {
			thoughtMesh.tagList += "," + thoughtMesh.selectedTags[tagCounter].tag ;
		};
		if( thoughtMesh.method == "telamon") {
			if (telamon.offline) {
				document.getElementById("lexias-out-warning").innerHTML = "<span class='warning'>You appear to be offline, so this feature is not available.</span> Please enable Internet and reload this page to use this feature." ;
			}
			else {
				if ( thoughtMesh.isAuthorMesh ) {
					if ( thoughtMesh.wantFilteredForAuthor ) {
						showOutsideLexiasFiltered( {authorId: thoughtMesh.authorId} ) ;
					}
					else { // Show all authors.
						showOutsideLexiasFiltered( {authorId: 0} ) ;
					}
				}
				else {
					showOutsideLexiasFiltered() ;
				}
			}
		}
		if( thoughtMesh.method == "custom") {
			outsideLexiasFun() ;
			showOutsideLexias() ;
		}
		if( thoughtMesh.method == "standalone") {
			document.getElementById("lexias-out-warning").innerHTML = "<span class='warning'>This page has no outside excerpts.</span>" ; // Default--move?
		}
	}
	else {
		document.getElementById("lexias-out-warning").innerHTML = "Pick a tag to see related excerpts." ;
		document.getElementById("lexias-here").innerHTML = "Pick a tag to see related excerpts." ;
		// Make plusses go away.
		for (var tagCounter=0; tagCounter < thoughtMesh.tagObjs.length; tagCounter++) {
			thoughtMesh.tagObjs[tagCounter].plusLink.style.display = "none" ;
			thoughtMesh.tagObjs[tagCounter].blankLink.style.display = "inline" ;
		}
	}
};
function respondToTagInContent( linkEle ) {
	respondToTag({tagArg: linkEle.firstChild.nodeValue , linkType: 'replace'});
	hideCloud({ wantClosed: false }) ;
}
function hideCloud(cloudHeaderEle, wantClosed) { // DEPRECATED: cloudHeaderEle is no longer necessary; could be useful in future if more than one cloud?
	if (wantClosed) {
		document.getElementById("thoughtmesh-title-id").className = "thoughtmesh-title-closed" ;
		document.getElementById("cloud-container").style.display = "none" ;
		cloudHeaderEle.onmouseover = function() {this.getElementsByTagName("div")[0].className = 'thoughtmesh-title'} ;
		cloudHeaderEle.onmouseout = function() {this.getElementsByTagName("div")[0].className = 'thoughtmesh-title-closed'} ;

	}
	else { // You want it open.
		document.getElementById("thoughtmesh-title-id").className = "thoughtmesh-title" ;
		document.getElementById("cloud-container").style.display = "block" ;
		cloudHeaderEle.onmouseover = function() {this.getElementsByTagName("div")[0].className = 'thoughtmesh-title-closed'} ;
		cloudHeaderEle.onmouseout = function() {this.getElementsByTagName("div")[0].className = 'thoughtmesh-title'} ;
	}
}
function toggleCloud(cloudHeaderEle) {
	if ( document.getElementById("cloud-container").style.display != "none" ) { // Cloud is open (true on load).
		hideCloud(cloudHeaderEle, true) ;
	}
	else { // Cloud is closed.
		hideCloud(cloudHeaderEle, false) ;
	}
}
function respondToTab(tabEle) {
	// Reset all tabs and content to "off".
	for (var tabCounter=0; tabCounter < document.getElementById("tabs").getElementsByTagName("div").length; tabCounter++) {
		document.getElementById("tabs").getElementsByTagName("div")[tabCounter].className = "tab" ; // Default
		document.getElementById("tabs").getElementsByTagName("div")[tabCounter].style.borderBottomWidth = "0px" ;
	};
	for (var tabCounter=0; tabCounter < tabs.length; tabCounter++) {
		tabs[tabCounter].isShowing = false ;
		document.getElementById( tabs[tabCounter].presentationId ).style.display = "none" ;
	};
	// Highlight chosen content.
	tabEle.style.borderBottomWidth = "2px" ;
	tabs[tabEle.id].isShowing = true ;
	document.getElementById( tabs[tabEle.id].presentationId ).style.display = "block" ;
	// For outside lexias, fade tags to show which tags actually correspond to outside lexias in the mesh.
	for (var tagCounter=0; tagCounter < thoughtMesh.uniqueTags.length; tagCounter++) {
		if ( typeof numTaggedWith != "undefined" ) { // Checking for bad JSON. Necessary?
		//  && numTaggedWith.documents[ thoughtMesh.uniqueTags[tagCounter] ]  > 0 ) { // Removed from check above in v6.7.
			if (tabEle.id == "tab-out") { // User wants to see outside lexias.
			    // BELOW WAS MOVED BY CRAIG UP TWO LINES TO AVOID THE PUBLISH DOCS FROM CRASHING
				//if ( typeof numTaggedWith != "undefined") { // Make sure user is online.
					if ( numTaggedWith.documents[ thoughtMesh.uniqueTags[tagCounter] ] > 1 ) { // There are other documents with that tag. 
						// Changed from 1 to 0 in version 6.7, then back to 1 in 6.8. Note that this will register a false positive for an unpublished document's own tags.
						// Leave opaque.
						_tag = thoughtMesh.uniqueTags[tagCounter]; debug("_tag", 6) ;
						_numTaggedWith = numTaggedWith.documents[ thoughtMesh.uniqueTags[tagCounter] ]; debug("_numTaggedWith", 6) ;
					}
					else {
						if ( browsers.ie ) { // God-damned IE fails to style tagBox or apply opacity filter >:0
							// cloudthoughtMesh.tagObjs[ thoughtMesh.uniqueTags[tagCounter] ].tagBox.filters.item("DXImageTransform.Microsoft.Alpha").Opacity=20 ;
							// cloudthoughtMesh.tagObjs[ thoughtMesh.uniqueTags[tagCounter] ].tagBox.filters["DXImageTransform.Microsoft.Alpha"].Opacity=20 ;
							thoughtMesh.tagObjs.getObjectByTag[ thoughtMesh.uniqueTags[tagCounter] ].replaceLink.style.fontWeight = "normal" ;
							thoughtMesh.tagObjs.getObjectByTag[ thoughtMesh.uniqueTags[tagCounter] ].replaceLink.style.fontStyle = "italic" ;
						}
						else {
							thoughtMesh.tagObjs.getObjectByTag[ thoughtMesh.uniqueTags[tagCounter] ].tagBox.style.opacity = ".2" ;
						}
					}
				//}
			}
			else { // User chose a different tab than outside lexias.
				thoughtMesh.tagObjs.getObjectByTag[ thoughtMesh.uniqueTags[tagCounter] ].tagBox.style.opacity = "1" ;
				if ( browsers.ie ) { // God-damned IE fails to style tagBox or apply opacity filter >:0
					thoughtMesh.tagObjs.getObjectByTag[ thoughtMesh.uniqueTags[tagCounter] ].replaceLink.style.fontWeight = "bold" ; // KLUDGE. Damned IE!
					thoughtMesh.tagObjs.getObjectByTag[ thoughtMesh.uniqueTags[tagCounter] ].replaceLink.style.fontStyle = "normal" ; // KLUDGE.
				};
			};
		};
	};
}
function showOutsideLexias() { // thoughtMesh.selectedTags is a manager with a "tag" property.
	if (thoughtMesh.selectedTags[0]) {
		// Loop through documents in outsideLexiasObj.
		var outsideLexiasFound = false ;
		for (var documentProperty in outsideLexiasObj){
			outsideLexiasFound = true ;
			var documentCitation = new DocumentCitation( {
				containerEle: document.getElementById("lexias-out-listing"),
				author: outsideLexiasObj[documentProperty].author,
				title: outsideLexiasObj[documentProperty].title,
				url: outsideLexiasObj[documentProperty].url
			} ) ;
			// Loop through lexias in that document.
			for ( var lexiaProperty in outsideLexiasObj[documentProperty].lexias ) {
				var lexiaExcerptOutObj = new LexiaExcerpt( {
					containerEle: document.getElementById("lexias-out-listing"),
					url: outsideLexiasObj[documentProperty].url,
					headingText: outsideLexiasObj[documentProperty].lexias[lexiaProperty].heading,
					anchor: outsideLexiasObj[documentProperty].lexias[lexiaProperty].anchor,
					isOutside: true,
					lexiaText: outsideLexiasObj[documentProperty].lexias[lexiaProperty].excerpt
				} ) ;
				// Add to excerpt manager.
				lexiaExcerptOutObjs.push(lexiaExcerptOutObj) ;
				// Create a handle that looks like lexiaExcerptsObj["introduction"]. UPGRADE: NOT SURE IF THIS IS NEC.
				lexiaExcerptOutObjs[lexiaExcerptOutObj.itemEle.id] = lexiaExcerptOutObj ;
			}
		}
	}
	else {
		document.getElementById("lexias-out-warning").innerHTML = "Pick a tag to see related excerpts." ; // Default--move?
	}
	if ( !outsideLexiasFound ) {
		warnNoMatch( { tagArray: thoughtMesh.selectedTags, presentationId: "lexias-out-listing" } ) ;
	}
}
/************************* Other utilities.*************************/
function warnNoMatch( argObj ) {
		if (argObj.presentationId == "search-here") {
			var warningHTML =  "<h3> <span class='warning'>No excerpts contain that character combination.</span></h3>" ;
			document.getElementById("search-warning").innerHTML = warningHTML ;
		}
		else { // A tag combination.
			var tagList = "";
			for (var tagCounter=0; tagCounter < argObj.tagArray.length; tagCounter++) {
				tagList += argObj.tagArray[tagCounter].tag + " ";
			};
			var warningHTML =  "<h3>No excerpts match the tag combination <span class='warning'>" ;
			warningHTML += tagList ;
			warningHTML += ".</span></h3>" ;
			document.getElementById(argObj.presentationId).innerHTML = warningHTML ;
		}
}
function solicitHelp() {
	if ( confirm("ThoughtMesh is tag-based navigation for Web pages.\n\nCancel if you want to continue navigating this page.\n\nOr click OK to learn more at ThoughtMesh.net.") ) {
		document.location="http://thoughtmesh.net/help/";
	}
}
var htmlTagRegExp = /<\/?[^>]+>/gi;
function getInnerText(htmlArg){ // Because .innerText only works in IE.
	// Strip out HTML tags.
	htmlArg = htmlArg.replace(htmlTagRegExp,"");
	return htmlArg;
}
function searchFilter(searchString) { // Written to be independent of tag-based lexia navigation.
	/*________________________ Wait for three characters.________________________*/
	if (searchString.length < 3) {
		document.getElementById("search-warning").innerHTML = "Please type at least three characters." ;
	}
	else { // Proceed with search.
		/*________________________ Initialize some objects.________________________*/
		var regexObj = new RegExp(searchString, "i");
		regexObj.compile(searchString, "i");
		lexiaSearchedObjs = [] ;
		document.getElementById("search-warning").innerHTML = "" ;
		document.getElementById("search-results").innerHTML = "" ;
		/*________________________ If content contains string, add a lexia to search presentation.________________________*/
		for (var itemCounter=0; itemCounter < homeMenu.itemManager.length; itemCounter++) {
			var contentText = getInnerText( homeMenu.itemManager[itemCounter].content.innerHTML ) ;
			if ( regexObj.test(contentText) ) {
				// Find the first place where the string appears. Pick the smaller of the lowercase (default) and capitalized appearances.
				var firstStringOccurrence = contentText.indexOf( searchString ) ;
				var firstCapitalizedOccurrence = contentText.indexOf( searchString.substr(0,1).toUpperCase() + searchString.substr( 1, searchString.length-1 ) ) ;
				if ( firstCapitalizedOccurrence >= 0 ) { // A capital was found.
					if ( firstStringOccurrence < 0 || firstStringOccurrence > firstCapitalizedOccurrence ) { // Lowercase doesn't appear or is after capitalized appearance.
						firstStringOccurrence = firstCapitalizedOccurrence ;
					}
				}
				if (firstStringOccurrence > 20) { // So you don't ask for more characters at the beginning than you have.
				// substring takes as second arg the *position* you want to go from the beginning.
				// substr takes as second arg the *length* you want.
					var contentToDisplay = "..." + contentText.substring( firstStringOccurrence-20 , firstStringOccurrence ) ;
				}
				else { // String appears near the beginning, so start there.
					var contentToDisplay = contentText.substring( 0 , firstStringOccurrence ) ;
				}
				// Now add and highlight the word found.
				contentToDisplay += "<strong>" + contentText.substr( firstStringOccurrence, searchString.length ) + "</strong>" ;
				// Now add the rest of the excerpt, to a total of 300 characters. Subtract 17 to account for <strong></strong>.
				contentToDisplay += contentText.substr(  firstStringOccurrence + searchString.length , 300 - (contentToDisplay.length - 17) ) + "...";
				var lexiaExcerptObj = new LexiaExcerpt( {
					containerEle: document.getElementById("search-results"),
					headingText: homeMenu.itemManager[itemCounter].htmlElement.innerHTML,
					itemEle: homeMenu.itemManager[itemCounter].htmlElement,
					lexiaText: contentToDisplay
				} ) ;
				// Add to excerpt manager.
				lexiaSearchedObjs.push(lexiaExcerptObj) ;
				// Create a handle that looks like lexiaSearchedObjs["introduction"].
				lexiaSearchedObjs[lexiaExcerptObj.itemEle.id] = lexiaSearchedObjs ;
			}
		};
		if (lexiaSearchedObjs.length == 0 ) {
			warnNoMatch({ tagArray: thoughtMesh.selectedTags, presentationId: "search-here" } ) ;
		}
	} // End if search string long enough.
}
function addToMenuResponses() {
	// UPGRADE: Not sure if this will conflict with multi-menu implementations. Consider js_superclass...html to solve that.
	for (var itemCounter=0; itemCounter < homeMenu.itemManager.length; itemCounter++) {
		homeMenu.itemManager[itemCounter].associateResponse(   {
			responseFun: "hideCloud( document.getElementById('thoughtmesh-header-id'), true ); document.getElementById('content').style.display='block'"
		  }    ) ;
	};
}