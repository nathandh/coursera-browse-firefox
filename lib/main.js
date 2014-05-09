/**
CourseraBrowse v: 0.1.0	Firefox Version |	05/08/2014
----------------------------------------------------------
A Firefox Add-on that allows browsing of Coursera course
offerings utilizing the publicly available API:
https://tech.coursera.org/app-platform/catalog/

Disclaimer: This application is a 3rd party utilization
of the API, and is NOT an official application of Coursera.
As such, the API can change at any moment and cause the 
add-on (or parts of it) to break and stop working without
any advance notice.  

Developed by: Nathan D. Hernandez
			  nathandhernandez _@_ gmail(.com)
			  
===========================================================

background.js SPECIFIC:

This is the BACKEND javascript file which handles the storage
and communication logic for the add-on.

Interaction and ongoing communication exists between this 
file ('main.js') and the CONTENT javascript file: ('coursera_browse.js'). 
Specifically, when the panel is hidden by the end-user data and 
messages are sent HERE in order to save the current end-user BROWSE-state 
using the 'Firefox Simple Storage' api. 

STORAGE actually takes place here, and string-parsed JSON messages are 
passed back and forth in order to implement saving the browse state and
creating a better user experience.

version: 0.1.0	|	05/08/2014
	: Initial implementation completed.		@nathandh
**/

// Used to save our state and scroll position
// received from coursera_browse.js periodically
// through messaging
var browse_state = [];

// Used to save our attached link listeners
var link_listeners = [];

// Used to save our last Coursera categories retrieved
var last_categories = [];

// Firefox SimpleStorage
var ss = require("sdk/simple-storage");

// Firefox Add-on Simple Storage implementation
// see: https://developer.mozilla.org/en-US/Add-ons/SDK/High-Level_APIs/simple-storage
var ff_addonStorage = {
	/**
	Attempts to GET our browse_state from Firefox simple storage, if exists
	**/
	getBrowseState: function(callback){
		try{
			if (ss.storage.stored_browseState){
				console.log("stored_browseState found!");
				// just return our saved data for processing below
				callback(ss.storage.stored_browseState);
			} else {
				callback("0_browse_state");
			}
		} catch (e){
			console.log("Failure GETTING storage: " + e);	
			
					/**
					if(typeof(browse_state) == "undefined" || browse_state.length == 0){
						// We have no browse_state
						port.postMessage({response:"0_browse_state"});
						console.log("no BROWSE_STATE available!");
					} else {
						var _browseState_response = JSON.stringify(browse_state[0]);
						port.portMessage({browseState:_browseState_response});
						console.log("...sent browse_state reply: " + _browseState_response);
					}
					**/
		}
	},
	
	/**
	Attempts to SET our browse_state to Firefox simple storage
	**/
	setBrowseState: function(state_data){
		try{
			console.log("SET-BROWSE-STATE: " + state_data);
			ss.storage.stored_browseState = {stored_browseState:state_data};
			console.log("Saving browse_state...");
			console.log('browse_state was saved to "ss.stored_browseState" as: ' + state_data);			
		} catch (e){
			console.log("Failure SETTING storage: " + e);
		}
	},
	
	/**
	Attempts to GET our link_state from Firefox simple storage, if exists
	**/
	getLinkState: function(callback){
		try{
			if (ss.storage.stored_linkState){
				console.log("stored_linkState found!");
				// just return our saved data for processing below
				callback(ss.storage.stored_linkState);
			} else {
				callback("0_link_state");
			}		
		} catch (e){
			console.log("Failure GETTING storage: " + e);	
		}
	},
	
	/**
	Attempts to SET our link_state to Firefox simple storage
	**/
	setLinkState: function(state_data){
		try{
			console.log("SET-LINK-STATE: " + state_data);
			ss.storage.stored_linkState = {stored_linkState:state_data};
			console.log("Saving link_state...");
			console.log('link_state was saved to "ss.storage.stored_linkState" as: ' + state_data);		
		} catch (e){
			console.log("Failure SETTING storage: " + e);
		}
	},
	
	/**
	Attempts to GET our last_categories from Firefox simple storage, if exists
	**/
	getLastCategories: function(callback){
		try{
			if (ss.storage.stored_lastCategories){
				console.log("stored_lastCategories found!");
				// just return our saved data for processing below
				callback(ss.storage.stored_lastCategories);
			} else {
				callback("0_last_categories");
			}			
		} catch (e){
			console.log("Failure GETTING storage: " + e);	
		}
	},	

	/**
	Attempts to SET our last_categories to chrome.storage.local
	**/
	setLastCategories: function(category_data){
		try{
			console.log("SET-LAST-CATEGORIES: " + category_data);
			ss.storage.stored_lastCategories = {stored_lastCategories:category_data};
			console.log("Saving category_data...");
			console.log('category_data was saved to "ss.storage.stored_lastCategories" as: ' + category_data);
		} catch (e){
			console.log("Failure SETTING storage: " + e);
		}
	}	
}

