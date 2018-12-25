const API_UTILS = require( "./api_utils.js" );
const SCRAPER_UTILS = require( "./scraper_utils.js" );

function compute_user_streak( user_name ) {
	return new Promise( async function( resolve , reject ) {
		try {

			//let games = await API_UTILS.getUsersLatestGames( user_name );
			let games = await SCRAPER_UTILS.getUsersLatestGames( user_name );

			const last_opponent = games[ 0 ][ 2 ];
			console.log( "Last Opponent == " + last_opponent );

			let result = { score: 0 , opponent: last_opponent , our_guy: user_name , message: "" };

			//let streak_games = [];
			for ( let i = 0; i < games.length; ++i ) {
				if ( games[ i ][ 2 ] === last_opponent ) {
					console.log( i.toString() + " == " + user_name + " == " + games[ i ][ 1 ] + " vs " + last_opponent + " == " + games[ i ][ 3 ] );
					if ( games[ i ][ 1 ] === "1" ) {
						result.score = result.score + 1;
					}
					else { break; }
				}
				else { break; }
			}
			//console.log( streak_games );
			// TODO : Add Reverse Adoption Score ?
			// let streak = 0;
			// for ( let i = 0; i < streak_games.length; ++i ) {
			// 	console.log( i.toString() + " == " + user_name + " == " + streak_games[ i ][ 1 ] + " vs " + last_opponent + " == " + black.result );
			// 	let our_guy = ( white.username === user_name ) ? white : black;
			// 	if ( our_guy.result === "win" ) { streak = streak + 1; }
			// 	else { break; }
			// }
			//resolve( [ streak , last_opponent , user_name ] );
			result.message = user_name + " vs " + last_opponent + " [" + result.score.toString() + "]";
			resolve( result );
		}
		catch( error ) { console.log( error ); reject( error ); }
	});
}
module.exports.getUserStreak = compute_user_streak;


function compute_twitch_channel_streak( channel ) {
	return new Promise( function( resolve , reject ) {
		try {
			resolve();
		}
		catch( error ) { console.log( error ); reject( error ); }
	});
}
module.exports.getTwitchChannelStreak = compute_twitch_channel_streak;

// ( async ()=> {

// 	let results = await compute_user_streak( "Hikaru" );
// 	console.log( results );

// })();