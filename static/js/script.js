var canvas = document.getElementById("canvas");

window.addEventListener("resize", OnResizeCalled, false); 
 
function OnResizeCalled() { 
	var gameWidth = window.innerWidth; 
	var gameHeight = window.innerHeight; 
	var scaleToFitX = gameWidth / 1920; 
	var scaleToFitY = gameHeight / 1080; 
	 
	var currentScreenRatio = gameWidth / gameHeight; 
	var optimalRatio = Math.min(scaleToFitX, scaleToFitY); 
	 
	if (currentScreenRatio >= 1.77 && currentScreenRatio <= 1.79) { 
	    canvas.style.width = gameWidth + "px"; 
	    canvas.style.height = gameHeight + "px"; 
	} 
	else { 
	    canvas.style.width = 1920 * optimalRatio + "px"; 
	    canvas.style.height = 1080 * optimalRatio + "px"; 
	}
}

OnResizeCalled();
