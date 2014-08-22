/**
CourseraBrowse v: 0.1.1	Firefox version |	05/17/2014
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

coursera_browse.js SPECIFIC:

This is the front javascript file which handles the view for 
panel.html. Accordingly it makes AJAX requests to the Coursera
public API, and generates the HTML shown in the Firefox panel.

Interaction and ongoing communication exists between this 
file ('coursera_browse.js') and the Firefox SDK main script file: ('main.js'). 
Specifically, when the panel is closed (hidden) by the end-user data and 
messages are sent to 'background.js' in order to save the current
end-user BROWSE-state using the 'Firefox Simple Storage' api. In this
way, when the user re-opens the panel, they will be presented with
the last HTML view they had before they closed the add-on.

@Version HISTORY:
Firefox version: 0.1.0	|	05/08/2014
	: Initial Firefox implementation completed.		@nathandh

Firefox version: 0.1.1	|	05/17/2014				@nathandh
	: Re-factored code base to include sanitization of 
	  of data retrieved from the Coursera API.
	: Fixed several bugs including 1) failure to save course_count
	  on panel close in allCategories view, 2) failure to save
	  university info on panel close in categoryCourses view,
	  and 3) eliminated some duplication of code. 
**/
"use strict";
// Set to 'true' to output debug console.log messages
var $debug_ON = false;

// A globals array of objects to store our retrieved category values
var categories = [];
// Used to save our state and scroll position
var browse_state = [];
// Listener links
var link_listeners = {
	'links_ids' : [],
	'location' : ""
};

// Used to track whether we are waiting for sanitized HTML from main.js()
var awaiting_sanitize = false;
var sanitize_count = 0;

// Some flags to track browsing state
var in_getAllCategories = false;
var in_getCategoryCourses = false;
var in_getCourseDetails = false;

