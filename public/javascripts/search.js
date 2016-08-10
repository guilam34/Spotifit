angular.module("spotifit", ['ui.bootstrap']).controller("searchController", function($scope, $http, $window) {
  $scope.loading = false;
  $scope.playlistSingle = false;
  $scope.playlistTracks = new Array();

  $scope.userTracks = new Array();
  $scope.userArtists = new Array();
  $scope.userPlaylists = new Array();

  $scope.suggestedTracks = new Array();
  $scope.suggestedArtists = new Array();
  $scope.selectedElmts = new Array();


  $scope.getUserTracks = function(){
    $scope.userTracks = new Array();
    $scope.loading = true;    
    return $http.get('/api/1/user/tracks', {      
    }).then(function(response){
      var results = (response.data);
      var display_data = new Array();

      for(var i = 0; i < results.length; i++){
        display_data.push({ 'id': results[i]['id'],
                            'name': results[i]['name'],
                            'artists': results[i]['artists'],
                            'type': 'track'
                         })

      }
      $scope.userTracks = display_data;
      $scope.loading = false;    
      return display_data; 
    });
  }

  $scope.getUserArtists = function(){
    $scope.userArtists = new Array();
    $scope.loading = true;
    return $http.get('/api/1/user/artists', {      
    }).then(function(response){     
      var results = (response.data);
      var display_data = new Array();

      for(var i = 0; i < results.length; i++){
        display_data.push({ 'id': results[i]['id'],
                            'name': results[i]['name'],
                            'type': 'artist'
                         })

      }
      $scope.userArtists = display_data;
      $scope.loading = false;    
      return display_data;
    });
  }

  $scope.getUserPlaylists = function(){
    $scope.playlistSingle = false;
    $scope.userPlaylists = new Array();
    $scope.loading = true;
    return $http.get('/api/1/user/playlists', {      
    }).then(function(response){    
      $scope.userPlaylists = response.data;
      $scope.loading = false;    
    });
  }

  $scope.getPlaylist = function(e){
    $scope.userPlaylists = new Array();
    $scope.playlistTracks = new Array();
    $scope.loading = true;
    var playlistId = e.currentTarget.firstChild.getAttribute("data-id");
    var playlistName = e.currentTarget.innerText;
    return $http.get('/api/1/playlist', {
      params: { id: playlistId,
                name: playlistName
              }    
    }).then(function(response){
      $scope.playlistTracks = response.data;
      $scope.loading = false;
      $scope.playlistSingle = true;
    });    
  }

  $scope.addLibraryEntryToSelected = function(e){
    var target = e.currentTarget.firstChild;
    $scope.selectedElmts.push({ 'id': target.getAttribute("data-id"),
                                'name': target.innerText,
                                'type': target.getAttribute("data-type")
                             });
  }

  $scope.addSuggestionToSelected = function(e){
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

  $scope.updateSuggestions = function(query){
    return $http.get('/api/1/suggestions', {
      params: {
        query: query
      }
    }).then(function(response){
      var results = (response.data)[0];
      var display_data = new Array();

      for(var i = 0; i < results['artists'].length; i++){
        display_data.push(results['artists'][i]['name']);
        $scope.suggestedArtists.push({ 'id': results['artists'][i]['id'],
                         'name': results['artists'][i]['name'],
                         'type': 'artist'
                      });
      }

      for(var i = 0; i < results['tracks'].length; i++){
        display_data.push(results['tracks'][i]['artist'] + " - " + results['tracks'][i]['name']);
        $scope.suggestedTracks.push({ 'id': results['tracks'][i]['id'],
                         'name': results['tracks'][i]['artist'] + " - " + results['tracks'][i]['name'],                        
                         'type': 'track'
                      });
      }

      return display_data;
    });
  };

  $scope.sharpenContentContainer = function(){
    document.getElementById("tabs_wrapper").children[1].children[1].style.borderTopLeftRadius = "0em";
  };

  $scope.roundOutContentContainer = function(){
    document.getElementById("tabs_wrapper").children[1].children[1].style.borderTopLeftRadius = "0.75em";
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

    var redirect_uri = '/api/1/tracks-data?ids=' + track_ids + '&a_ids=' +artist_ids + '&render=false';

    $window.location.href = redirect_uri;
  }  
});