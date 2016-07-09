module.exports = function(router, request, config){
	router.get('/suggestions', function(req, res){
		var search_string = req.query.query;

		var get_options = {
			url: 'https://api.spotify.com/v1/search?q=' + encodeURIComponent(search_string)
														+ '&type=artist,track&limit=10',
			json: true
		}

		request.get(get_options, function(error, response, body){
			if(!error && response.statusCode == 200){	
				var raw_artists = body['artists']['items'];			
				var raw_tracks = body['tracks']['items'];

				var artists = new Array();
				var tracks = new Array();

				for(var i = 0; i < (raw_artists.length > 3 ? 3 : raw_artists.length); i++){
					artists.push({ 'id': raw_artists[i]['id'],
								   'name': raw_artists[i]['name']
								});
				}

				for(var i = 0; i < (raw_tracks.length > 5 ? 5 : raw_tracks.length); i++){
					tracks.push({ 'id': raw_tracks[i]['id'],
								   'name': raw_tracks[i]['name'],
								   'artist': raw_tracks[i]['artists'][0]['name']
								});
				}

				var results = [{ 'artists': artists,							 
								 'tracks': tracks
							  }];

				res.statusCode = response.statusCode;
				res.send(results);
			}else{
				res.statusCode = response.statusCode;
				res.end();
			}
		});
	});

	router.get('/tracks-data', function(req, res){
		var raw_track_ids = req.query.ids;
		var raw_artist_ids = req.query.a_ids;
		var track_ids = raw_track_ids.split(',');
		var tracks_data = new Array();
		var tracks_processed = 0;
		var tempo = 132;

		//Get audio features for each track
		if(raw_track_ids != ''){
			for(var i = 0; i < track_ids.length; i++){
				var access_token = req.cookies.access_token;
				var cur_track = track_ids[i];

				var get_options = {
					url: 'https://api.spotify.com/v1/audio-features/' + cur_track,
					headers: {
						'Authorization': 'Bearer ' + access_token
					},
					json: true
				}

				request.get(get_options, function(error, response, body){
					if(!error && response.statusCode == 200){	
						tracks_data.push(body);
						tracks_processed++;

						//Resolve returned audio features into variables used to get track recommendations
						if(tracks_processed == track_ids.length){	
							var danceablity = energy = speechiness = acousticness = instrumentalness = liveness = valence = 0;				

							for(var i = 0; i < tracks_data.length; i++){
								danceablity += tracks_data[i]['danceablity'];
								energy += tracks_data[i]['energy'];
								speechiness = tracks_data[i]['speechiness'];
								acousticness = tracks_data[i]['acousticness'];
								instrumentalness = tracks_data[i]['instrumentalness'];
								liveness = tracks_data[i]['liveness'];
								valence = tracks_data[i]['valence'];
							}

							danceablity = danceablity / tracks_data.length;
							energy = energy / tracks_data.length;
							speechiness = speechiness / tracks_data.length;
							acousticness = acousticness / tracks_data.length;
							instrumentalness = instrumentalness / tracks_data.length;
							liveness = liveness / tracks_data.length;
							valence = valence / tracks_data.length;

							var uri = '/generate-playlist?' + 'ids=' + raw_track_ids + '&'
														   + 'danceablity=' + Math.round(danceablity * 10000) / 10000 + '&'
														   + 'energy=' + Math.round(energy * 10000) / 10000 + '&'
														   + 'speechiness=' + Math.round(speechiness * 10000) / 10000 + '&'
														   + 'acousticness=' + Math.round(acousticness * 10000) / 10000 + '&'
														   + 'instrumentalness=' + Math.round(instrumentalness * 10000) / 10000 + '&'
														   + 'liveness=' + Math.round(liveness * 10000) / 10000 + '&'
														   + 'valence=' + Math.round(valence * 10000) / 10000 + '&'
														   + 'tempo=' + tempo + '&'
														   + 'a_ids=' + raw_artist_ids;					
							res.redirect(uri);
						}
					}else{
						tracks_processed++;
					}
				});
			}
		}

		else{
			var uri = '/generate-playlist?ids=&a_ids=' + raw_artist_ids + '&tempo=' + tempo;
			res.redirect(uri);
		}
	});

	router.get('/playlist', function(req, res){	
		var user_id = req.cookies.user_id;
		var access_token = req.cookies.access_token;
		var playlist_id = req.query.id;
		var playlist_name = req.query.name;
		var render = req.query.render; 

		var get_options = {
			url: 'https://api.spotify.com/v1/users/' + user_id + '/playlists/'+ playlist_id + '/tracks',
			headers: {
				'Authorization': 'Bearer ' + access_token
			},
			json: true
		}
		request.get(get_options, function(error, response, body){
			if(!error && response.statusCode == 200){	
				var raw_tracks = body.items;
				var tracks = new Array();

				for(var i = 0; i < raw_tracks.length; i++){
					var cur_track = raw_tracks[i]['track'];
					var raw_artists = cur_track['artists'];
					var artists = new Array();
			
					//To Do: Verify how Spotify orders artists and filter accordingly
					for(var j = 0; j < raw_artists.length; j++){
						var cur_artist = raw_artists[j];
						artists.push({ id: cur_artist['id'],
									   name: cur_artist['name']
									});
					}
					tracks.push({ id: cur_track['id'],
								  name: cur_track['name'],
								  artists: artists
								});
				}

				if(!render){
					res.statusCode = response.statusCode;
					res.send(tracks);
				}	
				else{
					res.render('playlist_single', { id: playlist_id, 
													name: playlist_name,
													tracks: tracks
											  	  });
				}
			}else{
				if(!render){
					res.statusCode = response.statusCode;
					res.end();
				}
				else{
					res.redirect('/');
				}
			}
		});
	});

	return router;
}
