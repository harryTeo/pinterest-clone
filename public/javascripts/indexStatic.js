// Scroll Reveal Effect
window.sr = ScrollReveal({duration: 1000});	
// Initialize Masonry - Main Grid Continer
var gridContainer = $('.grid').masonry({
  // set itemSelector so .grid-sizer is not used in layout
  itemSelector: '.grid-item',
  // use element for option
  columnWidth: '.grid-sizer',
  percentPosition: true
  // horizontalOrder: true
});
// layout Masonry after each image loads
gridContainer.imagesLoaded().progress(function() {
  gridContainer.masonry('layout');
  sr.reveal('.card');
});
// Initialize Masonry - Favorites Grid Continer
var favoritesGridContainer = $('.favoritesGrid').masonry({
  itemSelector: '.grid-item',
  columnWidth: '.grid-sizer',
  percentPosition: true
});
// layout Masonry after each image loads
favoritesGridContainer.imagesLoaded().progress(function() {
  favoritesGridContainer.masonry('layout');
  sr.reveal('.favoritesGrid .card');
});
$('.favoritesGrid').masonry( 'on', 'layoutComplete', function() {
	// console.log('layout is complete');
	sr.sync();
});	

// Initialize Bootstrap Tooltips
$('[data-toggle="tooltip"]').tooltip();

// Scroll back to top button
$(window).scroll(function(){
	if ( $(this).scrollTop() >= 500 ) {
	    $(".scrollTop").fadeIn(700);
	}
	else {
	  $(".scrollTop").fadeOut(700);
	}
});
$(".scrollTop").click(function(){
  $("html,body").stop().animate({scrollTop : 0});
});

// Handle the onError event for the image to reassign its source
function imgError(image) {
  image.onerror = "";
  image.src = "/images/image_placeholder.png";
  $(".grid").masonry('reloadItems').imagesLoaded().progress(function(){ $(".grid").masonry('layout'); });
  return true;
}

// Handle .js-imageModal click
$("body").on("click", ".js-imageModal", function() { // This way of handling the "click" event, makes it available on dynamically appended elements
	var imgSrc = $(this).attr("src");
	var imgTitle = $(this).attr("alt");
	// $("#imageModal .modal-title").html(imgTitle);
	$("#imageModal img").attr("src", imgSrc);
	$("#imageModal img").attr("alt", imgTitle);
	$("#imageModal").modal("show");
});

// Clear image "src" and "alt" attributes on "#imageModal" close
$("#imageModal").on("hidden.bs.modal", function () {
	$("#imageModal img").attr("src", "");
	$("#imageModal img").attr("alt", "");
});

// Handle #profileRadioButtons click
$("#favoriteImages").click(function(event) {
	$("#favoriteImages").attr("checked", true);
	$("#profileOwnerImages").attr("checked", false);
	$(".grid").fadeOut(200, function(){
		$(".favoritesGrid").fadeIn(200, function(){
			$(".favoritesGrid").masonry('layout');
		});
	});
});
$("#profileOwnerImages").click(function(event) {	
	$("#profileOwnerImages").attr('checked', true);	
	$("#favoriteImages").attr('checked', false);
	$(".favoritesGrid").fadeOut(200, function(){
		$(".grid").fadeIn(200, function(){
			$(".grid").masonry('layout');
			sr.sync();
		});
	});

});

