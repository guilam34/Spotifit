module.exports = function(router, request, config){
	router.get('/', function(req, res, next) {
		if(req.cookies.access_token != undefined)
			res.redirect('/menu');
		else
	  		res.render('index', { title: 'Spotifit' });
	});

	router.get('/menu', function(req, res){
		res.render('menu');
	});

	router.get('/logout', function(req, res){
		res.clearCookie('access_token');
		res.clearCookie('user_id');
		res.redirect('/');
	});

	return router;
}
