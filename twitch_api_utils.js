const request = require( "request" );
//https://dev.twitch.tv/docs/v5/reference/users#follow-channel

const wTwitchKeys = require( "./personal.js" ).twitch;
//var wSES = [ process.argv[2] , process.argv[3] , process.argv[4] , process.argv[5] ];
//console.log( wSES );


//const RU = require( "./redis_Utils.js" );

function followUserName( wUserNameToFollow  ) {
	return new Promise( function( resolve , reject ) {
		try {
			var wURL = "https://api.twitch.tv/kraken/users/" + wTwitchKeys.user_name + "/follows/channels/" + wUserNameToFollow +"?client_id=" +
			wTwitchKeys.client_id + "&oauth_token=" + wTwitchKeys.oauth_token + "&on_site=1";
			request.put( wURL , function ( err , response , body ) {
		        if ( err ) { console.log( err ); reject( err ); return; }
				resolve( JSON.parse( body ) );
			});
		}
		catch( error ) { console.log( error ); reject( error ); }
	});
}
function unfollowUserName( wUserNameToUnFollow ) {
	return new Promise( function( resolve , reject ) {
		try {
			var wURL = "https://api.twitch.tv/kraken/users/" + wTwitchKeys.user_name + "/follows/channels/" + wUserNameToUnFollow +"?client_id=" +
				wTwitchKeys.client_id + "&oauth_token=" + wTwitchKeys.oauth_token + "&on_site=1";
			request.delete( wURL , function ( err , response , body ) {
				if ( err ) { console.log( err ); reject( err ); return; }
				var x11 = null;
				try { x11 = JSON.parse( body ); }
				catch( err ) { x11 = ""; }
				resolve( x11 );
			});
		}
		catch( error ) { console.log( error ); reject( error ); }
	});
}

function getFollowers() {
	return new Promise( function( resolve , reject ) {
		try {
			//var wURL = "https://api.twitch.tv/kraken/streams/followed?client_id=" +
			//wTwitchKeys.client_id + "&oauth_token=" + wTwitchKeys.oauth_token + "&on_site=1";
			var wURL = "https://api.twitch.tv/kraken/users/" + wTwitchKeys.user_name + "/follows/channels?client_id=" + wTwitchKeys.client_id + "&oauth_token=" + wTwitchKeys.oauth_token + "&on_site=1&limit=100";
			//console.log( wURL );
			request( wURL , async function ( err , response , body ) {
				if ( err ) {
					console.log( err );
					reject( err );
					return;
				}
				var followers = JSON.parse( body );
				followers = followers[ "follows" ];
				followers = followers.map( x => x[ "channel" ][ "name" ] );
				resolve( followers );
			});
		}
		catch( error ) { console.log( error ); reject( error ); }
	});
}
module.exports.getFollowers = getFollowers;

const R_TWITCH_LIVE_USERS = "TWITCH.LIVE_USERS";
const R_TWITCH_LIVE_USERS_INDEX = "TWITCH.LIVE_USERS_INDEX";
function UPDATE_LIVE_USERS( wResetIndex ) {
	return new Promise( async function( resolve , reject ) {
		try {
			//await RU.delKey( R_TWITCH_LIVE_USERS );
			var xR = null;
			//var fR = [];
			var wTMP = [];
			function parseResults() {
				return new Promise( async function( resolve2 , reject2 ) {
					try {
						for ( var x1 = 0; x1 < xR[ "streams" ].length; ++x1 ) {
							var t1 = new Date( xR[ "streams" ][ x1 ][ "created_at" ] );
							var t2 = Math.round( t1.getTime() / 1000 );
							var wOBJ = {
								name: xR[ "streams" ][ x1 ][ "channel" ][ "display_name" ].toLowerCase() ,
								game: xR[ "streams" ][ x1 ][ "game" ] ,
								_id: xR[ "streams" ][ x1 ][ "_id" ] ,
								start_time: t2 ,
								resolution: xR[ "streams" ][ x1 ][ "video_height" ] ,
								status: xR[ "streams" ][ x1 ][ "stream_type" ] ,
							};
							//fR.push( wOBJ );
							// console.log( wOBJ.status );
							// console.log( ( wOBJ.status === "live" ) ? true:false );
							if ( wOBJ.status === "live" ) {
								console.log( wOBJ );
								wTMP.push( wOBJ.name );
							}
						}
						if ( wTMP.length > 0 ) {
							console.log( wTMP );
							//await RU.setListFromArray( R_TWITCH_LIVE_USERS , wTMP );
							//if ( !wResetIndex ) { await RU.setKey( R_TWITCH_LIVE_USERS_INDEX , 0 ); }
							//await RU.setKey( R_TWITCH_LIVE_USERS_INDEX , 0 );
						}
						resolve2( wTMP );
					}
					catch( error ) { console.log( error ); reject2( error ); }
				});
			}
			var wURL = "https://api.twitch.tv/kraken/streams/followed?client_id=" +
			wTwitchKeys.client_id + "&oauth_token=" + wTwitchKeys.oauth_token + "&on_site=1";
			request( wURL , async function ( err , response , body ) {
		        //if ( err ) { wcl( err ); reject( err ); return; }
				xR = JSON.parse( body );
				if ( xR[ "error" ] ) { if ( xR[ "error"] === "Bad Request" ) { console.log( xR ); resolve( xR ); } }
				var fr = await parseResults();
				resolve( fr );
			});
		}
		catch( error ) { console.log( error ); reject( error ); }
	});
}
module.exports.updateLiveUsers = UPDATE_LIVE_USERS;