// Firefox Add-On SDK specific:
// Our toggle button:
// https://developer.mozilla.org/en-US/Add-ons/SDK/Low-Level_APIs/ui_button_toggle
var { ToggleButton } = require("sdk/ui/button/toggle");

var panels = require("sdk/panel");
var self = require("sdk/self");

var button = ToggleButton({
	id: "coursera-browse",
	label: "CourseraBrowse v0.0.1",
    icon: {
      "16": "./img/courseraBrowse-logo_16.png",
      "32": "./img/courseraBrowse-logo_32.png",
	  "64": "./img/courseraBrowsw-logo_64.png"
    },
    onChange: handleChange
  });
   
 var panel = panels.Panel({
     width: 275,
	 height: 585,
	 contentScriptWhen: 'start',
	  contentURL: self.data.url("panel.html"),
	  contentScriptFile :[
		self.data.url("./js/jquery-2.1.0.min.js"),
		self.data.url("./js/coursera_browse.js")
	  ], 
	  onHide: handleHide
});

function handleChange(state) {
  console.log(state.label + " checked state: " + state.checked);
  if (state.checked) {
    panel.show({
      position: {
		top: 0,
		right: 20
	  }
    });
	panel.port.emit("show");
	messaging(true);
  } 
} 

function handleHide() {
  // Save our Browse state data:
  console.log("Panel hidden...main.js ...disconnecting...");
  
  // Save our last categories, calling internal function
  ff_addonStorage.setLastCategories(last_categories[0]);		
  // Save our storage state, calling internal function
  ff_addonStorage.setBrowseState(browse_state[0]);
  // Save out linkListener state, calling internal function
  ff_addonStorage.setLinkState(link_listeners[0]); 

  button.state('window', {checked: false});
  panel.port.emit("hide");
  messaging(false);
}