// Main Coursera API view implementation
var courseraBrowse = {
	
	getUniversityDetails: function(university_ids, callback, update_html){
		$debug_ON && console.log(university_ids);
		$debug_ON && console.log("Getting University(s) details!");
		
		var formatted_ids;
		
		$debug_ON && console.log("Array length is: " + university_ids.length);
		for (var i = 0; i < university_ids.length; i++){
			if (i == 0)
				formatted_ids = university_ids[0];
			else
				formatted_ids += ',' + university_ids[i];
		}
		
		$debug_ON && console.log("Formatted university Ids: " + university_ids);
		
		//Ajax request
		var xhr = new XMLHttpRequest();
		var universityURL = [
			'https://api.coursera.org/api/catalog.v1/universities?ids=' + formatted_ids + '&includes=courses,instructors&fields=',
			'name,description,banner,homeLink,location,classLogo,website,logo,squareLogo'
		].join("\n");
		
		console.log(universityURL);
		
		xhr.onreadystatechange = function() {
			if (xhr.readyState == 4){ //request is done
				if (xhr.status == 200){ //successfully
					callback.apply(xhr.response);
				}
			}
		}
		
		xhr.open("GET", universityURL, true);
		xhr.responseType = "json";
		
		xhr.onload = function (e){
			var university_json = xhr.response;
			// $debug_ON && console.log(university_json);	//**json output commented out
		}
		
		// Set correct header for form data
		xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
		xhr.send(null);			
	},
	
	getInstructorDetails: function(instructor_ids, callback, update_html){
		$debug_ON && console.log(instructor_ids);
		$debug_ON && console.log("Getting Instructor(s) details!");
		
		// In case we got here through a click
		//event.preventDefault();
		
		var formatted_ids;
		
		$debug_ON && console.log("Array length is: " + instructor_ids.length);
		for (var i = 0; i < instructor_ids.length; i++){
			if (i == 0)
				formatted_ids = instructor_ids[0];
			else
				formatted_ids += ',' + instructor_ids[i];
		}
		
		$debug_ON && console.log("Formatted instructor Ids: " + formatted_ids);
		
		//AJAX request
		var xhr = new XMLHttpRequest();
		var instructorURL = 'https:/api.coursera.org/api/catalog.v1/instructors?ids=' + formatted_ids + '&includes=universities,courses,sessions&\
		fields=photo,photo150,bio,fullName,title,department';
		
		$debug_ON && console.log(instructorURL);
		
		xhr.onreadystatechange = function() {
			if (xhr.readyState == 4){ //request is done
				if (xhr.status == 200){ //successfully
					callback.apply(xhr.response);
				}
			}		
		}
		
		xhr.open("GET", instructorURL, true);
		xhr.responseType = "json";
		
		xhr.onload = function (e){
			var instructor_json = xhr.response;
			// $debug_ON && console.log(instructor_json);	//**json output commented out
		};
		
		// Set correct header for form data
		xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
		xhr.send(null);		
	},
	
	getSessionDetails: function(session_ids, callback, update_html){
		$debug_ON && console.log(session_ids);
		$debug_ON && console.log("Getting Session(s) details!");
		
		var formatted_ids;
		
		$debug_ON && console.log("Array length is: " + session_ids.length);
		for (var i = 0; i < session_ids.length; i++){
			if (i === 0)
				formatted_ids = session_ids[0];
			else {
				formatted_ids += ',' + session_ids[i];
			}
		}
		
		$debug_ON && console.log("Formatted session Ids: " + formatted_ids);
		
		//AJAX request
		var xhr = new XMLHttpRequest();
		var sessionURL = 'https://api.coursera.org/api/catalog.v1/sessions?ids=' + formatted_ids + '&includes=courses,instructors&fields=courseId,\
		status,active,startMonth,startDay,startYear,durationString';
		
		$debug_ON && console.log(sessionURL);
		
		xhr.onreadystatechange = function() {
			if (xhr.readyState == 4){ //request is done
				if (xhr.status == 200){ //successfully
					callback.apply(xhr.response);
				}
			}
		}
		
		xhr.open("GET", sessionURL, true);
		xhr.responseType = "json";
		
		xhr.onload = function (e){
			var session_json = xhr.response;
			// $debug_ON && console.log(session_json);	//**json output commented out
		};
		
		// Set correct header for form data
		xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
		xhr.send(null);	
	},

	/**
	 *  Gets all useful course details for passed in courses.
	 */
	getCourseDetails: function(course_ids, callback, update_html) {	
		// The in_getCourseDetails flag is set to true, only if
		// update_html = 'true' in our xhr.onload below.
		
		$debug_ON && console.log(course_ids);
		$debug_ON && console.log("Getting Course details!");
			
		var formatted_ids; 
			
		$debug_ON && console.log("Array length is: " + course_ids.length);	
		for (var i = 0; i < course_ids.length; i++){
			$debug_ON && console.log("In formatting loop....");
			if (i === 0)
				formatted_ids = course_ids[i];
			else{
				formatted_ids += ',' + course_ids[i];
			}
		}
		
		$debug_ON && console.log("Formatted Ids: " + formatted_ids);
		
		// our Ajax request
		var xhr = new XMLHttpRequest();
		var courseURL = 'https://api.coursera.org/api/catalog.v1/courses?ids=' + formatted_ids + '\
		&includes=instructors,categories,sessions,universities&fields=photo,language,smallIcon,largeIcon,video,\
		videoId,aboutTheCourse,shortDescription,targetAudience,instructor,aboutTheInstructor,recommendedBackground,estimatedClassWork';
			
		$debug_ON && console.log(courseURL);
		
		xhr.onreadystatechange = function() {
			if (xhr.readyState == 4){ // request is done
				if (xhr.status == 200){ // successfully
					callback.apply(xhr.response);
				}
			}
		}		
		
		xhr.open("GET", courseURL, true);
		xhr.responseType = "json";
		
		xhr.onload = function (e){
			var course_json = xhr.response;
			// $debug_ON && console.log(course_json);  //**json output commented out

			// Generate our SINGLE course detailed page
			if (update_html == true){
				// Set our flag to true
				in_getCourseDetails = true;
				
				// Request appropriate panel size from main.js
				self.port.emit('resize', {'width':400, 'height':585});
				
				$debug_ON && console.log("Updating HTML in getCourseDetails()");
				
				var courseraDiv = document.getElementById('courseraDiv');
				courseraDiv.innerHTML = " ";
				
				// Place a navigation button to get back to ALL courses in a category listing
				courseraDiv.insertAdjacentHTML('beforeend', '<a id="btn_AllCategories" href="javascript:void(0);" class="button"><--All Categories</a>');
				var btn_all_categories = document.getElementById("btn_AllCategories");
				btn_all_categories.addEventListener("click", function(event){
					if (in_getAllCategories === false){
						// leaving getCourseDetails, so set our state here to false
						in_getCourseDetails = false;
						courseraBrowse.getAllCategories(
							function(){
								$debug_ON && console.log("Got allCategories");
							}
						);					
						return false;
					} else {
						event.preventDefault();
						console.log(in_getAllCategories);
						console.log(in_getCategoryCourses);		
						console.log(in_getCourseDetails);							
					}
				}, false);
				courseraDiv.insertAdjacentHTML('beforeend', '<br />...also found in: <br />');
				
				// Zero out our link_listeners.links_ids array
				link_listeners.links_ids = [];
				
				// Get ALL our INSTRUCTOR IDs associated with course, used in Stage3 below
				var instructor_ids = [];
				for (var _instructor in course_json.linked.instructors){
					// Deliberate closure
					(function(){
						var current_instructor = course_json.linked.instructors[_instructor];
						$debug_ON && console.log("Linked instructor: " + current_instructor.firstName + "," + current_instructor.lastName);
						instructor_ids.push(current_instructor.id);
					}())
				}
			
				$debug_ON && console.log("Instructor IDs: " + instructor_ids);

				// Get our SESSION IDs associated with a course..., used in Stage4 below
				var session_ids = [];
				for (var session in course_json.linked.sessions){
					// Deliberate closure
					(function(){
						var current_session = course_json.linked.sessions[session];
						$debug_ON && console.log("Linked session: " + current_session.homeLink);
						session_ids.push(current_session.id);
					}())
				}
				
				$debug_ON && console.log("Session IDs: " + session_ids);				
				
				// Four levels of sanitization implemented here
				var sanitized_stage1 = false; 
				var sanitized_stage2 = false;
				var sanitized_stage3 = false;
				var sanitized_stage4 = false;
				
				// Ensure our sanitize_count = 0
				sanitize_count = 0;
				
				/**
				 *  Sanitation Stage1 Loop
				 */
				// Place CATEGORY found navigation at top
				for(var category in course_json.linked.categories){
					// This is deliberately a closure in order to get correct values in our addEventListener
					// see: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Closures			
					(function populate_linked_categories() {	
						$debug_ON && console.log("Linked category: " + course_json.linked.categories[category].name);
						
						// Identification variables
						var linked_categ_id = course_json.linked.categories[category].id;
						var linked_categ_name = course_json.linked.categories[category].name;
						var course_id = course_json.elements[0].id;

						// Append our DIV to create navigation based on Categories, after sanitation
						// Our linkedCategoriesHTML
						var linkedCategoriesHTML = '| <a class="button" id="btn_category_' + linked_categ_id + '"> ' + linked_categ_name + '</a> ';
						
						// getCourseDetails() sanitation stage 1
						// @STEP 1 in sanitation
						var sanitationPromise = courseraBrowse.sanitizeLinkedCategoriesHTML(course_json.linked.categories.length, course_id, linked_categ_id, linkedCategoriesHTML);
						
						// Sanitize LinkedCategoriesHTML start
						sanitationPromise.then(function(result){						
							var cleanHTML_msg = JSON.parse(result);
							
							// Append the sanitized HTML to our panel
							// *extra IF statement check to help eliminate the possibility of duplicate data being displayed
							if (courseraDiv.querySelector('#btn_category_' + cleanHTML_msg.linked_categ_id) === null){
								courseraDiv.insertAdjacentHTML('beforeend', cleanHTML_msg.html);
							};
							$debug_ON && console.log("COURSERA_DIV after update: " + courseraDiv.innerHTML);
							$debug_ON && console.log("=====our Current LINKED CATEG ID is: " + cleanHTML_msg.linked_categ_id);
							
							awaiting_sanitize = false;

							// Add a listener to the linked_category link
							var link = courseraDiv.querySelector('#btn_category_' + cleanHTML_msg.linked_categ_id);
							
							// Add standard href attribute to anchor tags
							link.setAttribute("href", "javascript:void(0);");
							
							// Add our links to our tracking array
							link_listeners.links_ids.push({'_link':'btn_category_'+cleanHTML_msg.linked_categ_id,'_current_id':cleanHTML_msg.linked_categ_id});
							link.addEventListener("click", function(event){
								if (in_getCategoryCourses === false){
									// leaving getCourseDetails, so set our state here to false
									in_getCourseDetails = false;
									courseraBrowse.getCategoryCourses(
										cleanHTML_msg.linked_categ_id,
										function(){
											$debug_ON && console.log("...beginning...single CategoryCourses XHR Request");
											// we will do nothing else here, since we are updating HTML 
											// in the 'onload' of our ajax request, as indicated by TRUE as follows 
										}, true);
										return false;
								} else {
									event.preventDefault();
									console.log(in_getAllCategories);
									console.log(in_getCategoryCourses);		
									console.log(in_getCourseDetails);	
								}
							}, false);

							// Check if we have sanitized all our Course Linked Categories
							// if so, set our sanitized_stage1 flag to indicate complete
							if (cleanHTML_msg.hasOwnProperty('cleaned_all_LinkedCategories')){
								if (cleanHTML_msg.cleaned_all_LinkedCategories === true){
									sanitized_stage1 = true;
								}
							}
							
							// Once we have iterated through all our Course Linked Categories,
							// we can then sanitize and append our course detail information table:
							// the logic here is our sanitize_count should at this point
							// be equal to our course linked_category length
							if (sanitized_stage1 === true) {
								// Sanitize our retrieved Course Details
								if (awaiting_sanitize === false && sanitized_stage2 === false){
									$debug_ON && console.log ("\n===Proceeding to STEP2 sanitize for course:" + cleanHTML_msg.course_id + "=====================");
									// call to @STEP 2 defined above
									sanitize_course_details(cleanHTML_msg.course_id);
								}									
							}
							
							self.port.removeListener(result);
						}, function(error){
									$debug_ON && console.log(error);
									self.port.removeListener(error);
						}); // end of @STEP1 sanitation	
					}()) // END of populate_linked_categories
				} // End of linked category search loop
				
				// Some variables to make our output to HTML easier
				var course_name = course_json.elements[0].name;
				var description = course_json.elements[0].shortDescription;	
				var about_course = course_json.elements[0].aboutTheCourse;
				var course_largeIcon = course_json.elements[0].largeIcon;
				var instructor = course_json.elements[0].instructor;					//*not currently used
				var about_instructor = course_json.elements[0].aboutTheInstructor;		//*not currently used
				
				/**
				 *  Sanitation Stage2 
				 *  (@STEP2) - sanitize_course_details()
				 */
				var sanitize_course_details = function(_course_id){			
					// Our main Course Detail HTML
					var courseDetails_HTML = [
						'<h3 id="subTitle">' + course_name + ' :</h3>',
						'<p><table id="tbl_course_' + _course_id + '_details"><tr><td><!--<a id=course_' + _course_id + ' href="javascript:void(0);">-->',
						'<img class="course_icon" src="' + course_largeIcon + '" alt="Course Icon"/><br/>',
						course_name + '<br/><!--</a>--><hr /><td></tr><tr><td><table><tr><td><div id="course_' + _course_id + '_sessions"></div></td></tr></table></div><hr /></td></tr>',
						'<tr><td><table><tr><td class="course_subhead">Description:<br /><br /></td></tr><tr><td class="course_description">' + description + '<br /><br /></td></tr></table></td></tr>',
						'<tr><td><table><tr><td class="course_subhead">About the course:</td></tr><tr><td class="course_about">' + about_course + '</td></tr></table><hr />',
						'<table><tr><td class="course_subhead">Instructors:</td></tr><tr><td id="instructors_info"></td></tr></table></td></tr></table><br /></p>'
					].join("\n");
					
					// @STEP 2 in sanitation
					var sanitationPromise2 = courseraBrowse.sanitizeCourseDetailsHTML(course_json.linked.categories.length, course_json.elements.length, _course_id, courseDetails_HTML);
					
					// Sanitize LinkedCategoriesHTML start
					sanitationPromise2.then(function(result){	
						var cleanHTML_msg = JSON.parse(result);
						
						// Append the sanitized HTML to our panel
						// *extra IF statement check to help eliminate the possibility of duplicate data being displayed
						if (courseraDiv.querySelector('#tbl_course_' + cleanHTML_msg.course_id) === null){
							courseraDiv.insertAdjacentHTML('beforeend', cleanHTML_msg.html);
						};
						
						awaiting_sanitize = false;

						// Ensure we have sanitized our CourseDetails, as extra property should exist
						// if so, set our sanitized_stage2 flag to indicate complete
						if (cleanHTML_msg.hasOwnProperty('cleaned_CourseDetails')){
							if (cleanHTML_msg.cleaned_CourseDetails === true){
								sanitized_stage2 = true;
							}
						}						

						// Once CourseDetails is populated we can then sanitize and append
						// our course instructor information table:
						// the logic here is that our sanitize_count should at this point
						// be equal to our course linked_category length + 1(for the single course details)
						if ((sanitized_stage2 === true) && (sanitized_stage1 === true)) {
							// Sanitize our retrieved Instructor(s) details
							if (awaiting_sanitize === false && sanitized_stage3 === false){
								$debug_ON && console.log ("\n===Proceeding to STEP3 sanitize Instructors with:" + instructor_ids + "=====================");
								// call to @STEP 3, pass instructor_ids array from above 
								sanitize_course_instructors(cleanHTML_msg.course_id, instructor_ids);
							}									
						}
						
						self.port.removeListener(result);
					}, function(error){
						$debug_ON && console.log(error);
						self.port.removeListener(error);
					});					 
				}; // end of STEP2 sanitize_course_details 
				 
				/**
				*  Sanitation Stage3 
				*  (@STEP3) - sanitize_course_instructors()
				*/				
				var sanitize_course_instructors = function(_course_id, _instructor_ids){
					// Get Instructor Data with IDs
					courseraBrowse.getInstructorDetails(
						_instructor_ids,
						function(){
							var instructor_json = this;
							$debug_ON && console.log("Instructor JSON received: " + instructor_json.elements);
							
							// Construct our Instructor HTML
							var instructorHTML = "";
							for (var __instructor in instructor_json.elements){
								var this_instructor = instructor_json.elements[__instructor];
								if (__instructor === 0)
									instructorHTML = '<table><tr><td>';
								
								instructorHTML += '<table id="course' + _course_id + '_instructor' + this_instructor.id + '"><tr><td class="td_instructor_photo"><img class="instructor_small_photo" src="' + this_instructor.photo150 + '" /></td><td><table class="tbl_instructor_info"><tr><td class="instructor_name">\
												' + this_instructor.firstName + ' ' + this_instructor.lastName + '</td></tr><tr><td>' + this_instructor.title + '</td></tr><tr><td class="td_instructor_department">\
												' + this_instructor.department + '</td></tr></table></td></tr></table>';
																			 
								if (__instructor == instructor_json.elements.length)
									instructorHTML += '</td></tr></table>';
							}	// End of instructor loop
							
							$debug_ON && console.log("InstructorHTML is: " + instructorHTML);
							
							/**
							 *  Sanitation STEP3
							 *  Course Instructor's HTML
							 */
							// @STEP 3 in sanitation -- Instructors
							var sanitationPromise3 = courseraBrowse.sanitizeCourseInstructorsHTML(course_json.linked.categories.length, _course_id, instructorHTML);
					
							// Sanitize LinkedCategoriesHTML start
							sanitationPromise3.then(function(result){
								var cleanHTML_msg = JSON.parse(result);	
								
								// Append the sanitized instructor HTML to the COURSE page of our panel
								// *extra IF statement check to help eliminate the possibility of duplicate data being displayed
								var instructors_td = courseraDiv.querySelector('#instructors_info');
								if (instructors_td.nextSibling === null){ 
									instructors_td.insertAdjacentHTML('beforeend', cleanHTML_msg.html);
								}
								
								awaiting_sanitize = false;
								
								// Ensure we have sanitized our Instructor HTML, as an extra property should exist
								// if so, set our sanitized_stage3 flag to indicate complete
								if (cleanHTML_msg.hasOwnProperty('cleaned_CourseInstructors')){
									if (cleanHTML_msg.cleaned_CourseInstructors === true){
										sanitized_stage3 = true;
									}
								}	
									
								// Proceed to FINAL stage4 if instructor HTML sanitize is complete
								// Logic here is that our sanitize_count, up to this point should be 
								// equal to the length of the linked_categories array for a course,
								// + 1 for the single parse of course details
								// + 1 for the single parse course Instructor section html
								if ((sanitized_stage3 === true) && (sanitized_stage2 === true) && (sanitized_stage1 === true)) {
									// Sanitize our retrieved Session(s) details
									if (awaiting_sanitize === false && sanitized_stage4 === false){
										$debug_ON && console.log ("\n===Proceeding to STEP4 sanitize Course Sessions with:" + session_ids + "=====================");
										// call to FINAL @STEP4, pass session_ids array from above 
										sanitize_course_sessions(cleanHTML_msg.course_id, session_ids);
									}									
								}
								self.port.removeListener(result);
							}, function(error){
								$debug_ON && console.log(error);
								self.port.removeListener(error);
							});							
						}, false);	// End of call to courseraBrowse.getInstructorDetails()	
				}; 	// end of STEP3 sanitize_course_instructors
								 
				/**
				*  Sanitation Stage4 
				*  (@STEP4) - sanitize_course_sessions()
				*/
				var sanitize_course_sessions = function(_course_id, _session_ids){
					// Get Session Data with IDs
					courseraBrowse.getSessionDetails(
						_session_ids,
						function(){
							var session_json = this;
							$debug_ON && console.log("Session JSON received: " + session_json);
							
							// Construct out Session HTML
							var sessionHTML = "";
							for (var _session in session_json.elements){
								//Deliberate closure
								(function(){
									var this_session = session_json.elements[_session];
									// Helper variable for HTML
									var session_id = this_session.id;
									var session_start_date = this_session.startMonth + '/' + this_session.startDay + '/' + this_session.startYear;
									if (typeof(this_session.startMonth) == "undefined" || typeof(this_session.startDay) == "undefined" || typeof(this_session.startYear) == "undefined")
										session_start_date = "N/A";
									var session_duration = this_session.durationString;
									var session_home_link = '<a href="' + this_session.homeLink + '" target="_blank" title="Link: ' + this_session.homeLink + '">' + this_session.homeLink + '</a>';
									var session_status;
									if (this_session.status == 0)
										session_status = "Not currently offered.";
									else
										session_status = "Open";
									
									if(_session == 0)
										sessionHTML = '<table><tr><td class="course_subhead">Sessions:<br/></td></tr></table>\
													<table class="status_state_duration"><tr><th>ID:</th><th>Status:</th><th>Start Date:</th><th>Duration:</th></tr>';
										
									sessionHTML += '<tr><td class="session_id">' + session_id + '</td><td class="session_status">' + session_status + '</td>\
													<td class="session_start_date">' + session_start_date + '</td><td class="session_duration">' + session_duration + '</td></tr>\
													<hr /></table><table class="course_home_link"><tr><td></td><td>' + session_home_link + '</td>\
													</tr></table><table class="status_state_duration">';
									
									if (_session == session_json.elements.length)
										sessionHTML += '</table>';								
								}())
							}	// End of session loop
							
							/**
							 *  Sanitation STEP4 - FINAL
							 *  Course Session info HTML
							 */
							// @STEP 4 in sanitation -- Sessions
							var sanitationPromise4 = courseraBrowse.sanitizeCourseSessionsHTML(course_json.linked.categories.length, _course_id, sessionHTML);						
							
							// Sanitize LinkedCategoriesHTML start
							sanitationPromise4.then(function(result){
								$debug_ON && console.log("\n" + result + "\n");
								var cleanHTML_msg = JSON.parse(result);	
								
								// Append the sanitized session HTML to the COURSE page of our panel
								// *extra IF statement check to help eliminate the possibility of duplicate data being displayed
								var session_div = courseraDiv.querySelector('#course_' + cleanHTML_msg.course_id + '_sessions');
								if (session_div.nextSibling === null){ 
									session_div.insertAdjacentHTML('beforeend', cleanHTML_msg.html);
								}
								
								awaiting_sanitize = false;	

								// Ensure we have sanitized our Session HTML, as an extra property should exist
								// if so, set our sanitized_stage4 flag to indicate complete
								if (cleanHTML_msg.hasOwnProperty('cleaned_CourseSessions')){
									if (cleanHTML_msg.cleaned_CourseSessions === true){
										sanitized_stage4 = true;
									}
								}

								// Proceed to SAVE our COURSE DETAILS panel page STATE
								// Logic here is that our sanitize_count, up to this point should be 
								// equal to the length of the linked_categories array for a course,
								// + 1 for the single parse of course details
								// + 1 for the single parse of course Instructor section html
								// + 1 for the single parse of course Sessions info html
								if ((sanitized_stage4 === true) && (sanitized_stage3 === true) && (sanitized_stage2 === true) && (sanitized_stage1 === true)) {
									// Save our browse STATE
									if (awaiting_sanitize === false){
										$debug_ON && console.log ("\n===Proceeding to SAVE STATE in: save_getCourseDetails() function.=====================");
										// call to save_getCourseDetails() function below
										save_getCourseDetails();
									}									
								}
								
								self.port.removeListener(result);
							}, function(error){
								$debug_ON && console.log(error);
								self.port.removeListener(error);
							});							
	
					}, false);
				}	// End sanitize_course_essions STEP4 - Final

				var save_getCourseDetails =	function (){
					if (awaiting_sanitize === false && sanitized_stage1 === true && sanitized_stage2 === true && sanitized_stage3 === true && sanitized_stage4 === true){	
						$debug_ON && console.log("GLOBAL values after populate_categoryCourses() loop: \
									" + ' awaiting_sanitize:' + awaiting_sanitize + ', sanitized_stage1: \
									' + sanitized_stage1 + ', sanitized_stage2: ' + sanitized_stage2 + '\
									sanitized_stage3: ' + sanitized_stage3 + ', sanitized_stage4: ' + sanitized_stage4 + '\n');  
						
						// *extra IF check to avoid duplicate appends
						if (courseraDiv.querySelector('#toTopAnchor') === null){
							courseraDiv.insertAdjacentHTML('beforeend', '<a id="toTopAnchor" class="button" href="#titleDiv">^Top</a>');
						}						

						// Make sure we are at top of page
						document.getElementById("toTopAnchor").click();

						// Save our state and zero scroll position
						browse_state[0] = {"courseraDiv":document.getElementById('courseraDiv').innerHTML,"scrollTop":0};
						//$debug_ON && console.log("==> browse_state after 'getCourseDetails()' call: " + browse_state[0].courseraDiv);	//**json output commented out
						
						// Sending updated state via messaging to background
						var _browse_state = JSON.stringify(browse_state[0]);
						self.port.emit("browseState",_browse_state);	

						link_listeners.location = "getCategoryCourses";
						// Send our links to 'main.js'
						$debug_ON && console.log("LINK Listeners" + link_listeners);
						var _link_listeners = JSON.stringify(link_listeners);
						self.port.emit("linkListeners",_link_listeners);
						
						// **RESET** our global sanitize_count back to 0 so that we don't get duplicate data
						// and so that other functions start with sanitize as 0
						sanitize_count = 0;
						
						// Set our flag back to false
						in_getCourseDetails = false;
						
						console.log('Global states after getCourseDetails() run=');
						console.log('in_getAllCategories: ' + in_getAllCategories);
						console.log('in_getCategoryCourses: ' + in_getCategoryCourses);	
						console.log('in_getCourseDetails: ' + in_getCourseDetails);							
					}
				}	// End function save_getCourseDetails()	
			}	// End update_html section
		};	// End xhr.onload()
		
		// Set correct header for form data
		xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
		xhr.send(null);	
	},
	
	/**
	 *  Gets all Courses within a specific Category
	 *  found at Coursera.org
	 */
	getCategoryCourses: function(category_id, callback, update_html) {	
		// The in_getCategoryCourses flag is set to true, only if
		// update_html = 'true' in our xhr.onload below.
		
		$debug_ON && console.log("...inside getCategoryCourses()...");
				
		var browse_category;
		
		// First let's get our category NAME given the passed in category ID
		// from our global categories array
		for (var category in categories){
			if (categories[category].id == category_id){
				$debug_ON && console.log("FOUND");
				browse_category = categories[category].name;
				break;
			}
			else{
				$debug_ON && console.log("...still LOOKING..."); 
			}
		}
		
		// Perform ajax request to retrieve our category's courses
		$debug_ON && console.log("I'm getting all courses with: " + category_id);
		var xhr = new XMLHttpRequest();
		var categoryCoursesURL = 'https://api.coursera.org/api/catalog.v1/categories?id=' + category_id + '&includes=courses'; 
		
		// Array to hold and sort our retrieved courses
		var courses = [];
		
		$debug_ON && console.log(categoryCoursesURL);
		
		xhr.onreadystatechange = function() {
			if (xhr.readyState == 4){ // request is done
				if (xhr.status == 200){ // successfully
					// Send our reply
					callback.apply(xhr.response);
				}
			}
		}		
		
		xhr.open("GET", categoryCoursesURL, true);
		xhr.responseType = "json";
		
		xhr.onload = function (e){
			var categories_courses_json = xhr.response;
			
			//$debug_ON && console.log(categories_courses_json); //**json output commented
			
			// We generate and output our HTML for Category Courses
			// if update_html flag is set to 'true' in the click handler
			// that got us here.
			if (update_html === true){
				// Set our flag to true
				in_getCategoryCourses = true;
				
				// Request appropriate panel size from main.js
				self.port.emit('resize', {'width':275, 'height':585});
			
				$debug_ON && console.log("Updating HTML in getCategoryCourses()");
				
				// course_ids is used so we can grab our small icons for each course
				// and more course details below.
				var course_ids = [] 
				for (var course in categories_courses_json.linked.courses){
					var current_course = categories_courses_json.linked.courses[course];
					var id, shortName, name;
					for (var key in current_course){
						if (current_course.hasOwnProperty(key)){
							$debug_ON && console.log("Key is: " + key);
							if (key ==  "id"){
								id = current_course[key];
								course_ids.push(id);
							}
							else if (key == "shortName")
								shortName = current_course[key];
							else if (key == "name")
								name = current_course[key];
						}
					}
					courses.push({
						"id":id,
						"shortName":shortName,
						"name":name,
						sortable: true,
						resizable: true
					});	
				}
				
				// Grab more course details for our courses
				courseraBrowse.getCourseDetails(
					course_ids,
					function get_categoryCourseDetails(){
						// 'this' is scoped in the called function xhr above, 
						// it is the response of the callback
						//$debug_ON && console.log(this);	//**json output commented out 
						var courses_json = this;

						for (var course in courses_json.elements){
							var current_course = courses_json.elements[course];
							for (var _course in courses){
								var _current_course = courses[_course];
								if (current_course.id == _current_course.id){
									$debug_ON && console.log(current_course.id  + "/" + _current_course.id);
									$debug_ON && console.log("We have matched our course!");
									// Update local courses[] array with our extra course data
									var smallIcon, largeIcon;
									var links;
									for (var key in current_course){
										if (current_course.hasOwnProperty(key)){
											$debug_ON && console.log("Key is: " + key);
											if (key == "smallIcon"){
												smallIcon = current_course[key];
												$debug_ON && console.log("Course: " + courses[_course].name);
												courses[_course].smallIcon = smallIcon;
											}
											if (key == "largeIcon"){
												largeIcon = current_course[key];
												courses[_course].largeIcon = largeIcon;
											}
											// Our linked object that holds information such as University ID
											// associated with our course.
											if (key == "links"){
												links = current_course[key];
												courses[_course].links = links;
											}
										}
									}
								}
							}
						}
						
						/**
						 *Finish processing our data and output to the page
						 */
						// Sort our courses
						courses.sort(function (a, b){
							var course1 = a.name.toLowerCase(), course2 = b.name.toLowerCase();				
							if (course1 < course2)
								return -1;
							if (course1 > course2)
								return 1;
							return 0;
						});	

						// Using vanilla javascript DOM manipulation for Firefox additions, since jQuery $('element').append() OR html() was
						// not working as expected in Firefox add-ons client-scripts after initial DOM load
						// Using insertAdjacentHTML here. see: https://developer.mozilla.org/en-US/docs/Web/API/Element.insertAdjacentHTML
						var courseraDiv = document.getElementById("courseraDiv");
						
						// Place a navigation button to get back to ALL category screen
						courseraDiv.innerHTML = " ";
						courseraDiv.insertAdjacentHTML('beforeend', '<a id="btn_AllCategories" href="javascript:void(0);" class="button"><--All Categories</a>');
						
						var btn_all_categories = document.getElementById("btn_AllCategories");
						btn_all_categories.addEventListener("click", function(event){
							if (in_getAllCategories === false){
								// leaving getCategoryCourses, so set our state here to false
								in_getCategoryCourses = false;
								courseraBrowse.getAllCategories(
									function(){
										$debug_ON && console.log("Got allCategories");
									}
								);
								return false;
							} else{
								event.preventDefault();
								console.log(in_getAllCategories);
								console.log(in_getCategoryCourses);
							}
						}, false);

						// Insert our selected browse Category title to the page
						courseraDiv.insertAdjacentHTML('beforeend', '<h3 class="subTitle"></h3>');
						btn_all_categories.nextSibling.textContent = String(browse_category) + ' Courses:';
						
						// University IDs array to get college names
						var university_ids = [];
						
						// University/Course array of objects
						var univ_course = [];
						
						// Zero out our link_listeners.links_ids array
						link_listeners.links_ids = [];
						
						// Two levels of sanitization implemented here
						var sanitized_stage1 = false; 
						var sanitized_stage2 = false;
						// Ensure our sanitize_count = 0
						sanitize_count = 0;
						
						// Main populate_categoryCourses() loop
						for (var i = 0; i < courses.length; i++){
							// This is deliberately a closure in order to get correct values in our addEventListener
							// see: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Closures			
							(function populate_categoryCourses(){		
								$debug_ON && console.log('Current COURSE is: ' + courses[i].name);
								
								// Output our category courses to the panel
								
								var course_html = [
									'<p><table id="tbl_course_' + courses[i].id + '"><tr><td><a id="a_course_' + courses[i].id + '">\
									<img class="course_icon" src="' + courses[i].largeIcon + '" alt="Course Icon"/><br/>\
									' + courses[i].name + '<br/></a></td></tr><tr><td id="university_' + courses[i].links.universities[0] + '_' + courses[i].id + '"></td></tr></table><br /></p>'		
								].join("\n");
								
								// Our course ID object, and getter
								// Only scoped and accessible to @STEP 1 below
								var _num_course_id =  {curr_course_id: courses[i].id};
								var getCourseID = function(){
									$debug_ON && console.log("returning curr_course_id:" + this.curr_course_id);
									return this.curr_course_id;
								}.bind(_num_course_id);		

								// Our Course University ID object, and getter
								// Only scoped and accessible to @STEP 1 below
								var _num_course_univ_id =  {curr_course_univ_id: courses[i].links.universities[0]};
								var getCourseUnivID = function(){
									$debug_ON && console.log("returning curr_course_univ_id:" + this.curr_course_univ_id);
									return this.curr_course_univ_id;
								}.bind(_num_course_univ_id);									
								
								// FUNCTION for adding click handlers to Category Courses
								// This is called in sequence with @STEP 1 sanitation below
								var add_click_handlers = function(_course_id, _courseLink){
									// Create new listener for onclick event of each anchor tag
									var current_course_id = _course_id;
									$debug_ON && console.log("Current COURSE ID is: " + current_course_id);
									var link = _courseLink;
									
									// Add standard href attribute to anchor tags
									link.setAttribute("href", "javascript:void(0);");							
								
									var array_ccid = [current_course_id]; // since our getCourseDetails function relies on an array as an argument
									// Add our links to our tracking array
									link_listeners.links_ids.push({'_link':'a_course_'+current_course_id,'_current_id':current_course_id});								
									link.addEventListener("click", function(event){
										if (in_getCourseDetails === false){
											// leaving getCategoryCourses, so set our state here to false
											in_getCategoryCourses = false;
											courseraBrowse.getCourseDetails(
												array_ccid,
												function(){
													$debug_ON && console.log("...beginning...single CourseDetails XHR Request");
													// we will do nothing else here, since we are updating HTML 
													// in the 'onload' of our ajax request, as indicated by TRUE as follows 
												}, true);
											return false; 	
										} else {
											event.preventDefault();
											console.log(in_getAllCategories);
											console.log(in_getCategoryCourses);
										}
									}, false);									
									
									$debug_ON && console.log("~~~~~~~~~~~~Value of couseraDiv after links: " + courseraDiv.innerHTML);
								};	// End of add_click_handlers() function
								
								// @STEP 2 in sanitation: for University information output to the page
								// This initiates after @STEP 1 has fully completed below.
								var sanitize_univ_details = function(_university_ids){
									// Get and append our University Names to the page
									courseraBrowse.getUniversityDetails(
										_university_ids,
										function univDetails_callback(){
											$debug_ON && console.log("...beginning...University lookup in getCategoryCourses()");
											var univ_json = this;
											
											// Loop through our retrieved University objects
											for(var univ in univ_json.elements){
												var current_univ = univ_json.elements[univ];
												// Append our page HTML with some University information, after sanitizing
												// for each course in the category
												var univ_html = '<table><tr><td class="categcourse_univ_name">' + current_univ.name + '</td></tr><tr><td class="categcourse_univ_loc">' + current_univ.location + '</td></tr></table>';
												$debug_ON && console.log(univ_html);
												
												// Sanitation stage 2 Promise
												/**
												 * @nathandh 05/17/2014 -- was initially passing '_university_ids.length' in our promise, but Coursera wasn't always supplying an accurate number
												 * of returned universities in the JSON. That is, sometimes a university name and location wasn't retrievable. As a result, saving of browse
												 * state never occurred, and TO_TOP bottom button link was never placed in the view where university info was missing.
												 * 
												 * So, to temporarily fix this, I've passed 'univ_js.elements.length' here instead. So we can accurately determine when our sanitation is
												 * finished.
												 *
												 * TODO: put a place-holder indicating "University not listed." on courses that have missing University info from Coursera. e.g. look at
												 * Education and Teaching categories for examples. OR, possibly find an alternate way to get that missing university information to accurately
												 * place in under those courses where it is currently missing.
												 */
												var sanitationPromise2 = courseraBrowse.sanitizeCC_UniversitiesHTML(courses.length, univ_json.elements.length, current_univ.id, univ_html);
												
												sanitationPromise2.then(function(result){
													var cleanHTML_msg = JSON.parse(result);
													
													// Iterate over our local university set, and append HTML as appropriate
													// univ_course array gets populated in 1st sanitation @STEP1 promise below
													for(var _univ_course in univ_course){
														var curr_univ_course = univ_course[_univ_course];
														if(curr_univ_course.univ_id == cleanHTML_msg.univ_id){
															// Append our university information
															var univ_td = courseraDiv.querySelector('#university_' + cleanHTML_msg.univ_id + '_' + curr_univ_course.course_id);
															// HTML is sanitized here
															// *extra IF statement check to help eliminate the possibility of duplicate data being displayed
															if (univ_td.hasChildNodes() === false){
																univ_td.insertAdjacentHTML('beforeend', cleanHTML_msg.html);
															}
														}
													}
													
													// Set our current state
													awaiting_sanitize = false;
													
													// Check if we have made the last sanitation on our courses and universities.
													// ...if so, then pass to ending function below: save_categoryCoursesState()
													// The logic here is dependent on that we are performing sanitize calls equal to our courses.length + university_id.length
													if (cleanHTML_msg.hasOwnProperty('cleaned_all_Universities')){
														if (cleanHTML_msg.cleaned_all_Universities === true){
															sanitized_stage2 = true;
														}
													}
													
													// Call to function save_categoryCoursesState() after sanitation is complete
													if (sanitized_stage2 === true) {
														if (awaiting_sanitize === false && sanitized_stage1 === true){
															// @FINAL Call save_categoryCoursesState()
															// to add panel footer and store panel data
															save_categoryCoursesState();
														}									
													}													
																										
													self.port.removeListener(result);
												}, function(error){
													$debug_ON && console.log(error);
													self.port.removeListener(error);
												});												
											}	// End of univ_json loop
									}, false);								
								};	// End of sanitize_univ_details() function
									
								// allCategoryCourses() sanitation stage 1
								// @STEP 1 in sanitation
								var sanitationPromise = courseraBrowse.sanitizeCategoryCoursesHTML(courses.length, getCourseID(), getCourseUnivID(), course_html);
								
								// MAIN Sanitize HTML
								sanitationPromise.then(function(result){									
									var cleanHTML_msg = JSON.parse(result);
									
									// Append the sanitized HTML to our panel
									// *extra IF statement check to help eliminate the possibility of duplicate data being displayed
									if (courseraDiv.querySelector('#tbl_course_' + cleanHTML_msg.course_id) === null){
										courseraDiv.insertAdjacentHTML('beforeend', cleanHTML_msg.html);
									}
									$debug_ON && console.log("COURSERA_DIV after update: " + courseraDiv.innerHTML);
									$debug_ON && console.log("=====our Current COURSE ID is: " + cleanHTML_msg.course_id);
									
									awaiting_sanitize = false;
									
									// Store our course UniversityID, if it doesn't yet exist in our array 
									// so we can update the page later with university information
									if (university_ids.indexOf(cleanHTML_msg.univ_id) === -1){
										university_ids.push(cleanHTML_msg.univ_id);
									}
									// Add key,value pair to our University/Course object
									univ_course.push({'course_id':cleanHTML_msg.course_id,'univ_id':cleanHTML_msg.univ_id});
								
									// See what our array currently holds
									$debug_ON && console.log(univ_course);									
									
									// Add a click handler to our course
									var curr_courseLink = courseraDiv.querySelector('#a_course_' + cleanHTML_msg.course_id);
									$debug_ON && console.log ("Value of curr_courseLink: " + curr_courseLink + "=====================");									
									// This function is defined above
									add_click_handlers(cleanHTML_msg.course_id, curr_courseLink);
									
									// Check if we have sanitized all our Category Course information
									// if so, set our sanitized_stage1 flag to indicate complete
									if (cleanHTML_msg.hasOwnProperty('cleaned_all_CCs')){
										if (cleanHTML_msg.cleaned_all_CCs === true){
											sanitized_stage1 = true;
										}
									}
									
									// Once we have iterated through all our Category courses,
									// we can then append our course University information:
									// the logic here is our sanitize_count should at this point
									// be equal to our category_course length
									if (sanitized_stage1 === true) {
										// Sanitize our retrieved Course University Details
										if (awaiting_sanitize === false && sanitized_stage2 === false){
											$debug_ON && console.log ("Value of  univ_ids: " + university_ids + "=====================");
											// call to @STEP 2 defined above
											sanitize_univ_details(university_ids);
										}									
									}
									
									self.port.removeListener(result);
								}, function(error){
									$debug_ON && console.log(error);
									self.port.removeListener(error);
								});									
							}());
						}; // end of populate_categoryCourses() loop

						function save_categoryCoursesState(){
							$debug_ON && console.log("GLOBAL values after populate_categoryCourses() loop: \
										" + ' awaiting_sanitize:' + awaiting_sanitize + ', sanitized_stage1: \
										' + sanitized_stage1 + ', sanitized_stage2: ' + sanitized_stage2 + "\n");    
							if (awaiting_sanitize === false && sanitized_stage1 === true && sanitized_stage2 === true){						
								link_listeners.location = "getCourseDetails";						
								
								// Add a link on bottom of page to easily get back to the top
								// *extra IF statement check to help eliminate the possibility of duplicate data being displayed
								if (courseraDiv.querySelector('#toTopAnchor') === null){
									courseraDiv.insertAdjacentHTML('beforeend', '<a id="toTopAnchor" class="button" href="#titleDiv">^Top</a>');
								}
								
								// Make sure we are at top of page
								document.getElementById("toTopAnchor").click();	

								// Save our state and zero scroll position
								browse_state[0] = {"courseraDiv":document.getElementById('courseraDiv').innerHTML,"scrollTop":0};
								// $debug_ON && console.log("==> browse_state after 'getCategoryCourses()' call: " + browse_state[0].courseraDiv);	//**json output commentedout
								
								// Sending updated state via messaging to 'main.js'
								var _browse_state = JSON.stringify(browse_state[0]);
								self.port.emit("browseState",_browse_state);	
								
								// Send our links to 'main.js'
								$debug_ON && console.log("LINK Listeners" + link_listeners);
								var _link_listeners = JSON.stringify(link_listeners);
								self.port.emit("linkListeners",_link_listeners);
								
								// **RESET** our global sanitize_count back to 0 so that we don't get duplicate data
								// and so that other functions start with sanitize as 0
								sanitize_count = 0;
								
								// Set our flag back to false
								in_getCategoryCourses = false;
								
								console.log('Global states after getCategoryCourses() run=');
								console.log('in_getAllCategories: ' + in_getAllCategories);
								console.log('in_getCategoryCourses: ' + in_getCategoryCourses);	
								console.log('in_getCourseDetails: ' + in_getCourseDetails);
							}
						}	// end of save_categoryCoursesState()						
					}, false); // end of get_categoryCourseDetails loop()	
			} // end up update_html
		};	// end of xhr.onload for getCategoryCourses()
		
		// Set correct header for form data
		xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
		xhr.send(null);		
	},
	
	/**
	 * Gets all the All Course Categories available in the Coursera database
	 * outputs the listing of browsable categories to the Firefox panel.
	 */
	getAllCategories: function(callback) {	
		// Set our flag to true
		in_getAllCategories = true;
	
		$debug_ON && console.log("...inside getAllCategories!");
				
		// Request appropriate panel size from main.js
		self.port.emit('resize', {'width':275, 'height':585});
		
		var xhr = new XMLHttpRequest();
		var allCategoriesURL = "https://api.coursera.org/api/catalog.v1/categories";
		
		xhr.onreadystatechange = function() {
			if (xhr.readyState == 4){ //request is done
				if (xhr.status == 200){ //successfully
					callback.apply(xhr.response);
				}
			}
		}		
	
		xhr.open("GET", allCategoriesURL, true);
		xhr.responseType = "json";
		
		xhr.onload = function(e){
			var categories_json = xhr.response;
			
			// $debug_ON && console.log(categories_json);	//**json output commented out
			
			// Get and clear our main div element before proceeding
			var courseraDiv = document.getElementById('courseraDiv');
			courseraDiv.innerHTML = " ";
			
			// Zero out our previous categories, if any
			categories = []; 
			
			// Append retrieved categories to the categories array
			for(var category in categories_json.elements){
				var current_category = categories_json.elements[category];
				var id, name, shortName, description;
				for (var key in current_category){
					if (current_category.hasOwnProperty(key)){
						if (key == "id")
							id = current_category[key];
						else if (key == "name")
							name = current_category[key];
						else if (key == "shortName")
							shortName = current_category[key];
						//else if (key == "description")
						//	description = current_category[key];
					}	
				}
				categories.push({
					"id":id,
					"name":name,
					"shortName":shortName,
					sortable: true,
					resizeable: true
				});
			}
			
			// Sort by Category NAME ascending
			categories.sort(function(a, b){
				var cat1 = a.name.toLowerCase(), cat2 = b.name.toLowerCase();
				if (cat1 < cat2) // sort ascending
					return -1;
				if (cat1 > cat2)
					return 1;
				return 0;		// default, no sorting
			});
			
			// Zero out our link_listeners.links_ids array
			link_listeners.links_ids = [];
			
			// Two stages of sanitization implemented below
			var sanitized_stage1 = false; 
			var sanitized_stage2 = false;
			// Ensure our sanitize_count = 0
			sanitize_count = 0;	
			
			// Main category population loop
			for (var i = 0; i < categories.length; i++){
				// This is deliberately a closure in order to get correct values in our addEventListener
				// see: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Closures
				(function populate_categories() {
					$debug_ON && console.log('Current CATEGORY is: ' + categories[i].name);
					
					// Creative Commons images for our Categories
					// sourced from: http://pixabay.com/
					var img_src;
					if (categories[i].id == 22)
						img_src = "img/categories/arts_categ.png";
					else if (categories[i].id == 10)
						img_src = "img/categories/bio_categ.png";
					else if (categories[i].id == 13)
						img_src = "img/categories/business_categ.png";
					else if (categories[i].id == 24)
						img_src = "img/categories/chemistry_categ.png";
					else if (categories[i].id == 17)
						img_src = "img/categories/ai_categ.png";
					else if (categories[i].id == 12)
						img_src = "img/categories/cs_se_categ.png";
					else if (categories[i].id == 11)
						img_src = "img/categories/cs_sec_categ.png";	
					else if (categories[i].id == 1)
						img_src = "img/categories/cs_theory_categ.png";	
					else if (categories[i].id == 2)
						img_src = "img/categories/finance_categ.png";		
					else if (categories[i].id == 14)
						img_src = "img/categories/edu_categ.png";	
					else if (categories[i].id == 25)
						img_src = "img/categories/energy_categ.png";	
					else if (categories[i].id == 15)
						img_src = "img/categories/engineering_categ.png";							
					else if (categories[i].id == 19)
						img_src = "img/categories/food_categ.png";
					else if (categories[i].id == 8)
						img_src = "img/categories/health_categ.png";						
					else if (categories[i].id == 6)
						img_src = "img/categories/humanities_categ.png";						
					else if (categories[i].id == 4)
						img_src = "img/categories/info_tech_categ.png";						
					else if (categories[i].id == 21)
						img_src = "img/categories/law_categ.png";
					else if (categories[i].id == 5)
						img_src = "img/categories/math_categ.png";						
					else if (categories[i].id == 3)
						img_src = "img/categories/medical_categ.png";	
					else if (categories[i].id == 18)
						img_src = "img/categories/music_categ.png";
					else if (categories[i].id == 9)
						img_src = "img/categories/physical_science_categ.png";						
					else if (categories[i].id == 23)
						img_src = "img/categories/physics_categ.png";	
					else if (categories[i].id == 20)
						img_src = "img/categories/social_science_categ.png";							
					else if (categories[i].id == 16)
						img_src = "img/categories/statistics_categ.png";						
					else if (categories[i].id == 26)
						img_src = "img/categories/teacher_categ.png";							
					else 
						img_src = "img/categories/coursera-logo-nobg-blue_48.png";
					
					// ======Output our Categories to the panel=======
					
					// Category specific HTML, created per each category retrieved
					var categ_html = [
						'<p><table id="tbl_category_' + categories[i].id + '"><tr><td><a class="categoryAnchor" id="a_category_' + categories[i].id + '">',
						'<img src="' + img_src + '" alt="Coursera Logo" /><br /><div class="categoryName">' + categories[i].name + '</div>',
						'<div class="categoryNumCourses" id="category_' + categories[i].id + '_numCourses"></div></a></td></tr></table></p>'
					].join("\n");
					
					// Our current category ID object, with getter
					// Accessible in scope, only by @STEP #1 below
					var _num_category_id =  {curr_category_id: categories[i].id};
					var getCategoryID = function(){
						$debug_ON && console.log("returning curr_category_id:" + this.curr_category_id);
						return this.curr_category_id;
					}.bind(_num_category_id);

 					// Adds a click handler to a singular category link, in sequence with sanitation stages 1 & 2 (below). 
					// @STEP #3
					var add_click_handlers = function(_categ_id, _categLink){
						// Create new listener for onclick event of anchor tag
						var current_id = _categ_id;
						$debug_ON && console.log("Current ID is: " + current_id);
						
						var link = _categLink;
		
						// Add standard href attribute to anchor tags
						link.setAttribute("href", "javascript:void(0);");
						
						// Add EACH link to our global link tracking array
						link_listeners.links_ids.push({'_link':'a_category_'+current_id,'_current_id':current_id}); 
						link.addEventListener("click", function(event){
							if (in_getCategoryCourses === false){
								// leaving getAllCategories, so set our state here to false
								in_getAllCategories = false;
								courseraBrowse.getCategoryCourses(
									current_id,
									function(){
										$debug_ON && console.log("...beginning...single CategoryCourses XHR Request");
										// we will do nothing else here, since we are updating HTML 
										// in the 'onload' of our click ajax request, as indicated by TRUE as follows 
									}, true);
								return false;
							} else { 
								event.preventDefault();
								console.log(in_getAllCategories);
								console.log(in_getCategoryCourses);
							}
						}, false);
						
						// Check if we have made the last sanitation on our categories.
						// ...if so, then pass to ending function below: save_allCategoriesState()
						if ((sanitized_stage1 === true) && (sanitized_stage2 === true)){						
							// Call save_allCategoriesState()
							// to add panel footer and store panel STATE data
							save_allCategoriesState();
						};	
						
						$debug_ON && console.log("~~~~~~~~~~~~Value of couseraDiv after links: " + courseraDiv.innerHTML);
					}; // End of @STEP 3 click-handler addition
					
					// @STEP #2
					var sanitize_num_courses = function(_categ_id, _categDiv){
						// Determine how many courses are in each category, and append to couseraDIV
						courseraBrowse.getCategoryCourses(
							_categ_id,
							function(){
								// Handle our callback here
								var _courses_json = this;
								var categ_num_courses = _courses_json.linked.courses.length;
								$debug_ON && console.log("Courses length: " + categ_num_courses);
								
								var categ_div = _categDiv;
								$debug_ON && console.log("=====>Category DIV is: " + categ_div + "<======CATEG_ID is: " + _categ_id);
								
								var num_courses_html = '<div><strong>' + categ_num_courses + '</strong> total courses</div>';
								
								// Sanitation stage 2
								// @ STEP #2 Promise
 								var sanitationPromise2 = courseraBrowse.sanitizeAllCategoriesHTML(categories.length, _categ_id, num_courses_html);
									
								sanitationPromise2.then(function(result){
									var cleanHTML_msg = JSON.parse(result);
									// extra IF statement check to help eliminate the possibility of duplicate data being displayed
									if (categ_div.hasChildNodes() === false){
										categ_div.insertAdjacentHTML('beforeend', cleanHTML_msg.html);
									}
									
									awaiting_sanitize = false;
									
									// Check if we have made the last sanitation on our categories.
									// ...if so, update sanitation variables accordingly
									if (cleanHTML_msg.hasOwnProperty('cleaned_all_Categories')){
										if (cleanHTML_msg.cleaned_all_Categories === true){
											sanitized_stage1 = true;
											sanitized_stage2 = true
										}
									}
									
									// Add click handler for current category
									var curr_categLink = courseraDiv.querySelector('#a_category_' + _categ_id);
									$debug_ON && console.log ("Value of curr_categLink: " + curr_categLink + "=====================");									
									
									// For each category link, we proceed to @STEP #3 above
									// Therefore: *Step 3 click handler completes right before 
									// Step #2 and Step #1 sanitation fully completes
									add_click_handlers(_categ_id, curr_categLink);
									
									self.port.removeListener(result);
								}, function(error){
									$debug_ON && console.log(error);
									self.port.removeListener(error);
								}); 
						}, false);					
					}; 	// End of @STEP 2 sanitation
					
					// allCategories() sanitation stage 1
					// @STEP #1
					var sanitationPromise = courseraBrowse.sanitizeAllCategoriesHTML(categories.length, getCategoryID(), categ_html);
					
					sanitationPromise.then(function(result){
						var cleanHTML_msg = JSON.parse(result);
						// extra IF statement check to help eliminate the possibility of duplicate data being displayed
						if (courseraDiv.querySelector('#tbl_category_' + cleanHTML_msg.categ_id) === null){
							courseraDiv.insertAdjacentHTML('beforeend', cleanHTML_msg.html);
						}
						$debug_ON && console.log("COURSERA_DIV after update: " + courseraDiv.innerHTML);
						$debug_ON && console.log("=====our Current ID is: " + cleanHTML_msg.categ_id);
						
						awaiting_sanitize = false;
						
						// Sanitize our retrieved number of courses
						if (awaiting_sanitize === false && sanitized_stage2 === false){
							var curr_categDiv = courseraDiv.querySelector('#category_' + cleanHTML_msg.categ_id + '_numCourses');
							$debug_ON && console.log ("Value of curr_categDiv: " + curr_categDiv + "=====================");
							
							// For each category, we proceed to @STEP #2 above
							// Therefore: *Step 1 sanitation completes right before *Step 2 sanitation completes
							sanitize_num_courses(cleanHTML_msg.categ_id, curr_categDiv);
						}

						self.port.removeListener(result);
					}, function(error){
						$debug_ON && console.log(error);
						self.port.removeListener(error);
					});	// End of @STEP 1 sanitation
					
				}());
			}; 	// End of populate_categories() loop
			
			function save_allCategoriesState(){
				$debug_ON && console.log("GLOBAL values after populate_categories() loop: \
							" + ' awaiting_sanitize:' + awaiting_sanitize + ', sanitized_stage1: \
							' + sanitized_stage1 + ', sanitized_stage2: ' + sanitized_stage2 + "\n");    
				if (awaiting_sanitize == false && sanitized_stage1 == true && sanitized_stage2 == true){
					// Append a button on the bottom of the view to quickly get back to the TOP
					// *extra IF statement check to help eliminate the possibility of duplicate data being displayed
					if (courseraDiv.querySelector('#toTopAnchor') === null){
						courseraDiv.insertAdjacentHTML('beforeend', '<a id="toTopAnchor" class="button" href="#titleDiv">^Top</a>');
					}
		
					// Make sure we are at top of page
					document.getElementById("toTopAnchor").click();
					
					// Save and Send our updated Categories via messaging to 'main.js'
					var _last_categories = JSON.stringify(categories);
					self.port.emit("lastCategories",_last_categories);			
								
					// Save our browse state and zero scroll position
					browse_state[0] = {"courseraDiv":document.getElementById('courseraDiv').innerHTML,"scrollTop":0};
					// $debug_ON && console.log("==> browse_state after 'getAllCategories()' call: " + browse_state[0].courseraDiv);	//**json output commented out
					
					// Sending updated state via messaging to 'main.js'
					var _browse_state = JSON.stringify(browse_state[0]);
					self.port.emit("browseState",_browse_state);
					
					// Set our current clicked link location
					link_listeners.location = "getCategoryCourses";
					
					// Send our links to 'main.js' for storage
					$debug_ON && console.log("LINK Listeners" + link_listeners);
					var _link_listeners = JSON.stringify(link_listeners);
					self.port.emit("linkListeners",_link_listeners);
					
					// **RESET** our global sanitize_count back to 0 so that we don't get duplicate data
					// and so that other functions start with sanitize as 0
					sanitize_count = 0;
					
					// Reset our in_getAllCategories flag to false
					in_getAllCategories = false;
					
					console.log('Global states after getAllCategories() run=');
					console.log('in_getAllCategories: ' + in_getAllCategories);
					console.log('in_getCategoryCourses: ' + in_getCategoryCourses);
				}
			}	// End of function: save_allCategoriesState()
		};	// End of xhr.onload()
		
		// Set correct header for form data
		xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
		xhr.send(null);
		
	},
	
	updateLinkListeners: function (links, callback){
		$debug_ON && console.log("...Updating link listeners on page....");
		$debug_ON && console.log(links[0].location);
		
		// First ATTEMPT to restore our ALL Categories link to get back to the main category page:
		// this will fail on MAIN page since we don't have our btn_AllCategories yet on the page
		try {
			(function (){
				var btn_all_categories = document.getElementById("btn_AllCategories");
				$debug_ON && console.log("Button element is: " + btn_all_categories);
				btn_all_categories.addEventListener("click", function(){
					courseraBrowse.getAllCategories(
						function(){
							$debug_ON && console.log("Got allCategories");
						}
					);
					return false;
				}, false);	
			}())
		} catch (e){
			$debug_ON && console.log("Error: " + e);
		}
				
		// Restore remaining links on the page
		var location = links[0].location;
		for (var link_obj in links[0].links_ids){
			// Deliberate closure
			(function (){
				var current_link = document.getElementById(links[0].links_ids[link_obj]._link);
				var current_id = links[0].links_ids[link_obj]._current_id;
				$debug_ON && console.log("Activating link: " + links[0].links_ids[link_obj]._link + " with current_id of: " + current_id);
				if (location == "getCategoryCourses"){
					current_link.addEventListener("click", function(){
						courseraBrowse.getCategoryCourses(
							current_id,
							function(){
								$debug_ON && console.log("...beginning...single CategoryCourses XHR Request");
								// we will do nothing else here, since we are updating HTML 
								// in the 'onload' of our ajax request, as indicated by TRUE as follows 
							}, true);
							return false;
						}, false);	
				} else if (location == "getCourseDetails"){
					var array_ccid = [current_id]; 	// since getCourseDetails expects array of cours id's
					current_link.addEventListener("click", function(){
						courseraBrowse.getCourseDetails(
							array_ccid,
							function(){
								$debug_ON && console.log("...beginning...single CourseDetails XHR Request");
								// we will do nothing else here, since we are updating HTML 
								// in the 'onload' of our ajax request, as indicated by TRUE as follows 
							}, true);	
							return false;
						}, false);					
				}			
			}())
		}
		callback(0);
	},
	
	// Communicates with main.js() to sanitize passed HTML
	sanitizeAllCategoriesHTML: function(_categories_length, categ_id, html){
		awaiting_sanitize = true;
		$debug_ON && console.log("...inside coursera_browse sanitizeAllCategoriesHTML()...");
		$debug_ON && console.log("received: categ_id, " + categ_id + "| html, " + html);
		
		self.port.emit("sanitizeHTML", {'location':'getAllCategories', 'categ_id':categ_id, 'html':html});
		
		return new Promise(function(resolve, reject){
			self.port.once("cleanHTML" + categ_id, function handleCleanHTML(cleanHTML_msg){
				self.port.removeListener("cleanHTML" + categ_id, handleCleanHTML);
				$debug_ON && console.log("Sanitize successful!" + cleanHTML_msg);
				sanitize_count += 1;
				$debug_ON && console.log("Sanitize count: " + sanitize_count);
				
				var cleaned_all_Categories = false;
				
				// Resolve our promise
				if(cleanHTML_msg.html.length > 0){
					// Check if we have made the last sanitation on our categories.
					// ...if so, respond that all categories have been cleaned
					// The logic here is dependent on that we are performing 2 calls to sanitize per category.
					if(sanitize_count === _categories_length * 2){
						cleaned_all_Categories = true;
						cleanHTML_msg.cleaned_all_Categories = true;
					}				
				
					$debug_ON && console.log("FULLFILLING Promise\n");
					resolve(JSON.stringify(cleanHTML_msg));
					self.port.removeListener(reject);
					//return 0;
				} else{
					reject("Failed to get cleaned HTML in sanitizeAllCategoriesHTML!");
					self.port.removeListener(resolve);
					//return 1;
				}
			});		
		});
	},

	// Communicates with main.js() to sanitize passed HTML
	sanitizeCategoryCoursesHTML: function(_cc_length, course_id, univ_id, html){
		awaiting_sanitize = true;
		$debug_ON && console.log("...inside coursera_browse sanitizeCategoryCoursesHTML()...");
		$debug_ON && console.log("received: course_id, " + course_id + "| univ_id, " + univ_id + "| html, " + html);
		
		self.port.emit("sanitizeHTML", {'location':'getCategoryCourses', 'course_id':course_id, 'univ_id':univ_id, 'html':html});
		
		return new Promise(function(resolve, reject){
			self.port.once("cleanHTML" + course_id + "_" + univ_id, function handleCleanHTML(cleanHTML_msg){
				self.port.removeListener("cleanHTML" + course_id + "_" + univ_id, handleCleanHTML);
				$debug_ON && console.log("Sanitize successful!" + cleanHTML_msg);
				sanitize_count += 1;
				$debug_ON && console.log("Sanitize count: " + sanitize_count);
				
				var cleaned_all_CCs = false;
				
				// Resolve our promise
				if(cleanHTML_msg.html.length > 0){	
					// If all our Category Courses have been sanitized,
					// we notify accordingly.
					// Logic here is that our sanitize_count should be 
					// equal to the length of the category course array.
					if(sanitize_count === _cc_length){
						cleaned_all_CCs = true;
						cleanHTML_msg.cleaned_all_CCs = true;
					}
				
					$debug_ON && console.log("FULLFILLING Promise\n");
					resolve(JSON.stringify(cleanHTML_msg));
					
					self.port.removeListener(reject);
					//return 0;
				} else{
					reject("Failed to get cleaned HTML");
					self.port.removeListener(resolve);
					//return 1;
				}
			});		
		});
	},

	// Communicates with main.js() to sanitize passed HTML
	sanitizeCC_UniversitiesHTML: function(_courses_length, _univ_json_length, univ_id, html){
		awaiting_sanitize = true;
		$debug_ON && console.log("...inside coursera_browse sanitizeCC_UniversitiesHTML()...");
		$debug_ON && console.log("received: univ_id, " + univ_id + "| html, " + html);
		
		self.port.emit("sanitizeHTML", {'location':'getCategoryCourses_Universities', 'univ_id':univ_id, 'html':html});
		
		return new Promise(function(resolve, reject){
			self.port.once("cleanHTML" + univ_id + "_ccUniversities", function handleCleanHTML(cleanHTML_msg){
				self.port.removeListener("cleanHTML" + univ_id + "_ccUniversities", handleCleanHTML);
				$debug_ON && console.log("Sanitize successful!" + cleanHTML_msg);
				sanitize_count += 1;
				$debug_ON && console.log("Sanitize count: " + sanitize_count);
				
				var cleaned_all_Universities = false;
				
				// Resolve our promise
				if(cleanHTML_msg.html.length > 0){				
					// If all our Category Course Universities have been sanitized,
					// we notify accordingly.
					// Logic here is that our sanitize_count should be 
					// equal to the length of the course array + length of UnivJSON array.
					if (sanitize_count === (_courses_length +  _univ_json_length)){
						cleaned_all_Universities = true;
						cleanHTML_msg.cleaned_all_Universities = true;
					}
					
					$debug_ON && console.log("FULLFILLING Promise\n");
					resolve(JSON.stringify(cleanHTML_msg));
					self.port.removeListener(reject);
					//return 0;
				} else{
					reject("Failed to get cleaned HTML");
					self.port.removeListener(resolve);
					//return 1;
				}
			});		
		});
	},

	// Communicates with main.js() to sanitize passed HTML
	sanitizeLinkedCategoriesHTML: function(_linked_categories_length, course_id, linked_categ_id, html){
		awaiting_sanitize = true;
		$debug_ON && console.log("...inside coursera_browse sanitizeLinkedCategoriesHTML()...");
		$debug_ON && console.log("received: course_id, " + course_id + "| linked_categ_id, " + linked_categ_id + "| html, " + html);
		
		self.port.emit("sanitizeHTML", {'location':'getCourseDetails_LinkedCategories', 'course_id':course_id, 'linked_categ_id':linked_categ_id, 'html':html});
		
		return new Promise(function(resolve, reject){
			self.port.once("cleanHTML" + course_id + "_" + linked_categ_id + "_linkedCategories", function handleCleanHTML(cleanHTML_msg){
				self.port.removeListener("cleanHTML" + course_id + "_" + linked_categ_id + "_linkedCategories", handleCleanHTML);
				$debug_ON && console.log("Sanitize successful!" + cleanHTML_msg);
				sanitize_count += 1;
				$debug_ON && console.log("Sanitize count: " + sanitize_count);
				
				var cleaned_all_LinkedCategories = false;
				
				// Resolve our promise
				if(cleanHTML_msg.html.length > 0){				
					// If all our Course Linked Categories have been sanitized,
					// we notify accordingly.
					// Logic here is that our sanitize_count, up to this point should be 
					// equal to the length of the linked_categories array for a course.
					if (sanitize_count === _linked_categories_length){
						cleaned_all_LinkedCategories = true;
						cleanHTML_msg.cleaned_all_LinkedCategories = true;
					}
					
					$debug_ON && console.log("FULLFILLING Promise\n");
					resolve(JSON.stringify(cleanHTML_msg));
					self.port.removeListener(reject);
					//return 0;
				} else{
					reject("Failed to get cleaned HTML");
					self.port.removeListener(resolve);
					//return 1;
				}
			});		
		});
	},

	// Communicates with main.js() to sanitize passed HTML
	sanitizeCourseDetailsHTML: function(_linked_categories_length, _courses_length, course_id, html){
		awaiting_sanitize = true;
		$debug_ON && console.log("...inside coursera_browse sanitizeCourseDetailsHTML()...");
		$debug_ON && console.log("received: course_id, " + course_id + "| html, " + html);
		
		self.port.emit("sanitizeHTML", {'location':'getCourseDetails_Details', 'course_id':course_id, 'html':html});
		
		return new Promise(function(resolve, reject){
			self.port.once("cleanHTML" + course_id + "_courseDetails", function handleCleanHTML(cleanHTML_msg){
				self.port.removeListener("cleanHTML" + course_id + "_courseDetails", handleCleanHTML);
				$debug_ON && console.log("Sanitize successful!" + cleanHTML_msg);
				sanitize_count += 1;
				$debug_ON && console.log("Sanitize count: " + sanitize_count);
				
				var cleaned_CourseDetails = false;
				
				// Resolve our promise
				if(cleanHTML_msg.html.length > 0){				
					// If our CourseDetails has been sanitized,
					// we notify accordingly.
					// Logic here is that our sanitize_count, up to this point should be 
					// equal to the length of the linked_categories array for a course,
					// + 1 for the course details
					if (sanitize_count === (_linked_categories_length + 1)){
						cleaned_CourseDetails = true;
						cleanHTML_msg.cleaned_CourseDetails = true;
					}
					
					$debug_ON && console.log("FULLFILLING Promise\n");
					resolve(JSON.stringify(cleanHTML_msg));
					self.port.removeListener(reject);
					//return 0;
				} else{
					reject("Failed to get cleaned HTML");
					self.port.removeListener(resolve);
					//return 1;
				}
			});		
		});
	},

	// Communicates with main.js() to sanitize passed HTML
	sanitizeCourseInstructorsHTML: function(_linked_categories_length, course_id, html){
		awaiting_sanitize = true;
		$debug_ON && console.log("...inside coursera_browse sanitizeCourseInstructorsHTML()...");
		$debug_ON && console.log("received: course_id, " + course_id + "| html, " + html);
		
		self.port.emit("sanitizeHTML", {'location':'getCourseDetails_Instructors', 'course_id':course_id, 'html':html});
		
		return new Promise(function(resolve, reject){
			self.port.once("cleanHTML" + course_id + "_courseInstructors", function handleCleanHTML(cleanHTML_msg){
				self.port.removeListener("cleanHTML" + course_id + "_courseInstructors", handleCleanHTML);
				$debug_ON && console.log("Sanitize successful!" + cleanHTML_msg);
				sanitize_count += 1;
				$debug_ON && console.log("Sanitize count: " + sanitize_count);
				
				var cleaned_CourseInstructors = false;
				
				// Resolve our promise
				if(cleanHTML_msg.html.length > 0){				
					// If our CourseDetails has been sanitized,
					// we notify accordingly.
					// Logic here is that our sanitize_count, up to this point should be 
					// equal to the length of the linked_categories array for a course,
					// + 1 for the single parse of course details
					// + 1 for the single parse course Instructor section html
					if (sanitize_count === (_linked_categories_length + 2)){
						cleaned_CourseInstructors = true;
						cleanHTML_msg.cleaned_CourseInstructors = true;
					}
					
					$debug_ON && console.log("FULLFILLING Promise\n");
					resolve(JSON.stringify(cleanHTML_msg));
					self.port.removeListener(reject);
					//return 0;
				} else{
					reject("Failed to get cleaned HTML");
					self.port.removeListener(resolve);
					//return 1;
				}
			});		
		});
	},

	// Communicates with main.js() to sanitize passed HTML
	sanitizeCourseSessionsHTML: function(_linked_categories_length, course_id, html){
		awaiting_sanitize = true;
		$debug_ON && console.log("...inside coursera_browse sanitizeCourseSessionsHTML()...");
		$debug_ON && console.log("received: course_id, " + course_id + "| html, " + html);
		
		self.port.emit("sanitizeHTML", {'location':'getCourseDetails_Sessions', 'course_id':course_id, 'html':html});
		
		return new Promise(function(resolve, reject){
			self.port.once("cleanHTML" + course_id + "_courseSessions", function handleCleanHTML(cleanHTML_msg){
				self.port.removeListener("cleanHTML" + course_id + "_courseSessions", handleCleanHTML);
				$debug_ON && console.log("Sanitize successful!" + cleanHTML_msg);
				sanitize_count += 1;
				$debug_ON && console.log("Sanitize count: " + sanitize_count);
				
				var cleaned_CourseSessions = false;
				
				// Resolve our promise
				if(cleanHTML_msg.html.length > 0){				
					// If our CourseDetails_Sessions has been sanitized,
					// we notify accordingly.
					// Logic here is that our sanitize_count, up to this point should be 
					// equal to the length of the linked_categories array for a course,
					// + 1 for the single parse of course details
					// + 1 for the single parse of course Instructor section html
					// + 1 for the single parse of course Session info html
					if (sanitize_count === (_linked_categories_length + 3)){
						cleaned_CourseSessions = true;
						cleanHTML_msg.cleaned_CourseSessions = true;
					}
					
					$debug_ON && console.log("FULLFILLING Promise\n");
					resolve(JSON.stringify(cleanHTML_msg));
					self.port.removeListener(reject);
					//return 0;
				} else{
					reject("Failed to get cleaned HTML");
					self.port.removeListener(resolve);
					//return 1;
				}
			});		
		});
	}	

};