const LiveFollowers_URL = "https://api.twitch.tv/kraken/streams/followed?client_id=" + wTwitchKeys.client_id + "&oauth_token=" + wTwitchKeys.oauth_token + "&on_site=1";
function GET_LIVE_USERS( wResetIndex ) {
	return new Promise( async function( resolve , reject ) {
		try {
			var xR = null;
			//var fR = [];
			var wTMP = [];
			function parseResults() {
				return new Promise( async function( resolve2 , reject2 ) {
					try {
						for ( var x1 = 0; x1 < xR[ "streams" ].length; ++x1 ) {
							var t1 = new Date( xR[ "streams" ][ x1 ][ "created_at" ] );
							var t2 = Math.round( t1.getTime() / 1000 );
							var wOBJ = {
								name: xR[ "streams" ][ x1 ][ "channel" ][ "display_name" ].toLowerCase() ,
								game: xR[ "streams" ][ x1 ][ "game" ] ,
								_id: xR[ "streams" ][ x1 ][ "_id" ] ,
								start_time: t2 ,
								resolution: xR[ "streams" ][ x1 ][ "video_height" ] ,
								status: xR[ "streams" ][ x1 ][ "stream_type" ] ,
							};
							//fR.push( wOBJ );
							// console.log( wOBJ.status );
							// console.log( ( wOBJ.status === "live" ) ? true:false );
							if ( wOBJ.status === "live" ) {
								console.log( wOBJ );
								wTMP.push( wOBJ.name );
							}
						}
						// if ( wTMP.length > 0 ) {
						// 	console.log( "live Followers === " );
						// 	console.log( wTMP );

						// 	await RU.setListFromArray( RC.RESTREAMING.LIVE_USERS , wTMP );
						// 	var pref_list = await RU.getFullList( RC.RESTREAMING.PREFERENCE_LIST );
						// 	console.log( "pref list ==" );
						// 	console.log( pref_list );
						// 	var built_que = wTMP 	;
						// 	if ( pref_list ) {
						// 		if ( pref_list.length > 0 ) {
						// 			console.log( "sorting" );
						// 			built_que = wTMP.sort(function(a, b){
						// 				// if ( pref_list.indexOf( a ) ) {
						// 				// 	if ( pref_list.indexOf( b  ) ) {

						// 				// 	}
						// 				// 	else { return a; }
						// 				// }
						// 				// else { return a; }
						// 				return pref_list.indexOf( a ) - pref_list.indexOf( b );
						// 			});
						// 		}
						// 	}

						// 	console.log( "Built Que === " );
						// 	console.log( built_que );
						// 	await RU.delKey( RC.RESTREAMING.QUE );
						// 	await RU.setListFromArray( RC.RESTREAMING.QUE , built_que );
						// 	await RU.delKey( RC.RESTREAMING.LIVE_USERS );
						// 	await RU.setListFromArray( RC.RESTREAMING.LIVE_USERS , wTMP );
						// }
						resolve2( wTMP );
					}
					catch( error ) { console.log( error ); reject2( error ); }
				});
			}

			request( LiveFollowers_URL , async function ( err , response , body ) {
		        //if ( err ) { wcl( err ); reject( err ); return; }
				xR = JSON.parse( body );
				if ( xR[ "error" ] ) { if ( xR[ "error"] === "Bad Request" ) { console.log( xR ); resolve( xR ); } }
				var fr = await parseResults();
				resolve( fr );
			});
		}
		catch( error ) { console.log( error ); reject( error ); }
	});
}
module.exports.getLiveUsers = GET_LIVE_USERS;


( async ()=> {
	let r1 = await followUserName( "manneredmonkey" );
	let r2 = await followUserName( "alexandrabotez" );
	// console.log( r1 );
	// console.log( r1 );
	let r3 = await getFollowers();
	console.log( r3 );
})();

module.exports.followUserName = followUserName;
module.exports.unfollowUserName = unfollowUserName;
module.exports.getFollowers = getFollowers;