// Messaging implementation is here.
// Connect our app through Firefox port messaging
// see: https://developer.mozilla.org/en-US/Add-ons/SDK/Guides/Content_Scripts/using_port
/**
Some app defined recognized message types to make
sending messages a bit easier in our program:
	1) notification
	2) request
	3) response
	4) acknowledge
	5) browseState
	6) linkListeners
	7) lastCategories
**/
function messaging(active_status){
	if (active_status == true){
		panel.port.emit("notification", "background.js connecting for messaging...");
		panel.port.emit("notification", "...CourseraBrowse ver: 0.1.0...");
		
		panel.port.on("request", function handleRequest (request_msg){
			panel.port.emit("response", "Hello: Panel!");
			if (request_msg == "browse_state"){
				// We have a REQUEST for our BROWSE STATE
				console.log("...acting on BROWSE_STATE request....");
					
				// See if we have some synced data available in storage
				/**
					getBrowseState()'s callback function handles our reply
					and determines how we load our popup
				**/
				ff_addonStorage.getBrowseState(
					function(last_browseState){
						console.log("getBrowseState response():");
						console.log(last_browseState);
						if (last_browseState == "0_browse_state"){
							//console.log(last_browseState);
							panel.port.emit("browseStateResponse", "0_browse_state");
						} else if (typeof(last_browseState) == "undefined" || last_browseState == null || last_browseState.hasOwnProperty('stored_browseState') == false){
							//console.log(last_browseState);
							panel.port.emit("browseStateResponse", "0_browse_state");
						} else {
							console.log("LAST BROWSE state returned is: " + last_browseState);
							if(typeof(last_browseState.stored_browseState) == "undefined"){
								panel.port.emit("browseStateResponse", "0_browse_state");
							} else if (last_browseState.stored_browseState.length == 0){
								panel.port.emit("browseStateReponse", "0_browse_state");
							} else {
								// Send our storage back to coursera_browse.js to append to page DIV
								console.log("Replying with courseraDiv contents from storage....");
								var state_msg = JSON.stringify(last_browseState.stored_browseState)
								console.log(state_msg);
								panel.port.emit("browseStateUpdate", state_msg);
							}											
						}
				});	
			} else if (request_msg == "link_state"){
					// We have a REQUEST for our LINK STATE
					console.log("...acting on LINK_STATE request....");
					
					// See if we have some synced data available in storage
					/**
						getLinksState()'s callback function handles our reply
						and determines how we load our popup
					**/
				ff_addonStorage.getLinkState(
					function(last_linkState){
						console.log(last_linkState);
						if (last_linkState == "0_link_state"){
							panel.port.emit("linkStateResponse", "0_link_state");							
						} else if (typeof(last_linkState) == "undefined" || last_linkState == null || last_linkState.hasOwnProperty('stored_linkState') == false){
							panel.port.emit("linkStateResponse", "0_link_state");
						} else {
							console.log("LAST LINK state returned is: " + last_linkState);
							if(typeof(last_linkState.stored_linkState.links_ids) == "undefined"){
								panel.port.emit("linkStateResponse", "0_link_state");
							} else if (last_linkState.stored_linkState.links_ids.length == 0){
								panel.port.emit("linkStateResponse", "0_link_state");
							} else {
								// Send our storage back to coursera_browse.js to use
								console.log("Replying with linkState contents from storage....");
								var state_msg = JSON.stringify(last_linkState.stored_linkState)
								//console.log(state_msg);
								panel.port.emit("linkStateUpdate", state_msg);
							}											
						}
					
				});
			} else if (request_msg == "last_categories"){
				// We have a REQUEST for our LAST CATEGORIES
				console.log("...acting on LAST_CATEGORIES request....");
					
				// See if we have some synced data available in storage
				/**
					getLastCategories()'s callback function handles our reply
					and determines how we load our panel
				**/
				ff_addonStorage.getLastCategories(
					function(last_categoriesState){
						console.log(last_categoriesState);
						if (last_categoriesState == "0_last_categories"){
							panel.port.emit("lastCategoriesResponse", "0_last_categories");
						} else if (typeof(last_categoriesState) == "undefined" || last_categoriesState == null || last_categoriesState.hasOwnProperty('stored_lastCategories') == false){
							panel.port.emit("lastCategoriesResponse", "0_last_categories");
						} else {
							console.log("LAST CATEGORIES returned is: " + last_categoriesState);
							if(typeof(last_categoriesState.stored_lastCategories) == "undefined"){
								panel.port.emit("lastCategoriesResponse", "0_last_categories");
							} else if (last_categoriesState.stored_lastCategories.length == 0){
								panel.port.emit("lastCategoriesResponse", "0_last_categories");
							} else {
								// Send our storage back to coursera_browse.js to use
								console.log("Replying with lastCategories contents from storage....");
								var state_msg = JSON.stringify(last_categoriesState.stored_lastCategories)
								console.log(state_msg);
								panel.port.emit("lastCategoriesUpdate", state_msg);
							}											
						}
				});				
			} else {
				console.log("!coursera_browse.js UNHANDLED request: ", request_msg); 
			}	
		});
		
		panel.port.on("response", function handleResponse (response_msg){
			console.log("Response from 'coursera_browse.js': " + response_msg);
		});	
		
		panel.port.on("browseState", function handleBrowseState (state_data){
			console.log("!~~~~main.js has received browse_state message~~~~!");
			browse_state[0] = JSON.parse(state_data);
			//console.log("JSON parsed browse_state msg: " + browse_state[0].courseraDiv);
		});

		panel.port.on("linkListeners", function handleLinkState (state_data){
			console.log("!^^^^main.js has recieved link_listeners message^^^^!");
			link_listeners[0] = JSON.parse(state_data);
			//console.log("JSON parsed link_listeners msg: " + link_listeners[0]);
		});

		panel.port.on("lastCategories", function handleLastCategories (state_data){
			console.log("!^^^^main.js has recieved last_categories message^^^^!");
			last_categories[0] = JSON.parse(state_data);
			//console.log("JSON parsed last_categories msg: " + last_categories[0]);			
		});

		panel.port.on("resize", function handleResize(dimensions){
			console.log("Panel resize request from 'coursera_browse.js': width," + dimensions.width + "height," + dimensions.height);
			//panel.resize(dimensions.width, dimensions.height);
			panel.hide();
			panel.show({
				width: dimensions.width,
				height: dimensions.height,
				position: {
				top: 0,
				right: 20
			}});
		});
	} else if (active_status == false){
		// Remove our listeners
		//panel.port.removeListener("response", handleResponse);		
		//panel.port.removeListener("request", handleRequest);			
		//panel.port.removeListener("getAllCategories_Ajax", handleGetAllCategories_Ajax);
	}
}