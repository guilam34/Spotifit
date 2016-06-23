angular.module("spotifit", ['ui.bootstrap']).controller("searchController", function($scope, $http, $window) {
  $scope.suggestedTracks = new Array();
  $scope.suggestedArtists = new Array();
  $scope.selectedElmts = new Array();


  $scope.updateSuggestions = function(query){
  	return $http.get('/suggestions', {
  		params: {
  			query: query
  		}
  	}).then(function(response){
  		var results = (response.data)[0];
  		var display_data = new Array();

  		for(var i = 0; i < results['artists'].length; i++){
  			display_data.push(results['artists'][i]['name']);
  			$scope.suggestedArtists.push({ 'id': results['artists'][i]['id'],
  										   'name': results['artists'][i]['name']
  										});
  		}

  		for(var i = 0; i < results['tracks'].length; i++){
  			display_data.push(results['tracks'][i]['name']);
  			$scope.suggestedTracks.push({ 'id': results['tracks'][i]['id'],
  										   'name': results['tracks'][i]['name']
  										});
  		}

  		return display_data;
  	});
  };

  $scope.addToSelected = function(e){
  	var name = String(e.currentTarget.childNodes[0].innerText);

  	for(var i = 0; i < $scope.suggestedArtists.length; i++){
  		if($scope.suggestedArtists[i].name == name){
  			$scope.selectedElmts.push({ 'id': $scope.suggestedArtists[i].id,
                                    'name': $scope.suggestedArtists[i].name,
  										              'type': 'artist'
  									             });
  			break;
  		}
  	}

  	if(i == $scope.suggestedArtists.length){
  		for(var i = 0; i < $scope.suggestedTracks.length; i++){
	  		if($scope.suggestedTracks[i].name == name){
	  			$scope.selectedElmts.push({ 'id': $scope.suggestedTracks[i].id,
                                      'name': $scope.suggestedTracks[i].name,
  											              'type': 'track'
  									 	             });
	  			break;
	  		}
	  	}
  	}
  };

  $scope.removeFromSelected = function(e){
    var name = String(e.currentTarget.firstChild.lastChild.innerText);

    for(var i = 0; i < $scope.selectedElmts.length; i++){
      if($scope.selectedElmts[i]['name'] == name){
        $scope.selectedElmts.splice(i, 1);
      }
    }
  };

  $scope.submitSelections = function(){
  	var artist_ids = '';
    var track_ids = '';

    for(var i = 0; i < $scope.selectedElmts.length; i++){
      if($scope.selectedElmts[i]['type'] == 'track')
        track_ids += $scope.selectedElmts[i]['id'] + ',';
      else
        artist_ids += $scope.selectedElmts[i]['id'] + ',';
    }

    artist_ids = artist_ids.substring(0, artist_ids.length - 1);
    track_ids = track_ids.substring(0, track_ids.length - 1);

    var redirect_uri = '/getTracksData?ids=' + track_ids + '&a_ids=' +artist_ids;

    $window.location.href = redirect_uri;
  }
});