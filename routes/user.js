module.exports = function(router, request, config){
	router.get('/generate-playlist', function(req, res){
		var access_token = req.cookies.access_token;
		var raw_artist_ids = req.query.a_ids;
		var artist_ids = raw_artist_ids.split(',');

		var uri = 'https://api.spotify.com/v1/recommendations?';
		uri += 'limit=40&';
		uri += 'min_tempo=' + req.query.tempo + '&';

		if(req.query.ids != ''){
			var tuneables = [parseInt(req.query.danceablity), parseInt(req.query.energy)];

			for(var i = 0; i < tuneables.length; i++){
				if(tuneables[i]< 0.5){
					tuneables[i] = 0.6;
				}else if(tuneables[i] + 0.2 > 1){
					tuneables[i] = 1;
				}else{
					tuneables[i] += 0.2;
				}
			}
					
			uri += 'min_danceability=' + (tuneables[0] + 0.2) + '&';
			uri += 'min_energy=' + (tuneables[1] + 0.2) + '&';
			uri += 'target_speechiness=' + req.query.speechiness + '&';
			uri += 'target_acousticness=' + req.query.acousticness + '&';
			uri += 'target_instrumentalness=' + req.query.instrumentalness + '&';
			uri += 'min_liveness=' + req.query.liveness + '&';
			uri += 'target_valence=' + req.query.valence + '&';		

			//Truncate track_ids if more than 5 selected
			var raw_track_ids = req.query.ids;
			var track_ids = raw_track_ids.split(',');

			if(track_ids.length <= (5 - artist_ids.length)){
				uri += 'seed_tracks=' + req.query.ids + '&';
			}else{
				var sliced_ids = '';
				for(var i = 0; i < (5 - artist_ids.length); i ++){
					sliced_ids += track_ids[i];

					if(i != 4)
						sliced_ids += ',';
				}

				uri += 'seed_tracks=' + sliced_ids + '&';
			}	
		}

		if(artist_ids.length <= 5){
			uri += 'seed_artists=' + raw_artist_ids;
		}else{
			var sliced_ids = '';
			for(var i = 0; i < artist_ids.length; i++){
				sliced_ids += artist_ids[i];

				if(i != 4){
					sliced_ids += ',';
				}
			}

			uri+= 'seed_artists=' + sliced_ids;
		}	

		//Get recommendations based on tracks ids and tuning variables provided
		var get_options = {
			url: uri,
			headers: {
				'Authorization': 'Bearer ' + access_token
			},
			json: true
		}

		request.get(get_options, function(error, response, body){
			if(!error && (response.statusCode == 200 || response.statusCode == 201)){	
				var recommendations = '';

				for(var i = 0; i < body['tracks'].length; i++){
					recommendations += 'spotify:track:' + body['tracks'][i]['id'];

					if(i != body.length - 1)
						recommendations += ',';
				}
				
				//Insert all tracks returned via recommendation request into new playlist
				//Playlist naming scheme 'Spotifit_<month-day-year>_<hours-minutes-seconds>'
				var user_id = req.cookies.user_id;
				var date = new Date();
				var playlist_name = 'Spotifit_' + String(parseInt(date.getMonth()) + 1)
												+ date.getDate()
												+ date.getFullYear()
												+ '_'
												+ date.getHours() + date.getMinutes() + date.getSeconds();

				var post_options = {
					url: 'https://api.spotify.com/v1/users/' + user_id + '/playlists',		
					body: JSON.stringify({
						'name': playlist_name
					}),
					dataType: 'json',
					headers: {
						'Authorization': 'Bearer ' + access_token,
						'Content-Type': 'application/json'
					}
				}

				request.post(post_options, function(error, response, body){
					if(!error && (response.statusCode == 200 || response.statusCode == 201)){	
						var playlist_id = JSON.parse(body).id;

						var insert_uri = 'https://api.spotify.com/v1/users/' + user_id + '/playlists/' + playlist_id + '/tracks?uris=' + recommendations;

						var post_options = {
							url: insert_uri,
							headers: {
								'Authorization': 'Bearer ' + access_token,
								'Content-Type': 'application/json'
							}
						}

						request.post(post_options, function(error, response, body){
							if(!error && (response.statusCode == 200 || response.statusCode == 201) ){
								res.redirect('/playlist?id=' + playlist_id +'&name=' + playlist_name + '&render=true');
							}else{
								res.redirect('/');
							}
						});
					}else{				
						res.redirect('/');
					}
				});
			}else{	
				res.redirect('/');
			}
		});
	});

	router.get('/playlists', function(req, res){			
		var access_token = req.cookies.access_token;

		var get_options = {
			url: 'https://api.spotify.com/v1/me/playlists',
			headers: {
				'Authorization': 'Bearer ' + access_token
			},
			json: true
		}
		request.get(get_options, function(error, response, body){
			if(!error && response.statusCode == 200){	
				var playlists = body.items;
				var playlists_arr = new Array();

				for(var i = 0; i < (body.items).length; i++){
					var cur_playlist = (body.items)[i];
					playlists_arr.push({ id: cur_playlist["id"], name: cur_playlist["name"] });
				}

				res.statusCode = response.statusCode;
				res.send(playlists_arr);
			}else{
				res.statusCode = response.statusCode;
				res.end();
			}
		});
	});

	router.get('/tracks', function(req, res){
		var access_token = req.cookies.access_token;
		var user_id = req.cookies.user_id;

		var get_options = {
			url: 'https://api.spotify.com/v1/me/tracks',
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
					var track = raw_tracks[i].track;
					var entry = { 'id': track.id,
								  'name': track.name,
								  'artists': track.artists[0].name
								};
					tracks.push(entry);				
				}
				res.statusCode = response.statusCode;
				res.send(tracks);
			}else{
				res.statusCode = response.statusCode;
				res.end();
			}
		});
	});

	router.get('/artists', function(req, res){
		var access_token = req.cookies.access_token;
		var user_id = req.cookies.user_id;

		var get_options = {
			url: 'https://api.spotify.com/v1/me/following?type=artist',
			headers: {
				'Authorization': 'Bearer ' + access_token
			},
			json: true
		}

		request.get(get_options, function(error, response, body){
			if(!error && response.statusCode == 200){	
				var raw_artists = body.artists.items;
				var artists = new Array();			

				for(var i = 0; i < raw_artists.length; i++){
					var artist = raw_artists[i];
					var entry = { 'id': artist.id,
								  'name': artist.name
								};
					artists.push(entry);
				}
				res.statusCode = response.statusCode;
				res.send(artists);
			}else{
				res.statusCode = response.statusCode;
				res.end();
			}
		});
	});

	return router;
}