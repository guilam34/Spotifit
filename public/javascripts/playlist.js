var selected_tracks = new Array();

function toggleSelection(track){
	var id = String(track.dataset.id);
	
	if(selected_tracks.indexOf(id) > -1){
		selected_tracks.splice(selected_tracks.indexOf(id), 1);	
		track.style.backgroundColor = "transparent";	
		track.style.backgroundColor = "	"
		track.style.borderRadius = "none";
	}else{
		selected_tracks.push(id);
		track.style.backgroundColor = "rgb(26, 51, 0)";
		track.style.borderRadius = "10px";
	}

}

function getRecommendations(){
	var redirect_url = '/api/1/tracks-data?ids=';

	for(var i = 0 ; i < selected_tracks.length; i++){
		redirect_url += selected_tracks[i];

		if(i != selected_tracks.length - 1){
			redirect_url += ',';
		}
	}

	window.location = redirect_url;
}