/**
Some app defined recognized message types to make
sending messages a bit easier in our program:
	1) notification
	2) request
	3) response
	4) acknowledge
	5) browseStateResponse
	6) browseStateUpdate
    7) linkStateUpdate
	8) lastCategoriesUpdate
**/
function messageListeningBuilder(){
	self.port.on("notification", function handleNotification (notification_msg){
		$debug_ON && console.log("MSG $Key is: notification"); 
		$debug_ON && console.log("coursera_browse.js Received message: " + notification_msg);
		
		// do nothing else
	});
	self.port.on("request", function handleRequest (request_msg){
		$debug_ON && console.log("MSG $Key is: request"); 
		$debug_ON && console.log("coursera_browse.js Received message: " + request_msg);
		// do nothing else
	});
	self.port.on("response", function handleNotification (response_msg){
		$debug_ON && console.log("MSG $Key is: response"); 
		$debug_ON && console.log("coursera_browse.js Received message: " + response_msg);
		
		// do nothing else
	});	
	self.port.on("acknowledge", function handleAcknowledge (acknowledge_msg){
		$debug_ON && console.log("MSG $Key is: acknowledge"); 
		$debug_ON && console.log("coursera_browse.js Received message: " + acknowledge_msg);
		// do nothing else
	});		
	self.port.on("browseStateResponse", function handleResponse (response_msg){
		$debug_ON && console.log("MSG $Key is: response"); 
		$debug_ON && console.log("coursera_browse.js Received message: " + response_msg);
			if(response_msg == "0_browse_state"){
				// Load our default page of Coursera Categories
				courseraBrowse.getAllCategories(
					function(){
						$debug_ON && console.log("Got allCategories");
					}
				);	
			self.port.removeListener("browseStateResponse", handleResponse);		
			} else {
				$debug_ON && console.log("!main.js UNHANDLED response: ", response_msg);
			}
	});	
	self.port.on("browseStateUpdate", function handleBrowseStateUpdate (browseStateUpdate_msg){
		$debug_ON && console.log("MSG $Key is: browseStateUpdate"); 
		$debug_ON && console.log("coursera_browse.js Received message: " + browseStateUpdate_msg);

		self.port.emit("acknowledge",'browse_state update received');
		$debug_ON && console.log("!~~~~coursera_browse.js has received browse_state message~~~~!");
		browse_state[0] = JSON.parse(browseStateUpdate_msg);
		$debug_ON && console.log("JSON parsed browse_state msg: " + browse_state[0].courseraDiv);
		
		// Set our HTML to the data sent
		var courseraDiv = document.getElementById('courseraDiv');
		courseraDiv.innerHTML = " ";
		
		courseraDiv.insertAdjacentHTML('beforeend', browse_state[0].courseraDiv);
		//$('#courseraDiv').html(browse_state[0].courseraDiv);
		//$('#courseraDiv').show();		
		
		// Set our panel size depending on the page we are on:
		//$debug_ON && console.log(browse_state[0].courseraDiv.slice(82,100));
		if (browse_state[0].courseraDiv.slice(97,114) == "...also found in:"){
			// Then we are on a Course detail page and need a larger width
			self.port.emit('resize', {'width':400, 'height':585});
		};
		
		// Remove listener until next show();
		self.port.removeListener("browseStateUpdate", handleBrowseStateUpdate);
	});	
	self.port.on("linkStateUpdate", function handleLinkStateUpdate (linkStateUpdate_msg){
		$debug_ON && console.log("MSG $Key is: linkStateUpdate"); 
		$debug_ON && console.log("coursera_browse.js Received message: " + linkStateUpdate_msg);

		self.port.emit("acknowledge",'link_state update received');
		$debug_ON && console.log("!~~~~coursera_browse.js has received link_state message~~~~!");
		link_listeners[0] = JSON.parse(linkStateUpdate_msg);
		$debug_ON && console.log("JSON parsed link_state msg 'location': " + link_listeners[0].location);
		
		// Update our listeners
		$debug_ON && console.log("...initiating Listener update!...");
		// Call our updateLinkListener function
		courseraBrowse.updateLinkListeners(link_listeners, function (response){
			if(response == 0){
				$debug_ON && console.log("Successfully updated LinkListeners!");
			} else {
				$debug_ON && console.log("ERROR updating LinkListeners!: " + response);
			}
		});
		// Remove listener until next show();
		self.port.removeListener("linkStateUpdate", handleLinkStateUpdate);		
	});
	self.port.on("lastCategoriesUpdate", function handleLastCategoriesUpdate (lastCategoriesUpdate_msg){
		$debug_ON && console.log("MSG $Key is: lastCategoriesUpdate"); 
		$debug_ON && console.log("coursera_browse.js Received message: " + lastCategoriesUpdate_msg);
		
		self.port.emit("acknowledge",'last_categories update received');
		$debug_ON && console.log("!~~~~coursera_browse.js has received last_categories message~~~~!");
		// Update our categories
		$debug_ON && console.log("...initiating Category update!...");				
		categories = JSON.parse(lastCategoriesUpdate_msg);
		$debug_ON && console.log("JSON parsed last_categories msg: " + categories);
		
		// Remove listener until next show();
		self.port.removeListener("linkStateUpdate", handleLastCategoriesUpdate);		
	});
}

// Runs at panel.html load
document.addEventListener('DOMContentLoaded', function () {
	self.port.on("show", function onShow() {
		// Initiate Message Listening
		messageListeningBuilder();

		// Send a response on load
		self.port.emit("response", "Hello: main.js!");
		
		// Request our stored "last_categories" object, if it exists
		self.port.emit("request", "last_categories");	
		// Request our stored "browse_state" object, if it exists
		self.port.emit("request", "browse_state");
		// Request our stored "link_state" object, if it exists
		self.port.emit("request", "link_state");	
	});
	
	self.port.on("hide", function onHide() {
		$debug_ON && console.log("Panel Hidden");
	});
});