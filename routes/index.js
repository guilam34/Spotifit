var express = require('express');
var router = express.Router();

var request = require('request');
var querystring = require('querystring');

var client_id = 'ed3b512e06d94fdc94ee6b3581393e14';
var client_secret = 'b0505301d1dd4efa92c0ae4b1b037aae';

var host_url = 'http://localhost:3000/';

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Spotifit' });
});

router.get('/auth_client', function(req, res, next) {
	var uri = 'https://accounts.spotify.com/authorize/?client_id=' + encodeURIComponent(client_id) +
						'&response_type=' + encodeURIComponent('code') +
						'&redirect_uri=' + encodeURIComponent(host_url + 'getToken') +
						'&scope=' + encodeURIComponent('playlist-modify-public user-library-read user-follow-read');  			
	res.redirect(uri);					
});

//TODO create separate test and deployment credentials for spotify api and test library read scope
//Get access token after user has allowed app permissions
router.get('/getToken', function(req, res, next) {
	var code = req.query.code;
	var error = req.query.error;

	if(error == null){
		var post_options = {
			url: 'https://accounts.spotify.com/api/token',		
			form: {
				'grant_type': 'authorization_code',
				'code': encodeURIComponent(code),
				'redirect_uri': encodeURIComponent(host_url + 'getToken')						
			},
			headers: {
				'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
			},
			json: true
		}

		request.post(post_options, function(error, response, body){
			if(!error && response.statusCode == 200){												
				res.cookie('access_token', body.access_token, { maxAge: (body.expires_in * 1000) });
				res.cookie('refresh_token', body.refresh_token);

				res.redirect('/userProfile');
			}else{
				res.redirect('/');
			}
		});
	}else{		
		res.redirect('/');
	}
});

//Get user info and generate user profile
router.get('/userProfile', refreshTokenMiddleware, function(req, res){
	var access_token = req.cookies.access_token;

	var get_options = {
		url: 'https://api.spotify.com/v1/me',
		headers: {
			'Authorization': 'Bearer ' + access_token
		},
		json: true
	}
	request.get(get_options, function(error, response, body){
		if(!error && response.statusCode == 200){
			res.cookie('user_id', body.id);
			// res.render('user', { user: body.id });
			res.redirect('/menu');
		}else{
			res.redirect('/');
		}
	});
});

//Gets search suggestions from Spotify API and returns JSON
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

router.get('/menu', refreshTokenMiddleware, function(req, res){
	res.render('menu');
});

//Return list of all playlists
router.get('/playlists', refreshTokenMiddleware, function(req, res){			
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

//Retrieve and display target playlist
router.get('/playlist', refreshTokenMiddleware, function(req, res){	
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

router.get('/getUserTracks', refreshTokenMiddleware, function(req, res){
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

router.get('/getUserArtists', refreshTokenMiddleware, function(req, res){
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

//Get audio features for each of the track_ids included in request
router.get('/getTracksData', refreshTokenMiddleware, function(req, res){
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

						var uri = '/generatePlaylist?' + 'ids=' + raw_track_ids + '&'
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
		var uri = '/generatePlaylist?ids=&a_ids=' + raw_artist_ids + '&tempo=' + tempo;
		res.redirect(uri);
	}
});

//Make new playlist based on variables passed in
//Maybe move setting varibles to getTracksData
router.get('/generatePlaylist', refreshTokenMiddleware, function(req, res){
	var access_token = req.cookies.access_token;
	var raw_artist_ids = req.query.a_ids;
	var artist_ids = raw_artist_ids.split(',');

	var uri = 'https://api.spotify.com/v1/recommendations?';
	uri += 'limit=40&';
	uri += 'target_tempo=' + req.query.tempo + '&';

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

//TODO: use this when accessing access_token cookie
//Get new access token if current one has expired
function refreshTokenMiddleware(req, res, next){
	if(req.cookies.access_token == undefined){
		var refresh_token = req.cookies.refresh_token;
		var post_options = {
			url: 'https://accounts.spotify.com/api/token',		
			form: {
				'grant_type': 'refresh_token',
				'refresh_token': refresh_token
			},
			headers: {
				'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
			},
			json: true
		}

		request.post(post_options, function(error, response, body){
			if(!error && response.statusCode == 200){												
				req.cookies.access_token = body.access_token;	
				res.cookie('access_token', body.access_token, { maxAge: (body.expires_in * 1000) });				
				next();
			}else{
				res.redirect('/');
			}
		});
	}else{
		next();
	}	
}

module.exports = router;