// Handle .favorite-button click 
$("body").on("click", ".favorite-button", function(event) {
	$(event.currentTarget).prop("disabled", true);
	var imageId = event.currentTarget.getAttribute("data-id");
	var csrf = $("input[name=_csrf]").val();
	$.ajax({
    type: "PUT",
    url: "/setfavorite", 
 		data: JSON.stringify({ imageId: imageId }),
 		contentType: 'application/json',
    headers: {
      'X-CSRF-TOKEN': csrf
    }
	})	
	.done(function(data, textStatus, jqXHR){ // Success
		// Handle the Personal Profile Page Case (Incude/Remove Favorite from Favorites)
		var currentUrlArray = window.location.href.split('/');
		if (currentUrlArray[currentUrlArray.length-1] === data.currentUserId) { // Personal Profile Page 
			if(data.alreadyFavorite) {
				$('.favorite-button[data-id="' + data.updatedImage._id + '"]').html('<i class="fa fa-star" aria-hidden="true"></i> ' + data.totalLikes);	
			  $('.favoritesGrid').masonry('remove', $('.favorite-button[data-id="' + data.updatedImage._id + '"]').parent().parent().parent()).masonry('layout');			
			}
			else {
				$('.favorite-button[data-id="' + data.updatedImage._id + '"]').html('<i class="fa fa-star alreadyFavorite" aria-hidden="true"></i> ' + data.totalLikes);
				var elem = '<div class="grid-item">\
											<div class="card">\
												<img class="card-img-top img-fluid js-imageModal" src="' + data.updatedImage.url + '" alt="' + data.updatedImage.title + '" data-id="' + data.updatedImage._id + '" onerror="imgError(this);" />\
												<div class="card-block"><h4 class="card-title text-center">' + data.updatedImage.title + '</h4></div>\
												<div class="card-footer">\
													<a href="/profile/' + data.updatedImage.createdById + '" class="usernameLink profileOwnerUsername">' + data.updatedImage.createdByName + '</a>\
													<button type="button" class="btn btn-secondary favorite-button" data-id="' + data.updatedImage._id + '"><i class="fa fa-star alreadyFavorite" aria-hidden="true"></i> ' + data.totalLikes + '</button>\
												</div>\
											</div>\
										</div>';
				$(".favoritesGrid").prepend(elem).masonry('prepended', elem).masonry('reloadItems').imagesLoaded().progress(function(){ $(".favoritesGrid").masonry('layout'); });				
			}
		}
		else { // Not Personal Profile Page 
			if (data.alreadyFavorite) { $(event.currentTarget).html('<i class="fa fa-star" aria-hidden="true"></i> ' + data.totalLikes); }
			else { $(event.currentTarget).html('<i class="fa fa-star alreadyFavorite" aria-hidden="true"></i> ' + data.totalLikes); }
		}
	})	
  .fail(function(jqXHR, textStatus, errorThrown){ // Failure
  	console.log("Failure...");
  	console.log(errorThrown);
  })	
	.always(function(){ // Always executed upon completion of ajax request
		$(event.currentTarget).prop("disabled", false);
	});
});

// Handle .delete-image click 
$(".grid").on("click", ".delete-image", function(event) {
	$(event.currentTarget).prop("disabled", true);
	var imageId = $(event.currentTarget).siblings("img").attr("data-id");
	var csrf = $("input[name=_csrf]").val();
	$.ajax({
    type: "DELETE",
    url: "/deleteimage", 
 		data: JSON.stringify({ imageId: imageId }),
 		contentType: 'application/json',    
    headers: {
      'X-CSRF-TOKEN': csrf
    }
	})	
	.done(function(data, textStatus, jqXHR){ // Success
		// console.log(data);
		$(".grid").masonry('remove', $(event.currentTarget).closest(".grid-item")).masonry('layout');
		if($('.favoritesGrid .favorite-button[data-id="' + data.id + '"]').length) { // Deleted Image was also in Favorites
			$('.favoritesGrid').masonry('remove', $('.favorite-button[data-id="' + data.id + '"]').parent().parent().parent()).masonry('layout');
		}
	})	
  .fail(function(jqXHR, textStatus, errorThrown){ // Failure
  	console.log("Failure...");
  	console.log(errorThrown);
  	$(event.currentTarget).prop("disabled", false);
  })	
	.always(function(){ // Always executed upon completion of ajax request
		// console.log("This part will be executed always!");
	});
});

