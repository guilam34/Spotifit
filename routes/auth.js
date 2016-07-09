module.exports = function(router, request, config){
	router.get('/auth-client', function(req, res, next) {
		var uri = 'https://accounts.spotify.com/authorize/?client_id=' + encodeURIComponent(config.client_id) +
							'&response_type=' + encodeURIComponent('code') +
							'&redirect_uri=' + encodeURIComponent(config.host_url + 'get-token') +
							'&scope=' + encodeURIComponent('user-top-read playlist-modify-public user-library-read user-follow-read');  			
		res.redirect(uri);					
	});

	router.get('/get-token', function(req, res, next) {
		var code = req.query.code;
		var error = req.query.error;

		if(error == null){
			var post_options = {
				url: 'https://accounts.spotify.com/api/token',		
				form: {
					'grant_type': 'authorization_code',
					'code': encodeURIComponent(code),
					'redirect_uri': encodeURIComponent(config.host_url + 'get-token')						
				},
				headers: {
					'Authorization': 'Basic ' + (new Buffer(config.client_id + ':' + config.client_secret).toString('base64'))
				},
				json: true
			}

			request.post(post_options, function(error, response, body){
				if(!error && response.statusCode == 200){												
					res.cookie('access_token', body.access_token, { maxAge: (body.expires_in * 1000) });
					res.cookie('refresh_token', body.refresh_token);

					res.redirect('/set-credentials');
				}else{
					res.redirect('/');
				}
			});
		}else{		
			res.redirect('/');
		}
	});

	router.get('/set-credentials', function(req, res){
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

	return router;
}