// Handle .js-addImageModal click
$(".js-addImageModal").click(function(event) {
	event.preventDefault();
	$("#addImageModal").modal("show");
});
// Handle #addImageModal -> #addImageForm submision
$("#addImageForm").submit(function(event) {
	event.preventDefault();
	var imageUrl = $("#imageUrlInput").val().trim();
	var imageTitle = $("#imageTitleInput").val().trim();
	if (imageUrl && imageTitle) { // Continue, iff required inputs non-empty (else do nothing)
		var matcher = /(http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/; // Regular Expression for URL validation
		if (!matcher.test(imageUrl)) { // Invalid URL
			$("#invalid-url-error").css( {visibility: "visible", opacity: 1} );
			$("#imageUrlInput").focus();
		}
		else { // Valid URL
			$("#addImageForm :submit").prop("disabled", true); // Temporarilly Disable the Submit Button
			var postURL = $("#addImageForm").attr("action");
			var formData = $("#addImageForm").serializeArray();
		  $.ajax({
		  	type: "POST",
		  	url: postURL, 
		  	data: formData	
		  })
		  .done(function(data, textStatus, jqXHR){ // Success
		  	var currentUrlArray = window.location.href.split('/');
		  	if (currentUrlArray[currentUrlArray.length-1] === "") { // Home Page
					var elem = '<div class="grid-item">\
												<div class="card">\
													<img class="card-img-top img-fluid js-imageModal" src="' + data.url + '" alt="' + data.title + '" onerror="imgError(this);" />\
													<div class="card-block"><h4 class="card-title text-center">' + data.title + '</h4></div>\
													<div class="card-footer">\
														<a href="/profile/' + data.createdById + '" class="usernameLink">' + data.createdByName + '</a>\
														<button type="button" class="btn btn-secondary favorite-button" data-id="' + data._id + '"><i class="fa fa-star" aria-hidden="true"></i> 0</button>\
													</div>\
												</div>\
											</div>';
					$(".grid").masonry().prepend(elem).masonry('prepended', elem).masonry('reloadItems').imagesLoaded().progress(function(){ $(".grid").masonry('layout'); });
		  	}
		  	else if (currentUrlArray[currentUrlArray.length-1] === data.createdById) { // Profile Page -> In this case, also add the .delete-image button
					var elem = '<div class="grid-item">\
												<div class="card">\
													<button type="button" class="btn delete-image"><i class="fa fa-trash-o" aria-hidden="true"></i></button>\
													<img class="card-img-top img-fluid js-imageModal" src="' + data.url + '" alt="' + data.title + '" data-id="' + data._id + '" onerror="imgError(this);" />\
													<div class="card-block"><h4 class="card-title text-center">' + data.title + '</h4></div>\
													<div class="card-footer">\
														<a href="/profile/' + data.createdById + '" class="usernameLink profileOwnerUsername">' + data.createdByName + '</a>\
														<button type="button" class="btn btn-secondary favorite-button" data-id="' + data._id + '"><i class="fa fa-star" aria-hidden="true"></i> 0</button>\
													</div>\
												</div>\
											</div>';
					$(".grid").masonry().prepend(elem).masonry('prepended', elem).masonry('reloadItems').imagesLoaded().progress(function(){ $(".grid").masonry('layout'); });		  		
		  	}
	
				$("#addImageModal").modal("hide");
		  })
		  .fail(function(jqXHR, textStatus, errorThrown){ // Failure
		  	console.log("Failure...");
		  	console.log(errorThrown);
		  })
			.always(function(){ // Always executed upon completion of ajax request
				$("#addImageForm :submit").prop("disabled", false); // // Enable the Submit Button
			});
		}
	}		
});
$("#addImageModal").on("hidden.bs.modal", function () {
	$("#invalid-url-error").css( {visibility: "hidden", opacity: 0} );
	$("#imageUrlInput").val("");
	$("#imageTitleInput").val(""); 
});

// Handle .edit-profile click
$(".edit-profile").click(function(event) {
	$("#editProfileModal").modal("show");
});
// Handle #editProfileModal 
$("#editProfileModal").on("hidden.bs.modal", function () {
	$("#profile-image-preview").attr("src", $("#profile-image-preview").attr("data-src"));
	$("#profile-username-preview").text($("#profile-username-preview").attr("data-name"));
	$("#profilePictureInputFile").val("");
	$("#usernameInput").attr("value", $("#profile-username-preview").attr("data-name"));
	$("#usernameInput").val($("#profile-username-preview").attr("data-name"));
});
// #editProfileModal -> #usernameInput keypress
$("#editProfileModal").on("keyup", "#usernameInput", function() { // This way of handling the "click" event, makes it available on dynamically appended elements
	if($("#usernameInput").val().trim()==="") {
		$("#profile-username-preview").text($("#profile-username-preview").attr("data-name"));
	}
	else {
		$("#profile-username-preview").text($("#usernameInput").val().trim());
	}
});
// Handle #editProfileModal -> #editProfileForm submission
$("#editProfileForm").submit(function(event) {
	event.preventDefault();
	if ($("#profilePictureInputFile").val()!=="" || ($("#usernameInput").val().trim()!=="" && $("#usernameInput").val().trim()!==$("#profile-username-preview").attr("data-name"))) {
		$("#editProfileForm :submit").prop("disabled", true);
		var csrf = $("input[name=_csrf]").val();
		var postURL = $("#editProfileForm").attr("action");

		var formData = new FormData();
		formData.append('profilePictureInputFile', document.getElementById("profilePictureInputFile").files[0]);
		formData.append('usernameInput', $("#usernameInput").val().trim());

		$.ajax({
	    type: "POST",
	    url: postURL, 
	    data : formData,
	    processData: false,  // tell jQuery not to process the data
	    contentType: false,  // tell jQuery not to set contentType
    	headers: {
      	'X-CSRF-TOKEN': csrf
    	}		    
		})
	  .done(function(data, textStatus, jqXHR){ // Success
	  	console.log("Success!!");
	  	if (data.newProfilePictureFilename && data.newUsername) {
	  		$(".profile-image").attr("src", data.newProfilePictureFilename);
	  		$(".profile-username").text(data.newUsername);
	  		$(".profileOwnerUsername").text(data.newUsername);
	  		$("#profile-image-preview").attr("data-src", data.newProfilePictureFilename);
	  		$("#profile-username-preview").attr("data-name", data.newUsername);  			
	  	}
			$("#editProfileModal").modal("hide");
	  })
	  .fail(function(jqXHR, textStatus, errorThrown){ // Failure
	  	console.log("Failure...");
	  	console.log(errorThrown);
	  })
		.always(function(){ // Always executed upon completion of ajax request
			$("#editProfileForm :submit").prop("disabled", false); 
		});		
	}
	else {
		$("#editProfileModal").modal("hide");
	}
});
// #editProfileModal -> Function triggered on file upload (before #editProfileForm submission)
function previewImage() {
	var imageSrc = $("#profile-image-preview").attr("data-src");
  var fileName = $("#profilePictureInputFile").val().trim().toLowerCase();
  var regex = /(\.jpg|\.jpeg|\.gif|\.png)$/i;
  var fileSize = document.getElementById("profilePictureInputFile").files[0] ? document.getElementById("profilePictureInputFile").files[0].size : 0;

	if(!regex.exec(fileName) || fileSize>1000000) { // File extension not supported OR fileSize>1MB
		$("#profilePictureInputFile").val("");
		if($("#profile-image-preview").attr("src") !== imageSrc) {
			$("#profile-image-preview").attr("src", imageSrc);
		}		
		if(fileName!==""){
			$("#fileHelp").fadeOut(250).fadeIn(250).fadeOut(250).fadeIn(250).fadeOut(250).fadeIn(250);
		}
	}  
	else { // Valid file extension AND fileSize<=1MB
	  var oFReader = new FileReader();
	  oFReader.readAsDataURL(document.getElementById("profilePictureInputFile").files[0]);
	  oFReader.onload = function (oFREvent) {
	  	$("#profile-image-preview").attr("src", oFREvent.target.result);
	  };
	}
}